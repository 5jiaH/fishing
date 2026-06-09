import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 自动生成 by scripts/migrate_v3_merged_none_to_root.mjs
// 干流（红色高亮）：茅洲河.js；命名支流：OSM/拓扑 合并；无名段：置信<0.85 或空间/跨流域不通过的保留段。
const FILES = [
  "茅洲河.js",
  "大陂河.js",
  "东宝河.js",
  "鹅颈水.js",
  "公益涌.js",
  "广济河.js",
  "合水口河.js",
  "楼村水.js",
  "猫山涌.js",
  "上屋河.js",
  "石岩河.js",
  "松岗河.js",
  "西乡河.js",
  "新陂头河.js",
  "衙边涌.js",
  "洋涌河.js",
  "应人石河.js",
  "丽水河.js",
  "交椅湾新河.js",
  "天圳河.js",
  "沙下涌.js",
  "沙福河.js",
  "福永海河.js",
  "苗涌.js",
  "茅洲河支流_015871.js",
  "茅洲河支流_015872.js",
  "茅洲河支流_018748.js",
  "茅洲河支流_018786.js",
  "茅洲河支流_018787.js",
  "茅洲河支流_018905.js",
  "茅洲河支流_018965.js",
  "茅洲河支流_018975.js",
  "茅洲河支流_018994.js",
  "茅洲河支流_019034.js",
  "茅洲河支流_019098.js",
  "茅洲河支流_019207.js",
  "茅洲河支流_020093.js",
];

startSingleFolderRiverMap({
  folderName: '茅洲河',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
