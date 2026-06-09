/**
 * 与 HTTP / 业务接口相关的类型。
 * 使用全局命名空间 ApiItf，源码中可直接写 ApiItf.xxx，无需 import。
 */
declare namespace ApiItf {
  type response<T = any> = {
    data : T,
    success: boolean;
    message ?: string;
    statusCode : number;
  }
  export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

  export interface BaseRequestOptions {
    path: string
    method?: RequestMethod
    /**
     * GET：作为 query。
     * POST/PUT/DELETE：默认作为 `application/x-www-form-urlencoded`（仅支持扁平字段）。
     * 若 `jsonBody: true`，则作为 `application/json` 发送，可为嵌套对象、数组等。
     */
    data?: Record<string, unknown>
    /** 为 true 时请求体为 JSON（`JSON.stringify(data)`），否则为表单 */
    jsonBody?: boolean
    headers?: Record<string, string>
    responseType?: 'text' | 'arraybuffer'
  }

  export type VerificationType = 'login' | 'register'

  export interface LoginBody {
    username: string
    password: string
    code: string
  }

  export interface RegisterBody {
    username: string
    password: string
    cover: string
    code: string
  }

  /** /api/hydrology/radar 站点项（坐标字段兼容多种命名） */
  export interface HydrologyRadarItem {
    sttp?: string
    stnm?: string
    stcd?: string
    lgtd?: number
    lttd?: number
    lng?: number
    lat?: number
    longitude?: number
    latitude?: number
    [key: string]: unknown
  }

  /** 水文雷达页 Map.markers 最小字段集 */
  export interface RadarMapMarker {
    id: number
    latitude: number
    longitude: number
    iconPath: string
    width: number
    height: number
    title?: string
  }


  export type verification = response<{
    code: string
  }>

  export type login = response<{
    token: string
  }>
}
