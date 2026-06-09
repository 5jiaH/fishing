/**
 * 和风 GeoAPI：city/lookup 取 Location ID（写入 zip），POI range（TSTA）取省/市；
 * city/lookup 首条 name 与 adm2 不同时写入 region（作区县名参考）。
 *
 * - GET /geo/v2/city/lookup  location=经度,纬度（最多两位小数）
 * - GET /geo/v2/poi/range     location=经度,纬度&type=TSTA&radius=km
 *
 * 用法（在项目根目录 Api/ 下执行）：
 *   node lib/global-tide.nmdis.org.cn/tide-port-zip.js
 *   node lib/global-tide.nmdis.org.cn/tide-port-zip.js --all
 *
 * 环境变量（与 Nest weather.service 对齐，避免 403 INVALID HOST）：
 *   SQLITE_PATH            数据库路径，默认 <项目根>/nest.sqlite
 *   QWEATHER_API_KEY       必填，与控制台凭据一致（请求头 X-QW-Api-Key）
 *   QWEATHER_KEY           可选，未设 QWEATHER_API_KEY 时使用
 *   QWEATHER_HOST          控制台「API Host」；未设时与 weather.service 一致（见下方默认常量）
 *   QWEATHER_API_HOST      可选，同 QWEATHER_HOST
 *   QWEATHER_POI_RADIUS_KM POI 搜索半径（公里），默认 50；和风限制约 1～50（文档示例为 10），超出会 400 invalid radius
 *
 * 启动时会尝试加载项目根目录 .env（不覆盖已存在的环境变量）。
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const ROOT = path.resolve(__dirname, '../..');

function loadEnvFromRoot(rootDir) {
  try {
    const p = path.join(rootDir, '.env');
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch (_) {
    /* ignore */
  }
}

loadEnvFromRoot(ROOT);

/** 与 src/modules/api/services/weather.service.ts 中 QWEATHER_BASE 默认一致，避免脚本用 devapi 而 KEY 绑定专属 Host 导致 403 */
const QWEATHER_DEFAULT_HOST = 'https://m84wcuq363.re.qweatherapi.com';

const DB_PATH = process.env.SQLITE_PATH || path.join(ROOT, 'nest.sqlite');
const QWEATHER_API_HOST = QWEATHER_DEFAULT_HOST.replace(/\/$/, '');
/** 和风 /geo/v2/poi/range 的 radius 超出上限会返回 400 invalidParams: radius（示例为 10km） */
const QWEATHER_POI_RADIUS_MIN = 1;
const QWEATHER_POI_RADIUS_MAX = 50;
const QWEATHER_POI_RADIUS_KM = Math.min(
  QWEATHER_POI_RADIUS_MAX,
  Math.max(
    QWEATHER_POI_RADIUS_MIN,
    Math.round(
      Number(process.env.QWEATHER_POI_RADIUS_KM) || 50,
    ),
  ),
);
const QWEATHER_DELAY_MS = 400;

const USER_AGENT = 'TidalApi-tide-port-qweather/1.1 (+https://github.com/)';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function str(s) {
  if (s == null) return '';
  return String(s).trim().slice(0, 255);
}

/** 和风：经纬度最多两位小数；文档为「经度,纬度」 */
function formatQweatherLocation(lon, lat) {
  const x = Number(lon);
  const y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestPoi(pois, lon, lat) {
  if (!Array.isArray(pois) || !pois.length) return null;
  let best = pois[0];
  let bestKm = Infinity;
  for (const p of pois) {
    const plon = parseFloat(p.lon);
    const plat = parseFloat(p.lat);
    if (!Number.isFinite(plon) || !Number.isFinite(plat)) continue;
    const d = haversineKm(lat, lon, plat, plon);
    if (d < bestKm) {
      bestKm = d;
      best = p;
    }
  }
  return best;
}

/** city/lookup 首条：name 与 adm2 不同则视为区县级名称 */
function regionFromCityLocation(loc) {
  if (!loc) return '';
  const name = str(loc.name);
  const adm1 = str(loc.adm1);
  const adm2 = str(loc.adm2);
  if (name && adm2 && name !== adm2 && name !== adm1) return name;
  return '';
}

async function qweatherJson(url, apiKey) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['X-QW-Api-Key'] = apiKey;
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    let hint = '';
    if (res.status === 403) {
      hint =
        ' 403 常见原因：API Host 与 KEY 不匹配（请设置 QWEATHER_HOST 为控制台「API Host」）；或额度/安全策略。';
    }
    const body = text.length > 300 ? `${text.slice(0, 300)}…` : text;
    throw new Error(`QWeather HTTP ${res.status}${hint} ${body}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`QWeather 响应非 JSON: ${text.slice(0, 160)}`);
  }
}

/**
 * @returns {{ id: string, adm1: string, adm2: string, name: string } | null}
 */
async function qweatherCityLookup(lon, lat, key) {
  const loc = formatQweatherLocation(lon, lat);
  if (!loc) return null;

  const url = new URL(`${QWEATHER_API_HOST}/geo/v2/city/lookup`);
  url.searchParams.set('location', loc);
  url.searchParams.set('number', '1');

  const j = await qweatherJson(url, key);
  if (String(j.code) !== '200') {
    const tip = j.code != null ? ` code=${j.code}` : '';
    throw new Error(`QWeather city/lookup${tip}`);
  }
  if (!j.location || !j.location[0]) return null;
  const L = j.location[0];
  return {
    id: str(L.id).slice(0, 32),
    adm1: str(L.adm1),
    adm2: str(L.adm2),
    name: str(L.name),
  };
}

/**
 * POI 范围搜索（潮汐站点）；取距离坐标最近的一条的 adm1/adm2
 * @returns {{ adm1: string, adm2: string } | null}
 */
async function qweatherPoiRangeTsta(lon, lat, key) {
  const loc = formatQweatherLocation(lon, lat);
  if (!loc) return null;

  const url = new URL(`${QWEATHER_API_HOST}/geo/v2/poi/range`);
  url.searchParams.set('location', loc);
  url.searchParams.set('type', 'TSTA');
  url.searchParams.set('radius', String(QWEATHER_POI_RADIUS_KM));

  const j = await qweatherJson(url, key);
  if (String(j.code) !== '200') {
    const tip = j.code != null ? ` code=${j.code}` : '';
    throw new Error(`QWeather poi/range${tip}`);
  }
  if (!j.poi || !Array.isArray(j.poi) || !j.poi.length) return null;
  const p = nearestPoi(j.poi, lon, lat);
  if (!p) return null;
  const adm3 = p.adm3 != null ? str(p.adm3) : '';
  return {
    adm1: str(p.adm1),
    adm2: str(p.adm2),
    adm3,
  };
}

async function main() {
  const overwriteAll = process.argv.includes('--all');
  const qKey = process.env.QWEATHER_API_KEY || process.env.QWEATHER_KEY || '';

  if (!qKey) {
    console.error(
      '请设置 QWEATHER_API_KEY 或 QWEATHER_KEY（与和风控制台凭据一致）。',
    );
    process.exit(1);
  }

  if (!process.env.QWEATHER_HOST && !process.env.QWEATHER_API_HOST) {
    console.error(
      `提示: 未设置 QWEATHER_HOST，使用与 weather.service 相同的默认 Host: ${QWEATHER_DEFAULT_HOST}`,
    );
  }

  const db = new sqlite3.Database(DB_PATH);

  const table = await get(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tide_port'",
  );
  if (!table) {
    db.close();
    throw new Error(
      `未找到表 tide_port（当前库: ${DB_PATH}）。请确认 SQLITE_PATH 与数据库已就绪。`,
    );
  }

  const cols = await all(db, 'PRAGMA table_info(tide_port)');
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has('zip')) {
    await run(
      db,
      "ALTER TABLE tide_port ADD COLUMN zip varchar(32) NOT NULL DEFAULT ''",
    );
    colNames.add('zip');
  }
  if (!colNames.has('province')) {
    await run(
      db,
      "ALTER TABLE tide_port ADD COLUMN province varchar(255) NOT NULL DEFAULT ''",
    );
    colNames.add('province');
  }

  let sql = `SELECT id, coordX, coordY FROM tide_port
     WHERE coordX IS NOT NULL AND coordY IS NOT NULL`;

  if (!overwriteAll) {
    sql +=
      " AND (zip IS NULL OR zip = '' OR province IS NULL OR province = '' OR city IS NULL OR city = '')";
  }

  const rows = await all(db, sql);
  console.error(
    `数据库: ${DB_PATH}\n` +
      `API Host: ${QWEATHER_API_HOST}\n` +
      `city/lookup + poi/range TSTA radius=${QWEATHER_POI_RADIUS_KM}km\n` +
      `待处理 ${rows.length} 条\n`,
  );

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lon = Number(row.coordX);
    const lat = Number(row.coordY);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      console.error(`[skip] id=${row.id} 无效坐标`);
      fail++;
      continue;
    }

    try {
      const cityRow = await qweatherCityLookup(lon, lat, qKey);
      let poiAd = null;
      try {
        poiAd = await qweatherPoiRangeTsta(lon, lat, qKey);
      } catch (pe) {
        console.warn(
          `\n[warn] id=${row.id} POI: ${pe instanceof Error ? pe.message : pe}`,
        );
      }

      await sleep(QWEATHER_DELAY_MS);

      const zip = cityRow ? cityRow.id : '';
      const province = str(poiAd?.adm1 || cityRow?.adm1);
      const city = str(poiAd?.adm2 || cityRow?.adm2);
      let region = str(poiAd?.adm3);
      if (!region && cityRow) {
        region = regionFromCityLocation(cityRow);
      }

      if (!zip && !province && !city && !region) {
        console.warn(
          `\n[empty] id=${row.id} (${formatQweatherLocation(lon, lat)}) 无数据`,
        );
      }

      await run(
        db,
        'UPDATE tide_port SET zip = ?, province = ?, city = ?, region = ? WHERE id = ?',
        [zip, province, city, region, row.id],
      );
      ok++;
      process.stdout.write(`\r${i + 1}/${rows.length} 已更新`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`\n[err] id=${row.id} (${lon},${lat}): ${msg}`);
    }

    await sleep(QWEATHER_DELAY_MS);
  }

  db.close((err) => {
    if (err) console.error('关闭数据库:', err);
    console.error(`\n完成: 成功 ${ok}, 失败/跳过 ${fail}`);
    process.exit(fail > 0 && ok === 0 ? 1 : 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
