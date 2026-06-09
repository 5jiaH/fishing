import { View, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useState } from 'react'
import {
  AUTH_TOKEN_STORAGE_KEY,
  getVerificationCode,
  login,
  register,
} from '../../api'
import './auth.scss'

function randomKey (): string {
  return `k_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function AuthPage () {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [cover, setCover] = useState('')
  const [code, setCode] = useState('')
  const [captchaKey, setCaptchaKey] = useState(randomKey)
  const [loadingCaptcha, setLoadingCaptcha] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const verificationType: ApiItf.VerificationType = mode === 'login' ? 'login' : 'register'

  const loadCaptcha = useCallback(async () => {
    setLoadingCaptcha(true)
    try {
      const reqKey = username.trim() || captchaKey
      const text = await getVerificationCode(reqKey, verificationType)
      console.log(text);
      
      setCode(text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '获取验证码失败'
      Taro.showToast({ title: msg, icon: 'none' })
      setCode('')
    } finally {
      setLoadingCaptcha(false)
    }
  }, [username, captchaKey, verificationType])

  const switchMode = (next: 'login' | 'register') => {
    if (next === mode) return
    setMode(next)
    setCaptchaKey(randomKey())
    setCode('')
  }

  const onSubmit = async () => {
    const u = username.trim()
    const p = password
    const c = code.trim()
    if (!u || !p || !c) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        const res = await login({ username: u, password: p, code: c })
        console.log(res);
        
        // const token = pickToken(res)
        
        if (res.data) Taro.setStorageSync(AUTH_TOKEN_STORAGE_KEY, res.data)
        Taro.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/tide/tide' })
        }, 400)
      } else {
        await register({
          username: u,
          password: p,
          cover: cover.trim(),
          code: c
        })
        Taro.showToast({ title: '注册成功', icon: 'success' })
        setMode('login')
        setCaptchaKey(randomKey())
        void loadCaptcha()
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : mode === 'login' ? '登录失败' : '注册失败'
      Taro.showToast({ title: msg, icon: 'none' })
      void loadCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='auth-page'>
      <View className='auth-page__tabs'>
        <View
          className={`auth-page__tab${mode === 'login' ? ' auth-page__tab--active' : ''}`}
          onClick={() => switchMode('login')}
        >
          登录
        </View>
        <View
          className={`auth-page__tab${mode === 'register' ? ' auth-page__tab--active' : ''}`}
          onClick={() => switchMode('register')}
        >
          注册
        </View>
      </View>

      <View className='auth-page__field'>
        <View className='auth-page__label'>用户名</View>
        <Input
          className='auth-page__input'
          placeholder='请输入用户名'
          value={username}
          onInput={e => setUsername(e.detail.value)}
        />
      </View>

      <View className='auth-page__field'>
        <View className='auth-page__label'>密码</View>
        <Input
          className='auth-page__input'
          password
          placeholder='请输入密码'
          value={password}
          onInput={e => setPassword(e.detail.value)}
        />
      </View>

      {mode === 'register' && (
        <View className='auth-page__field'>
          <View className='auth-page__label'>封面（可选）</View>
          <Input
            className='auth-page__input'
            placeholder='可为空，对应接口 cover 字段'
            value={cover}
            onInput={e => setCover(e.detail.value)}
          />
        </View>
      )}

      <View className='auth-page__field'>
        <View className='auth-page__label'>验证码（接口返回，可修改）</View>
        <Input
          className='auth-page__input'
          placeholder={loadingCaptcha ? '获取中…' : '请先获取验证码'}
          value={code}
          onInput={e => setCode(e.detail.value)}
        />
        <Button
          className='auth-page__refresh'
          plain
          onClick={() => void loadCaptcha()}
        >
          重新获取验证码
        </Button>
      </View>

      <Button
        className='auth-page__submit'
        disabled={submitting}
        onClick={() => void onSubmit()}
      >
        {mode === 'login' ? '登录' : '注册'}
      </Button>

      <View className='auth-page__hint'>接口基址：http://localhost:5000</View>
    </View>
  )
}
