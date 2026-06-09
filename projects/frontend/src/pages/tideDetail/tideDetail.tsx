import { useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import TideLineEchart from "@/components/TideLineEchart";
import { WeatherIcon } from "@/components/WeatherIcon";
import { TIDE_DETAIL_SPOT_KEY } from "@/constants/tide";
import {
  fetchTidalData,
  fetchWeatherOne,
  parseTidalDataFull,
  type TidalFishingSpotDisplay,
  type TideParsedPayload,
} from "@/api";
import {
  normalizeSpotWeatherPayload,
  type WeatherHourlyItem,
} from "@/pages/tide/components/TideFishingSpotCard";
import dayjs from "dayjs";

import "./tideDetail.scss";

function parseSpotFromStorage(): TidalFishingSpotDisplay | null {
  try {
    const raw = Taro.getStorageSync(TIDE_DETAIL_SPOT_KEY) as unknown;
    if (raw == null || raw === "") return null;
    let o: unknown;
    if (typeof raw === "string") {
      o = JSON.parse(raw) as unknown;
    } else if (typeof raw === "object" && raw !== null) {
      o = raw;
    } else {
      return null;
    }
    if (!o || typeof o !== "object" || !("name" in o)) return null;
    const s = o as TidalFishingSpotDisplay & { location?: string; code?: string };
    const loc = typeof s.location === "string" ? s.location.trim() : "";
    const co = typeof s.code === "string" ? s.code.trim() : "";
    return {
      ...s,
      location: loc,
      /* 旧缓存无 code 时用 location(zip) 顶 `/tidal/data` 的 code */
      code: co || loc,
    };
  } catch {
    return null;
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

function formatTideDateForApi(dateStr: string): string {
  const d = dayjs(dateStr);
  if (d.isValid()) return d.format("YYYY-MM-DD");
  return dayjs().format("YYYY-MM-DD");
}

/** 潮汐接口 `code`：以列表跳转写入的 `spot.code` 为准（与 `resolveTidalRequestCode(markerRow)` 一致） */
function tideDataRequestCode(s: TidalFishingSpotDisplay): string {
  const c = (s.code ?? "").trim();
  if (c) return c;
  return (s.location ?? "").trim();
}

function formatSunTime(isoOrDisplay: string | undefined, fallback: string): string {
  if (isoOrDisplay != null && String(isoOrDisplay).trim() !== "") {
    const d = dayjs(isoOrDisplay);
    if (d.isValid()) return d.format("HH:mm");
    return String(isoOrDisplay);
  }
  if (fallback && fallback !== "—") return fallback;
  return "—";
}

export default function TideDetailPage() {
  const [spot, setSpot] = useState<TidalFishingSpotDisplay | null>(null);
  const [weatherRaw, setWeatherRaw] = useState<unknown>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [tideParsed, setTideParsed] = useState<TideParsedPayload | null>(null);
  /** 潮汐请求完成前不展示假数据，完成后再用真实 SubData 驱动图表，避免 ECharts 未刷新仍停在 demo */
  const [tideDataStatus, setTideDataStatus] = useState<"loading" | "ready">("loading");

  const tideChartSeries = useMemo(
    () =>
      tideParsed ? { labels: tideParsed.labels, values: tideParsed.values } : null,
    [tideParsed],
  );

  const cardWeather = useMemo(
    () => normalizeSpotWeatherPayload(weatherRaw),
    [weatherRaw],
  );

  /** 标题下副行：预报日期、距离（无 spot 时为空，避免 Hook 放在 early return 后） */
  const metaDateDisplay = useMemo(() => {
    if (!spot) return "";
    const raw = spot.date?.trim();
    if (raw && raw !== "—") return raw;
    return formatTideDateForApi(spot.date);
  }, [spot]);

  const metaDistanceDisplay = useMemo(() => {
    if (!spot) return "";
    const d = spot.distance?.trim();
    if (d && d !== "—") return d;
    return "";
  }, [spot]);

  useLoad(() => {
    const s = parseSpotFromStorage();
    setSpot(s);
    if (!s) {
      setTideDataStatus("ready");
      return;
    }

    const tideCode = tideDataRequestCode(s);
    const tideDate = formatTideDateForApi(s.date);
    if (tideCode && tideDate) {
      setTideDataStatus("loading");
      void (async () => {
        try {
          const raw = await fetchTidalData(tideCode, tideDate);
          const parsed = parseTidalDataFull(raw);
          setTideParsed(parsed);
          if (!parsed?.values.some((v) => v != null && Number.isFinite(Number(v)))) {
            Taro.showToast({ title: "潮汐数据为空", icon: "none" });
          }
        } catch (e) {
          console.error(e);
          setTideParsed(null);
          Taro.showToast({ title: "潮汐数据加载失败", icon: "none" });
        } finally {
          setTideDataStatus("ready");
        }
      })();
    } else {
      setTideDataStatus("ready");
    }

    if (!s.location) {
      return;
    }
    setWeatherLoading(true);
    void (async () => {
      try {
        const data = await fetchWeatherOne(s.location);
        setWeatherRaw(data);
      } catch (e) {
        console.error(e);
        Taro.showToast({ title: "天气加载失败", icon: "none" });
      } finally {
        setWeatherLoading(false);
      }
    })();
  });

  if (!spot) {
    return (
      <View className='tide-detail app-page-sunshine-bg'>
        <View className='tide-detail__empty'>
          <Text>暂无钓点数据</Text>
        </View>
      </View>
    );
  }

  const h = cardWeather.weather;
  const sunrise = formatSunTime(cardWeather.sun?.sunrise, spot.sunrise);
  const sunset = formatSunTime(cardWeather.sun?.sunset, spot.sunset);
  const displayWeatherText =
    h?.text != null && String(h.text) !== "" ? String(h.text) : spot.weather;
  const displayAirTemp =
    h?.temp != null && String(h.temp) !== "" ? formatTemp(h.temp) : spot.airTemp;
  const displayHumidity =
    h != null ? formatHumidity(h.humidity) : "—";
  const displayWind = h != null ? formatWind(h) : spot.wind;
  const indexLine =
    cardWeather.indices != null
      ? [cardWeather.indices.category, cardWeather.indices.level, cardWeather.indices.text]
        .filter((x) => x != null && String(x).trim() !== "")
        .join(" · ") || "—"
      : null;

  return (
    <View className='tide-detail-page app-page-sunshine-bg'>
      <View className='tide-detail-page__chart'>
        <View className='tide-detail-page__chart-inner'>
          <TideLineEchart
            key={`tide-echart-${tideDataStatus}-${tideChartSeries && tideChartSeries.values.some((v) => v != null && Number.isFinite(Number(v))) ? "1" : "0"}`}
            className='tide-detail-page__echart'
            tideDataStatus={tideDataStatus}
            tideSeries={tideChartSeries}
            turningPoints={tideParsed?.turningPoints}
          />
        </View>
      </View>


      <View className='tide-detail tide-detail--in-scroll'>
        <Text className='tide-detail__title'>{spot.name}</Text>
        <View className='tide-detail__meta'>
          <Text>
            {metaDateDisplay}
            {metaDistanceDisplay ? ` · ${metaDistanceDisplay}` : ""}
            {tideDataStatus === "loading" ? " · 潮汐加载中…" : ""}
            {weatherLoading ? " · 天气加载中…" : ""}
          </Text>
        </View>

        <View className='tide-detail__section'>
          <View className='tide-detail__weather-head'>
            {h?.icon ? (
              <View className='tide-detail__weather-icon-wrap'>
                <WeatherIcon code={h.icon} className='tide-detail__weather-icon' />
              </View>
            ) : null}
            <Text className='tide-detail__weather-text'>{displayWeatherText}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>日出</Text>
            <Text className='tide-detail__value'>{sunrise}</Text>
            <Text className='tide-detail__label'>日落</Text>
            <Text className='tide-detail__value'>{sunset}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>水温</Text>
            <Text className='tide-detail__value'>{spot.temp}</Text>
            <Text className='tide-detail__label'>气温</Text>
            <Text className='tide-detail__value'>{displayAirTemp}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>相对湿度</Text>
            <Text className='tide-detail__value'>{displayHumidity}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>风力</Text>
            <Text className='tide-detail__value'>{displayWind}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>浪况</Text>
            <Text className='tide-detail__value'>{spot.wave}</Text>
          </View>
          {indexLine ? (
            <View className='tide-detail__row tide-detail__row--indices'>
              <Text className='tide-detail__label'>天气指数</Text>
              <Text className='tide-detail__value tide-detail__value--wrap'>
                {indexLine}
              </Text>
            </View>
          ) : null}
        </View>

        {tideParsed?.turningPoints && tideParsed.turningPoints.length > 0 ? (
          <View className='tide-detail__section'>
            <Text className='tide-detail__section-title'>高低潮预报</Text>
            <View className='tide-detail__tide-table'>
              <View className='tide-detail__tide-table-head'>
                <Text className='tide-detail__tide-th'>类型</Text>
                <Text className='tide-detail__tide-th'>时间</Text>
                <Text className='tide-detail__tide-th tide-detail__tide-th--right'>
                  潮高 (cm)
                </Text>
              </View>
              {tideParsed.turningPoints.map((tp, i) => (
                <View
                  key={`${tp.time}-${i}`}
                  className={`tide-detail__tide-table-row${tp.type === "high"
                    ? " tide-detail__tide-table-row--high"
                    : " tide-detail__tide-table-row--low"
                    }`}
                >
                  <View className='tide-detail__tide-td tide-detail__tide-td--type'>
                    <View
                      className={`tide-detail__tide-dot tide-detail__tide-dot--${tp.type}`}
                    />
                    <Text>{tp.type === "high" ? "高潮" : "低潮"}</Text>
                  </View>
                  <Text className='tide-detail__tide-td'>{tp.time}</Text>
                  <Text className='tide-detail__tide-td tide-detail__tide-td--right tide-detail__tide-td--height'>
                    {tp.height}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {tideParsed?.meta ? (
          <View className='tide-detail__section'>
            <Text className='tide-detail__section-title'>潮汐站信息</Text>
            {tideParsed.meta.coordinate && tideParsed.meta.coordinate !== "—" ? (
              <View className='tide-detail__row'>
                <Text className='tide-detail__label'>坐标</Text>
                <Text className='tide-detail__value'>
                  {tideParsed.meta.coordinate.trim()}
                </Text>
              </View>
            ) : null}
            {tideParsed.meta.benchmark && tideParsed.meta.benchmark !== "—" ? (
              <View className='tide-detail__row'>
                <Text className='tide-detail__label'>基准面</Text>
                <Text className='tide-detail__value tide-detail__value--wrap'>
                  {tideParsed.meta.benchmark}
                </Text>
              </View>
            ) : null}
            {tideParsed.meta.timeArea && tideParsed.meta.timeArea !== "—" ? (
              <View className='tide-detail__row'>
                <Text className='tide-detail__label'>时区</Text>
                <Text className='tide-detail__value'>
                  {tideParsed.meta.timeArea}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className='tide-detail__section'>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>涨潮 / 转流</Text>
            <Text className='tide-detail__value'>
              {spot.tideIn} {spot.tideInType}
            </Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>退潮</Text>
            <Text className='tide-detail__value'>
              {spot.tideOut} {spot.tideOutType}
            </Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>潮水高度</Text>
            <Text className='tide-detail__value'>{spot.waterDepth}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>潮高</Text>
            <Text className='tide-detail__value'>{spot.tideHeight}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>最高流速</Text>
            <Text className='tide-detail__value'>{spot.maxFlow}</Text>
          </View>
          <View className='tide-detail__row'>
            <Text className='tide-detail__label'>最高流速潮高</Text>
            <Text className='tide-detail__value'>{spot.maxFlowHeight}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
