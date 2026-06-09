import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/rematch_v3_strict.mjs（v4: bbox+15km spatial check + native-refusal）
// 干流（红色高亮）：流溪河.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "流溪河.js",
  "派潭河.js",
  "小海河.js",
  "铜鼓坑.js",
  "大沙河.js",
  "潖江.js",
  "黄龙河.js",
  "龙南河.js",
  "大燕河.js",
  "民安水.js",
  "铁山河.js",
  "牛栏河.js",
  "玉溪河.js",
];

startSingleFolderRiverMap({
  folderName: '流溪河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
