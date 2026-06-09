import { createElement, useEffect, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { load as loadAmap } from '@amap/amap-jsapi-loader'
import './index.scss'

type AMapNS = typeof AMap

function clampZoom (scale: number): number {
  const z = Math.round(scale)
  return Math.min(20, Math.max(3, z))
}

function setAmapSecurity (code: string | undefined): void {
  if (!code) return
  const w = window as Window & {
    _AMapSecurityConfig?: { securityJsCode: string }
  }
  w._AMapSecurityConfig = { securityJsCode: code }
}

function clearMarkers (list: AMap.Marker[]): void {
  for (const m of list) {
    m.setMap(null)
    m.destroy()
  }
  list.length = 0
}

function makeMarkers (
  AMap: AMapNS,
  map: AMap.Map,
  items: ApiItf.RadarMapMarker[]
): AMap.Marker[] {
  const out: AMap.Marker[] = []
  for (const m of items) {
    const icon = new AMap.Icon({
      image: m.iconPath,
      size: new AMap.Size(m.width, m.height),
      imageSize: new AMap.Size(m.width, m.height)
    })
    out.push(
      new AMap.Marker({
        map,
        position: [m.longitude, m.latitude],
        icon,
        title: m.title,
        offset: new AMap.Pixel(-m.width / 2, -m.height / 2)
      })
    )
  }
  return out
}

export type AmapH5MapProps = {
  className?: string
  longitude: number
  latitude: number
  scale?: number
  markers: ApiItf.RadarMapMarker[]
}

/** 仅 H5：高德 JSAPI 2.0（需在 env 配置 TARO_APP_AMAP_KEY；建议配置 TARO_APP_AMAP_SECURITY_JS_CODE） */
export function AmapH5Map ({
  className,
  longitude,
  latitude,
  scale = 12,
  markers
}: AmapH5MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<AMap.Map | null>(null)
  const amapRef = useRef<AMapNS | null>(null)
  const markerListRef = useRef<AMap.Marker[]>([])
  const markersRef = useRef(markers)
  markersRef.current = markers

  const key = process.env.TARO_APP_AMAP_KEY ?? ''
  const securityCode = process.env.TARO_APP_AMAP_SECURITY_JS_CODE ?? ''

  useEffect(() => {
    if (!key) return
    const el = containerRef.current
    if (!el) return

    setAmapSecurity(securityCode)

    let disposed = false
    void loadAmap({ key, version: '2.0', plugins: [] })
      .then((AMap: AMapNS) => {
        if (disposed || !containerRef.current) return
        amapRef.current = AMap
        const map = new AMap.Map(containerRef.current, {
          zoom: clampZoom(scale),
          center: [longitude, latitude],
          viewMode: '2D'
        })
        mapRef.current = map
        clearMarkers(markerListRef.current)
        markerListRef.current = makeMarkers(AMap, map, markersRef.current)
      })
      .catch((err: unknown) => {
        console.error(err)
      })

    return () => {
      disposed = true
      clearMarkers(markerListRef.current)
      mapRef.current?.destroy()
      mapRef.current = null
      amapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 页内中心/缩放为常量
  }, [key, securityCode])

  useEffect(() => {
    const AMapNs = amapRef.current
    const map = mapRef.current
    if (!AMapNs || !map) return
    clearMarkers(markerListRef.current)
    markerListRef.current = makeMarkers(AMapNs, map, markers)
  }, [markers])

  if (!key) {
    return (
      <View className={`amap-h5-map amap-h5-map--placeholder ${className ?? ''}`}>
        <Text className='amap-h5-map__hint'>
          请在环境变量中配置 TARO_APP_AMAP_KEY（高德开放平台 Web 端 Key）
        </Text>
      </View>
    )
  }

  return createElement('div', {
    ref: containerRef,
    className: `amap-h5-map ${className ?? ''}`
  })
}
