/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.styl';

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 内置环境变量, 会影响到最终构建生成产物 */
    NODE_ENV: 'development' | 'production',
    /** 当前构建的平台 */
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'qq' | 'jd' | 'harmony' | 'jdrn'
    /**
     * 当前构建的小程序 appid
     * @description 若不同环境有不同的小程序，可通过在 env 文件中配置环境变量`TARO_APP_ID`来方便快速切换 appid， 而不必手动去修改 dist/project.config.json 文件
     * @see https://taro-docs.jd.com/docs/next/env-mode-config#特殊环境变量-taro_app_id
     */
    TARO_APP_ID: string
    /** H5 高德地图 Web 端 Key（见 https://console.amap.com/ ） */
    TARO_APP_AMAP_KEY?: string
    /** H5 高德地图安全密钥（控制台「安全密钥」配合 Key 使用） */
    TARO_APP_AMAP_SECURITY_JS_CODE?: string
    /** 潮汐接口根地址，如 http://127.0.0.1:85000（不要末尾 /） */
    TARO_APP_TIDAL_API_BASE_URL?: string
    /** 潮汐接口 Bearer Token（可带或不带 `Bearer ` 前缀） */
    TARO_APP_TIDAL_API_TOKEN?: string
    /** markerPoint 接口的 tid 查询参数，默认 3 */
    TARO_APP_TIDAL_MARKER_TID?: string
  }
}


