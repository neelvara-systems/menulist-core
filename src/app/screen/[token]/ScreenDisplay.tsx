"use client";

/**
 * Screen Display Client Component
 * Handles slide rotation, offline caching, and real-time updates
 * Per DAL pattern: Receives initial data from server component
 *
 * HARDENING (Jan 2026):
 * - Server-authoritative rendering with version-matched offline fallback
 * - Firebase real-time listener (data freshness)
 * - Zero-blank guarantee (fallback guard)
 * - Lazy QR loading (cold boot optimization)
 */

import { firebaseClient } from "@lib/firebase/firebaseClient";
import { DB_COLLECTIONS } from "@constant/database";
import {
  formatScreenPrice,
  getScreenDietType,
  hasScreenPrice,
  normalizeCachedScreenSlides,
  normalizeOwnerSlideCaption,
  resolveScreenText,
  truncateScreenText,
} from "@lib/screen/screenContent";
import {
  getBoundedScreenStringContext,
  logScreenDisplayFailure,
} from "@lib/screen/screenDiagnostics";
import { getPublicScreenStateDocId } from "@lib/screen/publicScreenState";
import {
  DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
  shouldUseDigitalScreenOfflineCache,
} from "@lib/screen/screenRuntime";
import { screenTimestampToMillis } from "@lib/screen/screenTimestamp";
import {
  guardedReload as _guardedReload,
  guardedReloadWithJitter as _guardedReloadWithJitter,
  guardedReloadWithRetry as _guardedReloadWithRetry,
} from "@lib/screen/utils";
import { ScreenSlide, ScreenStoreInfo } from "@type/campaigns";
import { QRCode } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import ScreenAttribution from "./ScreenAttribution";
import styles from "./screenDisplay.module.scss";

const SCREEN_BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const SCREEN_SEEN_REQUEST_POLICY = {
  cache: "no-store" as RequestCache,
  credentials: "same-origin" as RequestCredentials,
  redirect: "manual" as RequestRedirect,
};

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
  const {
    slides: initialSlides,
    storeInfo,
    config,
    token,
    storeId,
  } = initialData;
  const cacheKey = `menulist-screen-data-${token}`;

  // Use a local snapshot only for a version-matched offline boot.
  const [state, setState] = useState<ScreenState>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const cachedSlides = normalizeCachedScreenSlides(parsedCache.slides);
          if (
            shouldUseDigitalScreenOfflineCache({
              cachedContentVersion: parsedCache.contentVersion,
              cachedEntryCount: cachedSlides.length,
              initialContentVersion: initialData.contentVersion,
              online: navigator.onLine,
            })
          ) {
            return {
              slides: cachedSlides,
              currentIndex: 0,
              isOffline: false,
            };
          }
        }
      } catch (e) {
        logScreenDisplayFailure("digital_screen_display_cache_read_failed", e, {
          ...getBoundedScreenStringContext("token", token),
          ...getBoundedScreenStringContext("storeId", storeId),
          buildVersionPresent: Boolean(SCREEN_BUILD_VERSION),
          buildVersionLength: SCREEN_BUILD_VERSION.length,
        });
      }
    }
    // Fall back to server data
    return {
      slides: initialSlides,
      currentIndex: 0,
      isOffline: false,
    };
  });

  // Lazy QR loading for cold boot optimization
  const [qrReady, setQrReady] = useState(false);

  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialTruthRef = useRef({
    slides: initialSlides,
    version: initialData.contentVersion,
  });

  // Keep current server truth authoritative after a client-side route refresh.
  // Local content is admitted only during a version-matched offline boot.
  useEffect(() => {
    const previous = initialTruthRef.current;
    initialTruthRef.current = {
      slides: initialSlides,
      version: initialData.contentVersion,
    };
    if (
      previous.slides === initialSlides
      && previous.version === initialData.contentVersion
    ) {
      return;
    }
    const serverDataStr = JSON.stringify(initialSlides);
    const currentDataStr = JSON.stringify(state.slides);
    if (serverDataStr !== currentDataStr) {
      setState((prev) => ({
        ...prev,
        currentIndex:
          initialSlides.length > 0
            ? Math.min(prev.currentIndex, initialSlides.length - 1)
            : 0,
        slides: initialSlides,
      }));
    }
  }, [initialData.contentVersion, initialSlides]);

  // Cache data for offline use (write after render)
  useEffect(() => {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ...initialData,
          slides: state.slides,
        }),
      );
    } catch (e) {
      logScreenDisplayFailure("digital_screen_display_cache_write_failed", e, {
        ...getBoundedScreenStringContext("token", token),
        ...getBoundedScreenStringContext("storeId", storeId),
        slideCount: state.slides.length,
      });
    }
  }, [cacheKey, initialData, state.slides, storeId, token]);

  // HARDENING: Delay QR loading for faster cold boot
  useEffect(() => {
    const timer = setTimeout(() => {
      setQrReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // HARDENING: Daily "seen" signal for operational awareness
  // NOT a heartbeat - just ONE write per day per screen
  // Gives ops team visibility without per-minute cost
  useEffect(() => {
    const todayKey = `screen_seen_${token}_${new Date().toISOString().slice(0, 10)}`;
    let alreadySeenToday = false;
    try {
      alreadySeenToday = localStorage.getItem(todayKey) === "1";
    } catch (error) {
      // Storage can be disabled by a TV browser policy. The operational signal
      // is best-effort and must never take the public display down with it.
      logScreenDisplayFailure(
        "digital_screen_display_seen_storage_read_failed",
        error,
        {
          ...getBoundedScreenStringContext("token", token),
          ...getBoundedScreenStringContext("storeId", storeId),
        },
      );
    }

    if (!alreadySeenToday) {
      fetch("/api/screen/seen", {
        ...SCREEN_SEEN_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, storeId }),
      })
        .then((response) => {
          if (!response.ok) {
            logScreenDisplayFailure(
              "digital_screen_display_seen_signal_rejected",
              new Error("screen_seen_signal_rejected"),
              {
                ...getBoundedScreenStringContext("token", token),
                ...getBoundedScreenStringContext("storeId", storeId),
                responseStatus: response.status,
              },
            );
            return;
          }
          localStorage.setItem(todayKey, "1");
        })
        .catch((error) => {
          // Seen-signal failures must not break the public screen.
          logScreenDisplayFailure(
            "digital_screen_display_seen_signal_failed",
            error,
            {
              ...getBoundedScreenStringContext("token", token),
              ...getBoundedScreenStringContext("storeId", storeId),
            },
          );
        });
    }
  }, [token, storeId]);

  // Advance to next slide
  const advanceSlide = useCallback(() => {
    setState((prev) => {
      if (prev.slides.length === 0) {
        return prev.currentIndex === 0
          ? prev
          : { ...prev, currentIndex: 0 };
      }
      const currentIndex = Number.isSafeInteger(prev.currentIndex)
        && prev.currentIndex >= 0
        ? prev.currentIndex
        : 0;
      return {
        ...prev,
        currentIndex: (currentIndex + 1) % prev.slides.length,
      };
    });
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

  // Owner posters have a truth deadline. Reload at the nearest expiry so a
  // long-running TV cannot keep displaying an expired offer until the next
  // six-hour maintenance refresh.
  useEffect(() => {
    const now = Date.now();
    const nextExpiry = state.slides
      .filter((slide) => slide.type === "owner_upload")
      .map((slide) => screenTimestampToMillis(slide.validUntil))
      .filter((value): value is number => value !== null && value > now)
      .sort((left, right) => left - right)[0];
    if (!nextExpiry) return;

    const timeout = window.setTimeout(
      () => _guardedReload("screen", token),
      Math.min(2_147_000_000, Math.max(1_000, nextExpiry - now + 1_000)),
    );
    return () => window.clearTimeout(timeout);
  }, [state.slides, token]);

  // HARDENING: Firebase real-time listener for data freshness
  // GPT FIX 3: Direct doc listener (cheaper than query listener at scale)
  // Doc listener = 1 persistent connection to exact doc. Query listener = index scan.
  // At 5k+ screens, this saves significant Firestore cost.
  useEffect(() => {
    if (!storeId || !firebaseClient) {
      setState((prev) => ({ ...prev, isOffline: true }));
      return;
    }

    try {
      let cancelScheduledReload: (() => void) | null = null;
      const scheduleImmediateReload = () => {
        cancelScheduledReload?.();
        cancelScheduledReload = _guardedReloadWithRetry("screen", token);
      };
      const docId = getPublicScreenStateDocId(storeId);
      const docRef = doc(
        firebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        docId,
      );

      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            scheduleImmediateReload();
            return;
          }
          const docData = snapshot.data();
          if (docData.enabled !== true) {
            scheduleImmediateReload();
            return;
          }
          const newVersion = docData.contentVersion || 1;
          const currentVersion = initialData.contentVersion;

          if (
            newVersion > currentVersion
            && cancelScheduledReload === null
          ) {
            cancelScheduledReload = _guardedReloadWithJitter("screen", token);
          }
        },
        (error) => {
          logScreenDisplayFailure(
            "digital_screen_display_listener_failed",
            error,
            {
              ...getBoundedScreenStringContext("storeId", storeId),
              currentVersion: initialData.contentVersion,
            },
          );
          setState((prev) => ({ ...prev, isOffline: true }));
        },
      );

      return () => {
        unsubscribe();
        cancelScheduledReload?.();
      };
    } catch (error) {
      logScreenDisplayFailure("digital_screen_display_listener_failed", error, {
        ...getBoundedScreenStringContext("storeId", storeId),
        currentVersion: initialData.contentVersion,
      });
      setState((prev) => ({ ...prev, isOffline: true }));
    }
  }, [storeId, initialData.contentVersion, token]);

  // Fallback: Refresh every 30 minutes if listener fails (safety net)
  useEffect(() => {
    const fallbackRefresh = setInterval(
      () => {
        if (state.isOffline) {
          _guardedReload("screen", token);
        }
      },
      30 * 60 * 1000,
    ); // 30 minutes

    return () => clearInterval(fallbackRefresh);
  }, [state.isOffline, token]);

  // Proactive refresh every 6 hours for long-running screen health (Customer Infra Hardening - TASK 9)
  // Screens run 12+ hours/day for years. Periodic refresh prevents:
  // - Memory leaks from long-running sessions
  // - Stale Firebase SDK listeners that stop receiving updates
  // - Missing code updates deployed to Vercel
  useEffect(() => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const proactiveRefresh = setInterval(() => {
      _guardedReload("screen", token);
    }, SIX_HOURS_MS);

    return () => clearInterval(proactiveRefresh);
  }, [token]);

  // Per ChatGPT review v3: Auto-fullscreen recovery
  // Staff may accidentally exit fullscreen via remote or touch
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const fullscreenHintTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const clearFullscreenHintTimer = () => {
      if (fullscreenHintTimerRef.current !== null) {
        window.clearTimeout(fullscreenHintTimerRef.current);
        fullscreenHintTimerRef.current = null;
      }
    };
    const handleFullscreenChange = () => {
      clearFullscreenHintTimer();
      if (!document.fullscreenElement) {
        setShowFullscreenHint(true);
        // Auto-hide hint after 10 seconds
        fullscreenHintTimerRef.current = window.setTimeout(() => {
          fullscreenHintTimerRef.current = null;
          setShowFullscreenHint(false);
        }, 10000);
      } else {
        setShowFullscreenHint(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      clearFullscreenHintTimer();
    };
  }, []);

  const handleFullscreenHintClick = () => {
    if (fullscreenHintTimerRef.current !== null) {
      window.clearTimeout(fullscreenHintTimerRef.current);
      fullscreenHintTimerRef.current = null;
    }
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    if (fullscreenRequest) {
      fullscreenRequest.catch((error) => {
        logScreenDisplayFailure(
          "digital_screen_display_fullscreen_request_failed",
          error,
          {
            ...getBoundedScreenStringContext("token", token),
            ...getBoundedScreenStringContext("storeId", storeId),
            component: "highlights",
          },
        );
      });
    }
    setShowFullscreenHint(false);
  };

  // Current slide with zero-blank guarantee
  const currentSlide = state.slides[state.currentIndex];

  // HARDENING: Zero-blank guarantee - always show something
  if (!currentSlide && state.slides.length === 0) {
    // Emergency fallback: show brand slide even if no data
    return (
      <div
        className={`${styles.highlights} screen-container`}
        style={{
          "--screen-brand-accent": storeInfo.accentColor || DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
        } as CSSProperties}
      >
        <div className="slide brand-slide">
          <div className="brand-content">
            {storeInfo.logoUrl && (
              <div className="brand-logo-wrap">
                <img
                  src={storeInfo.logoUrl}
                  alt={storeInfo.name}
                  className="brand-logo"
                />
              </div>
            )}
            <div className="brand-name-large">{storeInfo.name || "Menu"}</div>
            <p className="brand-tagline">Scan to view full menu</p>
            {qrReady && storeInfo.menuQrUrl && (
              <div className="brand-qr">
                <QRCode
                  value={storeInfo.menuQrUrl}
                  size={140}
                  color="#1e293b"
                  bgColor="#ffffff"
                  errorLevel="H"
                  style={{ borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        </div>
        <ScreenAttribution activePlanType={storeInfo.activePlanType} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.highlights} screen-container`}
      style={{
        "--screen-brand-accent": storeInfo.accentColor || DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
      } as CSSProperties}
    >
      {/* Fullscreen recovery hint */}
      {showFullscreenHint && (
        <button
          type="button"
          className="fullscreen-hint"
          onClick={handleFullscreenHintClick}
        >
          Tap to return to fullscreen
        </button>
      )}

      {/* Offline indicator */}
      {state.isOffline && (
        <div className="offline-indicator">
          <span className="offline-dot" />
          Offline
        </div>
      )}

      {/* Slides — enhanced transitions */}
      <AnimatePresence mode="wait">
        {currentSlide && (
          <motion.div
            key={currentSlide.id}
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="slide-wrapper"
          >
            <SlideContent
              slide={currentSlide}
              storeInfo={storeInfo}
              qrReady={qrReady}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide progress — capsule indicators */}
      {state.slides.length > 1 && (
        <div className="slide-progress-bar">
          {state.slides.map((_, index) => (
            <div
              key={index}
              className={`progress-capsule ${index === state.currentIndex ? "active" : ""} ${index < state.currentIndex ? "done" : ""}`}
            />
          ))}
        </div>
      )}

      <ScreenAttribution activePlanType={storeInfo.activePlanType} />
    </div>
  );
}

/**
 * Render slide based on type
 */
function SlideContent({
  slide,
  storeInfo,
  qrReady,
}: {
  slide: ScreenSlide;
  storeInfo: ScreenStoreInfo;
  qrReady: boolean;
}) {
  const slideQrUrl = slide.qrUrl || storeInfo.menuQrUrl;
  const slideQrLabel = slide.qrUrl ? "Scan" : "Full menu";

  if (slide.type === "brand_fallback") {
    return (
      <div className="slide brand-slide">
        <div className="brand-content">
          {storeInfo.logoUrl && (
            <div className="brand-logo-wrap">
              <img
                src={storeInfo.logoUrl}
                alt={storeInfo.name}
                className="brand-logo"
              />
            </div>
          )}
          <div className="brand-name-large">{storeInfo.name || "Menu"}</div>
          <p className="brand-tagline">Scan to view full menu</p>
          {/* HARDENING: Lazy QR loading for cold boot */}
          {qrReady && slideQrUrl && (
            <div className="brand-qr">
              <QRCode
                value={slideQrUrl}
                size={140}
                color="#1e293b"
                bgColor="#ffffff"
                errorLevel="H"
                style={{ borderRadius: 8 }}
              />
            </div>
          )}
        </div>
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

        {qrReady && slideQrUrl && (
          <div className="slide-qr-corner">
            <QRCode
              value={slideQrUrl}
              size={80}
              color="#1e293b"
              bgColor="#ffffff"
              errorLevel="H"
              style={{ borderRadius: 6 }}
            />
            <span className="slide-qr-label">{slideQrLabel}</span>
          </div>
        )}

        <div className="slide-store-watermark">{storeInfo.name}</div>
      </div>
    );
  }

  const slideLabel = resolveScreenText(
    slide.caption,
    slide.source === "evergreen" ? "On menu" : "Featured",
  );
  const dietType = getScreenDietType(slide.tags);
  const hasDietaryTag = dietType !== null;
  const displayTitle = truncateScreenText(
    slide.itemName || slide.caption,
    72,
    "Featured item",
  );
  const displayDesc = slide.description
    ? truncateScreenText(slide.description, 120)
    : null;

  return (
    <div className="slide item-slide">
      {/* Full-bleed image */}
      {slide.imageUrl && (
        <div className="slide-image-layer">
          <img
            src={slide.imageUrl}
            alt={displayTitle}
            className="slide-hero-image"
            onError={(e) => {
              // HARDENING: Hide broken image, gradient overlay handles background
              (e.target as HTMLImageElement).style.display = "none";
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
            <span
              className={`dietary-badge ${dietType === "veg" ? "veg" : "non-veg"}`}
            >
              <span className="dietary-dot" />
              {dietType === "veg" ? "Veg" : "Non-Veg"}
            </span>
          )}
        </div>

        {/* Item name */}
        <h2 className="slide-item-name">{displayTitle}</h2>

        {/* Description — v2.2 */}
        {displayDesc && <p className="slide-description">{displayDesc}</p>}

        {hasScreenPrice(slide.price) && (
          <div className="slide-meta-row">
            <div className="slide-price-pill">
              <span className="price-value">
                {formatScreenPrice(
                  slide.price,
                  storeInfo.currencySymbol,
                  storeInfo.locale,
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* QR in corner */}
      {qrReady && slideQrUrl && (
        <div className="slide-qr-corner">
          <QRCode
            value={slideQrUrl}
            size={80}
            color="#1e293b"
            bgColor="#ffffff"
            errorLevel="H"
            style={{ borderRadius: 6 }}
          />
          <span className="slide-qr-label">{slideQrLabel}</span>
        </div>
      )}

      {/* Store name — subtle bottom-right branding */}
      <div className="slide-store-watermark">{storeInfo.name}</div>
    </div>
  );
}
