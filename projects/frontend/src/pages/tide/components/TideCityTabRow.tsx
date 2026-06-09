import { ScrollView, Text, View } from "@tarojs/components";

type TideCityTabRowProps = {
  selectedCategoryLabel: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  cities: string[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
};

/** 潮汐页顶部：区域入口 + 城市横向 Tab */
export default function TideCityTabRow({
  selectedCategoryLabel,
  sidebarOpen,
  onToggleSidebar,
  cities,
  selectedCity,
  onSelectCity,
}: TideCityTabRowProps) {
  return (
    <View className='tide-page__city-row'>
      <View
        className={`tide-page__area-trigger${sidebarOpen ? " tide-page__area-trigger--open" : ""}`}
        onClick={onToggleSidebar}
      >
        <Text className='tide-page__area-trigger-text'>
          {selectedCategoryLabel}
        </Text>
        <Text className='tide-page__area-trigger-caret' aria-hidden>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='12' height='12'>
            <path fill='currentColor' d='m6 9l6 6l6-6' />
          </svg>
        </Text>
      </View>

      <ScrollView
        className='tide-page__cities-scroll'
        scrollX
        showScrollbar={false}
        enableFlex
      >
        <View className='tide-page__cities-inner'>
          {cities.map((city) => (
            <View
              key={city}
              className={`tide-page__city-chip${selectedCity === city ? " tide-page__city-chip--active" : ""}`}
              onClick={() => onSelectCity(city)}
            >
              <Text>{city}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
