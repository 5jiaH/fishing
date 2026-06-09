import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "漠阳江.js",
  "潭水河.js",
  "西山河.js",
  "那龙河.js",
  "大八河.js",
  "蟠龙河.js",
  "云林河.js",
  "云廉河.js",
  "那乌河.js",
  "轮水河.js",
  "八甲河.js",
  "平坦河.js",
  "小水河.js",
  "白水河.js",
  "漠西运河.js",
  "双捷西干渠.js",
  "平冈干渠.js",
  "中心洲干渠.js",
  "漠阳江支流_024680.js",
  "漠阳江支流_024688.js",
  "三甲河.js",
  "庙龙河.js",
  "龙门河.js",
  "马塘河.js",
];

startSingleFolderRiverMap({
  folderName: '漠阳江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
