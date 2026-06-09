import Taro from "@tarojs/taro";

/** 与微信小程序胶囊对齐的自定义顶栏布局（H5 等环境为 null，仅用安全区） */
export type WeappNavLayout = {
  statusBarHeight: number;
  navInnerHeight: number;
  menuHeight: number;
  menuLeft: number;
};

function computeWeappNavLayout(): WeappNavLayout | null {
  if (process.env.TARO_ENV !== "weapp") return null;
  try {
    const win = Taro.getWindowInfo();
    const menu = Taro.getMenuButtonBoundingClientRect();
    const statusBarHeight = win.statusBarHeight ?? 0;
    if (!menu?.height || typeof menu.left !== "number") return null;
    const navInnerHeight = (menu.top - statusBarHeight) * 2 + menu.height;
    return {
      statusBarHeight,
      navInnerHeight,
      menuHeight: menu.height,
      menuLeft: menu.left,
    };
  } catch {
    return null;
  }
}

/**
 * 读取顶栏布局。小程序内首次成功后写入进程内缓存，后续页面复用同一份数据
 */
export const readWeappNavLayout = (() => {
  let layoutCache: WeappNavLayout | null = null;
  return function (): WeappNavLayout | null {
    if (process.env.TARO_ENV !== "weapp") return null;
    if (layoutCache) return layoutCache;
    const next = computeWeappNavLayout();
    if (next) layoutCache = next;
    return next;
  };
})();
