"use client";

/**
 * Screen Display Client Component
 * Handles slide rotation, offline caching, and real-time updates
 * Per DAL pattern: Receives initial data from server component
 * 
 * HARDENING (Jan 2026):
 * - Cached-first rendering (deploy safety)
 * - Firebase real-time listener (data freshness)
 * - Zero-blank guarantee (fallback guard)
 * - Lazy QR loading (cold boot optimization)
 */

import { firebaseClient } from "@lib/firebase/firebaseClient";
import { DB_COLLECTIONS } from "@constant/database";
import {
    formatScreenPrice,
    getScreenDietType,
    normalizeOwnerSlideCaption,
    resolveScreenText,
    truncateScreenText,
} from "@lib/screen/screenContent";
import { getPublicScreenStateDocId } from "@lib/screen/publicScreenState";
import { guardedReload as _guardedReload, guardedReloadWithJitter as _guardedReloadWithJitter } from "@lib/screen/utils";
import { ScreenSlide, ScreenStoreInfo } from "@type/campaigns";
import { QRCode } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ScreenAttribution from "./ScreenAttribution";

// Build version for debugging (hardening)
const SCREEN_BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

// Bind guardedReload to this component's identity for unique localStorage key
const guardedReload = () => _guardedReload('screen');
const guardedReloadWithJitter = () => _guardedReloadWithJitter('screen');

interface ScreenDisplayProps {
    initialData: {
        slides: ScreenSlide[];
        storeInfo: ScreenStoreInfo;
        contentVersion: number;
        config: {
            refreshIntervalMs: number;
            slideDurationMs: number;
        };
        token: string;
        storeId: string; // GPT FIX 3: Used for direct doc listener (cheaper than query)
    };
}

interface ScreenState {
    slides: ScreenSlide[];
    currentIndex: number;
    isOffline: boolean;
}

export default function ScreenDisplay({ initialData }: ScreenDisplayProps) {
    const { slides: initialSlides, storeInfo, config, token, storeId } = initialData;
    const cacheKey = `menulist-screen-data-${token}`;

    // HARDENING: Cached-first rendering for deploy safety
    // Try to load from cache first, then update from server data
    const [state, setState] = useState<ScreenState>(() => {
        // Try cached data first (instant render, survives bad deploys)
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsedCache = JSON.parse(cached);
                    // Only use cache if it has valid slides
                    if (parsedCache.slides && parsedCache.slides.length > 0) {
                        console.log(`[Screen] v${SCREEN_BUILD_VERSION} - Using cached data (${parsedCache.slides.length} slides)`);
                        return {
                            slides: parsedCache.slides,
                            currentIndex: 0,
                            isOffline: false
                        };
                    }
                }
            } catch (e) {
                console.warn('[Screen] Cache read failed:', e);
            }
        }
        // Fall back to server data
        console.log(`[Screen] v${SCREEN_BUILD_VERSION} - Using server data (${initialSlides.length} slides)`);
        return {
            slides: initialSlides,
            currentIndex: 0,
            isOffline: false
        };
    });

    // Lazy QR loading for cold boot optimization
    const [qrReady, setQrReady] = useState(false);

    const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // HARDENING: Update state from server data after initial render
    // This ensures cache-first render, then seamless update if server has newer data
    useEffect(() => {
        if (initialSlides.length > 0) {
            // Only update if server data is valid and different
            const serverDataStr = JSON.stringify(initialSlides);
            const currentDataStr = JSON.stringify(state.slides);
            if (serverDataStr !== currentDataStr) {
                console.log(`[Screen] Updating from server data (${initialSlides.length} slides)`);
                setState(prev => ({ ...prev, slides: initialSlides }));
            }
        }
    }, [initialSlides]);

    // Cache data for offline use (write after render)
    useEffect(() => {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(initialData));
            console.log(`[Screen] Cache updated (${state.slides.length} slides)`);
        } catch (e) {
            console.warn('[Screen] Cache write failed:', e);
        }
    }, [cacheKey, initialData, state.slides.length]);

    // HARDENING: Delay QR loading for faster cold boot
    useEffect(() => {
        const timer = setTimeout(() => {
            setQrReady(true);
            console.log('[Screen] QR ready');
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // HARDENING: Daily "seen" signal for operational awareness
    // NOT a heartbeat - just ONE write per day per screen
    // Gives ops team visibility without per-minute cost
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
                    console.log('[Screen] Daily seen signal sent');
                })
                .catch(() => {
                    // Silent fail - don't break screen for ops signal
                    console.warn('[Screen] Daily seen signal failed (will retry tomorrow)');
                });
        }
    }, [token, storeId]);

    // Advance to next slide
    const advanceSlide = useCallback(() => {
        setState(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.slides.length
        }));
    }, []);

    // Slide rotation timer
    useEffect(() => {
        if (state.slides.length > 0) {
            slideTimerRef.current = setInterval(advanceSlide, config.slideDurationMs);
        }

        return () => {
            if (slideTimerRef.current) {
                clearInterval(slideTimerRef.current);
            }
        };
    }, [state.slides.length, advanceSlide, config.slideDurationMs]);

    // HARDENING: Firebase real-time listener for data freshness
    // GPT FIX 3: Direct doc listener (cheaper than query listener at scale)
    // Doc listener = 1 persistent connection to exact doc. Query listener = index scan.
    // At 5k+ screens, this saves significant Firestore cost.
    useEffect(() => {
        const docId = getPublicScreenStateDocId(storeId);
        console.log(`[Screen] Setting up doc listener: platformSummary/${docId}`);

        const docRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, docId);

        const unsubscribe = onSnapshot(docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const docData = snapshot.data();
                    const newVersion = docData.contentVersion || 1;
                    const currentVersion = initialData.contentVersion;

                    // Only reload if content version changed (real update)
                    if (newVersion > currentVersion) {
                        console.log(`[Screen] Content version changed (${currentVersion} → ${newVersion}), refreshing...`);
                        // Per ChatGPT review v3: Use jitter to prevent mass reload spikes
                        guardedReloadWithJitter();
                    }
                }
            },
            (error) => {
                console.warn('[Screen] Listener error:', error);
                // On listener error, set offline mode but keep showing cached slides
                setState(prev => ({ ...prev, isOffline: true }));
            }
        );

        // Cleanup listener on unmount
        return () => {
            console.log('[Screen] Cleaning up real-time listener');
            unsubscribe();
        };
    }, [storeId, initialData.contentVersion]);

    // Fallback: Refresh every 30 minutes if listener fails (safety net)
    useEffect(() => {
        const fallbackRefresh = setInterval(() => {
            if (state.isOffline) {
                console.log('[Screen] Offline fallback refresh attempt');
                guardedReload();
            }
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(fallbackRefresh);
    }, [state.isOffline]);

    // Proactive refresh every 6 hours for long-running screen health (Customer Infra Hardening - TASK 9)
    // Screens run 12+ hours/day for years. Periodic refresh prevents:
    // - Memory leaks from long-running sessions
    // - Stale Firebase SDK listeners that stop receiving updates
    // - Missing code updates deployed to Vercel
    useEffect(() => {
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
        const proactiveRefresh = setInterval(() => {
            console.log('[Screen] Proactive 6-hour refresh for health maintenance');
            guardedReload();
        }, SIX_HOURS_MS);

        return () => clearInterval(proactiveRefresh);
    }, []);

    // Per ChatGPT review v3: Auto-fullscreen recovery
    // Staff may accidentally exit fullscreen via remote or touch
    const [showFullscreenHint, setShowFullscreenHint] = useState(false);
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setShowFullscreenHint(true);
                // Auto-hide hint after 10 seconds
                setTimeout(() => setShowFullscreenHint(false), 10000);
            } else {
                setShowFullscreenHint(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Current slide with zero-blank guarantee
    const currentSlide = state.slides[state.currentIndex];

    // HARDENING: Zero-blank guarantee - always show something
    if (!currentSlide && state.slides.length === 0) {
        // Emergency fallback: show brand slide even if no data
        return (
            <div className="screen-container">
                <div className="slide brand-slide">
                    {storeInfo.logoUrl ? (
                        <img src={storeInfo.logoUrl} alt={storeInfo.name} className="store-logo" />
                    ) : (
                        <div className="store-name-large">{storeInfo.name || 'Menu'}</div>
                    )}
                    <p className="scan-prompt">Scan to view menu</p>
                    {qrReady && storeInfo.menuQrUrl && (
                        <div className="qr-code">
                            <QRCode
                                value={storeInfo.menuQrUrl}
                                size={140}
                                color="#000000"
                                bgColor="#ffffff"
                                errorLevel="H"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                    )}
                </div>
                <ScreenAttribution activePlanType={storeInfo.activePlanType} />
                <style jsx>{`
                    .screen-container {
                        width: 100vw;
                        height: 100vh;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    .brand-slide {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                        gap: 24px;
                    }
                    .store-logo {
                        max-width: 200px;
                        max-height: 200px;
                        object-fit: contain;
                    }
                    .store-name-large {
                        font-size: 48px;
                        font-weight: bold;
                    }
                    .scan-prompt {
                        font-size: 24px;
                        opacity: 0.8;
                    }
                    .qr-code {
                        padding: 8px;
                        background: white;
                        border-radius: 8px;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="screen-container">
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

            {/* Offline indicator */}
            {state.isOffline && (
                <div className="offline-indicator">
                    <span className="offline-dot" />
                    Offline Mode
                </div>
            )}

            {/* Slides — enhanced transitions */}
            <AnimatePresence mode="wait">
                {currentSlide && (
                    <motion.div
                        key={currentSlide.id}
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="slide-wrapper"
                    >
                        <SlideContent slide={currentSlide} storeInfo={storeInfo} qrReady={qrReady} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Slide progress — capsule indicators */}
            {state.slides.length > 1 && (
                <div className="slide-progress-bar">
                    {state.slides.map((_, index) => (
                        <div
                            key={index}
                            className={`progress-capsule ${index === state.currentIndex ? 'active' : ''} ${index < state.currentIndex ? 'done' : ''}`}
                        />
                    ))}
                </div>
            )}

            <ScreenAttribution activePlanType={storeInfo.activePlanType} />

            {/* Styles */}
            <style jsx global>{`
                html, body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background: #000;
                }
                
                .screen-container {
                    width: 100vw;
                    height: 100vh;
                    background: #0a0e1a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                }
                
                .fullscreen-hint {
                    position: fixed;
                    top: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.86);
                    color: #ffffff;
                    padding: 10px 24px;
                    border-radius: 8px;
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
                
                .slide-wrapper {
                    width: 100%;
                    height: 100%;
                }
                
                .offline-indicator {
                    position: fixed;
                    top: 16px;
                    right: 16px;
                    background: rgba(0, 0, 0, 0.78);
                    color: #fca5a5;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .offline-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #ef4444;
                }
                
                .slide-progress-bar {
                    position: fixed;
                    bottom: 28px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 6px;
                    z-index: 100;
                    padding: 6px 12px;
                    background: rgba(0, 0, 0, 0.56);
                    border-radius: 8px;
                }
                
                .progress-capsule {
                    width: 24px;
                    height: 4px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.2);
                    transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
                }
                
                .progress-capsule.active {
                    width: 40px;
                    background: #ffffff;
                }
                
                .progress-capsule.done {
                    background: rgba(255,255,255,0.5);
                }
            `}</style>
        </div>
    );
}

/**
 * Render slide based on type
 */
function SlideContent({ slide, storeInfo, qrReady }: { slide: ScreenSlide; storeInfo: ScreenStoreInfo; qrReady: boolean }) {
    if (slide.type === "brand_fallback") {
        return (
            <div className="slide brand-slide">
                <div className="brand-content">
                    {storeInfo.logoUrl ? (
                        <div className="brand-logo-wrap">
                            <img src={storeInfo.logoUrl} alt={storeInfo.name} className="brand-logo" />
                        </div>
                    ) : (
                        <div className="brand-name-large">{storeInfo.name}</div>
                    )}
                    <p className="brand-tagline">Scan to view full menu</p>
                    {/* HARDENING: Lazy QR loading for cold boot */}
                    {qrReady && (slide.qrUrl || storeInfo.menuQrUrl) && (
                        <div className="brand-qr">
                            <QRCode
                                value={slide.qrUrl || storeInfo.menuQrUrl}
                                size={140}
                                color="#1e293b"
                                bgColor="#ffffff"
                                errorLevel="H"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                    )}
                </div>
                <style jsx>{`
                    .brand-slide {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                        background: #070b12;
                    }
                    .brand-content {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 28px;
                        position: relative;
                        z-index: 1;
                    }
                    .brand-logo-wrap {
                        width: 180px;
                        height: 180px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(255, 255, 255, 0.08);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.16);
                        padding: 24px;
                    }
                    .brand-logo {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }
                    .brand-name-large {
                        font-size: 56px;
                        font-weight: 800;
                        letter-spacing: 0;
                        text-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    }
                    .brand-tagline {
                        font-size: 22px;
                        opacity: 0.6;
                        font-weight: 500;
                        letter-spacing: 0;
                    }
                    .brand-qr {
                        padding: 12px;
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 8px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    }
                `}</style>
            </div>
        );
    }

    if (slide.type === "owner_upload") {
        const ownerSlideLabel = normalizeOwnerSlideCaption(slide.caption);

        return (
            <div className="slide owner-upload-slide">
                <img
                    src={slide.imageUrl}
                    alt={ownerSlideLabel}
                    className="owner-upload-image"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}
                />

                {qrReady && (slide.qrUrl || storeInfo.menuQrUrl) && (
                    <div className="slide-qr-corner">
                        <QRCode
                            value={slide.qrUrl || storeInfo.menuQrUrl}
                            size={64}
                            color="#1e293b"
                            bgColor="#ffffff"
                            errorLevel="H"
                            style={{ borderRadius: 6 }}
                        />
                    </div>
                )}

                <div className="slide-store-watermark">{storeInfo.name}</div>

                <style jsx>{`
                    .owner-upload-slide {
                        width: 100%;
                        height: 100%;
                        position: relative;
                        overflow: hidden;
                        background: #070b12;
                    }
                    .owner-upload-image {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }
                    .slide-qr-corner {
                        position: absolute;
                        top: 24px;
                        right: 24px;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.92);
                        border-radius: 8px;
                        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                        z-index: 2;
                    }
                    .slide-store-watermark {
                        position: absolute;
                        bottom: 28px;
                        right: 24px;
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.32);
                        letter-spacing: 0;
                        text-transform: uppercase;
                        z-index: 2;
                    }
                `}</style>
            </div>
        );
    }

    const slideLabel = resolveScreenText(
        slide.caption,
        slide.source === "evergreen" ? "On menu" : "Featured",
    );
    const dietType = getScreenDietType(slide.tags);
    const hasDietaryTag = dietType !== null;
    const displayTitle = truncateScreenText(slide.itemName || slide.caption, 72, "Featured item");
    const displayDesc = slide.description ? truncateScreenText(slide.description, 120) : null;

    return (
        <div className="slide item-slide">
            {/* Full-bleed image with Ken Burns zoom */}
            {slide.imageUrl && (
                <div className="slide-image-layer">
                    <img
                        src={slide.imageUrl}
                        alt={displayTitle}
                        className="slide-hero-image"
                        onError={(e) => {
                            // HARDENING: Hide broken image, gradient overlay handles background
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}

            {/* Multi-stop gradient overlay for text readability */}
            <div className="slide-overlay" />

            {/* Screen accent strip */}
            <div className="slide-accent-strip" />

            {/* Content positioned over the image */}
            <div className="slide-content">
                {/* Top row: label badge + dietary tag */}
                <div className="slide-top-row">
                    {slideLabel && (
                        <span className="slide-label-badge">{slideLabel}</span>
                    )}
                    {hasDietaryTag && dietType && (
                        <span className={`dietary-badge ${dietType === "veg" ? 'veg' : 'non-veg'}`}>
                            <span className="dietary-dot" />
                            {dietType === "veg" ? 'Veg' : 'Non-Veg'}
                        </span>
                    )}
                </div>

                {/* Item name */}
                <h2 className="slide-item-name">{displayTitle}</h2>

                {/* Description — v2.2 */}
                {displayDesc && (
                    <p className="slide-description">{displayDesc}</p>
                )}

                {slide.price != null && slide.price > 0 && (
                    <div className="slide-meta-row">
                        <div className="slide-price-pill">
                            <span className="price-value">{formatScreenPrice(slide.price, storeInfo.currencySymbol)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* QR in corner */}
            {qrReady && (slide.qrUrl || storeInfo.menuQrUrl) && (
                <div className="slide-qr-corner">
                    <QRCode
                        value={slide.qrUrl || storeInfo.menuQrUrl}
                        size={64}
                        color="#1e293b"
                        bgColor="#ffffff"
                        errorLevel="H"
                        style={{ borderRadius: 6 }}
                    />
                </div>
            )}

            {/* Store name — subtle bottom-right branding */}
            <div className="slide-store-watermark">{storeInfo.name}</div>

            <style jsx>{`
                .item-slide {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow: hidden;
                    background: #0a0e1a;
                }

                /* ═══ KEN BURNS IMAGE ═══ */
                .slide-image-layer {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }
                .slide-hero-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    animation: ken-burns 12s ease-in-out infinite alternate;
                    transform-origin: center center;
                }
                @keyframes ken-burns {
                    0% { transform: scale(1) translate(0, 0); }
                    100% { transform: scale(1.08) translate(-1%, -1%); }
                }

                /* ═══ GRADIENT OVERLAY ═══ */
                .slide-overlay {
                    position: absolute;
                    inset: 0;
                    background: 
                        linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.2) 100%),
                        linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%);
                    z-index: 1;
                }

                /* ═══ SCREEN ACCENT STRIP ═══ */
                .slide-accent-strip {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 6px;
                    background: linear-gradient(90deg, #fbbf24, #f472b6, #60a5fa, #34d399);
                    z-index: 2;
                }

                /* ═══ CONTENT ═══ */
                .slide-content {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 48px 56px 80px;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                /* ═══ TOP ROW — BADGES ═══ */
                .slide-top-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .slide-label-badge {
                    display: inline-flex;
                    padding: 6px 16px;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.9);
                    text-transform: uppercase;
                    letter-spacing: 0;
                }

                .dietary-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0;
                }
                .dietary-badge.veg {
                    background: rgba(34, 197, 94, 0.18);
                    border: 1px solid rgba(34, 197, 94, 0.35);
                    color: #4ade80;
                }
                .dietary-badge.non-veg {
                    background: rgba(239, 68, 68, 0.18);
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    color: #fca5a5;
                }
                .dietary-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 2px;
                    border: 2px solid currentColor;
                }
                .dietary-badge.veg .dietary-dot {
                    background: #22c55e;
                }
                .dietary-badge.non-veg .dietary-dot {
                    background: #ef4444;
                    border-radius: 50%;
                }

                /* ═══ ITEM NAME ═══ */
                .slide-item-name {
                    font-size: 56px;
                    font-weight: 800;
                    margin: 0;
                    color: #ffffff;
                    text-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    letter-spacing: 0;
                    line-height: 1.1;
                }

                /* ═══ DESCRIPTION — v2.2 ═══ */
                .slide-description {
                    font-size: 20px;
                    color: rgba(255, 255, 255, 0.65);
                    font-weight: 400;
                    margin: 0;
                    line-height: 1.4;
                    max-width: 700px;
                    letter-spacing: 0;
                }

                /* ═══ META ROW — PRICE ═══ */
                .slide-meta-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-top: 4px;
                }

                .slide-price-pill {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 4px;
                    padding: 8px 24px;
                    background: rgba(74, 222, 128, 0.15);
                    border: 1px solid rgba(74, 222, 128, 0.25);
                    border-radius: 8px;
                }
                .price-value {
                    font-size: 36px;
                    font-weight: 800;
                    color: #4ade80;
                    font-variant-numeric: tabular-nums;
                }

                /* ═══ QR CORNER ═══ */
                .slide-qr-corner {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.92);
                    border-radius: 8px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                    z-index: 2;
                }

                /* ═══ STORE WATERMARK ═══ */
                .slide-store-watermark {
                    position: absolute;
                    bottom: 28px;
                    right: 24px;
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.2);
                    letter-spacing: 0;
                    text-transform: uppercase;
                    z-index: 2;
                }
            `}</style>
        </div>
    );
}
