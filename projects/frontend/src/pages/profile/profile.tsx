import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useState } from 'react'
import CustomTabBar from '@/components/CustomTabBar'
import { TAB_INDEX } from '@/constants/tabbar'
import { useTabBarSelected } from '@/mixins/tabbar.mixin'
import { AUTH_TOKEN_STORAGE_KEY } from '../../api'
import './profile.scss'

type MenuItem = {
  key: string
  label: string
  hint?: string
  toast?: string
}

type MenuGroup = {
  title: string
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: '常用功能',
    items: [
      { key: 'fav', label: '我的收藏', toast: '敬请期待' },
      { key: 'history', label: '浏览记录', toast: '敬请期待' },
      { key: 'msg', label: '消息通知', toast: '敬请期待' },
    ],
  },
  {
    title: '设置与帮助',
    items: [
      { key: 'settings', label: '通用设置', toast: '敬请期待' },
      { key: 'feedback', label: '意见反馈', toast: '敬请期待' },
      { key: 'about', label: '关于我们', toast: '敬请期待' },
    ],
  },
]

const isH5 = process.env.TARO_ENV === 'h5'

function readLoggedIn (): boolean {
  try {
    const t = Taro.getStorageSync(AUTH_TOKEN_STORAGE_KEY) as unknown
    return typeof t === 'string' && t.length > 0
  } catch {
    return false
  }
}

export default function ProfilePage () {
  useTabBarSelected(TAB_INDEX.profile)

  const [loggedIn, setLoggedIn] = useState(readLoggedIn)

  const refreshAuth = useCallback(() => {
    setLoggedIn(readLoggedIn())
  }, [])

  Taro.useDidShow(refreshAuth)

  const goAuth = () => {
    Taro.navigateTo({ url: '/pages/auth/auth' })
  }

  const onMenuItem = (item: MenuItem) => {
    if (item.toast) Taro.showToast({ title: item.toast, icon: 'none' })
  }

  const onLogout = () => {
    try {
      Taro.removeStorageSync(AUTH_TOKEN_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setLoggedIn(false)
    Taro.showToast({ title: '已退出', icon: 'none' })
  }

  return (
    <View className='profile-page app-page-sunshine-bg app-page-with-tabbar'>
      <View className='profile-page__header'>
        <View
          className='profile-page__user'
          onClick={loggedIn ? undefined : goAuth}
          hoverClass={loggedIn ? '' : 'profile-page__user--hover'}
        >
          <View className='profile-page__avatar'>
            <Text className='profile-page__avatar-text'>
              {loggedIn ? '用' : '访'}
            </Text>
          </View>
          <View className='profile-page__user-meta'>
            <Text className='profile-page__nickname'>
              {loggedIn ? '已登录用户' : '点击登录'}
            </Text>
            <Text className='profile-page__sub'>
              {loggedIn ? '欢迎使用潮汐相关功能' : '登录后可同步收藏与偏好'}
            </Text>
          </View>
          {!loggedIn && <Text className='profile-page__chevron'>›</Text>}
        </View>

        <View className='profile-page__stats'>
          <View className='profile-page__stat'>
            <Text className='profile-page__stat-num'>0</Text>
            <Text className='profile-page__stat-label'>收藏</Text>
          </View>
          <View className='profile-page__stat-divider' />
          <View className='profile-page__stat'>
            <Text className='profile-page__stat-num'>0</Text>
            <Text className='profile-page__stat-label'>足迹</Text>
          </View>
          <View className='profile-page__stat-divider' />
          <View className='profile-page__stat'>
            <Text className='profile-page__stat-num'>0</Text>
            <Text className='profile-page__stat-label'>消息</Text>
          </View>
        </View>
      </View>

      <View className='profile-page__body'>
        <View
          className='profile-page__account-card'
          onClick={goAuth}
          hoverClass='profile-page__row--hover'
        >
          <Text className='profile-page__account-title'>账号与安全</Text>
          <Text className='profile-page__account-desc'>
            {loggedIn ? '管理登录与密码' : '登录 / 注册'}
          </Text>
          <Text className='profile-page__chevron profile-page__chevron--on-card'>›</Text>
        </View>

        {MENU_GROUPS.map((group) => (
          <View key={group.title} className='profile-page__group'>
            <Text className='profile-page__group-title'>{group.title}</Text>
            <View className='profile-page__card'>
              {group.items.map((item, index) => (
                <View key={item.key}>
                  <View
                    className='profile-page__row'
                    onClick={() => onMenuItem(item)}
                    hoverClass='profile-page__row--hover'
                  >
                    <Text className='profile-page__row-label'>{item.label}</Text>
                    {item.hint ? (
                      <Text className='profile-page__row-hint'>{item.hint}</Text>
                    ) : null}
                    <Text className='profile-page__chevron'>›</Text>
                  </View>
                  {index < group.items.length - 1 ? (
                    <View className='profile-page__row-line' />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}

        {loggedIn ? (
          <View
            className='profile-page__logout'
            onClick={onLogout}
            hoverClass='profile-page__row--hover'
          >
            <Text className='profile-page__logout-text'>退出登录</Text>
          </View>
        ) : null}
      </View>
      {isH5 ? <CustomTabBar current={TAB_INDEX.profile} /> : null}
    </View>
  )
}
