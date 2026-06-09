import { HttpClient } from './base'

const client = new HttpClient()

function toNum (v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function itemCoords (row: ApiItf.HydrologyRadarItem): { lng: number; lat: number } | null {
  const lng = toNum(row.lgtd ?? row.lng ?? row.longitude)
  const lat = toNum(row.lttd ?? row.lat ?? row.latitude)
  if (lng === null || lat === null) return null
  return { lng, lat }
}

function isRecord (x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/**
 * 解析 /api/hydrology/radar 返回体为站点列表（兼容多种常见包装）。
 */
export function parseHydrologyRadarList (raw: unknown): ApiItf.HydrologyRadarItem[] {
  const tryArray = (a: unknown): ApiItf.HydrologyRadarItem[] => {
    if (!Array.isArray(a)) return []
    return a.filter((x): x is ApiItf.HydrologyRadarItem => isRecord(x))
  }

  if (Array.isArray(raw)) return tryArray(raw)
  if (!isRecord(raw)) return []

  const d = raw.data
  if (Array.isArray(d)) return tryArray(d)
  if (isRecord(d)) {
    if (Array.isArray(d.data)) return tryArray(d.data)
    if (Array.isArray(d.list)) return tryArray(d.list)
    if (Array.isArray(d.records)) return tryArray(d.records)
  }
  return []
}

/**
 * GET /api/hydrology/radar?lng=&lat=
 * 有登录 token 时由 HttpClient 自动附加 Authorization: Bearer &lt;token&gt;
 */
export async function fetchHydrologyRadar (
  lng: number,
  lat: number
): Promise<unknown> {
  return client.request({
    path: '/api/hydrology/radar',
    method: 'GET',
    data: { lng, lat }
  })
}

export function radarItemCoords (row: ApiItf.HydrologyRadarItem): { lng: number; lat: number } | null {
  return itemCoords(row)
}
