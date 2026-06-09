import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "潭江.js",
  "锦江.js",
  "台城河.js",
  "新昌水.js",
  "白沙水.js",
  "斗山河.js",
  "宅梧河.js",
  "沙坪河.js",
  "雅瑶河.js",
  "莱苏河.js",
  "大海河.js",
  "大江河.js",
  "大沙河水渠.js",
  "端芬河.js",
  "水步河.js",
  "都斛河.js",
  "南坦海.js",
  "银洲湖.js",
  "镇海水.js",
  "岭头河.js",
  "蚬冈水.js",
];

startSingleFolderRiverMap({
  folderName: '潭江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
