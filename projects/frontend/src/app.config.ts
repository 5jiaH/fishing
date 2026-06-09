export default defineAppConfig({
  renderer: "skyline",
  lazyCodeLoading: "requiredComponents",
  componentFramework: "glass-easel",
  rendererOptions: {
    skyline: {
      defaultDisplayBlock: true,
      defaultContentBox: true,
      tagNameStyleIsolation: "legacy",
      enableScrollViewAutoSize: true,
      keyframeStyleIsolation: "legacy",
    },
  },
  appBar: {},
  pages: [
    "pages/tide/tide",
    "pages/tideDetail/tideDetail",
    "pages/index/index",
    "pages/fish/fish",
    "pages/profile/profile",
    "pages/auth/auth",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "WeChat",
    navigationBarTextStyle: "black",
  },
  tabBar: {
    custom: true,
    color: "#4b4b4b",
    selectedColor: "#000000",
    backgroundColor: "#ffffff",
    borderStyle: "black",
    list: [
      {
        pagePath: "pages/tide/tide",
        text: "潮汐表",
        iconPath: "assets/tab/tide.png",
        selectedIconPath: "assets/tab/tide-active.png",
      },
      {
        pagePath: "pages/index/index",
        text: "江河",
        iconPath: "assets/tab/river.png",
        selectedIconPath: "assets/tab/river-active.png",
      },
      {
        pagePath: "pages/fish/fish",
        text: "识鱼",
        iconPath: "assets/tab/fish.png",
        selectedIconPath: "assets/tab/fish-active.png",
      },
      {
        pagePath: "pages/profile/profile",
        text: "我的",
        iconPath: "assets/tab/me.png",
        selectedIconPath: "assets/tab/me-active.png",
      },
    ],
  },
  permission: {
    "scope.userLocation": {
      desc: "用于在地图上显示您的位置",
    },
    "scope.camera": {
      desc: "用于拍摄鱼类照片并上传识别",
    },
  },
});
