import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/migrate_v3_merged_none_to_root.mjs
// 干流（红色高亮）：南渡河.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "南渡河.js",
  "雷州青年运河东运河.js",
  "雷州青年运河西运河.js",
  "田西溪.js",
  "站堰河.js",
  "流牛滩.js",
  "公和水.js",
  "土塘水.js",
  "松竹河.js",
  "花桥水.js",
];

startSingleFolderRiverMap({
  folderName: '南渡河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
