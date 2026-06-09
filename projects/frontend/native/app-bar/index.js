Component({
  data: {
    tagline: '近海出行，先看潮汐与江河雷达111',
    count: 0
  },
  lifetimes: {
    attached() {
      this._timer = setInterval(() => {
        this.setData({ count: this.data.count + 1 })
      }, 1000)
    },
    detached() {
      if (this._timer) clearInterval(this._timer)
    }
  },
  methods: {
    setTagline(text) {
      this.setData({ tagline: text })
    }
  }
})
