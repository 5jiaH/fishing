import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 龙江（惠来）水系 — 天地图 HYDL + OSM 数据补全 2026-04-25
// 干流（红色高亮）：龙江.js；支流：蓝色描边。
// 数据来源：天地图 1:100万 HYDL + OSM Overpass API（小支流补全）
const FILES = [
  "龙江.js",
  "龙潭河.js",
  "高埔河.js",
  "崩坎水.js",
  "南洋仔水.js",
  "头寮水.js",
  "梅林河.js",
  "罗溪水.js",
  "盐岭河.js",
  "雷岭河.js",
  "隆江溪.js",
  "渡头溪.js",
  "鳌江.js",
  "葛内溪.js",
];

startSingleFolderRiverMap({
  folderName: '龙江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
