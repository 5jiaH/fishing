import { Image, View } from "@tarojs/components";
import {
  getWeatherIconDataUriByCode,
  getWeatherIconSvgByCode,
  getWeatherIconColor,
} from "@/lib/weather.icon";

export type WeatherIconProps = {
  /** 气象 icon 代码（如和风 `100`），字符串数字亦可 */
  code: number | string;
  className?: string;
  /**
   * - `auto`（默认）：H5 用内联 SVG（DOM）；小程序用 `Image` + data URI。
   * - `svg`：始终 `View` + `dangerouslySetInnerHTML`（仅 H5 可靠）。
   * - `image`：始终 `Image` + data URI（全端一致）。
   */
  variant?: "auto" | "svg" | "image";
};

/**
 * 在 `tide.tsx` 等处使用 SVG 形态：
 *
 * ```tsx
 * <WeatherIcon code={target.icon} className="spot-card__weather-svg-wrap" />
 * ```
 *
 * H5 下为真实 `<svg>`（`currentColor` 随外层 `color`）；小程序为矢量 data URI 图。
 */
export function WeatherIcon({
  code,
  className,
  variant = "auto",
}: WeatherIconProps) {
  const color = getWeatherIconColor(code);
  const isH5 = process.env.TARO_ENV === "h5";

  if (variant === "image" || (variant === "auto" && !isH5)) {
    return (
      <Image
        className={className}
        src={getWeatherIconDataUriByCode(code)}
        mode='aspectFit'
      />
    );
  }

  return (
    <View
      className={className}
      style={{
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: getWeatherIconSvgByCode(code) }}
    />
  );
}
