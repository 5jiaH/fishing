/**
 * 根据 tide_port.coordX（经度）、coordY（纬度）逆地理编码，写入 city、region，及高德 adcode（行政区划码）。
 *
 * 用法（在项目根目录 Api/ 下执行）：
 *   node lib/global-tide.nmdis.org.cn/fill-tide-port-city.js
 *   node lib/global-tide.nmdis.org.cn/fill-tide-port-city.js --all
 *
 * 环境变量：
 *   SQLITE_PATH   数据库文件路径，默认 <项目根>/nest.sqlite
 *   AMAP_WEB_KEY  若配置则优先使用高德逆地理（国内地址更贴近「城市」习惯）；否则用 OSM Nominatim
 *
 * Nominatim 使用政策：约 1 请求/秒，脚本已内置间隔；请勿多进程并发跑。
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 本文件在 lib/global-tide.nmdis.org.cn/ 下，上两级为项目根（含 nest.sqlite 的 Api/）
const ROOT = path.resolve(__dirname, '../..');
const DB_PATH = process.env.SQLITE_PATH || path.join(ROOT, 'nest.sqlite');
const NOMINATIM_DELAY_MS = 1100;
const AMAP_DELAY_MS = 200;

const USER_AGENT =
  'TidalApi-tide-port-city-fill/1.0 (batch reverse-geocode; +https://github.com/)';

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

function pickFromNominatim(data) {
  const a = data && data.address;
  if (!a) {
    return { city: '', region: '', adcode: '' };
  }
  // 仅市/镇/村进 city；county/state/country/name 易成「省、区」误填，县级进 region
  let city = '';
  if (a.city) city = a.city;
  else if (a.town) city = a.town;
  else if (a.village) city = a.village;

  let region = '';
  if (a.county && a.county !== city) region = a.county;
  else if (a.suburb && a.suburb !== city) region = a.suburb;

  if (!city && a.state && a.state !== a.country) {
    city = String(a.state).trim();
  }

  return {
    city: String(city).trim(),
    region: String(region).trim(),
    adcode: '',
  };
}

async function reverseNominatim(lon, lat) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', 'zh-CN,zh,en');

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (res.status === 429) {
    const err = new Error('Nominatim rate limited (429)');
    err.retryAfter = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  const data = await res.json();
  return pickFromNominatim(data);
}

/** 高德直辖市：province 即市级，city 常空或与省同 */
const AMAP_MUNICIPALITIES = new Set(['北京市', '天津市', '上海市', '重庆市']);

function parseAmapRegeo(j) {
  const empty = { city: '', region: '', adcode: '' };
  if (!j || j.status !== '1' || !j.regeocode) return empty;
  const c = j.regeocode.addressComponent || {};
  const adcode = String(c.adcode != null ? c.adcode : '').trim();
  const province = (c.province || '').trim();
  let cityName = c.city;
  if (Array.isArray(cityName)) {
    cityName = cityName[0] || '';
  }
  cityName = String(cityName || '').trim();
  const district = (c.district || '').trim();

  // 市名：地级市用 city；直辖市用 province。实在没有市再退回省。
  let city = '';
  if (cityName && cityName !== province) {
    const looksLikeDistrict = /[区县]$/.test(cityName);
    if (looksLikeDistrict && district && cityName === district) {
      city = AMAP_MUNICIPALITIES.has(province) ? province : '';
    } else if (!looksLikeDistrict) {
      city = cityName;
    }
  } else if ((!cityName || cityName === province) && province && AMAP_MUNICIPALITIES.has(province)) {
    city = province;
  }

  if (!city && province) {
    city = province;
  }

  return { city, region: district, adcode };
}

async function reverseAmap(lon, lat, key) {
  const loc = `${lon},${lat}`;
  const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
  url.searchParams.set('key', key);
  url.searchParams.set('location', loc);
  url.searchParams.set('extensions', 'base');
  url.searchParams.set('radius', '1000');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Amap HTTP ${res.status}`);
  }
  const j = await res.json();
  return parseAmapRegeo(j);
}

async function reverseGeocode(lon, lat, amapKey) {
  if (amapKey) {
    const r = await reverseAmap(lon, lat, amapKey);
    if (r.city || r.region || r.adcode) return r;
  }
  return reverseNominatim(lon, lat);
}

async function main() {
  const overwriteAll = process.argv.includes('--all');
  const amapKey = process.env.AMAP_WEB_KEY || '';

  const db = new sqlite3.Database(DB_PATH);

  const table = await get(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tide_port'",
  );
  if (!table) {
    db.close();
    throw new Error(
      `未找到表 tide_port（当前库: ${DB_PATH}）。请确认已用正确 nest.sqlite，并已启动过 Nest 让 TypeORM 建表；也可用环境变量 SQLITE_PATH 指定库文件路径。`,
    );
  }

  const cols = await all(db, 'PRAGMA table_info(tide_port)');
  const hasRegion = cols.some((c) => c.name === 'region');
  if (!hasRegion) {
    await run(
      db,
      "ALTER TABLE tide_port ADD COLUMN region varchar(255) NOT NULL DEFAULT ''",
    );
  }
  const hasAdcode = cols.some((c) => c.name === 'adcode');
  if (!hasAdcode) {
    await run(
      db,
      "ALTER TABLE tide_port ADD COLUMN adcode varchar(16) NOT NULL DEFAULT ''",
    );
  }

  let sql =
    'SELECT id, coordX, coordY, city, region, adcode FROM tide_port WHERE coordX IS NOT NULL AND coordY IS NOT NULL';
  if (!overwriteAll) {
    sql +=
      " AND ((city IS NULL OR city = '') OR (region IS NULL OR region = '') OR (adcode IS NULL OR adcode = ''))";
  }

  const rows = await all(db, sql);
  console.error(
    `数据库: ${DB_PATH}\n待处理 ${rows.length} 条${amapKey ? '（高德优先）' : '（仅 Nominatim）'}\n`,
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
      const { city, region, adcode } = await reverseGeocode(lon, lat, amapKey);
      if (!city && !region && !adcode) {
        console.warn(`[empty] id=${row.id} (${lon},${lat}) 无城市/区/adcode`);
      }
      await run(
        db,
        'UPDATE tide_port SET city = ?, region = ?, adcode = ? WHERE id = ?',
        [city, region, adcode, row.id],
      );
      ok++;
      process.stdout.write(
        `\r${i + 1}/${rows.length} 已更新（${city}/${region}/${adcode}）`,
      );
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`\n[err] id=${row.id} (${lon},${lat}): ${msg}`);
      if (e.retryAfter) {
        await sleep(5000);
        i--;
        continue;
      }
    }

    await sleep(amapKey ? AMAP_DELAY_MS : NOMINATIM_DELAY_MS);
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
