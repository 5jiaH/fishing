import { useCallback, useState } from "react";
import { View } from "@tarojs/components";
import { bd09ToGcj02 } from "@/mixins/map.mixin";
import Taro, { useLoad } from "@tarojs/taro";
import CustomTabBar from "@/components/CustomTabBar";
import { TAB_INDEX } from "@/constants/tabbar";
import { useTabBarSelected } from "@/mixins/tabbar.mixin";
import {
  fetchHydrologyRadar,
  parseHydrologyRadarList,
  radarItemCoords,
} from "../../api";
import iconRain from "../../../assets/svg/rain.svg";
import iconWater from "../../../assets/svg/water.svg";

import { AmapH5Map } from "../../components/amap-h5-map";
import "./index.scss";


const RADAR_LONGITUDE_BD = 112.90944;
const RADAR_LATITUDE_BD = 22.860277;

const RADAR_GCJ = bd09ToGcj02(RADAR_LONGITUDE_BD, RADAR_LATITUDE_BD);

const DEFAULT_SCALE = 12;

const MARKER_SIZE = 24;

function sttpIsRain(sttp: string | undefined): boolean {
  return String(sttp ?? "").toLowerCase() === "pp";
}

function itemToMarker(
  row: ApiItf.HydrologyRadarItem,
  index: number,
  iconRainPath: string,
  iconWaterPath: string,
): ApiItf.RadarMapMarker | null {
  const pos = radarItemCoords(row);
  if (!pos) return null;
  const title = typeof row.stnm === "string" ? row.stnm.trim() : "";
  return {
    id: index,
    latitude: pos.lat,
    longitude: pos.lng,
    iconPath: sttpIsRain(row.sttp) ? iconRainPath : iconWaterPath,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    ...(title ? { title } : {}),
  };
}

const isH5 = process.env.TARO_ENV === "h5";

export default function MapPage() {
  useTabBarSelected(TAB_INDEX.index);

  const [markers, setMarkers] = useState<ApiItf.RadarMapMarker[]>([]);

  const loadRadar = useCallback(async () => {
    try {
      const raw = await fetchHydrologyRadar(RADAR_LONGITUDE_BD, RADAR_LATITUDE_BD);
      const list = parseHydrologyRadarList(raw);
      const next: ApiItf.RadarMapMarker[] = [];
      let id = 0;
      for (const row of list) {
        const m = itemToMarker(row, id, iconRain, iconWater);
        if (m) {
          next.push(m);
          id += 1;
        }
      }
      setMarkers(next);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: "水文雷达数据加载失败", icon: "none" });
    }
  }, []);

  useLoad(() => {
    void loadRadar();
  });

  return (
    <View className='map-page app-page-with-tabbar'>
      <AmapH5Map
        className='map-page__map'
        longitude={RADAR_GCJ.lng}
        latitude={RADAR_GCJ.lat}
        scale={DEFAULT_SCALE}
        markers={markers}
      />
      {isH5 ? <CustomTabBar current={TAB_INDEX.index} /> : null}
    </View>
  );
}
