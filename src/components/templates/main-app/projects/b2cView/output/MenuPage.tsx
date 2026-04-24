/**
 * Customer-Facing Menu Page (B2C Output)
 * 
 * Mobile-first, performance-optimized
 * NO Ant Design - Minimal styling
 */

import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { useMemo, useState } from 'react';
import {
    DEFAULTS,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
    SPACING,
} from '../designSystem';
import MenuCategoryOutput from './MenuCategory';
import MenuItemOutput from './MenuItem';

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price?: number | string;
    image?: string;
    available?: boolean;
}

interface MenuCategory {
    id: string;
    icon?: string;
    name: string;
    description?: string;
    items: MenuItem[];
    active?: boolean;
}

interface MenuPageOutputProps {
    categories: MenuCategory[];
    mood?: MenuMood;
    layout?: MenuLayout;
    showImages?: boolean;
    backgroundImage?: string;
    currency?: string;
    onItemClick?: (item: MenuItem) => void;
}

export default function MenuPageOutput({
    categories,
    mood = DEFAULTS.menu.mood,
    layout = DEFAULTS.menu.layout,
    showImages = true,
    backgroundImage,
    currency = '$',
    onItemClick,
}: MenuPageOutputProps) {
    const moodConfig = MENU_MOODS[mood];
    const layoutConfig = MENU_LAYOUTS[layout];
    const spacing = SPACING[moodConfig.spacing];

    const [activeCategory, setActiveCategory] = useState<string | null>(
        layout === 'tabs' ? categories[0]?.id || null : null
    );

    const visibleCategories = useMemo(() =>
        categories.filter(c => c.active !== false),
        [categories]
    );

    const isGrid = layout === 'grid';
    const isCard = layout === 'card';

    return (
        <div
            className="min-h-screen"
            style={{
                background: backgroundImage
                    ? `url(${backgroundImage}) center/cover no-repeat fixed`
                    : moodConfig.background,
            }}
        >
            <div
                className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8"
                style={{ padding: spacing.container }}
            >
                {/* Tabs Navigation */}
                {layout === 'tabs' && (
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b scrollbar-hide"
                        style={{ borderColor: moodConfig.categoryStyle.borderColor }}
                    >
                        {visibleCategories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className="px-4 py-2 text-sm whitespace-nowrap rounded-full transition-colors duration-150"
                                style={{
                                    fontFamily: moodConfig.headingFont,
                                    fontWeight: activeCategory === category.id ? 600 : 400,
                                    color: activeCategory === category.id
                                        ? moodConfig.accentColor
                                        : moodConfig.bodyColor,
                                    background: activeCategory === category.id
                                        ? moodConfig.categoryStyle.background
                                        : 'transparent',
                                    border: 'none',
                                }}
                            >
                                <span className="inline-flex items-center gap-2">
                                    {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && category.icon ? (
                                        <CategoryIcon
                                            color={activeCategory === category.id ? moodConfig.accentColor : moodConfig.bodyColor}
                                            icon={category.icon}
                                            size={14}
                                        />
                                    ) : null}
                                    <span>{category.name}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Categories */}
                {(layout === 'tabs' && activeCategory
                    ? visibleCategories.filter(c => c.id === activeCategory)
                    : visibleCategories
                ).map(category => (
                    <MenuCategoryOutput
                        key={category.id}
                        category={category}
                        moodConfig={moodConfig}
                    >
                        <div
                            className={isGrid
                                ? 'grid grid-cols-2 gap-3 md:gap-4'
                                : 'flex flex-col'
                            }
                            style={{ gap: isGrid ? undefined : spacing.itemGap }}
                        >
                            {category.items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => item.available !== false && onItemClick?.(item)}
                                    className={onItemClick ? 'cursor-pointer' : ''}
                                >
                                    <MenuItemOutput
                                        item={item}
                                        moodConfig={moodConfig}
                                        showImage={showImages && layoutConfig.showImages}
                                        imagePosition={isCard || isGrid ? 'top' : 'left'}
                                        currency={currency}
                                    />
                                </div>
                            ))}
                        </div>
                    </MenuCategoryOutput>
                ))}
            </div>
        </div>
    );
}
