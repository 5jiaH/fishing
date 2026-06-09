export { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, HttpClient, HttpError } from './base'
export {
  getVerificationCode,
  login,
  register,
  pickToken,
} from './auth'
export {
  fetchHydrologyRadar,
  parseHydrologyRadarList,
  radarItemCoords
} from './hydrology'
export {
  FishRecognizeError,
  recognizeFishByImage,
} from './fish'
export type { FishRecognizeCandidate, FishRecognizeResult } from './fish'
export {
  fetchTidalAreas,
  fetchTidalData,
  fetchTidalPoints,
  fetchWeatherOne,
  getMarkerRowCity,
  getTidalDataCodeFromMarkerRow,
  mapMarkerRowToFishingSpot,
  markerRowMatchesAreaId,
  parseTidalDataChartPayload,
  parseTidalDataFull,
  resolveTidalRequestCode,
} from './tidal'
export type {
  TideAreaCategory,
  TidalFishingSpotDisplay,
  TideParsedPayload,
  TideReportMeta,
  TideTurningPoint,
} from './tidal'
