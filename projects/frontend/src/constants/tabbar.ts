import tideIcon from '../assets/tab/tide.png'
import tideActiveIcon from '../assets/tab/tide-active.png'
import riverIcon from '../assets/tab/river.png'
import riverActiveIcon from '../assets/tab/river-active.png'
import fishIcon from '../assets/tab/fish.png'
import fishActiveIcon from '../assets/tab/fish-active.png'
import meIcon from '../assets/tab/me.png'
import meActiveIcon from '../assets/tab/me-active.png'

export const TAB_BAR_ITEMS = [
  {
    pagePath: '/pages/tide/tide',
    text: '潮汐表',
    iconPath: tideIcon,
    selectedIconPath: tideActiveIcon,
  },
  {
    pagePath: '/pages/index/index',
    text: '江河',
    iconPath: riverIcon,
    selectedIconPath: riverActiveIcon,
  },
  {
    pagePath: '/pages/fish/fish',
    text: '识鱼',
    iconPath: fishIcon,
    selectedIconPath: fishActiveIcon,
  },
  {
    pagePath: '/pages/profile/profile',
    text: '我的',
    iconPath: meIcon,
    selectedIconPath: meActiveIcon,
  },
] as const

export const TAB_INDEX = {
  tide: 0,
  index: 1,
  fish: 2,
  profile: 3,
} as const

/** 悬浮胶囊 TabBar 占用高度（含 16rpx 下边距） */
export const TAB_BAR_RESERVE = 'calc(128rpx + env(safe-area-inset-bottom))'
