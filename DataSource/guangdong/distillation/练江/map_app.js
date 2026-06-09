import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "练江.js",
  "流沙河.js",
  "洪阳河.js",
  "练江支流_034337.js",
  "枫江.js",
  "梅林河.js",
  "两英河.js",
];

startSingleFolderRiverMap({
  folderName: '练江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
