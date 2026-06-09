import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import CustomTabBar from "@/components/CustomTabBar";
import { TAB_INDEX } from "@/constants/tabbar";
import { useTabBarSelected } from "@/mixins/tabbar.mixin";
import { fetchWeather } from "@/api/tidal";
import { readWeappNavLayout, type WeappNavLayout } from "@/mixins/global.mixin";
import {
  fetchTidalAreas,
  fetchTidalPoints,
  getMarkerRowCity,
  mapMarkerRowToFishingSpot,
  type TideAreaCategory,
} from "../../api";
import TideCategorySidebar from "./components/TideCategorySidebar";
import TideCityTabRow from "./components/TideCityTabRow";
import TideFishingSpotCard from "./components/TideFishingSpotCard";

import "./tide.scss";

const isH5 = process.env.TARO_ENV === "h5";

export default function TidePage() {
  useTabBarSelected(TAB_INDEX.tide);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [categories, setCategories] = useState<TideAreaCategory[]>([]);
  const [markerRows, setMarkerRows] = useState<Record<string, unknown>[]>([]);
  const [weather, setWeather] = useState<unknown[]>([]);

  /** 左侧潮汐区域栏是否展开（默认收起） */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navLayout, setNavLayout] = useState<WeappNavLayout | null>(() =>
    readWeappNavLayout(),
  );

  const selectedCategoryLabel = useMemo(() => {
    const c = categories.find((x) => x.id === selectedCategory);
    return c?.label ?? "区域";
  }, [categories, selectedCategory]);

  /** 当前接口返回数据中出现的城市（去重、排序） */
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const row of markerRows) {
      set.add(getMarkerRowCity(row));
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [markerRows]);

  /** 二级 Tab：按选中城市过滤钓点，天气数组与 markerRows 下标一一对应 */
  const spotsForCity = useMemo(() => {
    const pairs = markerRows.map((row, i) => ({
      row,
      weather: weather[i],
    }));
    if (!selectedCity) return pairs;
    return pairs.filter(
      ({ row }) => getMarkerRowCity(row) === selectedCity,
    );
  }, [markerRows, weather, selectedCity]);

  useEffect(() => {
    if (cities.length === 0) {
      setSelectedCity("");
      return;
    }
    setSelectedCity((prev) =>
      prev && cities.includes(prev) ? prev : cities[0],
    );
  }, [cities]);

  useEffect(() => {
    selectedCategory && fetchTidalRegion(selectedCategory);
  }, [selectedCategory]);

  useLoad(() => {
    if (!navLayout) {
      const next = readWeappNavLayout();
      if (next) setNavLayout(next);
    }

    void (async () => {
      try {
        const list = await fetchTidalAreas().catch(() => [] as TideAreaCategory[]);
        setCategories(list);

        setSelectedCategory((prev) => {
          let areaId = prev;
          if (!(prev && list.some((c) => c.id === prev)))
            areaId = list[0]?.id ?? "";
          return areaId;
        });
      } catch (e) {
        Taro.showToast({ title: "潮汐区域加载失败", icon: "none" });
      }
    })();
  });

  async function fetchTidalRegion(parentID: number | string) {
    try {
      const rows = await fetchTidalPoints(parentID);
      setMarkerRows(rows);

      const weathers = await fetchWeather(rows.map(({ zip }) => zip as string));
      setWeather(Array.isArray(weathers) ? weathers : []);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: "数据加载失败", icon: "none" });
    }
  }

  const titleMaskWidthPx =
    navLayout != null ? Math.max(navLayout.menuLeft - 16, 0) : 0;

  return (
    <View className='tide-page app-page-sunshine-bg app-page-with-tabbar'>
      {navLayout != null ? (
        <View
          className='tide-page__custom-nav'
          style={{ paddingTop: `${navLayout.statusBarHeight}px` }}
        >
          <View
            className='tide-page__custom-nav-inner'
            style={{ height: `${navLayout.navInnerHeight}px` }}
          >
            <View
              className='tide-page__custom-nav-title-mask'
              style={{
                width: `${titleMaskWidthPx}px`,
                height: `${navLayout.menuHeight}px`,
              }}
            />
          </View>
        </View>
      ) : (
        <View className='tide-page__safe-top-spacer' />
      )}

      <TideCityTabRow
        selectedCategoryLabel={selectedCategoryLabel}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        cities={cities}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
      />

      <View className='tide-page__main'>
        <TideCategorySidebar
          open={sidebarOpen}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id);
            setSidebarOpen(false);
          }}
        />

        <View className='tide-page__content'>
          <ScrollView
            className='tide-page__spots-scroll'
            scrollY
            showScrollbar={false}
            enableFlex
          >
            <View className='tide-page__spots-inner'>
              {spotsForCity.map(({ row, weather: spotWeather }, i) => (
                <TideFishingSpotCard
                  key={String(row.ID ?? row.Id ?? row.id ?? i)}
                  spot={mapMarkerRowToFishingSpot(row, i)}
                  weather={spotWeather}
                  markerRow={row}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
      {isH5 ? <CustomTabBar current={TAB_INDEX.tide} /> : null}
    </View>
  );
}
