Component({
  data: {
    selected: 0,
    color: '#4b4b4b',
    selectedColor: '#000000',
    list: [
      {
        pagePath: '/pages/tide/tide',
        text: '潮汐表',
        iconPath: '/assets/tab/tide.png',
        selectedIconPath: '/assets/tab/tide-active.png',
      },
      {
        pagePath: '/pages/index/index',
        text: '江河',
        iconPath: '/assets/tab/river.png',
        selectedIconPath: '/assets/tab/river-active.png',
      },
      {
        pagePath: '/pages/fish/fish',
        text: '识鱼',
        iconPath: '/assets/tab/fish.png',
        selectedIconPath: '/assets/tab/fish-active.png',
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/assets/tab/me.png',
        selectedIconPath: '/assets/tab/me-active.png',
      },
    ],
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      if (typeof index !== 'number' && typeof index !== 'string') return
      const next = Number(index)
      if (this.data.selected === next) return
      wx.switchTab({ url: path })
    },
    setSelected(index) {
      this.setData({ selected: index })
    },
  },
})
