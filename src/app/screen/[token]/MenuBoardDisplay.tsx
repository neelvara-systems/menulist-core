"use client";

/**
 * Menu Board Display - Full menu with categories, items, prices
 * Per spec v2.0: Default screen mode — displays full menu as a menu board
 * 
 * Key behaviors:
 * - Groups items by category
 * - Shows prices for all items
 * - Hides unavailable items (availability-aware)
 * - Auto-paginates for large menus (15-20s per page)
 * - Best seller badge on qualifying items
 * - QR code to digital menu
 * - Offline cache (localStorage)
 * - Firebase onSnapshot listener for real-time updates
 * - Daily seen signal
 * 
 * Firebase cost: $0.00 additional (same data pipeline as Highlights mode)
 */

import { firebaseClient } from "@lib/firebase/firebaseClient";
import { DB_COLLECTIONS } from "@constant/database";
import { formatScreenPrice, getScreenDietType, hasScreenPrice, normalizeScreenCategoryName, truncateScreenText } from "@lib/screen/screenContent";
import { getBoundedScreenStringContext, logScreenDisplayFailure } from "@lib/screen/screenDiagnostics";
import { getPublicScreenStateDocId } from "@lib/screen/publicScreenState";
import { guardedReload as _guardedReload, guardedReloadWithJitter as _guardedReloadWithJitter } from "@lib/screen/utils";
import { MenuItemForSlide, ScreenStoreInfo } from "@type/campaigns";
import { QRCode } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ScreenAttribution from "./ScreenAttribution";

// Auto-pagination timing (per spec: 15-20 seconds per page)
const PAGE_DURATION_MS = 18000; // 18 seconds
const SCREEN_SEEN_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

// Per ChatGPT review v3: Cap total rendered items to prevent layout overflow on TVs
const MAX_TOTAL_ITEMS = 200;

interface MenuBoardProps {
    initialData: {
        menuItems: MenuItemForSlide[];
        storeInfo: ScreenStoreInfo;
        contentVersion: number;
        token: string;
        storeId: string;
    };
}

interface CategoryGroup {
    name: string;
    items: MenuItemForSlide[];
    orderIndex: number;
}

/**
 * Group items by category, filter unavailable
 */
function groupByCategory(items: MenuItemForSlide[]): CategoryGroup[] {
    const groups = new Map<string, MenuItemForSlide[]>();
    let totalCount = 0;

    for (const item of items) {
        if (!item.available) continue;
        if (totalCount >= MAX_TOTAL_ITEMS) break;
        const category = normalizeScreenCategoryName(item.categoryName, "Menu");
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category)!.push(item);
        totalCount++;
    }

    return Array.from(groups.entries())
        .map(([name, items], index) => ({
            name,
            orderIndex: Math.min(...items.map((item) => item.categoryOrderIndex ?? index)),
            items: items.sort((a, b) => (
                (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER)
                || a.name.localeCompare(b.name)
            )),
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name));
}

/**
 * Calculate how many items fit per page based on screen height
 * Conservative estimate: ~12 items per page for readability on TV
 */
const ITEMS_PER_PAGE = 8;

/**
 * Paginate category groups into pages that fit on screen
 */
function paginateCategories(categories: CategoryGroup[]): CategoryGroup[][] {
    if (categories.length === 0) return [[]];

    const pages: CategoryGroup[][] = [];
    let currentPage: CategoryGroup[] = [];
    let currentCount = 0;

    for (const category of categories) {
        // Each category header takes ~1 item slot
        const categorySlots = category.items.length + 1;

        if (currentCount + categorySlots > ITEMS_PER_PAGE && currentPage.length > 0) {
            // Start new page
            pages.push(currentPage);
            currentPage = [];
            currentCount = 0;
        }

        if (categorySlots > ITEMS_PER_PAGE) {
            // Category too large for one page — split it
            if (currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [];
                currentCount = 0;
            }

            let remaining = [...category.items];
            while (remaining.length > 0) {
                const chunk = remaining.slice(0, ITEMS_PER_PAGE - 1); // -1 for header
                pages.push([{ name: category.name, items: chunk, orderIndex: category.orderIndex }]);
                remaining = remaining.slice(ITEMS_PER_PAGE - 1);
            }
        } else {
            currentPage.push(category);
            currentCount += categorySlots;
        }
    }

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
}

export default function MenuBoardDisplay({ initialData }: MenuBoardProps) {
    const { menuItems: initialItems, storeInfo, contentVersion: initialVersion, token, storeId } = initialData;
    const cacheKey = `menulist-menuboard-data-${token}`;

    // HARDENING: Cache-first initialization (matching ScreenDisplay pattern)
    // Survives bad deploys — shows cached menu if server returns empty
    const [menuItems, setMenuItems] = useState<MenuItemForSlide[]>(() => {
        if (typeof window !== 'undefined' && initialItems.length === 0) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.menuItems?.length > 0) {
                        return parsed.menuItems;
                    }
                }
            } catch (error) {
                logScreenDisplayFailure('digital_screen_menuboard_cache_read_failed', error, {
                    ...getBoundedScreenStringContext('token', token),
                    ...getBoundedScreenStringContext('storeId', storeId),
                });
            }
        }
        return initialItems;
    });
    const [currentPage, setCurrentPage] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    const [qrReady, setQrReady] = useState(false);
    const contentVersionRef = useRef(initialVersion);

    // Group and paginate
    const categories = useMemo(() => groupByCategory(menuItems), [menuItems]);
    const pages = useMemo(() => paginateCategories(categories), [categories]);
    const totalPages = pages.length;

    // Lazy QR loading (same pattern as ScreenDisplay — cold boot optimization)
    useEffect(() => {
        const timer = setTimeout(() => setQrReady(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Cache to localStorage for offline support
    useEffect(() => {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                menuItems,
                storeInfo,
                contentVersion: contentVersionRef.current,
                timestamp: Date.now()
            }));
        } catch (error) {
            logScreenDisplayFailure('digital_screen_menuboard_cache_write_failed', error, {
                ...getBoundedScreenStringContext('token', token),
                ...getBoundedScreenStringContext('storeId', storeId),
                itemCount: menuItems.length,
            });
        }
    }, [cacheKey, menuItems, storeId, storeInfo, token]);

    // Auto-pagination timer
    useEffect(() => {
        if (totalPages <= 1) return;

        const timer = setInterval(() => {
            setCurrentPage(prev => (prev + 1) % totalPages);
        }, PAGE_DURATION_MS);

        return () => clearInterval(timer);
    }, [totalPages]);

    // Firebase onSnapshot listener for real-time updates
    // Per ChatGPT review v3: Added offline state + retry matching ScreenDisplay pattern
    useEffect(() => {
        if (!storeId) return;

        const docRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, getPublicScreenStateDocId(storeId));
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data?.enabled !== true) {
                    _guardedReload('menuboard', token);
                    return;
                }
                const newVersion = data?.contentVersion || 0;

                if (newVersion > contentVersionRef.current) {
                    contentVersionRef.current = newVersion;
                    // Per ChatGPT review v3: Use jitter to prevent mass reload spikes
                    _guardedReloadWithJitter('menuboard', token);
                }
            }
        }, (error) => {
            logScreenDisplayFailure('digital_screen_menuboard_listener_failed', error, {
                ...getBoundedScreenStringContext('storeId', storeId),
                currentVersion: contentVersionRef.current,
            });
            setIsOffline(true);
        });

        return () => unsubscribe();
    }, [storeId]);

    // Fallback: Refresh every 30 minutes if listener fails (matching ScreenDisplay)
    useEffect(() => {
        const fallbackRefresh = setInterval(() => {
            if (isOffline) {
                _guardedReload('menuboard', token);
            }
        }, 30 * 60 * 1000);
        return () => clearInterval(fallbackRefresh);
    }, [isOffline]);

    // Daily seen signal (same as ScreenDisplay — once per day per screen)
    useEffect(() => {
        const todayKey = `screen_seen_${token}_${new Date().toISOString().slice(0, 10)}`;
        if (!localStorage.getItem(todayKey)) {
            fetch('/api/screen/seen', {
                ...SCREEN_SEEN_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, storeId }),
            })
                .then((response) => {
                    if (!response.ok) {
                        logScreenDisplayFailure('digital_screen_menuboard_seen_signal_rejected', new Error('screen_seen_signal_rejected'), {
                            ...getBoundedScreenStringContext('token', token),
                            ...getBoundedScreenStringContext('storeId', storeId),
                            responseStatus: response.status,
                        });
                        return;
                    }
                    localStorage.setItem(todayKey, '1');
                })
                .catch((error) => {
                    logScreenDisplayFailure('digital_screen_menuboard_seen_signal_failed', error, {
                        ...getBoundedScreenStringContext('token', token),
                        ...getBoundedScreenStringContext('storeId', storeId),
                    });
                });
        }
    }, [token, storeId]);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOffline(!navigator.onLine);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 6-hour proactive refresh (same as ScreenDisplay — picks up code deploys)
    useEffect(() => {
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
        const timer = setInterval(() => {
            _guardedReload('menuboard', token);
        }, SIX_HOURS_MS);
        return () => clearInterval(timer);
    }, []);

    // Per ChatGPT review v3: Auto-fullscreen recovery
    const [showFullscreenHint, setShowFullscreenHint] = useState(false);
	    useEffect(() => {
	        const handleFullscreenChange = () => {
	            if (!document.fullscreenElement) {
	                setShowFullscreenHint(true);
                setTimeout(() => setShowFullscreenHint(false), 10000);
            } else {
                setShowFullscreenHint(false);
            }
        };
	        document.addEventListener('fullscreenchange', handleFullscreenChange);
	        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	    }, []);

	    const handleFullscreenHintClick = () => {
	        const fullscreenRequest = document.documentElement.requestFullscreen?.();
	        if (fullscreenRequest) {
	            fullscreenRequest.catch((error) => {
	                logScreenDisplayFailure('digital_screen_menuboard_fullscreen_request_failed', error, {
	                    ...getBoundedScreenStringContext('token', token),
	                    ...getBoundedScreenStringContext('storeId', storeId),
	                    component: 'menuboard',
	                });
	            });
	        }
	        setShowFullscreenHint(false);
	    };

	    const currentCategories = pages[currentPage] || [];

    // Category accent colors — restrained high-contrast palette for TV readability
    const ACCENT_COLORS = [
        { bg: 'rgba(251, 191, 36, 0.12)', border: '#fbbf24', text: '#fbbf24' },  // Amber
        { bg: 'rgba(244, 114, 182, 0.12)', border: '#f472b6', text: '#f472b6' }, // Pink
        { bg: 'rgba(96, 165, 250, 0.12)', border: '#60a5fa', text: '#60a5fa' },  // Blue
        { bg: 'rgba(52, 211, 153, 0.12)', border: '#34d399', text: '#34d399' },  // Emerald
        { bg: 'rgba(167, 139, 250, 0.12)', border: '#a78bfa', text: '#a78bfa' }, // Violet
        { bg: 'rgba(251, 146, 60, 0.12)', border: '#fb923c', text: '#fb923c' },  // Orange
    ];

    return (
        <div className="menu-board">
            {/* Fullscreen recovery hint */}
            {showFullscreenHint && (
	                <div
	                    className="fullscreen-hint"
	                    onClick={handleFullscreenHintClick}
	                >
                    Tap to return to fullscreen
                </div>
            )}

            {/* Header */}
            <header className="board-header">
                <div className="store-identity">
                    {storeInfo.logoUrl && (
                        <div className="logo-glow">
                            <img src={storeInfo.logoUrl} alt={storeInfo.name} className="store-logo" />
                        </div>
                    )}
                    <h1 className="store-name">{storeInfo.name}</h1>
                </div>
                <div className="header-right">
                    {qrReady && storeInfo.menuQrUrl && (
                        <div className="qr-card">
                            <QRCode
                                value={storeInfo.menuQrUrl}
                                size={72}
                                color="#1e293b"
                                bgColor="#ffffff"
                                errorLevel="H"
                                style={{ borderRadius: 6 }}
                            />
                            <span className="qr-label">View full menu</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Menu Content — animated page transitions */}
            <AnimatePresence mode="wait">
                <motion.main
                    key={currentPage}
                    className="board-content"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {currentCategories.length === 0 ? (
                        <div className="empty-state">
                            <p>{menuItems.length > 0 && menuItems.every(i => !i.available)
                                ? 'All items currently unavailable'
                                : 'Preparing your menu...'}</p>
                        </div>
                    ) : (
                        <div className="categories-layout">
                            {currentCategories.map((category, catIdx) => {
                                const accent = ACCENT_COLORS[catIdx % ACCENT_COLORS.length];
                                return (
                                    <motion.section
                                        key={category.name}
                                        className="category-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: catIdx * 0.1, duration: 0.5 }}
                                        style={{
                                            background: accent.bg,
                                            borderColor: accent.border,
                                        }}
                                    >
                                        <div className="category-header">
                                            <div
                                                className="category-accent-bar"
                                                style={{ background: accent.border }}
                                            />
                                            <h2 className="category-name" style={{ color: accent.text }}>
                                                {category.name}
                                            </h2>
                                            <span className="category-count" style={{ color: accent.text }}>
                                                {category.items.length}
                                            </span>
                                        </div>
                                        <div className="items-list">
                                            {category.items.map((item, itemIdx) => (
                                                <motion.div
                                                    key={item.id}
                                                    className="menu-item-row"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{
                                                        delay: catIdx * 0.1 + itemIdx * 0.04,
                                                        duration: 0.4,
                                                    }}
                                                >
                                                    <div className="item-details">
                                                        <div className="item-name-row">
                                                            {/* Dietary indicator dot — logic must match ScreenDisplay */}
                                                            {(() => {
                                                                const dietType = getScreenDietType(item.tags);
                                                                if (dietType === "veg") return <span className="diet-dot veg" />;
                                                                if (dietType === "nonVeg") return <span className="diet-dot non-veg" />;
                                                                return null;
                                                            })()}
                                                            <span className="item-name">{truncateScreenText(item.name, 64, "Menu item")}</span>
                                                            {item.isBestSeller && (
                                                                <span className="popular-tag">
                                                                    <span className="popular-dot" />
                                                                    Popular
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Short description — truncated for menu board density */}
                                                        {item.description && (
                                                            <span className="item-desc">
                                                                {truncateScreenText(item.description, 60)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="item-price-area">
                                                        <span className={`item-price ${hasScreenPrice(item.price) ? "" : "muted"}`}>
                                                            {formatScreenPrice(item.price, storeInfo.currencySymbol)}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.section>
                                );
                            })}
                        </div>
                    )}
                </motion.main>
            </AnimatePresence>

            {/* Footer — progress bar + status */}
            <footer className="board-footer">
                {totalPages > 1 && (
                    <div className="progress-track">
                        <motion.div
                            className="progress-fill"
                            key={currentPage}
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{
                                duration: PAGE_DURATION_MS / 1000,
                                ease: 'linear',
                            }}
                        />
                        <span className="page-label">
                            {currentPage + 1} / {totalPages}
                        </span>
                    </div>
                )}
                {isOffline && (
                    <span className="offline-pill">Offline Mode</span>
                )}
            </footer>

            <ScreenAttribution activePlanType={storeInfo.activePlanType} />

            <style jsx>{`
                .menu-board {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #070b12;
                    color: #e5edf7;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                .fullscreen-hint {
                    position: fixed;
                    top: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.86);
                    color: #ffffff;
                    padding: 10px 22px;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 700;
                    z-index: 200;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    animation: hint-fade 10s ease-out forwards;
                }
                @keyframes hint-fade {
                    0%, 80% { opacity: 1; }
                    100% { opacity: 0; pointer-events: none; }
                }

                .board-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 28px;
                    padding: 26px 56px 18px;
                    background: #070b12;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    flex-shrink: 0;
                    position: relative;
                    z-index: 1;
                }
                .store-identity {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    min-width: 0;
                }
                .logo-glow {
                    width: 64px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .store-logo {
                    width: 64px;
                    height: 64px;
                    object-fit: contain;
                    border-radius: 8px;
                    background: #ffffff;
                    padding: 4px;
                }
                .store-name {
                    font-size: 42px;
                    font-weight: 800;
                    line-height: 1.08;
                    margin: 0;
                    color: #ffffff;
                    letter-spacing: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-shrink: 0;
                }
                .qr-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 9px 14px 9px 9px;
                    background: #ffffff;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.22);
                }
                .qr-label {
                    font-size: 13px;
                    color: #172033;
                    font-weight: 800;
                    letter-spacing: 0;
                    max-width: 72px;
                    line-height: 1.18;
                }

                .board-content {
                    flex: 1;
                    overflow: hidden;
                    padding: 32px 56px 18px;
                    position: relative;
                    z-index: 1;
                }
                .empty-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    opacity: 0.8;
                    text-align: center;
                }
                .empty-state p {
                    font-size: 30px;
                    font-weight: 700;
                    margin: 0;
                    color: rgba(255, 255, 255, 0.72);
                }

                .categories-layout {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
                    gap: 28px;
                    height: 100%;
                    align-content: start;
                }
                .category-card {
                    border-radius: 8px;
                    border: 2px solid rgba(255, 255, 255, 0.12);
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    min-width: 0;
                }
                .category-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
                }
                .category-accent-bar {
                    width: 6px;
                    height: 34px;
                    border-radius: 6px;
                    flex-shrink: 0;
                }
                .category-name {
                    font-size: 31px;
                    font-weight: 800;
                    line-height: 1.08;
                    text-transform: uppercase;
                    letter-spacing: 0;
                    margin: 0;
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .category-count {
                    display: none;
                }

                .items-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
                .menu-item-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 18px;
                    min-height: 58px;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .menu-item-row:last-child {
                    border-bottom: none;
                }
                .item-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    min-width: 0;
                }
                .item-name-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }
                .item-name {
                    font-size: 30px;
                    font-weight: 700;
                    line-height: 1.12;
                    color: #ffffff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-desc {
                    font-size: 17px;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.25;
                }

                .diet-dot {
                    width: 14px;
                    height: 14px;
                    border-radius: 3px;
                    border: 2px solid;
                    flex-shrink: 0;
                }
                .diet-dot.veg {
                    border-color: #22c55e;
                    background: #22c55e;
                }
                .diet-dot.non-veg {
                    border-color: #ef4444;
                    background: #ef4444;
                    border-radius: 50%;
                }

                .popular-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    background: rgba(251, 191, 36, 0.16);
                    border: 1px solid rgba(251, 191, 36, 0.36);
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 800;
                    color: #fbbf24;
                    text-transform: uppercase;
                    letter-spacing: 0;
                    flex-shrink: 0;
                }
                .popular-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #fbbf24;
                }

                .item-price-area {
                    flex-shrink: 0;
                    text-align: right;
                    min-width: 120px;
                }
                .item-price {
                    font-size: 32px;
                    font-weight: 800;
                    line-height: 1;
                    color: #86efac;
                    font-variant-numeric: tabular-nums;
                    white-space: nowrap;
                }
                .item-price .currency {
                    font-size: 22px;
                    font-weight: 700;
                    opacity: 0.78;
                    margin-right: 1px;
                }
                .item-price.muted {
                    color: rgba(255, 255, 255, 0.28);
                }

                .board-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 30px;
                    padding: 8px 56px 22px;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 1;
                }
                .progress-track {
                    width: 320px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.14);
                    border-radius: 6px;
                    position: relative;
                }
                .progress-fill {
                    height: 100%;
                    background: #fbbf24;
                    border-radius: 6px;
                }
                .page-label {
                    position: absolute;
                    right: -58px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.58);
                    font-weight: 700;
                    font-variant-numeric: tabular-nums;
                }
                .offline-pill {
                    font-size: 13px;
                    padding: 6px 12px;
                    background: rgba(239, 68, 68, 0.16);
                    color: #fecaca;
                    border-radius: 8px;
                    border: 1px solid rgba(239, 68, 68, 0.32);
                    font-weight: 700;
                    letter-spacing: 0;
                }

                @media (max-width: 1100px), (orientation: portrait) {
                    .board-header {
                        padding: 20px 32px 14px;
                    }
                    .store-name {
                        font-size: 34px;
                    }
                    .logo-glow,
                    .store-logo {
                        width: 52px;
                        height: 52px;
                    }
                    .board-content {
                        padding: 24px 32px 12px;
                    }
                    .categories-layout {
                        grid-template-columns: 1fr;
                        gap: 18px;
                    }
                    .category-card {
                        padding: 18px 20px;
                    }
                    .category-name {
                        font-size: 28px;
                    }
                    .item-name {
                        font-size: 27px;
                    }
                    .item-desc {
                        font-size: 16px;
                    }
                    .item-price {
                        font-size: 29px;
                    }
                    .item-price-area {
                        min-width: 104px;
                    }
                    .qr-label {
                        display: none;
                    }
                    .board-footer {
                        padding-left: 32px;
                        padding-right: 32px;
                    }
                }
            `}</style>
        </div>
    );
}
