/**
 * Menu Category FAB (New Design System)
 * 
 * Floating Action Button for category navigation.
 * No Ant Design - uses Tailwind + Framer Motion only.
 * 
 * CONSTITUTIONAL RULES:
 * - FAB only visible when category tabs are scrolled out of view
 * - No search in this component (moved to MenuSearchBar)
 * - Bottom-right corner positioning
 * 
 * Preserves functional logic from old CategoryPopup:
 * - findVisibleCategory: auto-selects visible category when popup opens
 * - Scroll to category on selection
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { LuList } from 'react-icons/lu';
import { MenuMoodConfig } from '../designSystem';

interface Category {
    id: string;
    name: { [lang: string]: string };
}

interface MenuFiltersProps {
    categories: Category[];
    activeCategory: Category | null;
    onSelectCategory: (category: Category | null, from?: string) => void;
    activeLanguage: string;
    moodConfig: MenuMoodConfig;
    /** When true, FAB is hidden (category tabs are visible) */
    hideFAB?: boolean;
}

function MenuFilters({
    categories,
    activeCategory,
    onSelectCategory,
    activeLanguage,
    moodConfig,
    hideFAB = false,
}: MenuFiltersProps) {
    const [showCategories, setShowCategories] = useState(false);

    // Find the currently visible category when popup opens
    const findVisibleCategory = (): Category | null => {
        if (!categories || categories.length === 0) return null;

        const visibleCategories = categories
            .map(category => {
                const element = document.querySelector(`[data-category-id="${category.id}"]`);
                if (!element) return null;

                const rect = element.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                // Calculate how much of the element is visible in the viewport
                const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                const visibilityRatio = visibleHeight > 0 ? visibleHeight / rect.height : 0;

                return { category, visibilityRatio, top: rect.top };
            })
            .filter((item): item is { category: Category; visibilityRatio: number; top: number } =>
                item !== null && item.visibilityRatio > 0
            )
            .sort((a, b) => {
                // First prioritize visibility ratio
                if (b.visibilityRatio !== a.visibilityRatio) {
                    return b.visibilityRatio - a.visibilityRatio;
                }
                // If equal visibility, prioritize the one closer to the top
                return a.top - b.top;
            });

        if (visibleCategories.length > 0) {
            return visibleCategories[0].category;
        }

        return null;
    };

    // When popup opens, find and select the visible category
    const handleOpenCategories = () => {
        setShowCategories(true);

        const visibleCategory = findVisibleCategory();
        if (visibleCategory && visibleCategory.id !== activeCategory?.id) {
            onSelectCategory(visibleCategory, '');
        }
    };

    const handleCategorySelect = (category: Category) => {
        onSelectCategory(category, 'MENU-POPOVER');
        setShowCategories(false);
    };

    // Only show category button if there are 2+ categories
    const showCategoryButton = categories.length >= 2;

    return (
        <>
            {/* Category Popup */}
            <AnimatePresence>
                {showCategories && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCategories(false)}
                            className="fixed inset-0 bg-black/50 z-40"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-16 left-4 right-4 z-50 rounded-xl overflow-hidden"
                            style={{ background: moodConfig.background }}
                        >
                            <div className="p-3 border-b" style={{ borderColor: moodConfig.itemStyle.borderColor }}>
                                <h3
                                    className="text-sm font-medium"
                                    style={{ color: moodConfig.headingColor }}
                                >
                                    Categories
                                </h3>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategorySelect(category)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1"
                                        style={{
                                            background: activeCategory?.id === category.id
                                                ? `${moodConfig.accentColor}20`
                                                : 'transparent',
                                            color: moodConfig.bodyColor,
                                            border: activeCategory?.id === category.id
                                                ? `1px solid ${moodConfig.accentColor}50`
                                                : '1px solid transparent',
                                        }}
                                    >
                                        <span
                                            className="text-sm"
                                            style={{
                                                fontWeight: activeCategory?.id === category.id ? 600 : 400,
                                                color: activeCategory?.id === category.id
                                                    ? moodConfig.accentColor
                                                    : moodConfig.bodyColor,
                                            }}
                                        >
                                            {category.name[activeLanguage]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floating Category FAB - Bottom Right */}
            {/* Constitutional: Only show when category tabs are NOT visible */}
            <AnimatePresence>
                {showCategoryButton && !hideFAB && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={handleOpenCategories}
                        className="fixed bottom-6 right-4 flex items-center gap-2 px-4 py-3 rounded-full text-sm shadow-lg z-30 min-h-[48px]"
                        style={{
                            background: moodConfig.accentColor,
                            color: '#000',
                            fontWeight: 600,
                        }}
                        aria-label="Open category menu"
                    >
                        <LuList size={18} />
                        <span>Menu</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}

export default MenuFilters;
