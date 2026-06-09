const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'tidal.sqlite');

const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  async (err) => {
    if (err) {
      console.error('连接 tidal.sqlite 失败：', err.message);
      process.exit(1);
    }

    try {
      await mergeMonitoringPointByStcd();
      console.log('monitoringPoint 合并完成。');
    } catch (error) {
      console.error('合并 monitoringPoint 失败：', error.message || error);
      process.exitCode = 1;
    } finally {
      db.close();
    }
  },
);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text === '' ? null : text;
}

function splitSttp(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function pickPreferredRow(rows) {
  const scoredRows = rows.map((row, index) => {
    const types = splitSttp(row.sttp);
    const hasZQ = types.includes('ZQ');
    const hasZZ = types.includes('ZZ');

    let score = 0;

    if (hasZQ) {
      score = 2;
    } else if (hasZZ) {
      score = 1;
    }

    return { row, index, score };
  });

  scoredRows.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.index - right.index;
  });

  return scoredRows[0].row;
}

function pickField(rows, preferredRow, fieldName) {
  const preferredValue = normalizeText(preferredRow[fieldName]);

  if (preferredValue !== null) {
    return preferredValue;
  }

  for (const row of rows) {
    const value = normalizeText(row[fieldName]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function mergeRows(rows) {
  const preferredRow = pickPreferredRow(rows);
  const sttpList = uniqueValues(rows.flatMap((row) => splitSttp(row.sttp)));

  return {
    stcd: normalizeText(preferredRow.stcd),
    stnm: pickField(rows, preferredRow, 'stnm'),
    sttp: sttpList.length > 0 ? sttpList.join(',') : null,
    areaName: pickField(rows, preferredRow, 'areaName'),
    cityName: pickField(rows, preferredRow, 'cityName'),
    img: pickField(rows, preferredRow, 'img'),
    sttpName: pickField(rows, preferredRow, 'sttpName'),
    lat: pickField(rows, preferredRow, 'lat'),
    lng: pickField(rows, preferredRow, 'lng'),
  };
}

function groupRows(rows) {
  const groups = new Map();

  rows.forEach((row, index) => {
    const stcd = normalizeText(row.stcd);
    const key =
      stcd === null ? `__EMPTY__${row._rowid || row.id || index}` : stcd;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  });

  return [...groups.values()];
}

async function ensureMonitoringPointTableExists() {
  const row = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    ['monitoringPoint'],
  );

  if (!row) {
    throw new Error('monitoringPoint 表不存在');
  }
}

async function rebuildMonitoringPointTable(mergedRows) {
  await run('BEGIN TRANSACTION');

  try {
    await run('DROP TABLE IF EXISTS monitoringPoint_new');
    await run(`
      CREATE TABLE monitoringPoint_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stcd TEXT UNIQUE,
        stnm TEXT,
        sttp TEXT,
        areaName TEXT,
        cityName TEXT,
        img TEXT,
        sttpName TEXT,
        lat TEXT,
        lng TEXT
      )
    `);

    const insertSql = `
      INSERT INTO monitoringPoint_new (
        stcd, stnm, sttp, areaName, cityName, img, sttpName, lat, lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const row of mergedRows) {
      await run(insertSql, [
        row.stcd,
        row.stnm,
        row.sttp,
        row.areaName,
        row.cityName,
        row.img,
        row.sttpName,
        row.lat,
        row.lng,
      ]);
    }

    await run('DROP TABLE monitoringPoint');
    await run('ALTER TABLE monitoringPoint_new RENAME TO monitoringPoint');
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

async function mergeMonitoringPointByStcd() {
  await ensureMonitoringPointTableExists();

  const rawRows = await all('SELECT rowid AS _rowid, * FROM monitoringPoint');

  if (rawRows.length === 0) {
    console.log('monitoringPoint 表为空，无需处理。');
    return;
  }

  const groupedRows = groupRows(rawRows);
  const mergedRows = groupedRows.map((rows) => mergeRows(rows));
  const duplicateGroupCount = groupedRows.filter(
    (rows) => rows.length > 1,
  ).length;

  await rebuildMonitoringPointTable(mergedRows);

  console.log(`原始数据 ${rawRows.length} 条。`);
  console.log(`合并后数据 ${mergedRows.length} 条。`);
  console.log(`共处理重复 stcd 分组 ${duplicateGroupCount} 组。`);
}
