import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/migrate_v3_merged_none_to_root.mjs
// 干流（红色高亮）：黄江.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "黄江.js",
  "大液河.js",
  "龙津河.js",
  "公平灌渠.js",
  "横河.js",
  "鹿境溪.js",
  "吃贡水.js",
  "西坑水.js",
];

startSingleFolderRiverMap({
  folderName: '黄江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
