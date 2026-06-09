import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

// 韩江水系 — 校验后文件清单（2026-04-26）
// 干流（红色高亮）：韩江.js；一级支流 6 条全覆盖
const FILES = [
  // ── 干流 ──
  "韩江.js",
  "韩江东溪.js",      // 三角洲汊道
  "韩江西溪.js",      // 三角洲汊道
  "九河.js",           // 三角洲汊道
  "梅河.js",           // 韩江下游别称
  // ── 上源·梅江 ──
  "梅江.js",           // ★一级支流（西源）
  "琴江.js",           // ★梅江支流（天地图补全）
  "五华河.js",         // ★梅江支流（天地图补全）
  "五华水.js",         // 五华水（v3）
  "铁场河.js",         // 五华河上源
  "程江.js",           // ★梅江支流（天地图补全）
  "石窟河.js",         // ★梅江支流（天地图补全）
  "宁江.js",           // ★梅江支流（天地图补全）
  "松源河.js",         // ★梅江支流（天地图补全）
  // ── 上源·汀江 ──
  "汀江.js",           // ★一级支流（东源·闽粤）
  "梅潭河.js",         // ★一级支流·大埔（OSM 补全）
  // ── 中下游支流 ──
  "漳溪河.js",         // 中游支流
  "柚树河.js",         // 中游支流
  "小靖河.js",         // 中游支流
  "青溪水.js",         // 中游支流
  "凤凰溪.js",         // 中游支流·潮州
  "大胜溪.js",         // 中游支流
  "产溪.js",           // 中游支流
  "蔗溪.js",           // 下游支流
  "三洲溪.js",         // 中游支流
  "溪美溪.js",         // 中游支流
  "北溪河.js",         // 下游支流
  // ── 小支流 / 其他 ──
  "白宫河.js",
  "赤山水.js",
  "大坑水.js",
  "合溪水.js",
  "银江.js",
  "韩江支流_066359.js", // 韩江干流旁无名支叉（大埔/丰顺交界）
];

startSingleFolderRiverMap({
  folderName: '韩江水系',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
