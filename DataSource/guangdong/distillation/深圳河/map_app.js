import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/migrate_v3_merged_none_to_root.mjs
// 干流（红色高亮）：深圳河.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "深圳河.js",
  "沙湾河.js",
  "布吉河.js",
  "福田河.js",
  "山背河.js",
  "平原河.js",
  "莲塘河.js",
];

startSingleFolderRiverMap({
  folderName: '深圳河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
