import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "九洲江.js",
  "罗江.js",
  "合江.js",
  "塘蓬河.js",
  "白沙河.js",
  "莲塘河.js",
  "清湖水.js",
  "宁潭河.js",
  "凌江.js",
  "长径河.js",
  "白火江.js",
  "潭莲河.js",
  "大坝河.js",
  "卖皂河.js",
  "东平河.js",
  "营仔河.js",
  "柴埠江.js"
];

startSingleFolderRiverMap({
  folderName: '九洲江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
