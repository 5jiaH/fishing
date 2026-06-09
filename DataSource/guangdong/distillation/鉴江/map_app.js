import { startSingleFolderRiverMap } from '../_shared/river_folder_map.js';

const FILES = [
  "鉴江.js",
  "罗江.js",
  "曹江河.js",
  "袂花江.js",
  "小东江.js",
  "凌江.js",
  "新丰河.js",
  "金银河.js",
  "引鉴河.js",
  "东岸河.js",
  "鉴西江.js",
  "共青河.js",
  "杨梅河.js",
  "塘尾分洪河.js",
  "工业引水渠.js",
  "西干渠.js",
  "潭丹河.js",
  "南塘河.js",
  "鉴江支流_009412.js",
];

startSingleFolderRiverMap({
  folderName: '鉴江',
  fileNames: FILES,
  statusEl: document.getElementById('status'),
  canvas: document.getElementById('c'),
}).catch((e) => {
  document.getElementById('status').textContent = String(e && e.message ? e.message : e);
});
