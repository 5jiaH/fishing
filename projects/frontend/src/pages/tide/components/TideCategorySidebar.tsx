import { ScrollView, Text, View } from "@tarojs/components";
import type { TideAreaCategory } from "@/api";

type TideCategorySidebarProps = {
  open: boolean;
  categories: TideAreaCategory[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
};

/** 潮汐区域分类侧边栏 */
export default function TideCategorySidebar({
  open,
  categories,
  selectedCategory,
  onSelectCategory,
}: TideCategorySidebarProps) {
  return (
    <View
      className={`tide-page__category-shell${open ? " tide-page__category-shell--open" : ""}`}
    >
      <ScrollView
        className='tide-page__category'
        scrollY
        showScrollbar={false}
      >
        {categories.map((cat) => (
          <View
            key={cat.id || cat.label}
            className={`tide-page__category-btn${selectedCategory === cat.id ? " tide-page__category-btn--active" : ""}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            <Text>{cat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
