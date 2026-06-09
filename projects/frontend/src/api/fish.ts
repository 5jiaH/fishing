import Taro from '@tarojs/taro'
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from './base'

/**
 * 后端约定（需自行实现）：
 * POST {API_BASE_URL}/api/fish/recognize
 * Content-Type: multipart/form-data
 * 字段名：image（文件）
 * 可选请求头：Authorization: Bearer <token>
 *
 * 响应体与项目其它接口一致，例如：
 * { "success": true, "statusCode": 200, "data": { "candidates": [ { "name": "鲫鱼", "confidence": 0.82 } ] } }
 */
export type FishRecognizeCandidate = {
  name: string
  confidence?: number
}

export type FishRecognizeResult = {
  candidates: FishRecognizeCandidate[]
  note?: string
}

function readBearerToken (): string | undefined {
  try {
    const raw = Taro.getStorageSync(AUTH_TOKEN_STORAGE_KEY) as unknown
    if (typeof raw === 'string') {
      const t = raw
        .trim()
        .replace(/^Bearer\s+/i, '')
        .trim()
      return t || undefined
    }
    if (raw && typeof raw === 'object' && raw !== null) {
      const token = (raw as Record<string, unknown>).token
      if (typeof token === 'string' && token.trim()) return token.trim()
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function normalizeRecognizeData (raw: unknown): FishRecognizeResult {
  if (!raw || typeof raw !== 'object') {
    return { candidates: [] }
  }
  const o = raw as Record<string, unknown>
  if (Array.isArray(o.candidates)) {
    const candidates: FishRecognizeCandidate[] = []
    for (const item of o.candidates) {
      if (!item || typeof item !== 'object') continue
      const c = item as Record<string, unknown>
      const name = c.name
      if (typeof name !== 'string' || !name.trim()) continue
      const confidence = c.confidence
      const row: FishRecognizeCandidate = { name: name.trim() }
      if (typeof confidence === 'number') row.confidence = confidence
      candidates.push(row)
    }
    return {
      candidates,
      note: typeof o.note === 'string' ? o.note : undefined,
    }
  }
  if (Array.isArray(o.labels)) {
    return {
      candidates: (o.labels as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        .map((name) => ({ name })),
    }
  }
  return { candidates: [] }
}

export class FishRecognizeError extends Error {
  constructor (message: string, public readonly statusCode?: number) {
    super(message)
    this.name = 'FishRecognizeError'
  }
}

/** 上传本地图片文件路径，返回解析后的候选物种列表 */
export async function recognizeFishByImage (
  localPath: string,
): Promise<FishRecognizeResult> {
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = `${base}/api/fish/recognize`

  const header: Record<string, string> = {}
  const token = readBearerToken()
  if (token) header.Authorization = `Bearer ${token}`

  let filePath = localPath
  try {
    const compressed = await Taro.compressImage({ src: localPath, quality: 78 })
    if (compressed.tempFilePath) filePath = compressed.tempFilePath
  } catch {
    /* 部分端不支持或非图片，沿用原路径 */
  }

  const res = await Taro.uploadFile({
    url,
    filePath,
    name: 'image',
    header,
  })

  const status = res.statusCode ?? 0
  let body: unknown
  try {
    body = JSON.parse(res.data as string) as unknown
  } catch {
    throw new FishRecognizeError('服务器返回格式异常', status)
  }

  if (!body || typeof body !== 'object') {
    throw new FishRecognizeError('服务器返回格式异常', status)
  }

  const payload = body as Record<string, unknown>
  if (payload.success !== true) {
    const msg =
      typeof payload.message === 'string' && payload.message
        ? payload.message
        : '识别失败'
    throw new FishRecognizeError(msg, status)
  }

  return normalizeRecognizeData(payload.data)
}
