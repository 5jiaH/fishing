const https = require('https');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 数据库路径（与 crawler.mycz.cn.js 保持一致）
const dbPath = path.join(__dirname, '..', 'nest.sqlite');

// 固定时间参数，如需调整可在此修改
const START_DATE = '2026-04-06+00';
const END_DATE = '2026-04-08+12';
// hour 参数目前按需求传空
const HOUR = '';

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
 * 请求接口 /sqc/stDetail，获取单个测站的详情
 * 期望从返回中拿到 LGTD(经度) 和 LTTD(纬度)
 */
function fetchStationDetail(stcd) {
  const pathStr = `/sqc/stDetail?stcd=${stcd}&startDate=${START_DATE}&endDate=${END_DATE}&hour=${HOUR}`;

  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: 'nhwx.mycz.cn',
          path: pathStr,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/18787 Flue',
            Cookie: 'PHPSESSID=i0n1tra3k53nrunet2fnsq2s02',
            Referer: `https://nhwx.mycz.cn/sqc/info.html?stcd=${stcd}`,
            Host: 'nhwx.mycz.cn',
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              reject(e);
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
 * 将获取到的 LGTD / LTTD 更新到 monitoringPoint 表的 lng / lat 字段
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
 * 1. 查询 monitoringPoint 表中 lat、lng 为空的数据
 * 2. 逐条调用 /sqc/stDetail 接口获取 LGTD、LTTD
 * 3. 回写到表的 lng、lat 字段
 */
function processMonitoringPoints() {
  const sql =
    "SELECT stcd FROM hydrology WHERE (lat IS NULL OR lat = '') AND (lng IS NULL OR lng = '')";

  db.all(sql, async (err, rows) => {
    if (err) {
      console.error('查询 monitoringPoint 失败：', err.message);
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
        `(${i + 1}/${rows.length}) 正在获取测站 ${stcd} 的坐标信息...`,
      );

      try {
        const detail = await fetchStationDetail(stcd);

        // 根据实际返回结构提取 LGTD / LTTD
        // 这里先兼容几种常见结构：
        let lng;
        let lat;

        if (detail && detail.data) {
          const d = detail.data;
          lng = d.LGTD || d.lgtd || d.lng;
          lat = d.LTTD || d.lttd || d.lat;
        } else {
          lng = detail && (detail.LGTD || detail.lgtd || detail.lng);
          lat = detail && (detail.LTTD || detail.lttd || detail.lat);
        }

        if (!lng || !lat) {
          console.warn(`测站 ${stcd} 返回数据中未找到 LGTD/LTTD，已跳过。`);
        } else {
          await updateLatLng(stcd, String(lng), String(lat));
        }
      } catch (e) {
        console.error(`请求测站 ${stcd} 详情失败：`, e.message || e);
      }

      // 为了避免请求过快，简单加一点延时
      await delay(10000);
    }

    console.log('所有需要补充坐标的监测点处理完成，正在关闭数据库连接。');
    db.close();
  });
}
