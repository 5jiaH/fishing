const https = require('https');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 数据库路径（与 crawler.mycz.cn.js 保持一致）
const dbPath = path.join(__dirname, '..', 'nest.sqlite');

const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error('连接 tidal.sqlite 失败：', err.message);
      process.exit(1);
    }
    processMonitoringPoints();
  },
);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从 rain.html 页面 HTML 中解析 var detail = {...} 里的 LGTD(经度)、LTTD(纬度)
 */
function parseLgtdLttdFromHtml(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const tryJsonSlice = (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      const lng = obj.LGTD ?? obj.lgtd;
      const lat = obj.LTTD ?? obj.lttd;
      if (
        lng != null &&
        lat != null &&
        String(lng) !== '' &&
        String(lat) !== ''
      ) {
        return { LGTD: String(lng), LTTD: String(lat) };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const m = html.match(/var\s+detail\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (m && m[1]) {
    const fromParse = tryJsonSlice(m[1]);
    if (fromParse) {
      return fromParse;
    }
  }

  const lgtd =
    html.match(/["']LGTD["']\s*:\s*["']([^"']+)["']/) ||
    html.match(/\\"LGTD\\"\s*:\s*\\"([^"\\]+)\\"/);
  const lttd =
    html.match(/["']LTTD["']\s*:\s*["']([^"']+)["']/) ||
    html.match(/\\"LTTD\\"\s*:\s*\\"([^"\\]+)\\"/);

  if (lgtd && lttd) {
    return { LGTD: lgtd[1], LTTD: lttd[1] };
  }

  return null;
}

/**
 * GET https://nhwx.mycz.cn/sqc/rain.html?stcd=...
 * 页面内嵌 var detail = { ..., LGTD, LTTD, ... }
 */
function fetchStationDetailHtml(stcd) {
  const pathStr = `/sqc/rain.html?stcd=${encodeURIComponent(stcd)}`;

  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: 'nhwx.mycz.cn',
          path: pathStr,
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/18787 Flue',
            Cookie: 'PHPSESSID=i0n1tra3k53nrunet2fnsq2s02',
            Referer: `https://nhwx.mycz.cn/sqc/rain.html?stcd=${encodeURIComponent(stcd)}`,
            Host: 'nhwx.mycz.cn',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const coords = parseLgtdLttdFromHtml(data);
            if (coords) {
              resolve(coords);
            } else {
              reject(
                new Error(
                  `未在 HTML 中解析到 LGTD/LTTD（HTTP ${res.statusCode}，长度 ${data.length}）`,
                ),
              );
            }
          });
        },
      )
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * 将获取到的 LGTD / LTTD 更新到 hydrology 表的 lng / lat 字段
 */
function updateLatLng(stcd, lng, lat) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE hydrology SET lng = ?, lat = ? WHERE stcd = ?';
    db.run(sql, [lng, lat, stcd], function (err) {
      if (err) {
        console.error(`更新监测点 ${stcd} 坐标失败：`, err.message);
        reject(err);
        return;
      }
      console.log(`监测点 ${stcd} 坐标已更新：lng=${lng}, lat=${lat}`);
      resolve();
    });
  });
}

/**
 * 主流程：
 * 1. 查询 hydrology 表中 lat、lng 为空的数据
 * 2. 逐条 GET rain.html?stcd=...，从页面内嵌 detail 解析 LGTD、LTTD
 * 3. 回写到表的 lng、lat 字段
 */
function processMonitoringPoints() {
  const sql =
    "SELECT stcd FROM hydrology WHERE (lat IS NULL OR lat = '') AND (lng IS NULL OR lng = '')";

  db.all(sql, async (err, rows) => {
    if (err) {
      console.error('查询 hydrology 失败：', err.message);
      db.close();
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('没有需要补充坐标的监测点记录。');
      db.close();
      return;
    }

    console.log(`共 ${rows.length} 条监测点需要补充坐标。`);

    for (let i = 0; i < rows.length; i += 1) {
      const { stcd } = rows[i];
      console.log(
        `(${i + 1}/${rows.length}) 正在从 rain.html 获取测站 ${stcd} 的坐标...`,
      );

      try {
        const { LGTD: lng, LTTD: lat } = await fetchStationDetailHtml(stcd);
        await updateLatLng(stcd, lng, lat);
      } catch (e) {
        console.error(`请求测站 ${stcd} rain.html 失败：`, e.message || e);
      }

      await delay(4000);
    }

    console.log('所有需要补充坐标的监测点处理完成，正在关闭数据库连接。');
    db.close();
  });
}
