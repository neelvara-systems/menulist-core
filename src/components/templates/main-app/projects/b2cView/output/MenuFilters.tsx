/**
 * Menu Sections Navigator (New Design System)
 * 
 * Category/section jump control for public menu navigation.
 * No Ant Design - uses Tailwind + Framer Motion only.
 * 
 * CONSTITUTIONAL RULES:
 * - Inline trigger belongs to the sticky search/navigation layer
 * - Floating trigger remains available only as a legacy fallback mode
 * - No search in this component (moved to MenuSearchBar)
 * 
 * Preserves functional logic from old CategoryPopup:
 * - findVisibleCategory: auto-selects visible category when popup opens
 * - Scroll to category on selection
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type TouchEvent as ReactTouchEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { LuList, LuX } from 'react-icons/lu';
import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { getLocalizedText } from '@lib/localization/text';
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
    triggerVariant?: 'floating' | 'inline';
    categoryItemCounts?: Record<string, number>;
    /** When true, FAB is hidden (category tabs are visible) */
    hideFAB?: boolean;
}

const getCategoryLabel = (category: Category, activeLanguage: string): string =>
    getLocalizedText(category.name, activeLanguage, 'en', 'Section');

function MenuFilters({
    categories,
    activeCategory,
    onSelectCategory,
    activeLanguage,
    showCategoryIcons = true,
    moodConfig,
    triggerVariant = 'floating',
    categoryItemCounts,
    hideFAB = false,
}: MenuFiltersProps) {
    const [showCategories, setShowCategories] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isWideInlinePopover, setIsWideInlinePopover] = useState(false);
    const [triggerFocused, setTriggerFocused] = useState(false);
    const [anchorPosition, setAnchorPosition] = useState({ top: 72, right: 12 });
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const isInline = triggerVariant === 'inline';

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const updateViewportMode = () => setIsWideInlinePopover(window.innerWidth >= 768);

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);
        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    const updateAnchorPosition = useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setAnchorPosition({
            top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 180)),
            right: Math.max(12, window.innerWidth - rect.right),
        });
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
        if (showCategories) {
            setShowCategories(false);
            return;
        }

        updateAnchorPosition();
        setShowCategories(true);

        const visibleCategory = findVisibleCategory();
        if (visibleCategory && visibleCategory.id !== activeCategory?.id) {
            onSelectCategory(visibleCategory, 'MENU-POPOVER-SYNC');
        }
    };

    const handleCategorySelect = (category: Category, event?: ReactMouseEvent<HTMLAnchorElement>) => {
        event?.preventDefault();
        onSelectCategory(category, 'MENU-POPOVER');
        setShowCategories(false);
    };

    const closeCategories = (
        event?: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>
    ) => {
        event?.preventDefault();
        event?.stopPropagation();
        setShowCategories(false);
    };

    useEffect(() => {
        if (!showCategories) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowCategories(false);
            }
        };

        const handlePositionChange = () => updateAnchorPosition();

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handlePositionChange);
        window.addEventListener('scroll', handlePositionChange, { passive: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handlePositionChange);
            window.removeEventListener('scroll', handlePositionChange);
        };
    }, [showCategories, updateAnchorPosition]);

    // Only show category button if there are 2+ categories
    const showCategoryButton = categories.length >= 2;
    const useAnchoredInlinePopover = isInline && isWideInlinePopover;
    const categoryNavRadius = Math.max(4, moodConfig.categoryStyle.borderRadius ?? 0);
    const categoryNavBackground = moodConfig.categoryStyle.background !== 'transparent'
        ? moodConfig.categoryStyle.background
        : moodConfig.itemStyle.background;
    const categoryNavBorderWidth = moodConfig.categoryStyle.borderWidth ?? 1;
    const panelRadius = Math.max(8, moodConfig.itemStyle.borderRadius || categoryNavRadius);

    const categoryPanelBody = (
        <>
            <div
                className="p-3 border-b"
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'space-between',
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
                    Menu sections
                </h3>
                <button
                    type="button"
                    onClick={closeCategories}
                    onClickCapture={closeCategories}
                    onMouseDown={closeCategories}
                    onPointerDown={closeCategories}
                    onTouchStart={closeCategories}
                    aria-label="Close menu sections"
                    style={{
                        alignItems: 'center',
                        background: `${moodConfig.accentColor}0f`,
                        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                        borderRadius: 999,
                        color: moodConfig.bodyColor,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        flexShrink: 0,
                        height: 44,
                        justifyContent: 'center',
                        minHeight: 44,
                        minWidth: 44,
                        width: 44,
                    }}
                >
                    <LuX size={16} />
                </button>
            </div>
            <div
                className="max-h-64 overflow-y-auto p-2"
                style={{
                    maxHeight: isInline
                        ? `calc(min(${useAnchoredInlinePopover ? '440px' : '560px'}, calc(100vh - ${anchorPosition.top + 16}px)) - 45px)`
                        : 'calc(min(440px, 58vh) - 45px)',
                    overflowY: 'auto',
                    padding: 8,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {categories.map((category) => {
                    const isActive = activeCategory?.id === category.id;
                    const itemCount = categoryItemCounts?.[category.id];
                    return (
                        <a
                            key={category.id}
                            href={`#cat-${category.id}`}
                            onClick={(event) => handleCategorySelect(category, event)}
                            className="w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1"
                            style={{
                                width: '100%',
                                minHeight: 44,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 4,
                                padding: '10px 12px',
                                borderRadius: categoryNavRadius,
                                background: isActive
                                    ? `${moodConfig.accentColor}14`
                                    : categoryNavBackground,
                                color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                border: isActive
                                    ? `${Math.max(1, categoryNavBorderWidth)}px solid ${moodConfig.accentColor}50`
                                    : `${categoryNavBorderWidth}px solid ${moodConfig.categoryStyle.borderColor}`,
                                fontFamily: moodConfig.bodyFont,
                                fontSize: 15,
                                lineHeight: '20px',
                                fontWeight: isActive ? 700 : 500,
                                textAlign: 'left',
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && category.icon ? (
                                <CategoryIcon
                                    color={isActive ? moodConfig.accentColor : moodConfig.bodyColor}
                                    defaultIcon="LuTag"
                                    icon={category.icon}
                                    size={16}
                                />
                            ) : null}
                            <span
                                style={{
                                    minWidth: 0,
                                    flex: '1 1 auto',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {getCategoryLabel(category, activeLanguage)}
                            </span>
                            {typeof itemCount === 'number' && itemCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    style={{
                                        flexShrink: 0,
                                        color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        opacity: isActive ? 0.82 : 0.46,
                                    }}
                                >
                                    {itemCount}
                                </span>
                            )}
                        </a>
                    );
                })}
            </div>
        </>
    );

    const inlineCategoryPopover = mounted && isInline && showCategories ? createPortal(
        <div
            ref={popoverRef}
            role="dialog"
            aria-modal={false}
            aria-label="Menu sections"
            style={{
                position: 'fixed',
                right: useAnchoredInlinePopover ? anchorPosition.right : 12,
                left: useAnchoredInlinePopover ? 'auto' : 12,
                top: anchorPosition.top,
                bottom: 'auto',
                zIndex: 10021,
                width: useAnchoredInlinePopover
                    ? 'min(360px, calc(100vw - 24px))'
                    : 'auto',
                maxHeight: `min(${useAnchoredInlinePopover ? '440px' : '560px'}, calc(100vh - ${anchorPosition.top + 16}px))`,
                overflow: 'hidden',
                borderRadius: panelRadius,
                background: moodConfig.background,
                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                boxShadow: '0 18px 42px rgba(0, 0, 0, 0.28)',
            }}
        >
            {categoryPanelBody}
        </div>,
        document.body
    ) : null;

    const legacyCategoryPopover = mounted && !isInline ? createPortal(
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
                            background: useAnchoredInlinePopover
                                ? 'rgba(0, 0, 0, 0.04)'
                                : 'rgba(0, 0, 0, 0.16)',
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="fixed left-4 right-4 z-50 rounded-xl overflow-hidden"
                        role="dialog"
                        aria-modal={isInline}
                        aria-label="Menu sections"
                        style={{
                            position: 'fixed',
                            right: useAnchoredInlinePopover
                                ? anchorPosition.right
                                : isInline ? 12 : 16,
                            left: useAnchoredInlinePopover
                                ? 'auto'
                                : isInline ? 12 : 'auto',
                            top: useAnchoredInlinePopover ? anchorPosition.top : 'auto',
                            bottom: useAnchoredInlinePopover
                                ? 'auto'
                                : isInline
                                    ? 'calc(12px + env(safe-area-inset-bottom))'
                                    : 'calc(84px + env(safe-area-inset-bottom))',
                            zIndex: 10021,
                            width: useAnchoredInlinePopover
                                ? 'min(360px, calc(100vw - 24px))'
                                : isInline ? 'auto' : 'min(360px, calc(100vw - 32px))',
                            maxHeight: useAnchoredInlinePopover
                                ? `min(440px, calc(100vh - ${anchorPosition.top + 16}px))`
                                : isInline ? 'min(560px, 72vh)' : 'min(440px, 58vh)',
                            overflow: 'hidden',
                            borderRadius: panelRadius,
                            background: moodConfig.background,
                            border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                            boxShadow: '0 20px 44px rgba(0, 0, 0, 0.32)',
                        }}
                    >
                        {categoryPanelBody}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    ) : null;

    return (
        <>
            {/* Category Popup */}
            {inlineCategoryPopover}
            {legacyCategoryPopover}

            {isInline && showCategoryButton && (
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={handleOpenCategories}
                    onFocus={() => setTriggerFocused(true)}
                    onBlur={() => setTriggerFocused(false)}
                    aria-label="Open menu sections"
                    aria-expanded={showCategories}
                    style={{
                        minHeight: 44,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        flexShrink: 0,
                        padding: '0 12px',
                        borderRadius: categoryNavRadius,
                        background: showCategories
                            ? `${moodConfig.accentColor}14`
                            : moodConfig.itemStyle.background,
                        border: `1px solid ${showCategories ? `${moodConfig.accentColor}50` : moodConfig.itemStyle.borderColor}`,
                        outline: 'none',
                        boxShadow: showCategories || triggerFocused
                            ? `0 0 0 3px ${moodConfig.accentColor}14`
                            : 'none',
                        color: moodConfig.accentColor,
                        cursor: 'pointer',
                        fontFamily: moodConfig.bodyFont,
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: '20px',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    className="active:scale-[0.98]"
                >
                    <LuList size={17} />
                    <span>Sections</span>
                </button>
            )}

            {/* Floating fallback trigger - kept for callers that have not adopted the sticky command row */}
            <AnimatePresence>
                {!isInline && showCategoryButton && !hideFAB && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={handleOpenCategories}
                        className="fixed right-4 flex items-center gap-2 px-4 py-3 rounded-full text-sm shadow-lg z-30 min-h-[48px]"
                        style={{
                            position: 'fixed',
                            right: 16,
                            background: moodConfig.itemStyle.background,
                            bottom: 'calc(24px + env(safe-area-inset-bottom))',
                            zIndex: 10010,
                            color: moodConfig.accentColor,
                            fontWeight: 600,
                            fontFamily: moodConfig.bodyFont,
                            fontSize: 14,
                            lineHeight: '20px',
                            minHeight: 48,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            width: 'auto',
                            maxWidth: 'calc(100vw - 32px)',
                            padding: '12px 18px',
                            border: `1px solid ${moodConfig.accentColor}50`,
                            borderRadius: 999,
                            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                        aria-label="Open menu sections"
                        aria-expanded={showCategories}
                    >
                        <LuList size={18} />
                        <span>Sections</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}

export default MenuFilters;
