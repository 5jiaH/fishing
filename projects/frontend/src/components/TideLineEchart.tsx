import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useReady } from "@tarojs/taro";
import Echarts from "taro-react-echarts";
import type { EChartsOption } from "echarts";
import type { TideTurningPoint } from "@/api";

import { echarts } from "@/lib/echarts-line";

const MEASURE_BOX_ID = "tide-line-echart-measure-box";

/** 天蓝：曲线、整点圆点、极值标数值；深蓝：转潮高点等辅助强调（可选） */
const SKY_BLUE = "#3DB3E8";
const DEEP_BLUE = "#0D47A1";

/** 明日 / 后日 示例曲线（后续可对接接口） */
const DATASETS = [
  { phase: 1.25, amp: 68, base: 125 },
  { phase: 0.15, amp: 92, base: 118 },
] as const;

const TAB_LABELS: readonly string[] = ["潮汐", "明日", "后日"];

export type TideChartSeries = {
  labels: string[];
  /** 与 `a0`~`a23` 一一对应，缺测为 null */
  values: (number | null)[];
};

type Props = {
  className?: string;
  /**
   * 详情页传：`loading` 时只显示坐标占位，不用 demo 曲线（避免进页先错数据）；
   * `ready` 后展示接口数据或空图。
   */
  tideDataStatus?: "loading" | "ready";
  /** 详情页 `useLoad` 中请求的潮汐曲线；有数据时「潮汐」Tab 展示接口结果 */
  tideSeries?: TideChartSeries | null;
  turningPoints?: TideTurningPoint[];
};

const TAB_ROW_RPX = 100;

function initialChartSize(): { w: number; h: number } {
  try {
    const { windowWidth = 375 } = Taro.getSystemInfoSync();
    const W = Math.max(1, windowWidth);
    const padX = W * 0.02 * 2;
    const padY = W * 0.02 * 2;
    const innerW = Math.max(1, Math.floor(W - padX));
    const cardH = W * 0.5;
    const innerH = Math.max(1, Math.floor(cardH - padY));
    const tabPx = Math.ceil(TAB_ROW_RPX * (W / 750));
    const plotH = Math.max(1, innerH - tabPx);
    return { w: innerW, h: plotH };
  } catch {
    return { w: 351, h: 154 };
  }
}

function isFiniteTideY(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v);
}

/** 序列在有效点上的 max/min 下标，供「数据点 label」在 canvas 上同层绘制 */
function getSeriesExtremaIndices(data: (number | null)[]) {
  const n = data.length;
  let maxI = -1;
  let minI = -1;
  let maxV = -Infinity;
  let minV = Infinity;
  for (let i = 0; i < n; i += 1) {
    const v = data[i];
    if (!isFiniteTideY(v)) continue;
    if (v > maxV) {
      maxV = v;
      maxI = i;
    }
    if (v < minV) {
      minV = v;
      minI = i;
    }
  }
  if (maxI < 0 || minI < 0) return null;
  return { maxI, minI, maxV, minV, same: maxI === minI };
}

const fmtCm = (v: number) => String(Math.round(v * 10) / 10);

/**
 * 最高/最低用折线 `data` 里单点的 `label` 绘制，与线、点走同一套 canvas 渲染
 *（小程序里 markPoint 的 label 常不画）
 */
function buildLineDataWithExtremaOnCanvas(
  data: (number | null)[],
): (number | null | { value: number; label: unknown; itemStyle: unknown; symbolSize: number })[] {
  const ex = getSeriesExtremaIndices(data);
  if (ex == null) return data;

  const { maxI, minI, same } = ex;
  const extremaValueLabel = (v: number) => ({
    show: true,
    position: "top" as const,
    distance: 6,
    formatter: fmtCm(v),
    fontSize: 11,
    color: SKY_BLUE,
    fontWeight: 700,
    textBorderColor: "#ffffff",
    textBorderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: SKY_BLUE,
    borderWidth: 1,
    borderRadius: 3,
    padding: [2, 5, 2, 5] as [number, number, number, number],
  });

  return data.map((v, i) => {
    if (!isFiniteTideY(v)) return v;
    if (same && i === maxI) {
      return {
        value: v,
        symbolSize: 7,
        itemStyle: {
          color: SKY_BLUE,
          borderColor: "#ffffff",
          borderWidth: 1.5,
        },
        label: extremaValueLabel(v),
      };
    }
    if (i === maxI) {
      return {
        value: v,
        symbolSize: 7,
        itemStyle: {
          color: SKY_BLUE,
          borderColor: "#ffffff",
          borderWidth: 1.5,
        },
        label: extremaValueLabel(v),
      };
    }
    if (i === minI) {
      return {
        value: v,
        symbolSize: 7,
        itemStyle: {
          color: SKY_BLUE,
          borderColor: "#ffffff",
          borderWidth: 1.5,
        },
        label: extremaValueLabel(v),
      };
    }
    return v;
  });
}

function buildChartOption(
  labels: string[],
  data: (number | null)[],
  tps?: TideTurningPoint[],
): EChartsOption {
  const fin = data.filter(isFiniteTideY);
  const dataMax = fin.length > 0 ? Math.max(...fin) : undefined;
  /** 为最高点上方数值标签留出 y 量程，避免贴顶被裁切 */
  const yAxisMax =
    dataMax != null
      ? Math.max(dataMax * 1.12, dataMax + 20)
      : undefined;

  const turnMarkData =
    tps && tps.length > 0
      ? tps.map((tp) => ({
          coord: [tp.time, tp.height] as [string, number],
          symbol: "circle" as const,
          symbolSize: 7,
          itemStyle: {
            color: tp.type === "high" ? DEEP_BLUE : SKY_BLUE,
            borderColor: "#ffffff",
            borderWidth: 1.5,
          },
          label: {
            show: true,
            formatter: `${tp.time}\n${tp.height}cm`,
            fontSize: 9,
            color: "#4b4b4b",
            position: tp.type === "high" ? ("top" as const) : ("bottom" as const),
            lineHeight: 12,
          },
        }))
      : [];

  const markData = turnMarkData;
  const hasTurnMarks = markData.length > 0;
  const hasExtrema = getSeriesExtremaIndices(data) != null;
  const needChartPadding = Boolean(
    hasTurnMarks || hasExtrema || data.length > 0,
  );
  const lineData = buildLineDataWithExtremaOnCanvas(data);

  return {
    backgroundColor: "transparent",
    grid: {
      left: "2%",
      right: "2%",
      top: needChartPadding ? "20%" : "2%",
      bottom: needChartPadding ? "16%" : "2%",
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: "rgba(0,0,0,0.15)" } },
      axisLabel: { color: "#afafaf", fontSize: 10, margin: 2 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yAxisMax,
      scale: dataMax == null,
      splitLine: { lineStyle: { color: "rgba(0,0,0,0.06)" } },
      axisLabel: { color: "#afafaf", fontSize: 10, margin: 4 },
      axisLine: { show: false },
    },
    series: [
      {
        type: "line",
        smooth: true,
        connectNulls: true,
        showSymbol: true,
        showAllSymbol: true,
        symbol: "circle",
        symbolSize: 5,
        itemStyle: {
          color: SKY_BLUE,
          borderColor: "rgba(255,255,255,0.95)",
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            color: SKY_BLUE,
            borderColor: "#ffffff",
            borderWidth: 1,
            shadowBlur: 4,
            shadowColor: "rgba(61, 179, 232, 0.45)",
          },
          scale: 1.3,
        },
        lineStyle: { color: SKY_BLUE, width: 2 },
        label: { show: false },
        endLabel: { show: false },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(61, 179, 232, 0.2)" },
              { offset: 1, color: "rgba(61, 179, 232, 0)" },
            ],
          },
        },
        data: lineData,
        sampling: false,
        markPoint: hasTurnMarks
          ? { data: markData, z: 10, zlevel: 1 }
          : undefined,
      },
    ],
  };
}

/** 等接口：仅轴网，不画假曲線 */
function buildEmptyTideOption(): EChartsOption {
  const labels = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`,
  );
  return {
    backgroundColor: "transparent",
    grid: {
      left: "2%",
      right: "2%",
      top: "8%",
      bottom: "8%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: "rgba(0,0,0,0.1)" } },
      axisLabel: { color: "#afafaf", fontSize: 10, margin: 2 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      scale: true,
      splitLine: { lineStyle: { color: "rgba(0,0,0,0.06)" } },
      axisLabel: { color: "#afafaf", fontSize: 10, margin: 4 },
      axisLine: { show: false },
    },
    series: [
      {
        type: "line",
        data: labels.map(() => null),
        showSymbol: false,
        lineStyle: { width: 0, opacity: 0 },
        areaStyle: undefined,
        silent: true,
        animation: false,
      },
    ],
  };
}

type DemoCurveCfg = { phase: number; amp: number; base: number };

function demoSeries24(
  cfg: DemoCurveCfg,
): { labels: string[]; values: number[] } {
  const labels = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, "0")}:00`,
  );
  const values = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2;
    return Math.round(cfg.base + cfg.amp * Math.sin(t + cfg.phase));
  });
  return { labels, values };
}

export default function TideLineEchart({
  className,
  tideDataStatus,
  tideSeries = null,
  turningPoints,
}: Props) {
  const [datasetIndex, setDatasetIndex] = useState(0);

  const option = useMemo((): EChartsOption => {
    if (datasetIndex === 0) {
      if (tideDataStatus === "loading") {
        return buildEmptyTideOption();
      }
      if (tideSeries && tideSeries.values.some(isFiniteTideY)) {
        return buildChartOption(
          tideSeries.labels,
          tideSeries.values,
          turningPoints,
        );
      }
      if (tideDataStatus === "ready") {
        return buildEmptyTideOption();
      }
      const { labels, values } = demoSeries24({
        phase: 0.5,
        amp: 80,
        base: 120,
      });
      return buildChartOption(labels, values);
    }
    const cfg = DATASETS[datasetIndex - 1] ?? DATASETS[0];
    const { labels, values } = demoSeries24(cfg);
    return buildChartOption(labels, values);
  }, [datasetIndex, tideDataStatus, tideSeries, turningPoints]);

  const [px, setPx] = useState(initialChartSize);

  const measure = useCallback(() => {
    Taro.nextTick(() => {
      Taro.createSelectorQuery()
        .select(`#${MEASURE_BOX_ID}`)
        .boundingClientRect((rect) => {
          const r = Array.isArray(rect) ? rect[0] : rect;
          if (!r || typeof r.width !== "number") return;
          const w = Math.floor(r.width);
          const h = Math.floor(r.height);
          if (w > 0 && h > 0) {
            setPx((prev) =>
              prev.w === w && prev.h === h ? prev : { w, h },
            );
          }
        })
        .exec();
    });
  }, []);

  useReady(() => {
    measure();
  });

  useEffect(() => {
    measure();
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEB) return;
    let ro: ResizeObserver | undefined;
    const timer = setTimeout(() => {
      const el = document.getElementById(MEASURE_BOX_ID);
      if (el && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => measure());
        ro.observe(el);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      ro?.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    measure();
  }, [datasetIndex, measure, option, tideSeries, tideDataStatus]);

  return (
    <View className={`tide-line-echart ${className ?? ""}`}>
      <View
        id={MEASURE_BOX_ID}
        className='tide-line-echart__plot'
      >
        <Echarts
          echarts={echarts}
          option={option}
          style={{ width: px.w, height: px.h }}
          isPage
        />
      </View>
      <View className='tide-line-echart__tabs'>
        <View className='tide-line-echart__tabs-track'>
          {TAB_LABELS.map((label, i) => (
            <View
              key={label}
              className={`tide-line-echart__tab${datasetIndex === i ? " tide-line-echart__tab--active" : ""}`}
              onClick={() => setDatasetIndex(i)}
              hoverClass='tide-line-echart__tab--pressed'
            >
              <Text className='tide-line-echart__tab-text'>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
