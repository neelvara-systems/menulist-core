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
import { isCategoryVisibleByTime } from '@hook/useTimedCategories';
import { getResolvedAnalyticsPreferences, isDecisionBlockAnalyticsEnabled } from '@lib/analytics/preferences';
import { hasTrackedSearchTermInSession, markSearchTermTrackedInSession } from '@lib/analytics/searchDedup';
import { trackMenuAction, trackSearch, trackUnavailableItemAttempt } from '@lib/analytics/unified';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { slugify } from '@lib/utils/slugify';
import { StoreDataType } from '@type/platform/store';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Project } from '../../types';
import { DEFAULTS, getMoodWithBrandColor, MENU_LAYOUTS, MenuLayout, MenuMood, SPACING } from '../designSystem';
import BackToTop from '../output/BackToTop';
import DecisionBlocks from '../output/DecisionBlocks';
import FeedbackNudge from '../output/FeedbackNudge';
import MenuFilterChips, { FilterType } from '../output/MenuFilterChips';
import MenuFilters from '../output/MenuFilters';
import MenuFooter from '../output/MenuFooter';
import MenuHeader from '../output/MenuHeader';
import MenuSearchBar from '../output/MenuSearchBar';
import PDPModal from '../output/PDPModal';
import ServiceChargeNote from '../output/ServiceChargeNote';
import { DeviceTypes, PageType } from '../types';
import { normalizeTags } from '../utils/normalizeItemAttributes';

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
}

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
    setActivePage,
    activeLanguage,
    projectData,
    storeDetails,
    setActiveLanguage,
    from,
    businessType,
    precomputedBlocks
}: MenuPageNewProps) {
    const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
    const getMenuBasePath = useCallback(() => {
        if (typeof window === 'undefined') return '/menu';

        const itemPathMatch = window.location.pathname.match(/^(.*)\/item\/[^/]+\/?$/);
        if (itemPathMatch?.[1]) {
            return itemPathMatch[1];
        }

        return window.location.pathname;
    }, []);

    const getScrollPosition = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
            return container.scrollTop;
        }

        return window.scrollY;
    }, []);

    const restoreScrollPosition = useCallback((scrollY: number) => {
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
            container.scrollTo({ top: scrollY, behavior: 'auto' });
            return;
        }

        window.scrollTo({ top: scrollY, behavior: 'auto' });
    }, []);

    const moodConfig = getMoodWithBrandColor(mood, brandAccentColor);
    const layoutConfig = MENU_LAYOUTS[layout];
    const spacing = SPACING[moodConfig.spacing];
    const isMobile = activeDeviceType === 'mobile';
    const isTablet = activeDeviceType === 'tablet';
    const isDesktop = activeDeviceType === 'desktop';
    const labels = useMemo(() => getOfferingLabels(businessType), [businessType]);

    // Layout properties from config
    const isGridLayout = layoutConfig.itemsPerRow > 1;
    const imageOnTop = layoutConfig.imagePosition === 'top';

    // Responsive grid: desktop/tablet always get multi-column, mobile follows layout config
    const gridColumns = isDesktop ? (isGridLayout ? 3 : 2) : isTablet ? 2 : (isGridLayout ? 2 : 1);

    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedItemTrackView, setSelectedItemTrackView] = useState(true);
    const [activeCategory, setActiveCategory] = useState<any>(null);

    // B.1: Track if category tabs are visible (for tabs/FAB mutual exclusivity)
    const [categoryTabsVisible, setCategoryTabsVisible] = useState(true);
    const categoryTabsRef = useRef<HTMLDivElement>(null);

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
    const unavailableLabel = useMemo(() => getUnavailableLabel(businessType), [businessType]);
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
            if (!analyticsPreferences.trackMenuViews || !analyticsIds) return;
            void trackMenuAction(menuAction, analyticsIds);
        };

        return [
            (publicPresence?.showCall !== false) && callHref ? {
                label: 'Call',
                href: callHref,
                onClick: () => trackRecoveryAction('call'),
            } : null,
            (publicPresence?.showWhatsApp !== false) && whatsappHref ? {
                label: 'WhatsApp',
                href: whatsappHref,
                external: true,
                onClick: () => trackRecoveryAction('whatsapp'),
            } : null,
            (publicPresence?.showDirections !== false) && directionsHref ? {
                label: 'Directions',
                href: directionsHref,
                external: true,
                onClick: () => trackRecoveryAction('directions'),
            } : null,
            (publicPresence?.showReservation !== false) && publicPresence?.reservationUrl ? {
                label: 'Reserve',
                href: publicPresence.reservationUrl,
                external: true,
                onClick: () => trackRecoveryAction('reserve'),
            } : null,
            (publicPresence?.showOrder !== false) && publicPresence?.orderUrl ? {
                label: 'Order',
                href: publicPresence.orderUrl,
                external: true,
                onClick: () => trackRecoveryAction('order'),
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

                // Restore filter
                if (filter) {
                    setActiveFilter(filter);
                }

                // Restore active category
                if (category) {
                    const cat = allCategories.find((c: any) => c.id === category);
                    if (cat) setActiveCategory(cat);
                }

                // Restore scroll position after content renders
                if (scrollY && scrollY > 0) {
                    requestAnimationFrame(() => {
                        restoreScrollPosition(scrollY);
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
                    const state = {
                        scrollY: getScrollPosition(),
                        filter: activeFilter,
                        category: activeCategory?.id || null,
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
    }, [storageKey, activeFilter, activeCategory, getScrollPosition]);

    // B.1: Intersection Observer for tabs/FAB mutual exclusivity
    // Activates when category tabs are rendered (mobile with showCategoryTabs OR tablet always)
    const showTabsBar = !isDesktop && (showCategoryTabs || isTablet);
    useEffect(() => {
        if (!categoryTabsRef.current || !showTabsBar) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // FAB shows when tabs are NOT visible (scrolled out of view)
                setCategoryTabsVisible(entry.isIntersecting);
            },
            { threshold: 0.1, rootMargin: '-50px 0px 0px 0px' }
        );

        observer.observe(categoryTabsRef.current);
        return () => observer.disconnect();
    }, [showTabsBar]);

    // Scroll spy - update active category based on scroll position
    // Activates for: desktop sidebar, tablet category tabs, or mobile with showCategoryTabs
    const enableScrollSpy = isDesktop || isTablet || showCategoryTabs;
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !enableScrollSpy) return;

        const handleScroll = () => {
            const containerRect = container.getBoundingClientRect();
            const containerTop = containerRect.top;

            let closestCategory = null;
            let closestDistance = Infinity;

            allCategories.forEach((cat: any) => {
                const element = document.getElementById(`cat-${cat.id}`);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const distance = Math.abs(rect.top - containerTop - 100); // 100px offset for header

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

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [allCategories, activeCategory, enableScrollSpy]);

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

    // Filter items by search term and active filter
    const filteredItems = useMemo(() => {
        let items = allItems;

        // Apply search filter
        if (debouncedSearch) {
            const term = debouncedSearch.toLowerCase();
            items = items.filter((item: any) => {
                const nameMatch = item.name?.[activeLanguage]?.toLowerCase().includes(term);
                const descMatch = item.description?.[activeLanguage]?.toLowerCase().includes(term);
                return nameMatch || descMatch;
            });
        }

        // Apply filter chips using normalized attributes
        // Layer 2: Normalization converts tags → boolean flags
        if (activeFilter) {
            items = items.filter((item: any) => {
                const attributes = normalizeTags(item.tags, item.isBestSeller);
                return attributes[activeFilter];
            });
        }

        return items;
    }, [allItems, debouncedSearch, activeLanguage, activeFilter]);

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
        storeDetails?.storeId,
        storeDetails?.tenantId,
    ]);

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
                const itemName = item.name?.[activeLanguage] || item.name?.en || 'Unavailable Item';
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

        setSelectedItemTrackView(true);
        setSelectedItem(item);

        // G14: Push history state for back button support
        // Human-readable slug URLs for shareability + AI crawlability
        // Format: /menu/item/{slug}-{shortId} — slug for readability, shortId for uniqueness
        const itemName = item.name?.[activeLanguage] || item.name?.en || '';
        const itemSlug = slugify(itemName);
        const shortId = item.id?.slice(-6) || '';
        const urlSegment = itemSlug ? `${itemSlug}-${shortId}` : item.id;
        const basePath = getMenuBasePath();

        historyPushedRef.current = true;
        window.history.pushState(
            { modal: 'item', itemId: item.id },
            '',
            `${basePath}/item/${urlSegment}`
        );
    }, [activeLanguage, analyticsPreferences.trackLocation, analyticsPreferences.trackMenuViews, getMenuBasePath, projectData?.projectId, storeDetails?.storeId, storeDetails?.tenantId]);

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
                    const name = i.name?.[activeLanguage] || i.name?.en || '';
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
    }, [allItems, activeLanguage]);

    // Handle category selection (scroll to category)
    const handleCategorySelect = useCallback((category: any) => {
        setActiveCategory(category);
        if (category?.id) {
            const element = document.getElementById(`cat-${category.id}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    // Styles
    const containerStyle: React.CSSProperties = {
        minHeight: from === 'main-website' ? '100vh' : 'calc(100vh - 76px)',
        background: backgroundImage
            ? `url(${backgroundImage}) center/cover no-repeat fixed`
            : moodConfig.background,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    };

    const scrollContentStyle: React.CSSProperties = {
        flex: 1,
        paddingTop: spacing.container,
        paddingRight: spacing.container,
        paddingBottom: spacing.container,
        paddingLeft: spacing.container,
        overflowY: 'auto',
    };

    const contentStyle: React.CSSProperties = {
        maxWidth: isDesktop ? 1200 : isTablet ? 960 : 768,
        margin: '0 auto',
        width: '100%',
    };

    const categoryHeaderStyle: React.CSSProperties = {
        fontFamily: moodConfig.headingFont,
        fontSize: isMobile ? 18 : 20,
        fontWeight: 600,
        color: moodConfig.headingColor,
        margin: 0,
        marginBottom: spacing.item,
        textTransform: moodConfig.categoryStyle.titleTransform || 'none',
        letterSpacing: moodConfig.categoryStyle.titleLetterSpacing || '0',
    };

    const dividerStyle: React.CSSProperties = {
        height: 1,
        width: 48,
        background: moodConfig.categoryStyle.dividerColor || moodConfig.accentColor,
        marginTop: 8,
        marginBottom: spacing.item,
    };

    const getItemStyle = (): React.CSSProperties => ({
        display: 'flex',
        flexDirection: imageOnTop ? 'column' : 'row',
        gap: 12,
        padding: isMobile ? 12 : 16,
        background: moodConfig.itemStyle.background,
        border: `${moodConfig.itemStyle.borderWidth || 1}px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: moodConfig.itemStyle.borderRadius,
        cursor: 'pointer',
        transition: 'transform 0.15s, opacity 0.15s, box-shadow 0.15s',
    });

    const itemNameStyle: React.CSSProperties = {
        fontFamily: moodConfig.headingFont,
        fontSize: isMobile ? 14 : 16,
        fontWeight: 600,
        color: moodConfig.headingColor,
        margin: 0,
    };

    const itemDescStyle: React.CSSProperties = {
        fontFamily: moodConfig.bodyFont,
        fontSize: isMobile ? 12 : 13,
        color: moodConfig.descriptionColor || moodConfig.bodyColor,
        margin: 0,
        marginTop: 4,
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    };

    const priceStyle: React.CSSProperties = {
        fontFamily: moodConfig.bodyFont,
        fontSize: isMobile ? 14 : 15,
        fontWeight: 600,
        color: moodConfig.priceColor,
        marginTop: 'auto',
        ...(moodConfig.itemStyle.priceStyle === 'badge' && moodConfig.itemStyle.priceBadgeColor && {
            background: moodConfig.itemStyle.priceBadgeColor,
            padding: '2px 8px',
            borderRadius: 4,
            width: 'fit-content',
        }),
    };

    return (
        <div style={containerStyle}>
            <div ref={scrollContainerRef} style={scrollContentStyle}>
                <div style={contentStyle}>
                    {/* Header */}
                    <MenuHeader
                        activeDeviceType={activeDeviceType}
                        projectData={projectData}
                        activeLanguage={activeLanguage}
                        setActiveLanguage={setActiveLanguage}
                        setActivePage={setActivePage}
                        moodConfig={moodConfig}
                    />

                    {/* Search Bar - Below header, NEVER sticky (scrolls away) */}
                    <MenuSearchBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        moodConfig={moodConfig}
                        businessType={businessType}
                        isMobile={isMobile}
                    />

                    {/* Decision Blocks - Recommendation section at top of menu */}
                    {FEATURE_FLAGS.ENABLE_DECISION_BLOCKS && !debouncedSearch && allItems.length > 0 && (
                        <DecisionBlocks
                            items={allItems}
                            categories={allCategories}
                            activeLanguage={activeLanguage}
                            businessType={businessType}
                            moodConfig={moodConfig}
                            onItemClick={handleItemClick}
                            currency={storeDetails?.currencySymbol || '$'}
                            menuSettings={projectData?.menuSettings}
                            precomputedBlocks={precomputedBlocks}
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

                    {/* Horizontal Category Tabs - Sticky (mobile/tablet only, desktop uses sidebar) */}
                    {!isDesktop && (showCategoryTabs || isTablet) && allCategories.length > 0 && (
                        <div
                            ref={categoryTabsRef}
                            style={{
                                display: 'flex',
                                gap: 8,
                                overflowX: 'auto',
                                paddingBottom: 12,
                                marginBottom: 16,
                                borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                position: 'sticky',
                                top: 0,
                                zIndex: 20,
                                background: backgroundImage ? 'inherit' : moodConfig.background,
                                paddingTop: 8,
                            }}
                            className="hide-scrollbar"
                        >
                            {allCategories.map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setActiveCategory(cat);
                                        const element = document.getElementById(`cat-${cat.id}`);
                                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        border: 'none',
                                        background: activeCategory?.id === cat.id
                                            ? moodConfig.accentColor
                                            : moodConfig.itemStyle.background,
                                        color: activeCategory?.id === cat.id
                                            ? '#000'
                                            : moodConfig.bodyColor,
                                        fontFamily: moodConfig.bodyFont,
                                        fontSize: 13,
                                        fontWeight: activeCategory?.id === cat.id ? 600 : 400,
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
                                        {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && cat.icon ? (
                                            <CategoryIcon
                                                color={activeCategory?.id === cat.id ? '#000' : moodConfig.bodyColor}
                                                icon={cat.icon}
                                                size={14}
                                            />
                                        ) : null}
                                        <span>{cat.name?.[activeLanguage]}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Filter Chips - Below category tabs, auto-hide when irrelevant */}
                    <MenuFilterChips
                        items={allItems}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        moodConfig={moodConfig}
                        businessType={businessType}
                        isSearchActive={!!debouncedSearch}
                    />

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
                                    top: 16,
                                    maxHeight: 'calc(100vh - 120px)',
                                    overflowY: 'auto',
                                    paddingRight: 16,
                                    scrollbarWidth: 'thin',
                                }}
                                aria-label="Menu categories"
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {allCategories.map((cat: any) => {
                                        const isActive = activeCategory?.id === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => {
                                                    setActiveCategory(cat);
                                                    const element = document.getElementById(`cat-${cat.id}`);
                                                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }}
                                                style={{
                                                    padding: '10px 16px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    background: isActive ? `${moodConfig.accentColor}15` : 'transparent',
                                                    color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                                    fontFamily: moodConfig.bodyFont,
                                                    fontSize: 14,
                                                    fontWeight: isActive ? 600 : 400,
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    borderLeft: isActive ? `3px solid ${moodConfig.accentColor}` : '3px solid transparent',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        (e.currentTarget as HTMLButtonElement).style.background = `${moodConfig.accentColor}08`;
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                                    }
                                                }}
                                            >
                                                <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
                                                    {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && cat.icon ? (
                                                        <CategoryIcon
                                                            color={isActive ? moodConfig.accentColor : moodConfig.bodyColor}
                                                            icon={cat.icon}
                                                            size={15}
                                                        />
                                                    ) : null}
                                                    <span>{cat.name?.[activeLanguage]}</span>
                                                </span>
                                            </button>
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

                                // #31: Progressive rendering — show placeholder for off-screen categories
                                const isCategoryVisible = !useProgressiveRender || visibleCategoryIds.has(category.id);

                                return (
                                    <section
                                        key={category.id}
                                        id={`cat-${category.id}`}
                                        data-category-id={category.id}
                                        style={{ marginBottom: spacing.category }}
                                    >
                                        <header>
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                                                {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && category.icon ? (
                                                    <div
                                                        style={{
                                                            alignItems: 'center',
                                                            background: `${moodConfig.accentColor}12`,
                                                            border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                            borderRadius: 10,
                                                            display: 'flex',
                                                            flexShrink: 0,
                                                            height: 32,
                                                            justifyContent: 'center',
                                                            width: 32,
                                                        }}
                                                    >
                                                        <CategoryIcon color={moodConfig.headingColor} icon={category.icon} size={18} />
                                                    </div>
                                                ) : null}
                                                <h2 style={categoryHeaderStyle}>{category.name?.[activeLanguage]}</h2>
                                            </div>
                                            {moodConfig.categoryStyle.dividerStyle === 'line' && <div style={dividerStyle} />}
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

                                                    // G10 ENFORCEMENT: Image quota per category
                                                    const showItemImage = showImages && itemIndex < layoutConfig.maxImagesPerCategory;

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
                                                            style={{
                                                                ...getItemStyle(),
                                                                opacity: isAvailable ? 1 : 0.5,
                                                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                            }}
                                                            // G08 - Tap feedback + desktop hover
                                                            className={isAvailable
                                                                ? 'active:scale-[0.98] active:opacity-90 transition-all duration-100 hover:shadow-md hover:-translate-y-px'
                                                                : ''
                                                            }
                                                            role="button"
                                                            tabIndex={isAvailable ? 0 : -1}
                                                        >
                                                            {showItemImage && item.images?.[0]?.url && (
                                                                <div
                                                                    style={{
                                                                        position: 'relative',
                                                                        width: imageOnTop ? '100%' : (isMobile ? 64 : 80),
                                                                        height: imageOnTop ? 140 : (isMobile ? 64 : 80),
                                                                        borderRadius: moodConfig.itemStyle.imageRadius || 6,
                                                                        overflow: 'hidden',
                                                                        flexShrink: 0,
                                                                        backgroundColor: moodConfig.itemStyle.background,
                                                                    }}
                                                                    data-image-container={item.id}
                                                                >
                                                                    <Image
                                                                        src={item.images[0].url}
                                                                        alt={item.name?.[activeLanguage] || 'Menu item'}
                                                                        fill
                                                                        style={{ objectFit: 'cover' }}
                                                                        sizes={isDesktop ? '300px' : '(max-width: 768px) 50vw, 200px'}
                                                                        onError={(e) => {
                                                                            // G04 Runtime Fallback: Hide broken images gracefully
                                                                            const container = e.currentTarget.parentElement;
                                                                            if (container) {
                                                                                container.style.display = 'none';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                                    <h3 style={itemNameStyle}>{item.name?.[activeLanguage]}</h3>
                                                                    {showItemPrices && !item.attributes?.length && item.price && (
                                                                        <span style={{ ...priceStyle, marginTop: 0, whiteSpace: 'nowrap' }}>{item.price}</span>
                                                                    )}
                                                                </div>
                                                                {item.description?.[activeLanguage] && (
                                                                    <p style={itemDescStyle}>{item.description[activeLanguage]}</p>
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
                                        Try a different search, jump back into a category, or contact the business directly.
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
                                                borderRadius: 999,
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
                                                onClick={() => {
                                                    clearSearch();
                                                    handleCategorySelect(category);
                                                }}
                                                style={{
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                    borderRadius: 999,
                                                    padding: '8px 14px',
                                                    background: moodConfig.itemStyle.background,
                                                    color: moodConfig.bodyColor,
                                                    fontFamily: moodConfig.bodyFont,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {category.name?.[activeLanguage] || category.name?.en}
                                            </button>
                                        ))}
                                        {recoveryActions.map((action) => (
                                            <a
                                                key={action.label}
                                                href={action.href}
                                                onClick={action.onClick}
                                                target={action.external ? '_blank' : undefined}
                                                rel={action.external ? 'noopener noreferrer' : undefined}
                                                style={{
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                    borderRadius: 999,
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

                    {/* 
                      * CONSTITUTIONAL ORDER (DO NOT CHANGE):
                      * 1. Pricing disclosures (G06)
                      * 2. Business identity (G09)
                      * This order is trust hierarchy - pricing truth before identity.
                      */}

                    {/* G06 - Service Charge Disclosure (Trust Zone - Pricing Truth) */}
                    <ServiceChargeNote note={projectData?.menuSettings?.specialNote} />

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

            {/* Category FAB - Only visible when tabs are scrolled out of view (not on desktop - has sidebar) */}
                    <MenuFilters
                        categories={allCategories}
                        activeCategory={activeCategory}
                        onSelectCategory={handleCategorySelect}
                        activeLanguage={activeLanguage}
                        showCategoryIcons={showCategoryIcons}
                        moodConfig={moodConfig}
                        hideFAB={isDesktop || categoryTabsVisible || (!showCategoryTabs && !isTablet)}
                    />

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
                unavailableLabel={unavailableLabel}
                trackView={selectedItemTrackView}
                recoveryActions={recoveryActions}
            />
        </div>
    );
}

export default MenuPageNew;
