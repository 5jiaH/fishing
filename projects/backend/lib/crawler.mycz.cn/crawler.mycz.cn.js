const https = require('https');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 'ZQ', 'ZZ', 'PP'
const type = ['ZQ', 'ZZ', 'PP'];
const city = [
  // '江门市',
  // '广州市',
  // '佛山市',
  '深圳市',
  '珠海市',
  '东莞市',
  '中山市',
  '惠州市',
  '汕头市',
  '湛江市',
  '肇庆市',
  '梅州市',
  '茂名市',
  '阳江市',
  '清远市',
  '韶关市',
  '揭阳市',
  '汕尾市',
  '潮州市',
  '河源市',
  '云浮市',
];
const dbPath = path.join(__dirname, '..', 'nest.sqlite');

const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error('连接 tidal.sqlite 失败：', err.message);
      process.exit(1);
    }

    ensureMonitoringPointTable();
  },
);

// 判断hydrology表是否存在
function ensureMonitoringPointTable() {
  const tableName = 'hydrology';

  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [tableName],
    (err, row) => {
      if (err) {
        console.error('检查 hydrology 表时出错：', err.message);
        db.close();
        return;
      }

      if (row) {
        console.log(`数据表 "${tableName}" 已存在。`);
        ensureMonitoringPointPrimaryKey()
          .then(() => {
            d();
          })
          .catch((migrationErr) => {
            console.error(
              '处理 hydrology 表主键迁移失败：',
              migrationErr.message,
            );
            db.close();
          });
        return;
      }

      const createTableSql = `
        CREATE TABLE ${tableName} (
          stcd TEXT PRIMARY KEY,
          stnm TEXT,
          sttp TEXT,
          areaName TEXT,
          cityName TEXT,
          img TEXT,
          sttpName TEXT,
          lat TEXT,
          lng TEXT
        )
      `;

      db.run(createTableSql, (createErr) => {
        if (createErr) {
          console.error('创建 hydrology 表失败：', createErr.message);
          db.close();
        } else {
          console.log(`数据表 "${tableName}" 创建成功。`);
          d();
        }
      });
    },
  );
}

function ensureMonitoringPointPrimaryKey() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(hydrology)', (schemaErr, columns) => {
      if (schemaErr) {
        reject(schemaErr);
        return;
      }

      const hasId = columns.some((column) => column.name === 'id');
      const stcdColumn = columns.find((column) => column.name === 'stcd');
      const isStcdPrimaryKey = Boolean(stcdColumn && stcdColumn.pk === 1);

      if (!hasId && isStcdPrimaryKey) {
        resolve();
        return;
      }

      const sql = `
        BEGIN TRANSACTION;
        DROP INDEX IF EXISTS idx_hydrology_stcd;

        CREATE TABLE hydrology_new (
          stcd TEXT PRIMARY KEY,
          stnm TEXT,
          sttp TEXT,
          areaName TEXT,
          cityName TEXT,
          img TEXT,
          sttpName TEXT,
          lat TEXT,
          lng TEXT
        );

        INSERT INTO hydrology_new (stcd, stnm, sttp, areaName, cityName, img, sttpName, lat, lng)
        SELECT
          base.stcd,
          base.stnm,
          COALESCE((
            SELECT GROUP_CONCAT(sttp)
            FROM (
              SELECT DISTINCT mp2.sttp AS sttp
              FROM hydrology mp2
              WHERE mp2.stcd = base.stcd
                AND mp2.sttp IS NOT NULL
                AND mp2.sttp != ''
            )
          ), base.sttp),
          base.areaName,
          base.cityName,
          base.img,
          base.sttpName,
          base.lat,
          base.lng
        FROM hydrology base
        WHERE base.stcd IS NOT NULL
          AND base.stcd != ''
          AND base.rowid = (
            SELECT MIN(mp3.rowid)
            FROM hydrology mp3
            WHERE mp3.stcd = base.stcd
              AND mp3.stcd IS NOT NULL
              AND mp3.stcd != ''
          );

        DROP TABLE hydrology;
        ALTER TABLE hydrology_new RENAME TO hydrology;
        COMMIT;
      `;

      db.exec(sql, (err) => {
        if (err) {
          db.exec('ROLLBACK', () => {
            reject(err);
          });
          return;
        }

        resolve();
      });
    });
  });
}

function fetchPage(pageIndex, params) {
  const city = encodeURIComponent(params.city);
  // ZQ / ZZ
  const url = `https://nhwx.mycz.cn/sqc/getStList?stnm=&type=${params.type}&area=${city}&city=${city}&lat=&lng=&pageIndex=${pageIndex}&pageSize=20`;

  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: 'nhwx.mycz.cn',
          path: `/sqc/getStList?stnm=&type=${params.type}&area=${city}&city=${city}&lat=&lng=&pageIndex=${pageIndex}&pageSize=20`,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/18787 Flue',
            Cookie: 'PHPSESSID=i0n1tra3k53nrunet2fnsq2s02',
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveStations(list) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(list) || list.length === 0) {
      resolve();
      return;
    }

    db.serialize(() => {
      const stmt = db.prepare(
        `INSERT INTO hydrology (stcd, stnm, sttp, areaName, cityName, img, sttpName, lng, lat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(stcd) DO UPDATE SET
           stnm = excluded.stnm,
           sttp = CASE
             WHEN hydrology.sttp IS NULL OR hydrology.sttp = '' THEN excluded.sttp
             WHEN excluded.sttp IS NULL OR excluded.sttp = '' THEN hydrology.sttp
             WHEN instr(',' || hydrology.sttp || ',', ',' || excluded.sttp || ',') > 0 THEN hydrology.sttp
             ELSE hydrology.sttp || ',' || excluded.sttp
           END,
           areaName = excluded.areaName,
           cityName = excluded.cityName,
           img = excluded.img,
           sttpName = excluded.sttpName`,
      );

      list.forEach((item) => {
        const sttp = item && item.sttp ? String(item.sttp).trim() : '';

        stmt.run(
          [
            item.stcd,
            item.stnm,
            sttp,
            item.areaName,
            item.cityName,
            item.img,
            item.sttpName,
            '',
            '',
          ],
          (err) => {
            if (err) {
              console.error('写入监测点失败', item && item.stcd, err.message);
            }
          },
        );
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

function crawlAllPages(params) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(
        `*******************开始获取类型(${JSON.stringify(params)})的数据*********************`,
      );
      const first = await fetchPage(1, params);
      const inner = first && first.data && first.data.data;

      if (!inner || !Array.isArray(inner.data)) {
        console.error('第 1 页返回数据结构异常');
        // db.close();
        reject();
        return;
      }

      const lastPage = Number(inner.last_page) || 1;

      console.log(`共 ${lastPage} 页数据。`);
      await saveStations(inner.data);
      console.log('第 1 页数据已保存。');

      for (let page = 2; page <= lastPage; page += 1) {
        console.log(`等待 10 秒后请求第 ${page} 页...`);
        await delay(10000);

        console.log(`正在请求第 ${page} 页...`);
        const res = await fetchPage(page, params);
        const innerPage = res && res.data && res.data.data;

        if (!innerPage || !Array.isArray(innerPage.data)) {
          console.error(`第 ${page} 页返回数据结构异常，已跳过...`);
          continue;
        }

        await saveStations(innerPage.data);
        console.log(`第 ${page} 页数据已保存。`);
      }
      resolve('');
    } catch (err) {
      console.error('抓取分页数据时发生错误：', err.message || err);
      reject();
    }
  });
}

async function d() {
  for (let c of city) {
    for (let t of type) {
      await crawlAllPages({ city: c, type: t }).catch(() => {});
      await delay(10000);
    }
  }
  console.log('所有页数据处理完成，正在关闭数据库连接。');
  db.close();
}
