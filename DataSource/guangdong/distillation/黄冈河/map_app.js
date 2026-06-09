import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "黄冈河.js",
  "东门溪.js",
  "食饭溪.js",
  "东山溪.js",
  "浮滨溪.js",
  "新圩溪.js",
  "樟溪.js",
  "联饶溪.js",
  "九村溪.js",
  "新塘溪.js",
  "黄田港溪.js",
  "新港干渠.js",
  "高堂引汤渠.js",
  "坪洋溪.js",
  "黄冈河支流_037582.js",
];

startSingleFolderRiverMap({
  folderName: '黄冈河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
