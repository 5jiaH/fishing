import { Camera, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'
import CustomTabBar from '@/components/CustomTabBar'
import { TAB_INDEX } from '@/constants/tabbar'
import { useTabBarSelected } from '@/mixins/tabbar.mixin'
import {
  FishRecognizeError,
  recognizeFishByImage,
  type FishRecognizeResult,
} from '../../api'
import './fish.scss'

const CAMERA_ID = 'fish-camera'
const isWeapp = process.env.TARO_ENV === 'weapp'
const isH5 = process.env.TARO_ENV === 'h5'

function formatConfidence (c: number | undefined): string | null {
  if (c === undefined) return null
  if (c > 1) return `${Math.round(c)}%`
  return `${Math.round(c * 100)}%`
}

export default function FishPage () {
  useTabBarSelected(TAB_INDEX.fish)

  const busyRef = useRef(false)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FishRecognizeResult | null>(null)

  const runRecognize = useCallback(async (path: string) => {
    if (!path || busyRef.current) return
    busyRef.current = true
    setPreview(path)
    setResult(null)
    setLoading(true)
    Taro.showLoading({ title: '识别中…', mask: true })
    try {
      const data = await recognizeFishByImage(path)
      setResult(data)
      if (data.candidates.length === 0) {
        Taro.showToast({ title: '暂无匹配结果', icon: 'none' })
      }
    } catch (e) {
      const msg =
        e instanceof FishRecognizeError
          ? e.message
          : e instanceof Error
            ? e.message
            : '识别失败'
      Taro.showToast({ title: msg, icon: 'none' })
      setResult(null)
    } finally {
      busyRef.current = false
      setLoading(false)
      Taro.hideLoading()
    }
  }, [])

  const takePhoto = useCallback(() => {
    if (loading) return
    const ctx = Taro.createCameraContext(CAMERA_ID)
    ctx.takePhoto({
      quality: 'high',
      success: (r) => {
        void runRecognize(r.tempImagePath)
      },
      fail: () => {
        Taro.showToast({ title: '拍照失败', icon: 'none' })
      },
    })
  }, [loading, runRecognize])

  const pickAlbum = useCallback(() => {
    if (loading) return
    void Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (r) => {
        const f = r.tempFiles[0]
        if (f?.tempFilePath) void runRecognize(f.tempFilePath)
      },
      fail: () => {
        Taro.showToast({ title: '未选择图片', icon: 'none' })
      },
    })
  }, [loading, runRecognize])

  return (
    <View className='fish-page app-page-with-tabbar'>
      <Text className='fish-page__hint'>
        拍摄或上传鱼体清晰照片，将上传至服务端识别。请在后端实现 POST
        /api/fish/recognize（multipart 字段 image）。
      </Text>

      {isWeapp ? (
        <Camera
          id={CAMERA_ID}
          className='fish-page__camera'
          devicePosition='back'
          flash='off'
          mode='normal'
          onError={() =>
            Taro.showToast({ title: '相机无法使用', icon: 'none' })
          }
        />
      ) : (
        <View className='fish-page__camera-placeholder'>
          <Text className='fish-page__camera-placeholder-text'>
            当前为 H5 等端预览：请使用「从相册选择」；真机微信小程序可使用上方相机取景。
          </Text>
        </View>
      )}

      {preview ? (
        <Image className='fish-page__preview' src={preview} mode='aspectFit' />
      ) : null}

      <View className='fish-page__actions'>
        {isWeapp ? (
          <View
            className={`fish-page__btn fish-page__btn--primary${loading ? ' fish-page__btn--disabled' : ''}`}
            onClick={takePhoto}
          >
            <Text>拍照识别</Text>
          </View>
        ) : null}
        <View
          className={`fish-page__btn fish-page__btn--secondary${loading ? ' fish-page__btn--disabled' : ''}`}
          onClick={pickAlbum}
        >
          <Text>从相册选择</Text>
        </View>
      </View>

      {result ? (
        <View className='fish-page__result'>
          <Text className='fish-page__result-title'>识别结果</Text>
          {result.note ? (
            <Text className='fish-page__result-note'>{result.note}</Text>
          ) : null}
          {result.candidates.length === 0 ? (
            <Text className='fish-page__result-empty'>无候选物种</Text>
          ) : (
            result.candidates.map((c, i) => {
              const pct = formatConfidence(c.confidence)
              return (
                <View key={`${c.name}-${i}`} className='fish-page__candidate'>
                  <Text className='fish-page__candidate-name'>{c.name}</Text>
                  {pct ? (
                    <Text className='fish-page__candidate-score'>{pct}</Text>
                  ) : null}
                </View>
              )
            })
          )}
        </View>
      ) : null}
      {isH5 ? <CustomTabBar current={TAB_INDEX.fish} /> : null}
    </View>
  )
}
