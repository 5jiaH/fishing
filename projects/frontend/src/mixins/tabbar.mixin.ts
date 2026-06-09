import Taro, { useDidShow } from '@tarojs/taro'

type TabBarPage = {
  getTabBar?: () => {
    setSelected?: (index: number) => void
    setData?: (data: { selected: number }) => void
  }
}

export function useTabBarSelected(index: number) {
  useDidShow(() => {
    if (process.env.TARO_ENV !== 'weapp') return
    const page = Taro.getCurrentInstance().page as TabBarPage | undefined
    const tabBar = page?.getTabBar?.()
    if (!tabBar) return
    if (typeof tabBar.setSelected === 'function') {
      tabBar.setSelected(index)
      return
    }
    tabBar.setData?.({ selected: index })
  })
}
