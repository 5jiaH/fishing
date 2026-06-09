export default definePageConfig({
  renderer: "skyline",
  navigationBarTitleText: "",
  navigationStyle: "default",
  backgroundColor: "#fff8ec",
  /** 仅下方 ScrollView 滚动，避免整页与内部抢滚动 */
  disableScroll: true,
});
