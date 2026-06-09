import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "榕江.js",
  "榕江南河.js",
  "榕江北河.js",
  "横江河.js",
  "仙桥河.js",
  "凉港河.js",
  "红莲池河.js",
  "榕江支流_035253.js",
  "榕江支流_035289.js",
  "榕江支流_036747.js",
  "北河.js",
  "德桥河.js",
  "榕江河.js",
  "车田河.js",
  "龙江.js",
  "龙车溪.js",
  "八乡溪.js",
  "第一溪.js",
  "西山溪.js",
];

startSingleFolderRiverMap({
  folderName: '榕江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
