/**
 * Menu Page (New Design System)
 * 
 * Complete menu page with:
 * - Header with logo, language selector, view toggle
 * - Menu items with search/filter
 * - PDP modal for item details
 * - Bottom filter bar
 * 
 * No Ant Design - uses Tailwind + inline styles only.
 */

import { getUnavailableLabel } from '@config/businessLabels';
import { FEATURE_FLAGS } from '@config/features';
import CategoryIcon from '@atoms/CategoryIcon';
import TrustSignals from '@atoms/TrustSignals';
import { isCategoryVisibleByTime } from '@hook/useTimedCategories';
import { AnalyticsContext } from '@template/website/clientWebsite/AnalyticsContext';
import { getResolvedAnalyticsPreferences, isDecisionBlockAnalyticsEnabled } from '@lib/analytics/preferences';
import { hasTrackedSearchTermInSession, markSearchTermTrackedInSession } from '@lib/analytics/searchDedup';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { setMenuAttributeFilterContext, trackMenuAction, trackSearch, trackUnavailableItemAttempt } from '@lib/analytics/unified';
import { resolvePublicBusinessType } from '@lib/businessIdentity/publicBusinessType';
import { getLocalizedText } from '@lib/localization/text';
import {
    getDecisionFactArray,
    getDecisionFactNumber,
    getDecisionFactString,
    getDecisionFactValue,
} from '@lib/menu/itemDecisionFacts';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import {
    buildPublicMenuSearchDocument,
    buildPublicMenuSearchQuery,
    matchesPublicMenuSearchDocument,
} from '@lib/menu/publicMenuSearch';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { slugify } from '@lib/utils/slugify';
import { StoreDataType } from '@type/platform/store';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuImage } from 'react-icons/lu';
import { Project } from '../../types';
import {
    DEFAULTS,
    getMoodWithBrandColor,
    MENU_LAYOUTS,
    MenuLayout,
    MenuMood,
    normalizeMenuLayout,
    normalizeMenuMood,
    SPACING
} from '../designSystem';
import BackToTop from '../output/BackToTop';
import DecisionBlocks from '../output/DecisionBlocks';
import FeedbackNudge from '../output/FeedbackNudge';
import MenuFilterChips, { FilterType } from '../output/MenuFilterChips';
import MenuFilters from '../output/MenuFilters';
import MenuFooter from '../output/MenuFooter';
import MenuHeader from '../output/MenuHeader';
import MenuLanguageSwitcher from '../output/MenuLanguageSwitcher';
import MenuSearchBar from '../output/MenuSearchBar';
import PDPModal from '../output/PDPModal';
import ServiceChargeNote from '../output/ServiceChargeNote';
import { DeviceTypes, PageType } from '../types';
import { normalizeItemFilterAttributes } from '../utils/normalizeItemAttributes';

interface MenuPageNewProps {
    mood?: MenuMood;
    layout?: MenuLayout;
    brandAccentColor?: string;
    backgroundImage?: string;
    showItemPrices?: boolean;
    showImages?: boolean;
    showCategoryIcons?: boolean;
    showCategoryTabs?: boolean;
    activeDeviceType: DeviceTypes;
    setActivePage?: (page: PageType) => void;
    activeLanguage: string;
    projectData: Project;
    /**
     * Store details are passed explicitly (not read from PlatformGlobalDataContext)
     * so this component works identically in the public client menu (server-fetched)
     * and the dashboard preview (context-fetched). See MainContentRenderer caller.
     */
    storeDetails: StoreDataType;
    setActiveLanguage: (language: string) => void;
    from: string;
    businessType?: string;
    precomputedBlocks?: any | null;  // Precomputed Decision Blocks from Cloud Function
    restoreStoredLanguage?: boolean;
}

const getAttributeFilterAnalyticsLabel = (filter: FilterType): string | undefined => {
    switch (filter) {
        case 'popular':
            return 'Popular';
        case 'veg':
            return 'Veg';
        case 'nonveg':
            return 'Non-Veg';
        case 'forMen':
            return 'For Men';
        case 'forWomen':
            return 'For Women';
        default:
            return undefined;
    }
};

const hasDisplayPrice = (price: unknown): boolean =>
    price !== undefined && price !== null && String(price).trim() !== '';

const isElementScrollable = (element: HTMLElement | null): element is HTMLElement =>
    !!element && element.scrollHeight > element.clientHeight + 1;

const normalizeFactLabel = (value: string): string => value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const renderHighlightedText = (
    text: string,
    term: string,
    accentColor: string,
): React.ReactNode => {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) return text;

    const textIndex = text.toLowerCase().indexOf(normalizedTerm.toLowerCase());
    if (textIndex === -1) return text;

    const before = text.slice(0, textIndex);
    const match = text.slice(textIndex, textIndex + normalizedTerm.length);
    const after = text.slice(textIndex + normalizedTerm.length);

    return (
        <>
            {before}
            <mark
                data-search-highlight="true"
                style={{
                    background: `${accentColor}22`,
                    borderRadius: 3,
                    color: 'inherit',
                    padding: '0 2px',
                }}
            >
                {match}
            </mark>
            {after}
        </>
    );
};

function MenuPageNew({
    mood = DEFAULTS.menu.mood,
    layout = DEFAULTS.menu.layout,
    brandAccentColor,
    backgroundImage,
    showItemPrices = true,
    showImages = true,
    showCategoryIcons = true,
    showCategoryTabs = false,
    activeDeviceType,
    activeLanguage,
    projectData,
    storeDetails,
    setActiveLanguage,
    from,
    businessType,
    precomputedBlocks,
    restoreStoredLanguage = true
}: MenuPageNewProps) {
    const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
    const { trackMenuItemTap } = useContext(AnalyticsContext);
    const isPublicSurface = from === 'main-website';
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const categoryTabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
    const getMenuBasePath = useCallback(() => {
        if (typeof window === 'undefined') return '/menu';

        const itemPathMatch = window.location.pathname.match(/^(.*)\/item\/[^/]+\/?$/);
        if (itemPathMatch?.[1]) {
            return itemPathMatch[1];
        }

        return window.location.pathname;
    }, []);

    const getActiveScrollContainer = useCallback(() => {
        if (isPublicSurface) return null;
        const container = scrollContainerRef.current;
        return isElementScrollable(container) ? container : null;
    }, [isPublicSurface]);

    const getScrollPosition = useCallback(() => {
        const container = getActiveScrollContainer();
        if (container) {
            return container.scrollTop;
        }

        return window.scrollY;
    }, [getActiveScrollContainer]);

    const restoreScrollPosition = useCallback((scrollY: number) => {
        const container = getActiveScrollContainer();
        if (container) {
            container.scrollTo({ top: scrollY, behavior: 'auto' });
            return;
        }

        window.scrollTo({ top: scrollY, behavior: 'auto' });
    }, [getActiveScrollContainer]);

    const resolvedMood = normalizeMenuMood(mood);
    const resolvedLayout = normalizeMenuLayout(layout, resolvedMood);
    const moodConfig = getMoodWithBrandColor(resolvedMood, brandAccentColor);
    const layoutConfig = MENU_LAYOUTS[resolvedLayout];
    const spacing = SPACING[moodConfig.spacing];
    const isMobile = activeDeviceType === 'mobile';
    const isTablet = activeDeviceType === 'tablet';
    const isDesktop = activeDeviceType === 'desktop';
    const effectiveBusinessType = useMemo(
        () => resolvePublicBusinessType(
            businessType,
            storeDetails?.businessType,
            storeDetails?.businessIndustry,
        ) || businessType,
        [businessType, storeDetails?.businessType, storeDetails?.businessIndustry],
    );
    const labels = useMemo(() => getOfferingLabels(effectiveBusinessType), [effectiveBusinessType]);
    const currencySymbol = storeDetails?.currencySymbol || '₹';
    const currencyCode = storeDetails?.currencyCode || 'INR';
    const primaryLanguage = projectData?.defaultLanguage || storeDetails?.defaultLanguage || projectData?.languages?.[0] || 'en';
    const getMenuText = useCallback(
        (value: unknown, fallback = '') => getLocalizedText(value as any, activeLanguage, primaryLanguage, fallback),
        [activeLanguage, primaryLanguage],
    );

    // Layout properties from config
    const layoutAllowsImages = layoutConfig.showImages && layoutConfig.imagePosition !== 'none';
    const shouldShowItemImages = showImages && layoutAllowsImages;
    const imageOnTop = shouldShowItemImages && layoutConfig.imagePosition === 'top';

    // Responsive grid: desktop owns the multi-column rail model; mobile/tablet use a deterministic single-column scan.
    const gridColumns = isDesktop ? Math.max(1, layoutConfig.itemsPerRow) : 1;

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedItemTrackView, setSelectedItemTrackView] = useState(true);
    const [activeCategory, setActiveCategory] = useState<any>(null);
    const [pendingBrowseCategory, setPendingBrowseCategory] = useState<any>(null);

    // Phase C: Filter chips state
    const [activeFilter, setActiveFilter] = useState<FilterType>(null);

    // P0.2 - State Persistence: Track if state was restored from session
    const [stateRestored, setStateRestored] = useState(false);

    // #31: Progressive rendering — for large menus (150+ items), only render categories
    // near the viewport. Distant categories show lightweight placeholders until scrolled into view.
    const PROGRESSIVE_THRESHOLD = 150; // Only activate for menus with 150+ items
    const totalItemCount = useMemo(() => {
        return projectData?.files?.reduce((sum: number, file: any) =>
            sum + (file.extractedData?.data?.items?.length || 0), 0) || 0;
    }, [projectData?.files]);
    const useProgressiveRender = totalItemCount >= PROGRESSIVE_THRESHOLD;
    const [visibleCategoryIds, setVisibleCategoryIds] = useState<Set<string>>(new Set());

    // P0.2 - State Persistence: Generate unique storage key per menu
    const storageKey = useMemo(() => {
        const projectId = projectData?.projectId || 'default';
        return `menuState_${projectId}`;
    }, [projectData?.projectId]);

    // Get unavailable label based on business type
    const unavailableLabel = useMemo(() => getUnavailableLabel(effectiveBusinessType), [effectiveBusinessType]);
    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setDebouncedSearch('');
    }, []);

    // Get all categories from project files
    const allCategories = useMemo(() => {
        const cats: any[] = [];
        const seenIds = new Set();

        projectData?.files?.forEach(file => {
            const fileCats = file.extractedData?.data?.categories || [];
            fileCats.forEach((cat: any) => {
                if (!seenIds.has(cat.id) && cat.active !== false && isCategoryVisibleByTime(cat)) {
                    seenIds.add(cat.id);
                    cats.push(cat);
                }
            });
        });

        return cats;
    }, [projectData?.files]);
    const categoriesById = useMemo(() => {
        const map = new Map<string, any>();
        allCategories.forEach((category: any) => {
            if (category?.id) map.set(category.id, category);
        });
        return map;
    }, [allCategories]);
    const suggestedCategories = useMemo(() => allCategories.slice(0, 4), [allCategories]);
    const recoveryActions = useMemo(() => {
        const addressParts = [
            storeDetails?.addressLine,
            storeDetails?.area,
            storeDetails?.city,
            storeDetails?.state,
            storeDetails?.postalCode,
        ].filter(Boolean);
        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
        const publicPresence = storeDetails?.publicPresence;
        const normalizedPhone = storeDetails?.phoneNumber?.replace(/\s+/g, '');
        const callHref = storeDetails?.phoneNumber
            ? storeDetails.phoneNumber.startsWith('+')
                ? `tel:${normalizedPhone}`
                : storeDetails?.dialCode
                    ? `tel:${storeDetails.dialCode.startsWith('+') ? storeDetails.dialCode : `+${storeDetails.dialCode}`}${normalizedPhone?.replace(/^0+/, '') || ''}`
                    : `tel:${normalizedPhone}`
            : undefined;
        const whatsappNumber = (publicPresence?.whatsappNumber || storeDetails?.phoneNumber || '').replace(/[^0-9+]/g, '');
        const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace('+', '')}` : undefined;
        const directionsHref = publicPresence?.googleMapsUrl || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : undefined);
        const analyticsIds = storeDetails?.tenantId && storeDetails?.storeId && projectData?.projectId
            ? {
                tenantId: storeDetails.tenantId,
                storeId: String(storeDetails.storeId),
                projectId: projectData.projectId,
                storeTimeZone: storeDetails.timeZone,
                businessDayEndTime: storeDetails.businessDayEndTime,
            }
            : null;
        const trackRecoveryAction = (menuAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order') => {
            if (!analyticsPreferences.trackMenuViews || !analyticsIds) return Promise.resolve();
            return trackMenuAction(menuAction, analyticsIds);
        };

        return [
            (publicPresence?.showCall !== false) && callHref ? {
                label: 'Call',
                href: callHref,
                track: () => trackRecoveryAction('call'),
            } : null,
            (publicPresence?.showWhatsApp !== false) && whatsappHref ? {
                label: 'WhatsApp',
                href: whatsappHref,
                external: true,
                track: () => trackRecoveryAction('whatsapp'),
            } : null,
            (publicPresence?.showDirections !== false) && directionsHref ? {
                label: 'Directions',
                href: directionsHref,
                external: true,
                track: () => trackRecoveryAction('directions'),
            } : null,
            (publicPresence?.showReservation !== false) && publicPresence?.reservationUrl ? {
                label: 'Reserve',
                href: publicPresence.reservationUrl,
                external: true,
                track: () => trackRecoveryAction('reserve'),
            } : null,
            (publicPresence?.showOrder !== false) && publicPresence?.orderUrl ? {
                label: 'Order',
                href: publicPresence.orderUrl,
                external: true,
                track: () => trackRecoveryAction('order'),
            } : null,
        ].filter(Boolean);
    }, [
        analyticsPreferences.trackMenuViews,
        projectData?.projectId,
        storeDetails?.addressLine,
        storeDetails?.area,
        storeDetails?.city,
        storeDetails?.dialCode,
        storeDetails?.phoneNumber,
        storeDetails?.postalCode,
        storeDetails?.publicPresence,
        storeDetails?.state,
        storeDetails?.storeId,
        storeDetails?.tenantId,
    ]);

    // P0.2 - Restore state from sessionStorage on mount (runs once when categories load)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (stateRestored) return; // Only restore once
        if (allCategories.length === 0) return; // Wait for categories

        try {
            const savedState = sessionStorage.getItem(storageKey);
            if (savedState) {
                const { scrollY, filter, category } = JSON.parse(savedState);
                const restoredScrollY = Number(scrollY) || 0;

                // Restore filter
                if (filter) {
                    setActiveFilter(filter);
                }

                // Restore active category
                if (category && restoredScrollY > 0) {
                    const cat = allCategories.find((c: any) => c.id === category);
                    if (cat) setActiveCategory(cat);
                }

                // Restore scroll position after content renders
                if (restoredScrollY > 0) {
                    requestAnimationFrame(() => {
                        restoreScrollPosition(restoredScrollY);
                    });
                }
            }
        } catch (e) {
            // Silent fail - state persistence is non-critical
        }

        setStateRestored(true);
    }, [storageKey, allCategories, stateRestored, restoreScrollPosition]);

    // Set first category as active on mount (only if not restored from session)
    useEffect(() => {
        if (allCategories.length > 0 && !activeCategory && stateRestored) {
            setActiveCategory(allCategories[0]);
        }
    }, [allCategories, activeCategory, stateRestored]);

    // P0.2 - Save state to sessionStorage on scroll/filter change
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let saveTimeout: NodeJS.Timeout;
        const container = scrollContainerRef.current;

        const saveState = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                try {
                    const scrollY = getScrollPosition();
                    const firstCategoryId = allCategories[0]?.id || null;
                    const categoryId = scrollY > 16
                        ? activeCategory?.id || firstCategoryId
                        : firstCategoryId;
                    const state = {
                        scrollY,
                        filter: activeFilter,
                        category: categoryId,
                    };
                    sessionStorage.setItem(storageKey, JSON.stringify(state));
                } catch (e) {
                    // Silent fail - quota exceeded or private browsing
                }
            }, 300); // Debounce saves
        };

        window.addEventListener('scroll', saveState, { passive: true });
        container?.addEventListener('scroll', saveState, { passive: true });
        saveState(); // Save immediately on filter/category change

        return () => {
            window.removeEventListener('scroll', saveState);
            container?.removeEventListener('scroll', saveState);
            clearTimeout(saveTimeout);
        };
    }, [storageKey, activeFilter, activeCategory, allCategories, getScrollPosition]);

    const showTabsBar = !isDesktop && showCategoryTabs;
    const showSectionsControl = !isDesktop && allCategories.length >= 2;
    const stickyControlsOffset = isDesktop ? 96 : showTabsBar ? 124 : 76;

    // Scroll spy - update active category based on scroll position
    // Activates for: desktop sidebar, tablet category tabs, or mobile with showCategoryTabs
    const enableScrollSpy = isDesktop || isTablet || showCategoryTabs;
    useEffect(() => {
        if (!enableScrollSpy) return;

        const handleScroll = () => {
            const container = getActiveScrollContainer();
            const scrollOriginTop = container?.getBoundingClientRect().top || 0;
            const targetTop = scrollOriginTop + stickyControlsOffset + 8;

            let closestCategory = null;
            let closestDistance = Infinity;

            allCategories.forEach((cat: any) => {
                const element = document.getElementById(`cat-${cat.id}`);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const distance = Math.abs(rect.top - targetTop);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestCategory = cat;
                    }
                }
            });

            if (closestCategory && closestCategory.id !== activeCategory?.id) {
                setActiveCategory(closestCategory);
            }
        };

        const container = getActiveScrollContainer();
        window.addEventListener('scroll', handleScroll, { passive: true });
        container?.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [allCategories, activeCategory?.id, enableScrollSpy, getActiveScrollContainer, stickyControlsOffset]);

    // #31: Progressive rendering observer — mark categories visible as they approach viewport
    useEffect(() => {
        if (!useProgressiveRender) return;
        // Always show first 3 categories immediately (above-the-fold content)
        const initialVisible = new Set(allCategories.slice(0, 3).map((c: any) => c.id));
        setVisibleCategoryIds(initialVisible);

        const observer = new IntersectionObserver(
            (entries) => {
                setVisibleCategoryIds(prev => {
                    const next = new Set(prev);
                    let changed = false;
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            const catId = entry.target.getAttribute('data-category-id');
                            if (catId && !next.has(catId)) {
                                next.add(catId);
                                changed = true;
                            }
                        }
                    }
                    return changed ? next : prev;
                });
            },
            { rootMargin: '500px 0px' } // Pre-load 500px before visible
        );

        // Observe all category sentinel elements after render
        requestAnimationFrame(() => {
            allCategories.forEach((cat: any) => {
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) observer.observe(el);
            });
        });

        return () => observer.disconnect();
    }, [useProgressiveRender, allCategories]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Get all items from project files
    const allItems = useMemo(() => {
        return projectData?.files?.flatMap(file =>
            file.extractedData?.data?.items || []
        ) || [];
    }, [projectData?.files]);

    const visibleItems = useMemo(() => {
        return allItems.filter((item: any) =>
            typeof item.category === 'string' && categoriesById.has(item.category),
        );
    }, [allItems, categoriesById]);

    const categoryItemCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        visibleItems.forEach((item: any) => {
            if (item.active === false || typeof item.category !== 'string') return;
            counts[item.category] = (counts[item.category] || 0) + 1;
        });
        return counts;
    }, [visibleItems]);

    const searchDocumentsByItem = useMemo(() => {
        const documents = new Map<any, ReturnType<typeof buildPublicMenuSearchDocument>>();
        if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION) return documents;

        visibleItems.forEach((item: any) => {
            const category = typeof item.category === 'string'
                ? categoriesById.get(item.category)
                : undefined;
            documents.set(item, buildPublicMenuSearchDocument(item, {
                category,
                includePrices: showItemPrices,
                businessType: effectiveBusinessType,
                businessCategory: storeDetails?.businessCategory,
            }));
        });

        return documents;
    }, [visibleItems, categoriesById, showItemPrices, effectiveBusinessType, storeDetails?.businessCategory]);

    // Filter items by search term and active filter
    const filteredItems = useMemo(() => {
        let items = visibleItems;

        // Apply search filter
        if (debouncedSearch) {
            if (FEATURE_FLAGS.ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION) {
                const query = buildPublicMenuSearchQuery(debouncedSearch, {
                    businessType: effectiveBusinessType,
                    businessCategory: storeDetails?.businessCategory,
                });
                items = items.filter((item: any) => {
                    const document = searchDocumentsByItem.get(item);
                    if (!document) return false;
                    return matchesPublicMenuSearchDocument(document, query);
                });
            } else {
                const term = debouncedSearch.toLowerCase();
                items = items.filter((item: any) => {
                    const nameMatch = getMenuText(item.name).toLowerCase().includes(term);
                    const descMatch = getMenuText(item.description).toLowerCase().includes(term);
                    return nameMatch || descMatch;
                });
            }
        }

        // Apply filter chips using normalized attributes
        // Layer 2: Normalization converts tags + decision facts → boolean flags
        if (activeFilter) {
            items = items.filter((item: any) => {
                const attributes = normalizeItemFilterAttributes(item);
                return attributes[activeFilter];
            });
        }

        return items;
    }, [visibleItems, debouncedSearch, getMenuText, activeFilter, searchDocumentsByItem, effectiveBusinessType, storeDetails?.businessCategory]);

    const searchResultSectionCount = useMemo(() => {
        if (!debouncedSearch) return 0;
        return new Set(filteredItems.map((item: any) => item.category).filter(Boolean)).size;
    }, [debouncedSearch, filteredItems]);

    const getItemDecisionChips = useCallback((item: any) => {
        const chips: Array<{ label: string; tone?: 'neutral' | 'warning' }> = [];
        const addChip = (label?: string, tone: 'neutral' | 'warning' = 'neutral') => {
            const normalized = label?.trim();
            if (!normalized) return;
            if (chips.some((chip) => chip.label.toLowerCase() === normalized.toLowerCase())) return;
            chips.push({ label: normalized, tone });
        };

        const normalizedAttributes = normalizeItemFilterAttributes(item);
        if (normalizedAttributes.veg) addChip('Vegetarian');
        if (normalizedAttributes.nonveg) addChip('Non-veg');
        if (normalizedAttributes.forMen) addChip('For men');
        if (normalizedAttributes.forWomen) addChip('For women');
        if (normalizedAttributes.popular) addChip('Popular');

        getDecisionFactArray(item, 'dietaryTags')
            .slice(0, 2)
            .forEach((tag) => addChip(normalizeFactLabel(tag)));

        const spiceLevel = getDecisionFactString(item, 'spiceLevel');
        if (spiceLevel && !['none', 'not spicy', 'no spice'].includes(spiceLevel.toLowerCase())) {
            addChip(`${normalizeFactLabel(spiceLevel)} spice`);
        }

        const durationNumber = getDecisionFactNumber(item, 'duration');
        const durationValue = getDecisionFactValue(item, 'duration');
        if (typeof durationNumber === 'number') {
            addChip(durationNumber <= 90 ? `${durationNumber} min` : `${Math.round(durationNumber / 60)} hr`);
        } else if (typeof durationValue === 'string') {
            addChip(normalizeFactLabel(durationValue));
        }

        const targetAudience = getDecisionFactString(item, 'targetAudience');
        if (targetAudience) addChip(normalizeFactLabel(targetAudience));

        const allergens = getDecisionFactArray(item, 'allergens');
        if (allergens.length > 0) {
            addChip(`Contains ${normalizeFactLabel(allergens[0])}`, 'warning');
        }

        return chips.slice(0, 3);
    }, []);

    useEffect(() => {
        if (!analyticsPreferences.trackMenuViews) return;
        if (!storeDetails?.tenantId || !storeDetails?.storeId || !projectData?.projectId) return;

        const normalizedSearch = debouncedSearch.trim();
        if (normalizedSearch.length < 2) return;
        if (hasTrackedSearchTermInSession(storeDetails.storeId, projectData.projectId, normalizedSearch)) return;

        const timer = window.setTimeout(() => {
            markSearchTermTrackedInSession(storeDetails.storeId, projectData.projectId, normalizedSearch);
            void trackSearch(normalizedSearch, filteredItems.length, {
                tenantId: storeDetails.tenantId,
                storeId: String(storeDetails.storeId),
                projectId: projectData.projectId,
                storeTimeZone: storeDetails.timeZone,
                businessDayEndTime: storeDetails.businessDayEndTime,
                includeLocation: analyticsPreferences.trackLocation,
            });
        }, 900);

        return () => window.clearTimeout(timer);
    }, [
        analyticsPreferences.trackLocation,
        analyticsPreferences.trackMenuViews,
        debouncedSearch,
        filteredItems.length,
        projectData?.projectId,
        storeDetails?.businessDayEndTime,
        storeDetails?.storeId,
        storeDetails?.timeZone,
        storeDetails?.tenantId,
    ]);

    const handleAttributeFilterIntentChange = useCallback((filter: FilterType, label?: string) => {
        if (!analyticsPreferences.trackMenuViews) return;
        if (!storeDetails?.tenantId || !storeDetails?.storeId || !projectData?.projectId) return;

        setMenuAttributeFilterContext(filter, {
            tenantId: storeDetails.tenantId,
            storeId: String(storeDetails.storeId),
            projectId: projectData.projectId,
            storeTimeZone: storeDetails.timeZone,
            businessDayEndTime: storeDetails.businessDayEndTime,
        }, label);
    }, [
        analyticsPreferences.trackMenuViews,
        projectData?.projectId,
        storeDetails?.businessDayEndTime,
        storeDetails?.storeId,
        storeDetails?.tenantId,
        storeDetails?.timeZone,
    ]);

    useEffect(() => {
        if (!stateRestored) return;
        handleAttributeFilterIntentChange(activeFilter, getAttributeFilterAnalyticsLabel(activeFilter));
    }, [activeFilter, handleAttributeFilterIntentChange, stateRestored]);

    // Get items for a category
    const getItemsForCategory = useCallback((categoryId: string) => {
        return filteredItems.filter((item: any) =>
            item.category === categoryId && item.active !== false
        );
    }, [filteredItems]);

    // G14 - History Management: Track if we pushed state (to avoid double-back)
    const historyPushedRef = useRef(false);

    // G14 - Handle item click with history state
    const handleItemClick = useCallback((item: any) => {
        if (item.available === false) {
            if (analyticsPreferences.trackMenuViews && storeDetails?.tenantId && storeDetails?.storeId && projectData?.projectId) {
                const itemName = getMenuText(item.name, 'Unavailable Item');
                void trackUnavailableItemAttempt(item.id, itemName, item.category, {
                    tenantId: storeDetails.tenantId,
                    storeId: String(storeDetails.storeId),
                    projectId: projectData.projectId,
                    storeTimeZone: storeDetails.timeZone,
                    businessDayEndTime: storeDetails.businessDayEndTime,
                    includeLocation: analyticsPreferences.trackLocation,
                });
            }
            setSelectedItemTrackView(false);
            setSelectedItem(item);
            return;
        }

        const categoryId = typeof item.category === 'string' ? item.category : '';
        const category = allCategories.find((cat: any) => cat.id === categoryId);
        const categoryName = getMenuText(category?.name)
            || (typeof item.category === 'object' ? getMenuText(item.category) : undefined);
        const trackedItemName = getMenuText(item.name, 'Menu item');
        trackMenuItemTap({
            itemId: item.id,
            name: trackedItemName,
            category: categoryName,
            categoryId,
            categoryName,
            price: showItemPrices
                ? (typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price)
                : undefined,
            currency: currencyCode,
        });

        setSelectedItemTrackView(true);
        setSelectedItem(item);

        // G14: Push history state for back button support
        // Human-readable slug URLs for shareability + AI crawlability
        // Format: /menu/item/{slug}-{shortId} — slug for readability, shortId for uniqueness
        const itemSlugName = getMenuText(item.name);
        const itemSlug = slugify(itemSlugName);
        const shortId = item.id?.slice(-6) || '';
        const urlSegment = itemSlug ? `${itemSlug}-${shortId}` : item.id;
        const basePath = getMenuBasePath();

        historyPushedRef.current = true;
        window.history.pushState(
            { modal: 'item', itemId: item.id },
            '',
            `${basePath}/item/${urlSegment}`
        );
    }, [allCategories, analyticsPreferences.trackLocation, analyticsPreferences.trackMenuViews, currencyCode, getMenuBasePath, getMenuText, projectData?.projectId, showItemPrices, storeDetails?.storeId, storeDetails?.tenantId, trackMenuItemTap]);

    // G14 - Handle modal close (X button / overlay tap)
    const handleModalClose = useCallback(() => {
        if (historyPushedRef.current) {
            // Go back in history (will trigger popstate which clears selectedItem)
            historyPushedRef.current = false;
            window.history.back();
        } else {
            // Direct close without history (e.g., direct link then close)
            window.history.replaceState({}, '', getMenuBasePath());
            setSelectedItem(null);
        }
        setSelectedItemTrackView(true);
    }, [getMenuBasePath]);

    // G14 - Track selected item for popstate handler (avoids stale closure)
    const selectedItemRef = useRef<any>(null);
    useEffect(() => {
        selectedItemRef.current = selectedItem;
    }, [selectedItem]);

    // G14 - Handle browser back button (popstate event)
    useEffect(() => {
        const handlePopState = () => {
            // Intent-based: only close if PDP is actually open
            // Future-proof for other modals (language picker, filters, etc.)
            if (selectedItemRef.current) {
                historyPushedRef.current = false;
                setSelectedItem(null);
                setSelectedItemTrackView(true);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // G14 - Direct link load: Open PDP if URL contains item path
    // Supports both new slug URLs (/menu/item/butter-chicken-abc123) and legacy ID URLs (/menu/item/item_abc123)
    useEffect(() => {
        if (allItems.length === 0) return; // Wait for items to load

        // Segment-based parsing (robust against query params, trailing slashes, locale prefixes)
        const pathSegments = window.location.pathname.split('/');
        const itemIndex = pathSegments.indexOf('item');
        if (itemIndex !== -1 && pathSegments[itemIndex + 1]) {
            const urlSegment = pathSegments[itemIndex + 1];

            // 1. Try exact ID match first (backward compatible with old URLs)
            let item = allItems.find((i: any) => i.id === urlSegment);

            // 2. Try slug-shortId match: extract last 6 chars as shortId
            if (!item && urlSegment.length > 7) {
                const shortId = urlSegment.slice(-6);
                item = allItems.find((i: any) => i.id?.endsWith(shortId));
            }

            // 3. Try slug-only match (best effort for manually constructed URLs)
            if (!item) {
                item = allItems.find((i: any) => {
                    const name = getMenuText(i.name);
                    return slugify(name) === urlSegment || urlSegment.startsWith(slugify(name));
                });
            }

            if (item && item.available !== false) {
                setSelectedItemTrackView(true);
                setSelectedItem(item);
                // Don't push history - we're already at the correct URL
                historyPushedRef.current = false;
            }
        }
    }, [allItems, getMenuText]);

    const scrollToCategoryElement = useCallback((categoryId: string) => {
        const element = document.getElementById(`cat-${categoryId}`);
        if (!element) return false;

        const container = getActiveScrollContainer();
        const offset = stickyControlsOffset + 12;
        const initialElementRect = element.getBoundingClientRect();
        const documentTop = Math.max(0, window.scrollY + initialElementRect.top - offset);
        const containerTop = container
            ? Math.max(0, container.scrollTop + initialElementRect.top - container.getBoundingClientRect().top - offset)
            : null;

        if (container && containerTop !== null) {
            container.scrollTo({ top: containerTop, behavior: 'smooth' });
        }
        window.scrollTo({ top: documentTop, behavior: 'smooth' });
        window.setTimeout(() => {
            window.dispatchEvent(new Event('scroll'));
        }, 420);
        return true;
    }, [getActiveScrollContainer, stickyControlsOffset]);

    // Handle category selection (scroll to category)
    const handleCategorySelect = useCallback((category: any) => {
        if (category?.id) {
            const didScroll = scrollToCategoryElement(category.id);
            if (!didScroll) return;
            setActiveCategory(category);
            return;
        }

        setActiveCategory(category);
    }, [scrollToCategoryElement]);

    const handleBrowseCategorySelect = useCallback((category: any, source?: string) => {
        if (searchTerm || debouncedSearch) {
            setPendingBrowseCategory(category);
            clearSearch();
            return;
        }

        if (source === 'CATEGORY-ANCHOR' || source === 'MENU-POPOVER') {
            setActiveCategory(category);
            return;
        }

        handleCategorySelect(category);
    }, [clearSearch, debouncedSearch, handleCategorySelect, searchTerm]);

    const displayActiveCategory = debouncedSearch ? null : activeCategory;
    const activeCategoryTabId = displayActiveCategory?.id;

    useEffect(() => {
        if (!pendingBrowseCategory || searchTerm || debouncedSearch) return;

        const frame = requestAnimationFrame(() => {
            handleCategorySelect(pendingBrowseCategory);
            setPendingBrowseCategory(null);
        });

        return () => cancelAnimationFrame(frame);
    }, [debouncedSearch, handleCategorySelect, pendingBrowseCategory, searchTerm]);

    useEffect(() => {
        if (isDesktop || !showTabsBar || !activeCategoryTabId) return;

        const tab = categoryTabRefs.current[activeCategoryTabId];
        if (!tab) return;

        const frame = requestAnimationFrame(() => {
            tab.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        });

        return () => cancelAnimationFrame(frame);
    }, [activeCategoryTabId, isDesktop, showTabsBar]);

    // Styles
    const containerStyle: React.CSSProperties = {
        minHeight: from === 'main-website' ? '100dvh' : 'calc(100dvh - 76px)',
        background: backgroundImage
            ? `${moodConfig.backgroundOverlay ? `${moodConfig.backgroundOverlay}, ` : ''}url(${backgroundImage}) center/cover no-repeat fixed`
            : moodConfig.background,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'clip',
        position: 'relative',
    };

    const scrollContentStyle: React.CSSProperties = {
        flex: 1,
        paddingTop: `calc(${spacing.container}px + env(safe-area-inset-top))`,
        paddingRight: spacing.container,
        paddingBottom: `calc(${spacing.container}px + env(safe-area-inset-bottom) + ${isDesktop ? 0 : 24}px)`,
        paddingLeft: spacing.container,
        boxSizing: 'border-box',
        overflowX: 'clip',
        overflowY: isPublicSurface ? 'visible' : 'auto',
        scrollPaddingTop: `calc(72px + env(safe-area-inset-top))`,
        scrollPaddingBottom: `calc(96px + env(safe-area-inset-bottom))`,
    };

    const contentStyle: React.CSSProperties = {
        maxWidth: isDesktop ? 1200 : isTablet ? 960 : 768,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'clip',
    };
    const stickyControlsStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        zIndex: 70,
        marginBottom: 16,
        paddingTop: isMobile || isTablet ? 'calc(6px + env(safe-area-inset-top))' : 0,
        paddingBottom: showTabsBar ? 8 : 8,
        background: moodConfig.background,
        borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}`,
        boxShadow: `0 1px 0 ${moodConfig.itemStyle.borderColor}`,
    };
    const commandLayerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: showTabsBar ? 8 : 0,
    };
    const categoryTabsStyle: React.CSSProperties = {
        display: 'flex',
        gap: 6,
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'auto',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        marginBottom: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
    };
    const categoryNavRadius = Math.max(4, moodConfig.categoryStyle.borderRadius ?? 0);
    const categoryNavBackground = moodConfig.categoryStyle.background !== 'transparent'
        ? moodConfig.categoryStyle.background
        : moodConfig.itemStyle.background;
    const categoryNavBorderWidth = moodConfig.categoryStyle.borderWidth ?? 1;
    const bottomMetaTheme = {
        background: moodConfig.background,
        mutedColor: moodConfig.descriptionColor || moodConfig.bodyColor,
        borderColor: moodConfig.categoryStyle.dividerColor || moodConfig.itemStyle.borderColor,
        fontFamily: moodConfig.bodyFont,
    };
    const bottomMetaStyle: React.CSSProperties = {
        marginTop: spacing.category,
        padding: isMobile ? '10px 0 12px' : '12px 0 14px',
        borderTop: `1px solid ${moodConfig.itemStyle.borderColor}`,
        borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}`,
    };

    const categoryHeaderStyle: React.CSSProperties = {
        fontFamily: moodConfig.headingFont,
        fontSize: isMobile ? 14 : 15,
        fontWeight: 700,
        color: moodConfig.headingColor,
        margin: 0,
        textTransform: moodConfig.categoryStyle.titleTransform || 'none',
        letterSpacing: moodConfig.categoryStyle.titleLetterSpacing || '0',
        lineHeight: 1.3,
    };

    const getCategoryHeaderFrameStyle = (): React.CSSProperties => {
        const categoryBorderWidth = moodConfig.categoryStyle.borderWidth || 0;
        const hasCategorySurface =
            categoryBorderWidth > 0 ||
            moodConfig.categoryStyle.background !== 'transparent';

        return {
            marginBottom: Math.max(8, spacing.item - 2),
            ...(hasCategorySurface && {
                background: moodConfig.categoryStyle.background,
                border: categoryBorderWidth > 0
                    ? `${categoryBorderWidth}px solid ${moodConfig.categoryStyle.borderColor}`
                    : 'none',
                borderRadius: moodConfig.categoryStyle.borderRadius,
                padding: isMobile ? 8 : spacing.item,
            }),
        };
    };

    const getDividerStyle = (): React.CSSProperties | null => {
        const dividerColor = moodConfig.categoryStyle.dividerColor || moodConfig.accentColor;
        const baseStyle: React.CSSProperties = {
            marginTop: 8,
            marginBottom: 0,
            opacity: 0.72,
        };

        switch (moodConfig.categoryStyle.dividerStyle) {
            case 'line':
                return {
                    ...baseStyle,
                    height: 1,
                    width: 56,
                    background: dividerColor,
                };
            case 'gradient':
                return {
                    ...baseStyle,
                    height: 1,
                    width: '100%',
                    background: `linear-gradient(90deg, ${dividerColor}, transparent)`,
                };
            case 'dots':
                return {
                    ...baseStyle,
                    height: 4,
                    width: 44,
                    backgroundImage: `radial-gradient(circle, ${dividerColor} 1.5px, transparent 1.5px)`,
                    backgroundSize: '10px 4px',
                    backgroundRepeat: 'repeat-x',
                };
            default:
                return null;
        }
    };

    const getItemStyle = (): React.CSSProperties => ({
        display: 'flex',
        flexDirection: imageOnTop ? 'column' : 'row',
        gap: isMobile ? 10 : 12,
        padding: isMobile ? 11 : 14,
        background: moodConfig.itemStyle.background,
        border: `${moodConfig.itemStyle.borderWidth || 1}px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: moodConfig.itemStyle.borderRadius,
        cursor: 'pointer',
        transition: 'transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
    });

    const handleItemMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
        const hoverEffect = moodConfig.itemStyle.hoverEffect || 'none';
        if (hoverEffect === 'none') return;

        if (hoverEffect === 'lift') {
            event.currentTarget.style.transform = 'translateY(-1px)';
            event.currentTarget.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.10)';
            return;
        }

        if (hoverEffect === 'scale') {
            event.currentTarget.style.transform = 'scale(1.01)';
            return;
        }

        if (hoverEffect === 'glow') {
            event.currentTarget.style.boxShadow =
                moodConfig.itemStyle.hoverGlow || `0 0 0 3px ${moodConfig.accentColor}14`;
        }
    };

    const handleItemMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
        if ((moodConfig.itemStyle.hoverEffect || 'none') === 'none') return;
        event.currentTarget.style.transform = '';
        event.currentTarget.style.boxShadow = '';
    };

    const itemNameStyle: React.CSSProperties = {
        fontFamily: moodConfig.bodyFont,
        fontSize: isMobile ? 14 : 15,
        fontWeight: 600,
        color: moodConfig.headingColor,
        margin: 0,
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    };

    const itemDescStyle: React.CSSProperties = {
        fontFamily: moodConfig.bodyFont,
        fontSize: isMobile ? 12 : 13,
        color: moodConfig.descriptionColor || moodConfig.bodyColor,
        margin: 0,
        marginTop: 3,
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    };

    const priceStyle: React.CSSProperties = {
        fontFamily: moodConfig.bodyFont,
        fontSize: isMobile ? 13 : 14,
        fontWeight: 600,
        color: moodConfig.priceColor,
        opacity: 0.88,
        marginTop: 'auto',
        lineHeight: 1.3,
        ...(moodConfig.itemStyle.priceStyle === 'badge' && moodConfig.itemStyle.priceBadgeColor && {
            background: moodConfig.itemStyle.priceBadgeColor,
            padding: '2px 8px',
            borderRadius: 4,
            width: 'fit-content',
        }),
    };

    const itemFactRowStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 6,
    };

    const itemFactChipStyle = (tone: 'neutral' | 'warning' = 'neutral'): React.CSSProperties => ({
        border: `1px solid ${tone === 'warning' ? `${moodConfig.priceColor}36` : moodConfig.itemStyle.borderColor}`,
        borderRadius: 999,
        color: tone === 'warning' ? moodConfig.priceColor : moodConfig.bodyColor,
        background: tone === 'warning' ? `${moodConfig.priceColor}10` : `${moodConfig.accentColor}08`,
        fontFamily: moodConfig.bodyFont,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: '16px',
        maxWidth: '100%',
        overflow: 'hidden',
        padding: '2px 7px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    });

    const searchResultSummaryStyle: React.CSSProperties = {
        alignItems: 'center',
        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: moodConfig.itemStyle.borderRadius,
        color: moodConfig.bodyColor,
        display: 'flex',
        fontFamily: moodConfig.bodyFont,
        fontSize: 13,
        justifyContent: 'space-between',
        lineHeight: '18px',
        marginBottom: 16,
        padding: '9px 12px',
        background: `${moodConfig.accentColor}08`,
    };

    return (
        <div style={containerStyle}>
            <div ref={scrollContainerRef} style={scrollContentStyle}>
                <div style={contentStyle}>
                    <div
                        id="menu-top"
                        data-menu-top-anchor
                        aria-hidden="true"
                        style={{
                            height: 1,
                            pointerEvents: 'none',
                            width: 1,
                        }}
                    />
                    {/* Sticky command layer: retrieval first, section navigation second */}
                    <div style={stickyControlsStyle}>
                        <div style={commandLayerStyle}>
                            <MenuSearchBar
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                moodConfig={moodConfig}
                                businessType={effectiveBusinessType}
                                businessCategory={storeDetails?.businessCategory}
                                isMobile={isMobile}
                                compact={!isDesktop}
                                containerStyle={{ flex: '1 1 auto', minWidth: 0 }}
                            />

                            {showSectionsControl && (
                                <MenuFilters
                                    categories={allCategories}
                                    activeCategory={displayActiveCategory}
                                    onSelectCategory={handleBrowseCategorySelect}
                                    activeLanguage={activeLanguage}
                                    showCategoryIcons={showCategoryIcons}
                                    moodConfig={moodConfig}
                                    triggerVariant="inline"
                                    categoryItemCounts={categoryItemCounts}
                                />
                            )}

                            <MenuLanguageSwitcher
                                projectData={projectData}
                                activeLanguage={activeLanguage}
                                setActiveLanguage={setActiveLanguage}
                                moodConfig={moodConfig}
                                restoreStoredLanguage={restoreStoredLanguage}
                                compact
                            />
                        </div>

                        {!isDesktop && showTabsBar && allCategories.length > 0 && (
                            <div
                                style={categoryTabsStyle}
                                className="hide-scrollbar"
                            >
                                {allCategories.map((cat: any) => (
                                    <a
                                        key={cat.id}
                                        ref={(element) => {
                                            categoryTabRefs.current[cat.id] = element;
                                        }}
                                        href={`#cat-${cat.id}`}
                                        onClick={() => handleBrowseCategorySelect(cat, 'CATEGORY-ANCHOR')}
                                        style={{
                                            boxSizing: 'border-box',
                                            maxWidth: isMobile ? 220 : 260,
                                            minHeight: 40,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 12px',
                                            lineHeight: '18px',
                                            borderRadius: categoryNavRadius,
                                            border: displayActiveCategory?.id === cat.id
                                                ? `${Math.max(1, categoryNavBorderWidth)}px solid ${moodConfig.accentColor}50`
                                                : `${categoryNavBorderWidth}px solid ${moodConfig.categoryStyle.borderColor}`,
                                            background: displayActiveCategory?.id === cat.id
                                                ? `${moodConfig.accentColor}14`
                                                : categoryNavBackground,
                                            color: displayActiveCategory?.id === cat.id
                                                ? moodConfig.accentColor
                                                : moodConfig.bodyColor,
                                            fontFamily: moodConfig.bodyFont,
                                            fontSize: 13,
                                            fontWeight: displayActiveCategory?.id === cat.id ? 600 : 500,
                                            whiteSpace: 'nowrap',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            flexShrink: 0,
                                            scrollSnapAlign: 'start',
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                    >
                                        <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8, maxWidth: '100%', minWidth: 0 }}>
                                            {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && cat.icon ? (
                                                <CategoryIcon
                                                    color={displayActiveCategory?.id === cat.id ? moodConfig.accentColor : moodConfig.bodyColor}
                                                    defaultIcon="LuTag"
                                                    icon={cat.icon}
                                                    size={14}
                                                />
                                            ) : null}
                                            <span
                                                style={{
                                                    display: 'block',
                                                    maxWidth: '100%',
                                                    minWidth: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {getMenuText(cat.name)}
                                            </span>
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Decision Blocks - Recommendation section at top of menu */}
                    {FEATURE_FLAGS.ENABLE_DECISION_BLOCKS && !debouncedSearch && allItems.length > 0 && (
                        <DecisionBlocks
                            items={allItems}
                            categories={allCategories}
                            activeLanguage={activeLanguage}
                            businessType={effectiveBusinessType}
                            moodConfig={moodConfig}
                            onItemClick={handleItemClick}
                            currency={currencySymbol}
                            menuSettings={projectData?.menuSettings}
                            precomputedBlocks={precomputedBlocks}
                            showItemPrices={showItemPrices}
                            analyticsIds={{
                                tenantId: storeDetails?.tenantId,
                                storeId: String(storeDetails?.storeId || ''),
                                projectId: projectData?.projectId,
                                storeTimeZone: storeDetails?.timeZone,
                                businessDayEndTime: storeDetails?.businessDayEndTime,
                            }}
                            trackingEnabled={isDecisionBlockAnalyticsEnabled(storeDetails?.analytics)}
                        />
                    )}

                    {/* Filter Chips - Below category tabs, auto-hide when irrelevant */}
                    <MenuFilterChips
                        items={allItems}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        onFilterIntentChange={handleAttributeFilterIntentChange}
                        moodConfig={moodConfig}
                        businessType={effectiveBusinessType}
                        isSearchActive={!!debouncedSearch}
                    />

                    {debouncedSearch && filteredItems.length > 0 && (
                        <div
                            data-search-results-summary="true"
                            style={searchResultSummaryStyle}
                            aria-live="polite"
                        >
                            <span>
                                {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
                                {' '}across {searchResultSectionCount} {searchResultSectionCount === 1 ? 'section' : 'sections'}
                            </span>
                            <button
                                type="button"
                                onClick={clearSearch}
                                style={{
                                    background: 'transparent',
                                    border: 0,
                                    color: moodConfig.accentColor,
                                    cursor: 'pointer',
                                    fontFamily: moodConfig.bodyFont,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: 0,
                                }}
                            >
                                Show all
                            </button>
                        </div>
                    )}

                    {/* Desktop: Sidebar + Content layout | Mobile/Tablet: Content only */}
                    <div style={{
                        display: 'flex',
                        gap: isDesktop ? 32 : 0,
                        alignItems: 'flex-start',
                    }}>
                        {/* Desktop Sidebar - Sticky category navigation */}
                        {isDesktop && allCategories.length > 1 && (
                            <nav
                                style={{
                                    width: 220,
                                    flexShrink: 0,
                                    position: 'sticky',
                                    top: stickyControlsOffset,
                                    maxHeight: `calc(100vh - ${stickyControlsOffset + 24}px)`,
                                    overflowY: 'auto',
                                    paddingRight: 16,
                                    scrollbarWidth: 'thin',
                                }}
                                aria-label="Menu categories"
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {allCategories.map((cat: any) => {
                                        const isActive = displayActiveCategory?.id === cat.id;
                                        return (
                                            <a
                                                key={cat.id}
                                                href={`#cat-${cat.id}`}
                                                onClick={() => handleBrowseCategorySelect(cat, 'CATEGORY-ANCHOR')}
                                                style={{
                                                    padding: '10px 16px',
                                                    borderRadius: categoryNavRadius,
                                                    border: 'none',
                                                    background: isActive ? `${moodConfig.accentColor}15` : 'transparent',
                                                    color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                                    fontFamily: moodConfig.bodyFont,
                                                    fontSize: 14,
                                                    fontWeight: isActive ? 600 : 400,
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    borderLeft: isActive
                                                        ? `${Math.max(3, categoryNavBorderWidth)}px solid ${moodConfig.accentColor}`
                                                        : `${Math.max(3, categoryNavBorderWidth)}px solid transparent`,
                                                    display: 'block',
                                                    textDecoration: 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        (e.currentTarget as HTMLAnchorElement).style.background = `${moodConfig.accentColor}08`;
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                                                    }
                                                }}
                                            >
                                                <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
                                                    {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && cat.icon ? (
                                                        <CategoryIcon
                                                            color={isActive ? moodConfig.accentColor : moodConfig.bodyColor}
                                                            defaultIcon="LuTag"
                                                            icon={cat.icon}
                                                            size={15}
                                                        />
                                                    ) : null}
                                                    <span>{getMenuText(cat.name)}</span>
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </nav>
                        )}

                        {/* Main menu content area */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Categories & Items */}
                            {allCategories.map((category: any) => {
                                const items = getItemsForCategory(category.id);
                                if (items.length === 0 && debouncedSearch) return null;
                                const categoryHasImages = items.some((item: any) => !!item.images?.[0]?.url);
                                const categoryHeaderFrameStyle = getCategoryHeaderFrameStyle();
                                const renderedDividerStyle = getDividerStyle();

                                // #31: Progressive rendering — show placeholder for off-screen categories
                                const isCategoryVisible = !useProgressiveRender || visibleCategoryIds.has(category.id);

                                return (
                                    <section
                                        key={category.id}
                                        id={`cat-${category.id}`}
                                        data-category-id={category.id}
                                        style={{
                                            marginBottom: spacing.category,
                                            scrollMarginTop: `calc(${stickyControlsOffset + 16}px + env(safe-area-inset-top))`,
                                        }}
                                    >
                                        <header style={categoryHeaderFrameStyle}>
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                                                {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && category.icon ? (
                                                    <div
                                                        style={{
                                                            alignItems: 'center',
                                                            background: `${moodConfig.accentColor}12`,
                                                            border: `1px solid ${moodConfig.categoryStyle.borderColor}`,
                                                            borderRadius: categoryNavRadius,
                                                            display: 'flex',
                                                            flexShrink: 0,
                                                            height: 28,
                                                            justifyContent: 'center',
                                                            width: 28,
                                                        }}
                                                    >
                                                        <CategoryIcon
                                                            color={moodConfig.headingColor}
                                                            defaultIcon="LuTag"
                                                            icon={category.icon}
                                                            size={16}
                                                        />
                                                    </div>
                                                ) : null}
                                                <h2 style={categoryHeaderStyle}>{getMenuText(category.name, 'Category')}</h2>
                                            </div>
                                            {renderedDividerStyle && <div style={renderedDividerStyle} />}
                                        </header>

                                        {!isCategoryVisible ? (
                                            // #31: Lightweight placeholder — estimated height based on item count
                                            <div style={{
                                                height: items.length * 88,
                                                background: 'transparent',
                                            }} />
                                        ) : (
                                            <div style={{
                                                display: gridColumns > 1 ? 'grid' : 'flex',
                                                gridTemplateColumns: gridColumns > 1 ? `repeat(${gridColumns}, 1fr)` : undefined,
                                                flexDirection: gridColumns > 1 ? undefined : 'column',
                                                gap: spacing.itemGap,
                                            }}>
                                                {items.map((item: any, itemIndex: number) => {
                                                    const isAvailable = item.available !== false;
                                                    const itemName = getMenuText(item.name, 'Menu item');
                                                    const itemDescription = getMenuText(item.description);
                                                    const itemDecisionChips = getItemDecisionChips(item);

                                                    // G10 ENFORCEMENT: Image quota per category
                                                    const reserveItemImageSlot = shouldShowItemImages && categoryHasImages && itemIndex < layoutConfig.maxImagesPerCategory;
                                                    const itemImageUrl = item.images?.[0]?.url;

                                                    return (
                                                        <article
                                                            key={item.id}
                                                            id={`item-${item.id}`}
                                                            onClick={() => handleItemClick(item)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter' || event.key === ' ') {
                                                                    event.preventDefault();
                                                                    handleItemClick(item);
                                                                }
                                                            }}
                                                            onMouseEnter={isAvailable ? handleItemMouseEnter : undefined}
                                                            onMouseLeave={isAvailable ? handleItemMouseLeave : undefined}
                                                            style={{
                                                                ...getItemStyle(),
                                                                opacity: isAvailable ? 1 : 0.5,
                                                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                            }}
                                                            // G08 - Tap feedback + desktop hover
                                                            className={isAvailable
                                                                ? 'active:scale-[0.98] active:opacity-90 transition-all duration-100'
                                                                : ''
                                                            }
                                                            role="button"
                                                            tabIndex={isAvailable ? 0 : -1}
                                                            aria-label={itemName}
                                                        >
                                                            {reserveItemImageSlot && (
                                                                <div
                                                                    style={{
                                                                        position: 'relative',
                                                                        width: imageOnTop ? '100%' : (isMobile ? 64 : 80),
                                                                        height: imageOnTop ? (isMobile ? 124 : 132) : (isMobile ? 64 : 80),
                                                                        borderRadius: moodConfig.itemStyle.imageRadius || 6,
                                                                        overflow: 'hidden',
                                                                        flexShrink: 0,
                                                                        backgroundColor: `${moodConfig.accentColor}08`,
                                                                        border: moodConfig.itemStyle.imageBorder || `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                                    }}
                                                                    data-image-container={item.id}
                                                                >
                                                                    {!itemImageUrl && (
                                                                        <div
                                                                            aria-hidden="true"
                                                                            style={{
                                                                                alignItems: 'center',
                                                                                color: moodConfig.bodyColor,
                                                                                display: 'flex',
                                                                                inset: 0,
                                                                                justifyContent: 'center',
                                                                                opacity: 0.28,
                                                                                position: 'absolute',
                                                                            }}
                                                                        >
                                                                            <LuImage size={imageOnTop ? 22 : 18} />
                                                                        </div>
                                                                    )}
                                                                    {itemImageUrl && (
                                                                        <Image
                                                                            src={itemImageUrl}
                                                                            alt={itemName}
                                                                            fill
                                                                            style={{ objectFit: 'cover' }}
                                                                            sizes={isDesktop ? '300px' : '(max-width: 768px) 50vw, 200px'}
                                                                            onError={(e) => {
                                                                                // G04 Runtime Fallback: Keep the reserved slot to avoid scroll jumps.
                                                                                e.currentTarget.style.opacity = '0';
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                                    <h3 style={itemNameStyle}>
                                                                        {renderHighlightedText(itemName, debouncedSearch, moodConfig.accentColor)}
                                                                    </h3>
                                                                    {showItemPrices && !item.attributes?.length && hasDisplayPrice(item.price) && (
                                                                        <span style={{ ...priceStyle, marginTop: 0, whiteSpace: 'nowrap' }}>
                                                                            {formatMenuPrice(item.price, currencySymbol, { fractionDigits: 2 })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {itemDecisionChips.length > 0 && (
                                                                    <div style={itemFactRowStyle} aria-label="Item details">
                                                                        {itemDecisionChips.map((chip) => (
                                                                            <span key={chip.label} style={itemFactChipStyle(chip.tone)}>
                                                                                {chip.label}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {itemDescription && (
                                                                    <p style={itemDescStyle}>
                                                                        {renderHighlightedText(itemDescription, debouncedSearch, moodConfig.accentColor)}
                                                                    </p>
                                                                )}
                                                                {!isAvailable && (
                                                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#ef4444', marginTop: 4 }}>
                                                                        {unavailableLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}

                            {/* Empty state */}
                            {allCategories.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: 40,
                                    color: moodConfig.bodyColor,
                                    fontFamily: moodConfig.bodyFont,
                                }}>
                                    No {labels.itemsPlural} yet
                                </div>
                            )}

                            {/* No results state */}
                            {debouncedSearch && filteredItems.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: 40,
                                    color: moodConfig.bodyColor,
                                    fontFamily: moodConfig.bodyFont,
                                }}>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: moodConfig.headingColor }}>
                                        No {labels.itemsPlural} found for &ldquo;{debouncedSearch}&rdquo;
                                    </div>
                                    <p style={{ margin: '10px auto 0', maxWidth: 420, lineHeight: 1.5 }}>
                                        Try another spelling, jump back into a section, or contact the business directly.
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: 8,
                                        marginTop: 16,
                                    }}>
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            style={{
                                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                borderRadius: categoryNavRadius,
                                                padding: '8px 14px',
                                                background: moodConfig.itemStyle.background,
                                                color: moodConfig.accentColor,
                                                fontFamily: moodConfig.bodyFont,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Show all
                                        </button>
                                        {suggestedCategories.map((category: any) => (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() => handleBrowseCategorySelect(category)}
                                                style={{
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                    borderRadius: categoryNavRadius,
                                                    padding: '8px 14px',
                                                    background: moodConfig.itemStyle.background,
                                                    color: moodConfig.bodyColor,
                                                    fontFamily: moodConfig.bodyFont,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {getMenuText(category.name, 'Category')}
                                            </button>
                                        ))}
                                        {recoveryActions.map((action) => (
                                            <a
                                                key={action.label}
                                                href={action.href}
                                                onClick={(event) => trackBeforeNavigate({
                                                    event,
                                                    href: action.href,
                                                    target: action.external ? '_blank' : undefined,
                                                    track: action.track,
                                                })}
                                                target={action.external ? '_blank' : undefined}
                                                rel={action.external ? 'noopener noreferrer' : undefined}
                                                style={{
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                    borderRadius: categoryNavRadius,
                                                    padding: '8px 14px',
                                                    background: moodConfig.itemStyle.background,
                                                    color: moodConfig.accentColor,
                                                    fontFamily: moodConfig.bodyFont,
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                {action.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inline Feedback Nudge — timed prompt for customer feedback */}
                    {/* Only on live pages (not editor preview), only if feedback enabled */}
                    {from === 'main-website' &&
                        FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK &&
                        !debouncedSearch &&
                        storeDetails?.feedbackEnabled !== false &&
                        projectData?.menuSettings?.feedback !== false &&
                        projectData?.projectId && (
                            <FeedbackNudge
                                projectId={projectData.projectId}
                                reviewUrl={storeDetails?.reviewUrl}
                                moodConfig={moodConfig}
                                scrollContainerRef={scrollContainerRef}
                            />
                        )}

                    {/* Menu meta moves to the bottom so browsing controls stay focused at the top. */}
                    <section style={bottomMetaStyle} aria-label="Menu status and language">
                        <MenuHeader
                            activeDeviceType={activeDeviceType}
                            projectData={projectData}
                            activeLanguage={activeLanguage}
                            setActiveLanguage={setActiveLanguage}
                            moodConfig={moodConfig}
                            restoreStoredLanguage={restoreStoredLanguage}
                            placement="bottom"
                            showLanguageSelector={false}
                        />

                        {FEATURE_FLAGS.ENABLE_MENU_TRUST_SIGNALS && (
                            <TrustSignals
                                businessType={effectiveBusinessType || storeDetails?.businessType || ''}
                                lastPublishedAt={projectData?.lastPublishedAt || null}
                                locationArea={storeDetails?.area || null}
                                city={storeDetails?.city || null}
                                workingHours={storeDetails?.workingHours}
                                timeZone={storeDetails?.timeZone}
                                theme={bottomMetaTheme}
                                showBorder={false}
                            />
                        )}
                    </section>

                    {/* 
                      * CONSTITUTIONAL ORDER (DO NOT CHANGE):
                      * 1. Pricing disclosures (G06)
                      * 2. Business identity (G09)
                      * This order is trust hierarchy - pricing truth before identity.
                      */}

                    {/* G06 - Service Charge Disclosure (Trust Zone - Pricing Truth) */}
                    <ServiceChargeNote note={getLocalizedText(projectData?.menuSettings?.specialNote, activeLanguage, projectData?.defaultLanguage || 'en', '')} />

                    {/* G09 - Contact/Location Display (Trust Zone - Business Identity) */}
                    <MenuFooter
                        storeDetails={storeDetails}
                        moodConfig={moodConfig}
                        languages={projectData?.languages}
                        activeLanguage={activeLanguage}
                        projectId={projectData?.projectId}
                        feedbackEnabled={projectData?.menuSettings?.feedback}
                        menuVersion={projectData?.menuVersion}
                        lastPublishedAt={projectData?.lastPublishedAt}
                        onLanguageSelect={setActiveLanguage}
                        showLanguageSelector={false}
                        showUpdateMeta={false}
                        analyticsIds={{
                            tenantId: storeDetails?.tenantId,
                            storeId: String(storeDetails?.storeId || ''),
                            projectId: projectData?.projectId,
                            storeTimeZone: storeDetails?.timeZone,
                            businessDayEndTime: storeDetails?.businessDayEndTime,
                        }}
                        trackingEnabled={analyticsPreferences.trackMenuViews}
                    />
                </div>
            </div>

            {/* G07 - Back to Top Control (Accessibility - Long Menu Navigation) */}
            <BackToTop scrollContainerRef={scrollContainerRef} moodConfig={moodConfig} />

            {/* PDP Modal */}
            {/* G14: Uses handleModalClose for proper history management */}
            <PDPModal
                item={selectedItem}
                onClose={handleModalClose}
                language={activeLanguage}
                moodConfig={moodConfig}
                projectData={projectData}
                showItemPrices={showItemPrices}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                unavailableLabel={unavailableLabel}
                trackView={selectedItemTrackView}
                recoveryActions={recoveryActions}
            />
        </div>
    );
}

export default MenuPageNew;
