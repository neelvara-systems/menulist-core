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
import { guardedReload as _guardedReload, guardedReloadWithJitter as _guardedReloadWithJitter } from "@lib/screen/utils";
import { MenuItemForSlide, ScreenStoreInfo } from "@type/campaigns";
import { QRCode } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScreenAttribution from "./ScreenAttribution";

// Auto-pagination timing (per spec: 15-20 seconds per page)
const PAGE_DURATION_MS = 18000; // 18 seconds

// Bind guardedReload to this component's identity for unique localStorage key
const guardedReload = () => _guardedReload('menuboard');
const guardedReloadWithJitter = () => _guardedReloadWithJitter('menuboard');

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
        const category = item.categoryName || "Menu";
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category)!.push(item);
        totalCount++;
    }

    return Array.from(groups.entries()).map(([name, items]) => ({
        name,
        items: items.sort((a, b) => {
            // Bestsellers first within category
            if (a.isBestSeller && !b.isBestSeller) return -1;
            if (!a.isBestSeller && b.isBestSeller) return 1;
            return a.name.localeCompare(b.name);
        })
    }));
}

/**
 * Calculate how many items fit per page based on screen height
 * Conservative estimate: ~12 items per page for readability on TV
 */
const ITEMS_PER_PAGE = 10;

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
                pages.push([{ name: category.name, items: chunk }]);
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
                        console.log(`[MenuBoard] Using cached data (${parsed.menuItems.length} items)`);
                        return parsed.menuItems;
                    }
                }
            } catch {
                // Silent fail
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
        } catch {
            // Silent fail — localStorage might be full
        }
    }, [cacheKey, menuItems, storeInfo]);

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

        const docRef = doc(firebaseClient, 'platformSummary', `campaigns_${storeId}`);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const newVersion = data?.screen?.contentVersion || 0;

                if (newVersion > contentVersionRef.current) {
                    contentVersionRef.current = newVersion;
                    // Per ChatGPT review v3: Use jitter to prevent mass reload spikes
                    guardedReloadWithJitter();
                }
            }
        }, (error) => {
            console.warn('[MenuBoard] Snapshot error:', error);
            setIsOffline(true);
        });

        return () => unsubscribe();
    }, [storeId]);

    // Fallback: Refresh every 30 minutes if listener fails (matching ScreenDisplay)
    useEffect(() => {
        const fallbackRefresh = setInterval(() => {
            if (isOffline) {
                console.log('[MenuBoard] Offline fallback refresh attempt');
                guardedReload();
            }
        }, 30 * 60 * 1000);
        return () => clearInterval(fallbackRefresh);
    }, [isOffline]);

    // Daily seen signal (same as ScreenDisplay — once per day per screen)
    useEffect(() => {
        const todayKey = `screen_seen_${token}_${new Date().toISOString().slice(0, 10)}`;
        if (!localStorage.getItem(todayKey)) {
            fetch('/api/screen/seen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, storeId }),
            })
                .then(() => {
                    localStorage.setItem(todayKey, '1');
                    console.log('[MenuBoard] Daily seen signal sent');
                })
                .catch(() => {
                    console.warn('[MenuBoard] Daily seen signal failed (will retry tomorrow)');
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
            guardedReload();
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

    // Format price with Indian locale
    const formatPrice = useCallback((price?: number) => {
        if (price == null || price <= 0) return null;
        return `₹${price.toLocaleString('en-IN')}`;
    }, []);

    const currentCategories = pages[currentPage] || [];

    // Category accent colors — cycling palette for visual differentiation
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
                    onClick={() => {
                        document.documentElement.requestFullscreen?.().catch(() => { });
                        setShowFullscreenHint(false);
                    }}
                >
                    Tap to return to fullscreen
                </div>
            )}

            {/* Animated ambient background orbs */}
            <div className="ambient-orb orb-1" />
            <div className="ambient-orb orb-2" />
            <div className="ambient-orb orb-3" />

            {/* Header — glassmorphism */}
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
                            <div className="empty-icon">🍽</div>
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
                                                    {/* Thumbnail — show food image or initial */}
                                                    {item.imageUrl ? (
                                                        <div className="item-thumb">
                                                            <img
                                                                src={item.imageUrl}
                                                                alt=""
                                                                className="thumb-img"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    // Per ChatGPT review v3: Hide broken image, show placeholder instead
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                    const parent = (e.target as HTMLImageElement).parentElement;
                                                                    if (parent) parent.classList.add('thumb-broken');
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="item-thumb-placeholder"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${accent.border}33, ${accent.border}11)`,
                                                                borderColor: `${accent.border}44`,
                                                            }}
                                                        >
                                                            <span style={{ color: accent.text }}>
                                                                {item.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="item-details">
                                                        <div className="item-name-row">
                                                            {/* Dietary indicator dot — logic must match ScreenDisplay */}
                                                            {(() => {
                                                                const isVeg = item.tags?.some(t => t.toLowerCase().includes('vegetarian') && !t.toLowerCase().includes('non'));
                                                                const isNonVeg = item.tags?.some(t => t.toLowerCase().includes('non-vegetarian') || t.toLowerCase().includes('non vegetarian'));
                                                                if (isVeg) return <span className="diet-dot veg" />;
                                                                if (isNonVeg) return <span className="diet-dot non-veg" />;
                                                                return null;
                                                            })()}
                                                            <span className="item-name">{item.name}</span>
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
                                                                {item.description.length > 60 ? item.description.slice(0, 57) + '...' : item.description}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="item-price-area">
                                                        {item.price != null && item.price > 0 ? (
                                                            <span className="item-price">
                                                                <span className="currency">₹</span>
                                                                {item.price.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : (
                                                            <span className="item-price muted">—</span>
                                                        )}
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

            <ScreenAttribution />

            <style jsx>{`
                /* ═══ BASE ═══ */
                .menu-board {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #0a0e1a;
                    color: #e2e8f0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                .fullscreen-hint {
                    position: fixed;
                    top: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: #ffffff;
                    padding: 10px 24px;
                    border-radius: 24px;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 200;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    animation: hint-fade 10s ease-out forwards;
                }
                @keyframes hint-fade {
                    0%, 80% { opacity: 1; }
                    100% { opacity: 0; pointer-events: none; }
                }

                /* ═══ AMBIENT BACKGROUND ═══ */
                .ambient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(120px);
                    opacity: 0.15;
                    pointer-events: none;
                    z-index: 0;
                }
                .orb-1 {
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, #fbbf24, transparent 70%);
                    top: -200px;
                    left: -100px;
                    animation: float-orb 20s ease-in-out infinite;
                }
                .orb-2 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, #60a5fa, transparent 70%);
                    bottom: -150px;
                    right: -100px;
                    animation: float-orb 25s ease-in-out infinite reverse;
                }
                .orb-3 {
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, #f472b6, transparent 70%);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation: float-orb 30s ease-in-out infinite;
                }
                @keyframes float-orb {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, -20px) scale(1.05); }
                    50% { transform: translate(-20px, 30px) scale(0.95); }
                    75% { transform: translate(20px, 20px) scale(1.03); }
                }

                /* ═══ HEADER — GLASSMORPHISM ═══ */
                .board-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 48px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    flex-shrink: 0;
                    position: relative;
                    z-index: 1;
                }
                .store-identity {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                }
                .logo-glow {
                    position: relative;
                    width: 52px;
                    height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .logo-glow::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, #fbbf24, #f472b6, #60a5fa);
                    opacity: 0.5;
                    filter: blur(8px);
                    animation: logo-pulse 4s ease-in-out infinite;
                }
                @keyframes logo-pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.6; }
                }
                .store-logo {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                    border-radius: 14px;
                    position: relative;
                    z-index: 1;
                    background: rgba(255,255,255,0.1);
                }
                .store-name {
                    font-size: 30px;
                    font-weight: 800;
                    margin: 0;
                    color: #ffffff;
                    letter-spacing: -0.5px;
                }
                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .qr-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 16px 10px 12px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 14px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                }
                .qr-label {
                    font-size: 12px;
                    color: #374151;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    max-width: 60px;
                    line-height: 1.3;
                }

                /* ═══ CONTENT ═══ */
                .board-content {
                    flex: 1;
                    overflow: hidden;
                    padding: 28px 48px 16px;
                    position: relative;
                    z-index: 1;
                }
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: 16px;
                    opacity: 0.5;
                }
                .empty-icon {
                    font-size: 64px;
                    animation: float-orb 3s ease-in-out infinite;
                }
                .empty-state p {
                    font-size: 24px;
                    font-weight: 500;
                }

                /* ═══ CATEGORY LAYOUT ═══ */
                .categories-layout {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
                    gap: 24px;
                    height: 100%;
                    align-content: start;
                }

                /* ═══ CATEGORY CARD — GLASSMORPHISM ═══ */
                .category-card {
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .category-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }
                .category-accent-bar {
                    width: 4px;
                    height: 24px;
                    border-radius: 4px;
                    flex-shrink: 0;
                }
                .category-name {
                    font-size: 22px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin: 0;
                    flex: 1;
                }
                .category-count {
                    font-size: 13px;
                    font-weight: 600;
                    opacity: 0.6;
                    min-width: 20px;
                    text-align: right;
                }

                /* ═══ ITEM ROW ═══ */
                .items-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .menu-item-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 6px 8px;
                    border-radius: 10px;
                    transition: background 0.2s ease;
                }

                /* ═══ THUMBNAIL ═══ */
                .item-thumb {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    overflow: hidden;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .thumb-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .thumb-broken {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .item-thumb-placeholder {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid;
                    font-size: 18px;
                    font-weight: 700;
                }

                /* ═══ ITEM DETAILS ═══ */
                .item-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                }
                .item-name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                }
                .item-name {
                    font-size: 18px;
                    font-weight: 500;
                    color: #f1f5f9;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-desc {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.45);
                    font-weight: 400;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.3;
                }

                /* ═══ DIETARY DOT ═══ */
                .diet-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
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

                /* ═══ POPULAR TAG — ANIMATED ═══ */
                .popular-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 2px 10px;
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 146, 60, 0.2));
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #fbbf24;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    flex-shrink: 0;
                    animation: tag-shimmer 3s ease-in-out infinite;
                }
                .popular-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #fbbf24;
                    animation: dot-pulse 2s ease-in-out infinite;
                }
                @keyframes tag-shimmer {
                    0%, 100% { border-color: rgba(251, 191, 36, 0.3); }
                    50% { border-color: rgba(251, 191, 36, 0.6); }
                }
                @keyframes dot-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.7); }
                }

                /* ═══ PRICE ═══ */
                .item-price-area {
                    flex-shrink: 0;
                    text-align: right;
                }
                .item-price {
                    font-size: 18px;
                    font-weight: 700;
                    color: #4ade80;
                    font-variant-numeric: tabular-nums;
                }
                .item-price .currency {
                    font-size: 14px;
                    font-weight: 500;
                    opacity: 0.7;
                    margin-right: 1px;
                }
                .item-price.muted {
                    color: rgba(255, 255, 255, 0.2);
                }

                /* ═══ FOOTER — PROGRESS BAR ═══ */
                .board-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 48px;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 1;
                }
                .progress-track {
                    width: 240px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #fbbf24, #f472b6);
                    border-radius: 4px;
                }
                .page-label {
                    position: absolute;
                    right: -50px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.3);
                    font-weight: 600;
                    font-variant-numeric: tabular-nums;
                }
                .offline-pill {
                    font-size: 11px;
                    padding: 4px 12px;
                    background: rgba(239, 68, 68, 0.15);
                    color: #fca5a5;
                    border-radius: 20px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
            `}</style>
        </div>
    );
}
