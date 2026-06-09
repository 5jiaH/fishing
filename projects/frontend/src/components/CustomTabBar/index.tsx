import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { TAB_BAR_ITEMS } from '@/constants/tabbar'
import './index.scss'

type CustomTabBarProps = {
  current: number
}

export default function CustomTabBar({ current }: CustomTabBarProps) {
  const onSwitch = (index: number, path: string) => {
    if (index === current) return
    Taro.switchTab({ url: path })
  }

  return (
    <View className='custom-tab-bar'>
      <View className='custom-tab-bar__pill'>
        {TAB_BAR_ITEMS.map((item, index) => {
          const isActive = index === current
          return (
            <View
              key={item.pagePath}
              className={`custom-tab-bar__item${isActive ? ' custom-tab-bar__item--active' : ''}`}
              onClick={() => onSwitch(index, item.pagePath)}
            >
              <Image
                className='custom-tab-bar__icon'
                src={isActive ? item.selectedIconPath : item.iconPath}
                mode='aspectFit'
              />
              <Text
                className='custom-tab-bar__text'
                style={{ color: isActive ? '#000000' : '#4b4b4b' }}
              >
                {item.text}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
