import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 东江水系 — 校验后文件清单（2026-04-26）
// 干流（红色高亮）：东江.js；一级支流 9 条（公庄水 OSM 补全，安远水暂缺）
const FILES = [
  "东江.js",
  "九曲河.js",
  "车田河.js",
  "利江.js",
  "义都河.js",
  "义容河.js",
  "浰江.js",
  "秋香江.js",
  "鱼潭江.js",
  "柏埔河.js",
  "渡田河.js",
  "四水.js",
  "溪河.js",
  "石门水.js",
  "红岗水.js",
  "忠信水.js",
  "铁场河.js",
  "埔前河.js",
  "新丰江.js",
  "枚坑河.js",
  "永汉河.js",
  "平陵河.js",
  "公庄水.js",
  "沙河.js",
  "西枝江.js",
  "淡水河.js",
  "增江.js",
  "石马河.js",
  "青年河.js",
  "新开河.js",
  "大沥河.js",
  "龙鼻沟.js",
  "东江北干流.js",
  "东江南支流.js",
  "倒运海水道.js",
  "仙村运河.js",
  "麻涌河.js",
  "潢涌河.js",
  "东滘涌.js",
  "温涌.js",
  "第二涌.js",
  "狮子洋.js",
  "安远水.js",
];

startSingleFolderRiverMap({
  folderName: '东江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
