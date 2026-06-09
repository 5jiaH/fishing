import { useMemo } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { WeatherIcon } from "@/components/WeatherIcon";
import { TIDE_DETAIL_SPOT_KEY } from "@/constants/tide";
import {
  resolveTidalRequestCode,
  type TidalFishingSpotDisplay,
} from "@/api";
import dayjs from "dayjs";

type TideFishingSpotCardProps = {
  spot: TidalFishingSpotDisplay;
  weather?: unknown;
  /** 列表原始行：跳转详情时写入与 `/tidal/data` 一致的 `code` */
  markerRow?: Record<string, unknown>;
};

type ResponseWeather = {
  indices?: {
    daily?: WeatherIndexDailyItem[];
  };
  sun?: {
    sunrise?: string;
    sunset?: string;
  };
  weather?: {
    hourly?: WeatherHourlyItem[];
  };
};

/** 与和风等 hourly 项常见字段兼容 */
export type WeatherHourlyItem = {
  fxTime?: string;
  icon?: string;
  text?: string;
  temp?: string | number;
  humidity?: string | number;
  windDir?: string;
  windScale?: string | number;
  [key: string]: unknown;
};

/** 与和风等「生活指数」daily 项常见字段兼容 */
export type WeatherIndexDailyItem = {
  date?: string;
  type?: string;
  name?: string;
  level?: string;
  category?: string;
  text?: string;
  [key: string]: unknown;
};


/**
 * 在 `hourly` 中选取与 `ref` 时刻时间差最小的一条（同一小时整点或最接近的预报时次）。
 */
export function findNearestHourlyItem(
  hourly: WeatherHourlyItem[] | undefined,
  ref: dayjs.Dayjs = dayjs(),
): WeatherHourlyItem | undefined {
  if (!hourly?.length) return undefined;
  const refMs = ref.valueOf();
  let best: WeatherHourlyItem | undefined;
  let bestDiff = Infinity;
  for (const item of hourly) {
    if (!item.fxTime) continue;
    const t = dayjs(item.fxTime);
    if (!t.isValid()) continue;
    const diff = Math.abs(t.valueOf() - refMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = item;
    }
  }
  return best;
}

/**
 * 将接口下发的 `weather` 转为卡片用数据：
 * - `weather.weather.hourly` → 最近一小时；
 * - `weather.weather.indices.daily` → 按日期取最接近今日的一日，取该日第一条指数铺成 `weatherIndexRow`。
 */
export function normalizeSpotWeatherPayload(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first != null && typeof first === "object")
      return normalizeSpotWeatherPayload(first);
    return {};
  }
  try {
    const { indices, sun, weather } = raw as ResponseWeather;
    const hourWeather = findNearestHourlyItem(weather?.hourly);
    return {
      sun: sun
        ? {
            sunrise: sun.sunrise,
            sunset: sun.sunset,
          }
        : undefined,
      indices: indices?.daily?.[0],
      weather: hourWeather,
    };
  } catch {
    return {};
  }
}

function formatTemp(v: unknown): string {
  if (v == null || v === "") return "—";
  return `${v}°`;
}

function formatHumidity(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = String(v).replace(/%/g, "");
  return `${n}%`;
}

function formatWind(h: WeatherHourlyItem | undefined): string {
  if (!h) return "—";
  const dir = h.windDir != null ? String(h.windDir) : "";
  const scale =
    h.windScale != null && String(h.windScale) !== ""
      ? `${h.windScale}级`
      : "";
  const s = `${dir}${dir && scale ? " " : ""}${scale}`.trim();
  return s || (h.text != null ? String(h.text) : "—");
}

function SunRow({ sunData }: { sunData: ResponseWeather['sun'] | undefined }) {
  if (!sunData || typeof sunData !== "object") return null;
  const s = sunData as { sunrise?: string; sunset?: string };
  const sunrise = s.sunrise ? dayjs(s.sunrise).format("HH:mm") : "";
  const sunset = s.sunset ? dayjs(s.sunset).format("HH:mm") : "";
  if (!sunrise && !sunset) return null;
  return (
    <View className='spot-card__sun-row'>
      {sunrise ? (
        <View className='spot-card__sun-pill'>
          <svg className='spot-card__inline-svg' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
              d='M12 2v2m-6.4 1.6L7 7m10 0l1.4-1.4M2 12h2m16 0h2m-5 5l1.4 1.4M7 17l-1.4 1.4M12 8a4 4 0 1 0 0 8m-8 0h16'
            />
          </svg>
          <Text className='spot-card__sun-text'>{sunrise}</Text>
        </View>
      ) : null}
      {sunset ? (
        <View className='spot-card__sun-pill'>
          <svg className='spot-card__inline-svg' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
              d='M12 10V2m-6.4 5.6L7 9m10-2l1.4-1.4M2 14h2m16 0h2m-5 5l1.4 1.4M7 19l-1.4 1.4M4 22h16M12 14a4 4 0 0 0 0-8'
            />
          </svg>
          <Text className='spot-card__sun-text'>{sunset}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Barometer({ hourly }: { hourly?: WeatherHourlyItem }) {
  if (!hourly?.icon) return null;
  return (
    <View
      className='spot-card__weather-icon'
      role='img'
      aria-label={hourly.text ?? "天气"}
    >
      <WeatherIcon code={hourly.icon} className='spot-card__weather-img' />
    </View>
  );
}

/** 钓点列表卡片 */
export default function TideFishingSpotCard({
  spot,
  weather,
  markerRow,
}: TideFishingSpotCardProps) {

  const cardWeather = useMemo(
    () => normalizeSpotWeatherPayload(weather),
    [weather],
  );

  const goDetail = () => {
    try {
      const tidalCode = markerRow
        ? resolveTidalRequestCode(markerRow)
        : (spot.code ?? "").trim();
      const payload: TidalFishingSpotDisplay = {
        ...spot,
        code: tidalCode,
      };
      Taro.setStorageSync(TIDE_DETAIL_SPOT_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
    void Taro.navigateTo({ url: "/pages/tideDetail/tideDetail" });
  };


  return (
    <View
      className='spot-card'
      onClick={goDetail}
      hoverClass='spot-card--tap'
    >
      <View className='spot-card__head'>
        <View className='spot-card__head-left'>
          <Text className='spot-card__chevron'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='14' height='14'>
              <path fill='currentColor' d='m6 9l6 6l6-6' />
            </svg>
          </Text>
          <Text className='spot-card__name'>{spot.name}</Text>
          <Barometer hourly={cardWeather.weather} />
        </View>
        <Text className='spot-card__date'>{spot.date}</Text>
      </View>
      <View className='spot-card__body'>
        <SunRow sunData={cardWeather.sun} />
        <View className='spot-card__metrics-row'>
          <View className='spot-card__metric'>
            <svg
              className='spot-card__inline-svg'
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
            >
              <path
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0'
              />
            </svg>
            <Text className='spot-card__strong'>{formatTemp(cardWeather.weather?.temp)}</Text>
          </View>
          <View className='spot-card__metric'>
            <svg
              className='spot-card__inline-svg'
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
            >
              <path
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7'
              />
            </svg>
            <Text className='spot-card__strong'>
              {formatHumidity(cardWeather.weather?.humidity)}
            </Text>
          </View>
          <View className='spot-card__metric'>
            <svg
              className='spot-card__inline-svg'
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
            >
              <path
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12.8 19.6A2 2 0 1 0 14 16H2m15.5-8a2.5 2.5 0 1 1 2 4H2m7.8-7.6A2 2 0 1 1 11 8H2'
              />
            </svg>
            <Text className='spot-card__strong'>{formatWind(cardWeather.weather)}</Text>
          </View>
        </View>
        <View className='spot-card__indices'>
          <Text className='spot-card__indices-title'>天气指数</Text>
          {cardWeather.indices ? (
            <View className='spot-card__indices-row'>
              <Text className='spot-card__indices-name'>
                {cardWeather.indices.category}
              </Text>
              <Text className='spot-card__indices-value'>
                {cardWeather.indices.text}
              </Text>
            </View>
          ) : (
            <Text className='spot-card__indices-empty'>暂无指数数据</Text>
          )}
        </View>
        <View className='spot-card__row spot-card__cols'>
          <View className='spot-card__col'>
            <Text>影响河流:</Text>
            <Text className='spot-card__strong'>xxx</Text>
          </View>
          <View className='spot-card__col'>
            <Text className='spot-card__strong'>xxx</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
