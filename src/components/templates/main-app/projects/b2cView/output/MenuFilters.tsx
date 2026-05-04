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
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuList } from 'react-icons/lu';
import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { MenuMoodConfig } from '../designSystem';

interface Category {
    id: string;
    icon?: string;
    name: { [lang: string]: string };
}

interface MenuFiltersProps {
    categories: Category[];
    activeCategory: Category | null;
    onSelectCategory: (category: Category | null, from?: string) => void;
    activeLanguage: string;
    showCategoryIcons?: boolean;
    moodConfig: MenuMoodConfig;
    /** When true, FAB is hidden (category tabs are visible) */
    hideFAB?: boolean;
}

function MenuFilters({
    categories,
    activeCategory,
    onSelectCategory,
    activeLanguage,
    showCategoryIcons = true,
    moodConfig,
    hideFAB = false,
}: MenuFiltersProps) {
    const [showCategories, setShowCategories] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

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

    const categoryPopover = mounted ? createPortal(
        <AnimatePresence>
            {showCategories && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCategories(false)}
                        className="fixed inset-0 bg-black/50 z-40"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10020,
                            background: 'rgba(0, 0, 0, 0.16)',
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="fixed left-4 right-4 z-50 rounded-xl overflow-hidden"
                        role="dialog"
                        aria-modal="false"
                        aria-label="Menu categories"
                        style={{
                            position: 'fixed',
                            right: 16,
                            left: 'auto',
                            bottom: 'calc(84px + env(safe-area-inset-bottom))',
                            zIndex: 10021,
                            width: 'min(360px, calc(100vw - 32px))',
                            maxHeight: 'min(440px, 58vh)',
                            overflow: 'hidden',
                            borderRadius: 14,
                            background: moodConfig.background,
                            border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                            boxShadow: '0 20px 44px rgba(0, 0, 0, 0.32)',
                        }}
                    >
                        <div
                            className="p-3 border-b"
                            style={{
                                padding: '12px 14px',
                                borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}`,
                            }}
                        >
                            <h3
                                className="text-sm font-medium"
                                style={{
                                    margin: 0,
                                    color: moodConfig.headingColor,
                                    fontFamily: moodConfig.headingFont,
                                    fontSize: 15,
                                    lineHeight: '20px',
                                    fontWeight: 700,
                                }}
                            >
                                Categories
                            </h3>
                        </div>
                        <div
                            className="max-h-64 overflow-y-auto p-2"
                            style={{
                                maxHeight: 'calc(min(440px, 58vh) - 45px)',
                                overflowY: 'auto',
                                padding: 8,
                                WebkitOverflowScrolling: 'touch',
                            }}
                        >
                            {categories.map((category) => {
                                const isActive = activeCategory?.id === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategorySelect(category)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1"
                                        style={{
                                            width: '100%',
                                            minHeight: 44,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            marginBottom: 4,
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            background: isActive
                                                ? `${moodConfig.accentColor}20`
                                                : 'transparent',
                                            color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                            border: isActive
                                                ? `1px solid ${moodConfig.accentColor}50`
                                                : '1px solid transparent',
                                            fontFamily: moodConfig.bodyFont,
                                            fontSize: 15,
                                            lineHeight: '20px',
                                            fontWeight: isActive ? 700 : 500,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && category.icon ? (
                                            <CategoryIcon
                                                color={isActive ? moodConfig.accentColor : moodConfig.bodyColor}
                                                icon={category.icon}
                                                size={16}
                                            />
                                        ) : null}
                                        <span
                                            style={{
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {category.name[activeLanguage]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    ) : null;

    return (
        <>
            {/* Category Popup */}
            {categoryPopover}

            {/* Floating Category FAB - Bottom Right */}
            {/* Constitutional: Only show when category tabs are NOT visible */}
            <AnimatePresence>
                {showCategoryButton && !hideFAB && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={handleOpenCategories}
                        className="fixed right-4 flex items-center gap-2 px-4 py-3 rounded-full text-sm shadow-lg z-30 min-h-[48px]"
                        style={{
                            position: 'fixed',
                            right: 16,
                            background: moodConfig.accentColor,
                            bottom: 'calc(24px + env(safe-area-inset-bottom))',
                            zIndex: 10010,
                            color: '#000',
                            fontWeight: 600,
                            fontFamily: moodConfig.bodyFont,
                            fontSize: 15,
                            lineHeight: '20px',
                            minHeight: 48,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            width: 'auto',
                            maxWidth: 'calc(100vw - 32px)',
                            padding: '12px 18px',
                            border: 0,
                            borderRadius: 999,
                            boxShadow: '0 12px 26px rgba(0, 0, 0, 0.28)',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                        aria-label="Open category menu"
                        aria-expanded={showCategories}
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
