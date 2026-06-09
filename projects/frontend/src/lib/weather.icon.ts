/**
 * 气象图标代码（与和风等 API 常见字段一致）→ Iconify ID、展示色、**内联 SVG 字符串**。
 * SVG 源自 Lucide（Iconify `lucide:*`），经 better-icons 导出为 `currentColor`，便于用外层 `color` 控制颜色。
 */

/** 图标代码 → Iconify ID（统一使用 lucide） */
export const WEATHER_ICONIFY_BY_CODE: Record<number, string> = {
  100: "lucide:sun",
  101: "lucide:cloud-sun",
  102: "lucide:cloud",
  103: "lucide:cloud-sun",
  104: "lucide:cloud",
  150: "lucide:moon",
  151: "lucide:cloud-moon",
  152: "lucide:cloud",
  153: "lucide:cloud-moon",
  300: "lucide:cloud-rain",
  301: "lucide:cloud-rain",
  302: "lucide:cloud-lightning",
  303: "lucide:cloud-lightning",
  304: "lucide:cloud-hail",
  305: "lucide:cloud-drizzle",
  306: "lucide:cloud-rain",
  307: "lucide:cloud-rain-wind",
  308: "lucide:cloud-rain-wind",
  309: "lucide:cloud-drizzle",
  310: "lucide:cloud-rain",
  311: "lucide:cloud-rain",
  312: "lucide:cloud-rain",
  313: "lucide:cloud-drizzle",
  314: "lucide:cloud-rain",
  315: "lucide:cloud-rain",
  316: "lucide:cloud-rain-wind",
  317: "lucide:cloud-rain-wind",
  318: "lucide:cloud-rain-wind",
  350: "lucide:cloud-rain",
  351: "lucide:cloud-rain",
  399: "lucide:cloud-rain",
  400: "lucide:snowflake",
  401: "lucide:cloud-snow",
  402: "lucide:cloud-snow",
  403: "lucide:cloud-snow",
  404: "lucide:cloud-snow",
  405: "lucide:cloud-snow",
  406: "lucide:cloud-snow",
  407: "lucide:cloud-snow",
  408: "lucide:cloud-snow",
  409: "lucide:cloud-snow",
  410: "lucide:cloud-snow",
  456: "lucide:cloud-snow",
  457: "lucide:cloud-snow",
  499: "lucide:snowflake",
  500: "lucide:cloud-fog",
  501: "lucide:cloud-fog",
  502: "lucide:haze",
  503: "lucide:wind",
  504: "lucide:wind",
  507: "lucide:wind",
  508: "lucide:wind",
  509: "lucide:cloud-fog",
  510: "lucide:cloud-fog",
  511: "lucide:haze",
  512: "lucide:haze",
  513: "lucide:haze",
  514: "lucide:cloud-fog",
  515: "lucide:cloud-fog",
  900: "lucide:thermometer-sun",
  901: "lucide:thermometer-snowflake",
  999: "lucide:circle-help",
};

/**
 * Iconify ID → 内联 SVG（`currentColor`，无外链）。
 * 键与 `WEATHER_ICONIFY_BY_CODE` 中出现的 `lucide:*` 一致。
 */
export const WEATHER_ICON_SVG_BY_ICONIFY_ID: Record<string, string> = {
  "lucide:sun":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle fill="currentColor" cx="12" cy="12" r="4"/><path fill="currentColor" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></g></svg>',
  "lucide:cloud-sun":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m-7.07.93l1.41 1.41M20 12h2m-2.93-7.07l-1.41 1.41m-1.713 6.31a4 4 0 0 0-5.925-4.128M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6"/></svg>',
  "lucide:cloud":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9"/></svg>',
  "lucide:moon":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',
  "lucide:cloud-moon":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16a3 3 0 0 1 0 6H7a5 5 0 1 1 4.9-6zm5.376-1.488a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36"/></svg>',
  "lucide:cloud-rain":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v6m-8-6v6m4-4v6"/></svg>',
  "lucide:cloud-lightning":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path fill="currentColor" d="m13 12l-3 5h4l-3 5"/></g></svg>',
  "lucide:cloud-hail":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v2m-8-2v2m8 4h.01M8 20h.01M12 16v2m0 4h.01"/></svg>',
  "lucide:cloud-drizzle":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 19v1m0-6v1m8 4v1m0-6v1m-4 6v1m0-6v1"/></svg>',
  "lucide:cloud-rain-wind":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M9.2 22l3-7M9 13l-3 7m11-7l-3 7"/></svg>',
  "lucide:snowflake":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" d="m10 20l-1.25-2.5L6 18m4-14L8.75 6.5L6 6m8 14l1.25-2.5L18 18M14 4l1.25 2.5L18 6"/><path fill="currentColor" d="m17 21l-3-6h-4m7-12l-3 6l1.5 3M2 12h6.5L10 9m10 1l-1.5 2l1.5 2"/><path fill="currentColor" d="M22 12h-6.5L14 15M4 10l1.5 2L4 14m3 7l3-6l-1.5-3M7 3l3 6h4"/></g></svg>',
  "lucide:cloud-snow":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/></svg>',
  "lucide:cloud-fog":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 17H7m10 4H9"/></svg>',
  "lucide:haze":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5.2 6.2l1.4 1.4M2 13h2m16 0h2m-4.6-5.4l1.4-1.4M22 17H2m20 4H2m14-8a4 4 0 0 0-8 0m4-8V2.5"/></svg>',
  "lucide:wind":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.8 19.6A2 2 0 1 0 14 16H2m15.5-8a2.5 2.5 0 1 1 2 4H2m7.8-7.6A2 2 0 1 1 11 8H2"/></svg>',
  "lucide:thermometer-sun":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 4a4 4 0 0 0-1.645 7.647M2 12h2m16 2.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0zM4.93 4.93l1.41 1.41m0 11.32l-1.41 1.41"/></svg>',
  "lucide:thermometer-snowflake":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" d="m10 20l-1.25-2.5L6 18m4-14L8.75 6.5L6 6m4.585 9H10m-8-3h6.5L10 9m10 5.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/><path fill="currentColor" d="m4 10l1.5 2L4 14m3 7l3-6l-1.5-3M7 3l3 6h2"/></g></svg>',
  "lucide:circle-help":
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle fill="currentColor" cx="12" cy="12" r="10"/><path fill="currentColor" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01"/></g></svg>',
};

/**
 * 图标代码 → 图标主色（`#RRGGBB`），用于外层 `color`（配合 SVG `currentColor`）。
 */
export const WEATHER_ICON_COLOR_BY_CODE: Record<number, string> = {
  100: "#FFB300",
  101: "#78909C",
  102: "#90A4AE",
  103: "#78909C",
  104: "#546E7A",
  150: "#5C6BC0",
  151: "#607D8B",
  152: "#90A4AE",
  153: "#607D8B",
  300: "#42A5F5",
  301: "#2196F3",
  302: "#7E57C2",
  303: "#6A1B9A",
  304: "#5E35B1",
  305: "#64B5F6",
  306: "#42A5F5",
  307: "#1E88E5",
  308: "#1565C0",
  309: "#64B5F6",
  310: "#1565C0",
  311: "#0D47A1",
  312: "#0D47A1",
  313: "#29B6F6",
  314: "#2196F3",
  315: "#1976D2",
  316: "#1565C0",
  317: "#0D47A1",
  318: "#0D47A1",
  350: "#42A5F5",
  351: "#2196F3",
  399: "#42A5F5",
  400: "#81D4FA",
  401: "#4FC3F7",
  402: "#29B6F6",
  403: "#0288D1",
  404: "#4FC3F7",
  405: "#4FC3F7",
  406: "#4FC3F7",
  407: "#4FC3F7",
  408: "#29B6F6",
  409: "#0288D1",
  410: "#01579B",
  456: "#4FC3F7",
  457: "#4FC3F7",
  499: "#81D4FA",
  500: "#B0BEC5",
  501: "#90A4AE",
  502: "#9E9E9E",
  503: "#A1887F",
  504: "#8D6E63",
  507: "#8D6E63",
  508: "#6D4C41",
  509: "#B0BEC5",
  510: "#90A4AE",
  511: "#9E9E9E",
  512: "#757575",
  513: "#616161",
  514: "#78909C",
  515: "#607D8B",
  900: "#FF6F00",
  901: "#0277BD",
  999: "#9E9E9E",
};

const DEFAULT_CODE = 999;

export function getWeatherIconifyId(code: number | string): string {
  const n = typeof code === "string" ? Number(code) : code;
  if (!Number.isFinite(n)) return WEATHER_ICONIFY_BY_CODE[DEFAULT_CODE];
  return WEATHER_ICONIFY_BY_CODE[n] ?? WEATHER_ICONIFY_BY_CODE[DEFAULT_CODE];
}

export function getWeatherIconColor(code: number | string): string {
  const n = typeof code === "string" ? Number(code) : code;
  if (!Number.isFinite(n)) return WEATHER_ICON_COLOR_BY_CODE[DEFAULT_CODE];
  return WEATHER_ICON_COLOR_BY_CODE[n] ?? WEATHER_ICON_COLOR_BY_CODE[DEFAULT_CODE];
}

/** 按 Iconify ID 取内联 SVG；未知 ID 返回「未知」图标 SVG */
export function getWeatherIconSvg(iconifyId: string): string {
  return WEATHER_ICON_SVG_BY_ICONIFY_ID[iconifyId] ?? WEATHER_ICON_SVG_BY_ICONIFY_ID["lucide:circle-help"]!;
}

/** 按气象代码取内联 SVG */
export function getWeatherIconSvgByCode(code: number | string): string {
  return getWeatherIconSvg(getWeatherIconifyId(code));
}

/** 解析 `prefix:name`（保留，便于与其它 Iconify 工具互操作） */
export function parseIconifyId(
  id: string,
): { prefix: string; name: string } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  return { prefix: id.slice(0, i), name: id.slice(i + 1) };
}

/** 将 `currentColor` 替换为具体色值后，得到可用于 `<Image src>` 的 data URI（小程序/H5 通用） */
export function getWeatherIconDataUriByCode(code: number | string): string {
  const n = typeof code === "string" ? Number(code) : code;
  const c = Number.isFinite(n) ? n : DEFAULT_CODE;
  const svg = getWeatherIconSvgByCode(c).replace(
    /currentColor/g,
    getWeatherIconColor(c),
  );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function resolveWeatherCodeFromText(description: string): number {
  const t = description.trim();
  if (!t) return DEFAULT_CODE;

  if (/未知/.test(t)) return 999;
  if (/热|高温/.test(t)) return 900;
  if (/冷|低温|寒潮/.test(t)) return 901;

  if (/沙尘暴|强沙尘/.test(t)) return 508;
  if (/沙尘|扬沙|浮尘/.test(t)) return 503;

  if (/雾|霾/.test(t)) {
    if (/浓|大|强/.test(t)) return 514;
    if (/重|严重/.test(t)) return 512;
    return 501;
  }

  if (/雷|雹|冰雹/.test(t)) return 302;
  if (/暴雨|大暴雨|特大暴雨|极端降雨/.test(t)) return 310;
  if (/大雨|中雨|小雨|雨|阵雨|雨夹雪|雪|冻雨|细雨|毛毛雨/.test(t)) {
    if (/雪/.test(t) && !/雨夹雪/.test(t)) return 401;
    if (/雨夹雪|阵雪/.test(t)) return 404;
    if (/小雨|细雨|毛毛雨/.test(t)) return 305;
    if (/中雨/.test(t)) return 306;
    if (/大雨/.test(t)) return 307;
    if (/阵雨/.test(t)) return 300;
    return 399;
  }

  if (/阴|阴天/.test(t)) return 104;
  if (/多云|少云/.test(t)) return 101;
  if (/晴/.test(t)) return 100;

  return DEFAULT_CODE;
}

export function resolveWeatherIconifyIdFromText(description: string): string {
  return WEATHER_ICONIFY_BY_CODE[resolveWeatherCodeFromText(description)];
}

export function resolveWeatherColorFromText(description: string): string {
  return WEATHER_ICON_COLOR_BY_CODE[resolveWeatherCodeFromText(description)];
}

/** 根据中文描述取内联 SVG */
export function resolveWeatherIconSvgFromText(description: string): string {
  return getWeatherIconSvgByCode(resolveWeatherCodeFromText(description));
}
