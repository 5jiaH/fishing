import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/migrate_v3_merged_none_to_root.mjs
// 干流（红色高亮）：遂溪河.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "遂溪河.js",
  "东海河.js",
  "雷州青年运河.js",
  "遂溪河支流_020414.js",
  "遂溪河支流_020651.js",
  "遂溪河支流_020680.js",
  "遂溪河支流_020720.js",
  "遂溪河支流_020726.js",
  "遂溪河支流_020731.js",
  "遂溪河支流_020732.js",
  "遂溪河支流_020745.js",
  "遂溪河支流_020894.js",
  "遂溪河支流_020904.js",
  "遂溪河支流_021390.js",
  "遂溪河支流_021537.js",
  "遂溪河支流_021558.js",
  "遂溪河支流_021579.js",
  "遂溪河支流_021813.js",
  "遂溪河支流_021937.js",
  "遂溪河支流_022082.js",
  "遂溪河支流_022131.js",
  "遂溪河支流_022926.js",
];

startSingleFolderRiverMap({
  folderName: '遂溪河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
