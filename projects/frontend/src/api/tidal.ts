import { HttpClient } from "./base";

const client = new HttpClient();

/** 潮汐区域分类：ID→id、AreaName→label、SortIndex→sortIndex，其余字段原样保留 */
export type TideAreaCategory = Record<string, unknown> & {
  id: string;
  label: string;
  sortIndex: number;
};

function tidalBaseUrl(): string {
  return (process.env.TARO_APP_TIDAL_API_BASE_URL ?? "").replace(/\/$/, "");
}

function tidalAuthHeader(): Record<string, string> {
  const token = (process.env.TARO_APP_TIDAL_API_TOKEN ?? "").trim();
  if (!token) return {};
  const v = token.replace(/^Bearer\s+/i, "").trim();
  return v ? { Authorization: `Bearer ${v}` } : {};
}

/** 与 areas 等接口一致的列表解析（data.Data / 常见包装 / 根数组） */
function extractTidalRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((x) => x && typeof x === "object") as Record<
      string,
      unknown
    >[];
  }
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  const nested = o.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    const arr = inner.Data ?? inner.data ?? inner.list;
    if (Array.isArray(arr)) {
      return arr.filter((x) => x && typeof x === "object") as Record<
        string,
        unknown
      >[];
    }
  }
  for (const key of ["Data", "data", "list", "rows", "result", "items"]) {
    const v = o[key];
    if (Array.isArray(v)) {
      return v.filter((x) => x && typeof x === "object") as Record<
        string,
        unknown
      >[];
    }
  }
  return [];
}

function mapAreaRow(raw: Record<string, unknown>): TideAreaCategory {
  const idVal = raw.ID ?? raw.Id ?? raw.id;
  const nameVal = raw.AreaName ?? raw.areaName;
  const sortRaw = raw.SortIndex ?? raw.sortIndex;
  const sortNum = typeof sortRaw === "number" ? sortRaw : Number(sortRaw);
  return {
    ...raw,
    id: idVal != null ? String(idVal) : "",
    label: nameVal != null ? String(nameVal) : "",
    sortIndex: Number.isFinite(sortNum) ? sortNum : 0,
  };
}

/**
 * 请求潮汐区域数据
 */
export async function fetchTidalAreas(): Promise<TideAreaCategory[]> {
  return client
    .request<TideAreaCategory[]>({ path: "/v1/tidal/areas", data : {country : 'CN'} })
    .then((res) => {
      const { data } = res;
      const mapped = data
        .map(mapAreaRow)
        .filter((r) => r.id !== "" || r.label !== "");

      mapped.sort((a, b) => b.sortIndex - a.sortIndex);
      return mapped;
    });
}

/** 卡片展示用字段（接口字段名不一致时用 pick 多候选） */
export type TidalFishingSpotDisplay = {
  id: string | number;
  name: string;
  distance: string;
  date: string;
  sunrise: string;
  sunset: string;
  weather: string;
  temp: string;
  airTemp: string;
  wind: string;
  wave: string;
  tideIn: string;
  tideOut: string;
  waterDepth: string;
  tideHeight: string;
  maxFlow: string;
  maxFlowHeight: string;
  tideInType: string;
  tideOutType: string;
  /** 天气接口 `POST /v1/weather/basic/one` 的 `location`（多为邮编 zip） */
  location: string;
  /** `/v1/tidal/data` 的 `code`（监测点编码） */
  code: string;
};

function pickStr(raw: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v !== "") return String(v);
  }
  return "—";
}

/** 天气 basic 接口的 location，无则空串（不用 「—」） */
function pickWeatherLocation(raw: Record<string, unknown>): string {
  const keys = ["Zip", "zip", "ZIP", "Location", "location"];
  for (const k of keys) {
    const v = raw[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** 潮汐 data 接口的 code，无则空串 */
function pickTideCode(raw: Record<string, unknown>): string {
  const keys = [
    "Code",
    "code",
    "MarkerCode",
    "markerCode",
    "TideCode",
    "tideCode",
    "PointCode",
    "pointCode",
  ];
  for (const k of keys) {
    const v = raw[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/**
 * 监测点行 → `/v1/tidal/data` 的 `code`：优先业务 Code 字段，否则常用监测点 ID。
 */
export function getTidalDataCodeFromMarkerRow(
  raw: Record<string, unknown>,
): string {
  const fromField = pickTideCode(raw);
  if (fromField) return fromField;
  const id = raw.ID ?? raw.Id ?? raw.id;
  if (id != null && String(id).trim() !== "") return String(id).trim();
  return "";
}

/**
 * 跳转详情与潮汐请求最终使用的 code：`Code` / `ID` → 再退回 zip（与天气 location 一致）。
 */
export function resolveTidalRequestCode(raw: Record<string, unknown>): string {
  return getTidalDataCodeFromMarkerRow(raw) || pickWeatherLocation(raw);
}

function pickNumField(
  raw: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = raw[k];
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickTimeLabel(raw: Record<string, unknown>, fallback: string): string {
  const keys = [
    "Time",
    "time",
    "Hour",
    "hour",
    "FxTime",
    "fxTime",
    "DateTime",
    "dateTime",
    "T",
    "t",
  ];
  for (const k of keys) {
    const v = raw[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return fallback;
}

/** AreaID / areaId 是否等于当前选中的区域 id */
export function markerRowMatchesAreaId(
  row: Record<string, unknown>,
  selectedAreaId: string,
): boolean {
  if (!selectedAreaId) return false;
  const aid = row.AreaID ?? row.areaId ?? row.AreaId;
  return String(aid ?? "") === String(selectedAreaId);
}

/** 监测点所属城市（用于列表分类），无则归为「其他」 */
export function getMarkerRowCity(row: Record<string, unknown>): string {
  const keys = [
    "City",
    "city",
    "CityName",
    "cityName",
    "AreaName",
    "areaName",
    "Region",
    "region",
    "District",
    "district",
  ];
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "其他";
}

export function mapMarkerRowToFishingSpot(
  raw: Record<string, unknown>,
  index: number,
): TidalFishingSpotDisplay {
  const id = raw.ID ?? raw.Id ?? raw.id ?? index;
  return {
    id: id as string | number,
    name: pickStr(raw, [
      "Name",
      "MarkerName",
      "PointName",
      "Title",
      "SpotName",
      "name",
    ]),
    distance: pickStr(raw, ["Distance", "distance", "Dist"]),
    date: pickStr(raw, ["Date", "TideDate", "ForecastDate", "date"]),
    sunrise: pickStr(raw, ["Sunrise", "sunrise", "SunRise"]),
    sunset: pickStr(raw, ["Sunset", "sunset", "SunSet"]),
    weather: pickStr(raw, ["Weather", "weather"]),
    temp: pickStr(raw, ["WaterTemp", "Temp", "temp", "水温"]),
    airTemp: pickStr(raw, ["AirTemp", "airTemp", "气温"]),
    wind: pickStr(raw, ["Wind", "wind"]),
    wave: pickStr(raw, ["Wave", "wave", "浪"]),
    tideIn: pickStr(raw, ["TideIn", "TurnInTime", "tideIn", "涨潮时间"]),
    tideOut: pickStr(raw, ["TideOut", "tideOut", "退潮时间"]),
    waterDepth: pickStr(raw, ["WaterDepth", "waterDepth", "潮水高度"]),
    tideHeight: pickStr(raw, ["TideHeight", "tideHeight"]),
    maxFlow: pickStr(raw, ["MaxFlow", "maxFlow", "最高流速"]),
    maxFlowHeight: pickStr(raw, ["MaxFlowHeight", "maxFlowHeight"]),
    tideInType: pickStr(raw, ["TideInType", "tideInType"]),
    tideOutType: pickStr(raw, ["TideOutType", "tideOutType"]),
    location: pickWeatherLocation(raw),
    /** 与 `resolveTidalRequestCode` 一致，供列表展示；跳转时会再按原始 row 写入 storage */
    code: resolveTidalRequestCode(raw),
  };
}

/**
 * 获取地区列表
 */
export async function fetchTidalPoints(
  parentId?: string | number,
): Promise<Record<string, unknown>[]> {
  return client
    .request<unknown>({
      path: "/v1/tidal/point",
      data: { parentId },
    })
    .then((wrapper) => extractTidalRows(wrapper.data));
}


/**
 * 天气接口：POST body 为 JSON（含 `location` 数组等）。
 * 若后端要表单，可去掉 `jsonBody` 并把字段改成字符串（如 `location: arr.join(",")`）。
 */
export function fetchWeather(location : string[]): Promise<Record<string, unknown>> {
  return client
    .request<Record<string, unknown>>({
      method: "POST",
      path: "/v1/weather/basic",
      data: {location},
      jsonBody: true,
    })
    .then((wrapper) => wrapper.data);
}

/**
 * 单点天气：`POST /v1/weather/basic/one`，body `{ location }`。
 * 返回结构与列表批量接口中单条一致（由后端约定）。
 */
export function fetchWeatherOne(location: string): Promise<unknown> {
  const loc = String(location ?? "").trim();
  if (!loc) {
    return Promise.reject(new Error("location is required"));
  }
  return client
    .request<unknown>({
      method: "POST",
      path: "/v1/weather/basic/one",
      data: { location: loc },
      jsonBody: true,
    })
    .then((wrapper) => wrapper.data);
}

/**
 * 潮汐曲线：`GET /v1/tidal/data`，query `code`、`date`（date 建议 `YYYY-MM-DD`）。
 */
export function fetchTidalData(
  code: string,
  date: string,
): Promise<unknown> {
  const c = String(code ?? "").trim();
  const d = String(date ?? "").trim();
  if (!c || !d) {
    return Promise.reject(new Error("code and date are required"));
  }
  return client
    .request<unknown>({
      path: "/v1/tidal/data",
      data: { code: c, date: d },
    })
    .then((wrapper) => wrapper.data);
}

/** 高低潮转折点 */
export type TideTurningPoint = {
  time: string;
  height: number;
  /** 偶数索引 (0,2,4) 为高潮，奇数索引 (1,3,5) 为低潮 */
  type: "high" | "low";
};

/** `/tidal/data` → `Data.Data` 报告元信息 */
export type TideReportMeta = {
  title: string;
  coordinate: string;
  benchmark: string;
  timeArea: string;
  year: number;
  month: number;
};

/** 完整的潮汐解析结果（values 与 SubData a0~a23 一一对应，缺测为 null） */
export type TideParsedPayload = {
  labels: string[];
  values: (number | null)[];
  turningPoints: TideTurningPoint[];
  meta: TideReportMeta | null;
};

/** 读取 SubData 的 a{i}（兼 A{i} 大小写） */
function pickSubDataA(sub: Record<string, unknown>, i: number): number | null {
  const v = sub[`a${i}`] ?? sub[`A${i}`];
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * SubData 扁平字段 `a0`~`a23` 严格对应当日 00:00~23:00 各整点潮高（不少算、不串位）；
 * `cs0`~`cs5` / `cg0`~`cg5` → 高低潮转折点。
 */
function parseSubData(sub: Record<string, unknown>): {
  labels: string[];
  values: (number | null)[];
  turningPoints: TideTurningPoint[];
} | null {
  const labels: string[] = [];
  const values: (number | null)[] = [];
  for (let i = 0; i < 24; i += 1) {
    labels.push(`${String(i).padStart(2, "0")}:00`);
    values.push(pickSubDataA(sub, i));
  }
  if (!values.some((v) => v != null)) return null;

  const turningPoints: TideTurningPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const cs = sub[`cs${i}`];
    const cg = sub[`cg${i}`];
    if (cs == null || cg == null) continue;
    const h = typeof cg === "number" ? cg : Number(cg);
    if (!Number.isFinite(h)) continue;
    turningPoints.push({
      time: String(cs),
      height: h,
      type: i % 2 === 0 ? "high" : "low",
    });
  }

  return { labels, values, turningPoints };
}

function parseReportMeta(
  data: Record<string, unknown> | undefined,
): TideReportMeta | null {
  if (!data) return null;
  return {
    title: pickStr(data, ["Title", "title", "Name", "name"]),
    coordinate: pickStr(data, ["Coordinate", "coordinate"]),
    benchmark: pickStr(data, ["Benchmark", "benchmark"]),
    timeArea: pickStr(data, ["TimeArea", "timeArea"]),
    year: Number(data.Year ?? data.year ?? 0),
    month: Number(data.Month ?? data.month ?? 0),
  };
}

/**
 * 从 `/tidal/data` 响应中定位 SubData 对象（兼容多层嵌套）。
 */
function findSubData(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  if (o.SubData && typeof o.SubData === "object" && !Array.isArray(o.SubData))
    return o.SubData as Record<string, unknown>;

  for (const key of ["Data", "data"]) {
    const nested = o[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const found = findSubData(nested);
      if (found) return found;
    }
  }
  return null;
}

function findReportData(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const inner = (o.Data ?? o.data) as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== "object") return undefined;
  const dd = (inner.Data ?? inner.data) as Record<string, unknown> | undefined;
  if (dd && typeof dd === "object" && ("Title" in dd || "title" in dd))
    return dd;
  return undefined;
}

/** 将 `/tidal/data` 返回体解析为完整潮汐数据（图表 + 高低潮 + 元信息） */
export function parseTidalDataFull(body: unknown): TideParsedPayload | null {
  if (body == null) return null;

  const sub = findSubData(body);
  if (sub) {
    const parsed = parseSubData(sub);
    if (parsed) {
      return {
        ...parsed,
        meta: parseReportMeta(findReportData(body)),
      };
    }
  }

  const chart = parseTidalDataChartLegacy(body);
  if (chart) return { ...chart, turningPoints: [], meta: null };
  return null;
}

/** 将 `/tidal/data` 返回体解析为图表横纵轴（兼容多种列表/数组结构） */
export function parseTidalDataChartPayload(body: unknown): {
  labels: string[];
  values: (number | null)[];
} | null {
  const full = parseTidalDataFull(body);
  return full ? { labels: full.labels, values: full.values } : null;
}

function parseTidalDataChartLegacy(body: unknown): {
  labels: string[];
  values: number[];
} | null {
  if (body == null) return null;

  const rows = extractTidalRows(body);
  if (rows.length > 0) {
    const labels: string[] = [];
    const values: number[] = [];
    let i = 0;
    for (const r of rows) {
      const v = pickNumField(r, [
        "Height",
        "height",
        "TideHeight",
        "tideHeight",
        "Value",
        "value",
        "Level",
        "level",
        "H",
        "h",
      ]);
      if (v == null) continue;
      const label = pickTimeLabel(r, `${i}:00`);
      labels.push(label);
      values.push(v);
      i += 1;
    }
    if (values.length > 0) return { labels, values };
  }

  if (typeof body === "object" && body !== null) {
    const o = body as Record<string, unknown>;
    const nested = o.data ?? o.Data;
    if (nested != null && nested !== o) {
      const inner = parseTidalDataChartLegacy(nested);
      if (inner) return inner;
    }
    const heights = o.heights ?? o.values ?? o.dataList;
    const times = o.times ?? o.labels ?? o.hours ?? o.categories;
    if (Array.isArray(heights) && Array.isArray(times)) {
      const n = Math.min(heights.length, times.length);
      const values: number[] = [];
      const labels: string[] = [];
      for (let i = 0; i < n; i += 1) {
        const v = Number(heights[i]);
        if (!Number.isFinite(v)) continue;
        values.push(v);
        labels.push(String(times[i] ?? i));
      }
      if (values.length > 0) return { labels, values };
    }
  }

  return null;
}