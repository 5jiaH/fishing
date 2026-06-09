/** BD-09（百度）→ GCJ-02（国测局 / 高德、腾讯等） */
const X_PI = (Math.PI * 3000) / 180

export function bd09ToGcj02 (bdLng: number, bdLat: number): { lng: number; lat: number } {
  const x = bdLng - 0.0065
  const y = bdLat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta)
  }
}
