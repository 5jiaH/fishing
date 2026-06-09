import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "螺河.js",
  "螺溪.js",
  "漂河.js",
  "南溪坑.js",
  "流冲河.js",
  "埔陇溪.js",
  "公平灌渠.js",
  "香车沥.js",
  "八万河.js",
  "公村河.js",
  "南琴江.js",
  "水尾河.js",
  "乌坝河.js",
  "渡头溪.js",
  "新田河.js",
  "潭西水.js",
];

startSingleFolderRiverMap({
  folderName: '螺河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
