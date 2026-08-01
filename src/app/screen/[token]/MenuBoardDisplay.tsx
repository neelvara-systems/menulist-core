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
import {
  formatScreenPrice,
  getScreenDietType,
  hasScreenPrice,
  normalizeCachedScreenMenuItems,
  normalizeScreenCategoryName,
  truncateScreenText,
} from "@lib/screen/screenContent";
import {
  getBoundedScreenStringContext,
  logScreenDisplayFailure,
} from "@lib/screen/screenDiagnostics";
import { getPublicScreenStateDocId } from "@lib/screen/publicScreenState";
import {
  DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
  getFittingScreenColumnAssignments,
  getLeastUsedFittingScreenColumn,
  getMenuBoardLayout,
  getSmallestFittingScreenColumnCount,
  shouldUseDigitalScreenOfflineCache,
} from "@lib/screen/screenRuntime";
import {
  guardedReload as _guardedReload,
  guardedReloadWithJitter as _guardedReloadWithJitter,
  guardedReloadWithRetry as _guardedReloadWithRetry,
} from "@lib/screen/utils";
import { MenuItemForSlide, ScreenStoreInfo } from "@type/campaigns";
import { QRCode } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import ScreenAttribution from "./ScreenAttribution";
import styles from "./screenDisplay.module.scss";

// Auto-pagination timing (per spec: 15-20 seconds per page)
const PAGE_DURATION_MS = 12000;
const SCREEN_SEEN_REQUEST_POLICY = {
  cache: "no-store" as RequestCache,
  credentials: "same-origin" as RequestCredentials,
  redirect: "manual" as RequestRedirect,
};

// Per ChatGPT review v3: Cap total rendered items to prevent layout overflow on TVs
const MAX_TOTAL_ITEMS = 500;

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
      orderIndex: Math.min(
        ...items.map((item) => item.categoryOrderIndex ?? index),
      ),
      items: items.sort(
        (a, b) =>
          (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
            (b.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
          a.name.localeCompare(b.name),
      ),
    }))
    .sort(
      (a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name),
    );
}

/**
 * Paginate category groups into pages that fit on screen
 */
function getCategoryChunks(
  categories: CategoryGroup[],
  itemsPerColumn: number,
): CategoryGroup[] {
  return categories.flatMap((category) => {
    const chunks: CategoryGroup[] = [];
    const itemCapacity = Math.max(1, itemsPerColumn - 1);
    for (let index = 0; index < category.items.length; index += itemCapacity) {
      chunks.push({
        ...category,
        items: category.items.slice(index, index + itemCapacity),
      });
    }
    return chunks;
  });
}

function paginateCategories(
  categories: CategoryGroup[],
  itemsPerColumn: number,
  columnCount: number,
): CategoryGroup[][][] {
  if (categories.length === 0) return [[[]]];

  const categoryChunks = getCategoryChunks(categories, itemsPerColumn);
  const singlePageAssignments = getFittingScreenColumnAssignments(
    categoryChunks.map((category) => category.items.length + 1),
    itemsPerColumn,
    columnCount,
  );
  if (singlePageAssignments) {
    const singlePageColumns = Array.from(
      { length: columnCount },
      () => [] as CategoryGroup[],
    );
    categoryChunks.forEach((category, index) => {
      singlePageColumns[singlePageAssignments[index]].push(category);
    });
    return [singlePageColumns];
  }

  const pages: CategoryGroup[][][] = [];
  let columns = Array.from(
    { length: columnCount },
    () => [] as CategoryGroup[],
  );
  let usedSlots = Array.from({ length: columnCount }, () => 0);

  for (const category of categoryChunks) {
    const requiredSlots = category.items.length + 1;
    let columnIndex = getLeastUsedFittingScreenColumn(
      usedSlots,
      requiredSlots,
      itemsPerColumn,
    );
    if (columnIndex < 0) {
      pages.push(columns);
      columns = Array.from(
        { length: columnCount },
        () => [] as CategoryGroup[],
      );
      usedSlots = Array.from({ length: columnCount }, () => 0);
      columnIndex = 0;
    }
    columns[columnIndex].push(category);
    usedSlots[columnIndex] += requiredSlots;
  }

  if (columns.some((column) => column.length > 0)) pages.push(columns);
  return pages.length > 0 ? pages : [[[]]];
}

export default function MenuBoardDisplay({ initialData }: MenuBoardProps) {
  const {
    menuItems: initialItems,
    storeInfo,
    contentVersion: initialVersion,
    token,
    storeId,
  } = initialData;
  const cacheKey = `menulist-menuboard-data-${token}`;

  // Server data is authoritative online. A matching local snapshot is used
  // only during an offline boot so a withdrawn menu cannot reappear.
  const [menuItems, setMenuItems] = useState<MenuItemForSlide[]>(() => {
    if (typeof window !== "undefined" && initialItems.length === 0) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cachedMenuItems = normalizeCachedScreenMenuItems(
            parsed.menuItems,
          );
          if (
            shouldUseDigitalScreenOfflineCache({
              cachedContentVersion: parsed.contentVersion,
              cachedEntryCount: cachedMenuItems.length,
              initialContentVersion: initialVersion,
              online: navigator.onLine,
            })
          ) {
            return cachedMenuItems;
          }
        }
      } catch (error) {
        logScreenDisplayFailure(
          "digital_screen_menuboard_cache_read_failed",
          error,
          {
            ...getBoundedScreenStringContext("token", token),
            ...getBoundedScreenStringContext("storeId", storeId),
          },
        );
      }
    }
    return initialItems;
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [viewport, setViewport] = useState({ height: 1080, width: 1920 });
  const contentVersionRef = useRef(initialVersion);
  const initialTruthRef = useRef({ items: initialItems, version: initialVersion });

  // A client-side route refresh can preserve this component instance. Keep
  // newly received server truth authoritative without replacing a valid
  // offline cache during the initial mount.
  useEffect(() => {
    const previous = initialTruthRef.current;
    initialTruthRef.current = { items: initialItems, version: initialVersion };
    if (
      previous.items === initialItems
      && previous.version === initialVersion
    ) {
      return;
    }
    contentVersionRef.current = initialVersion;
    setMenuItems(initialItems);
    setCurrentPage(0);
  }, [initialItems, initialVersion]);

  // Group and paginate
  const categories = useMemo(() => groupByCategory(menuItems), [menuItems]);
  const viewportLayout = useMemo(
    () => getMenuBoardLayout(viewport.width, viewport.height),
    [viewport],
  );
  const layout = useMemo(() => {
    const categoryChunks = getCategoryChunks(
      categories,
      viewportLayout.itemsPerColumn,
    );
    const minimumColumns =
      categories.length <= 1 ? 1 : Math.min(2, viewportLayout.columnCount);
    const columnCount = getSmallestFittingScreenColumnCount(
      categoryChunks.map((category) => category.items.length + 1),
      viewportLayout.itemsPerColumn,
      viewportLayout.columnCount,
      minimumColumns,
    );

    return { ...viewportLayout, columnCount };
  }, [categories, viewportLayout]);
  const pages = useMemo(
    () =>
      paginateCategories(categories, layout.itemsPerColumn, layout.columnCount),
    [categories, layout],
  );
  const totalPages = pages.length;
  const totalPagesRef = useRef(totalPages);
  totalPagesRef.current = totalPages;
  const showWideDescriptions = useMemo(
    () =>
      viewport.width >= 1600 &&
      viewport.height > 800 &&
      layout.columnCount === 2 &&
      pages.every((page) =>
        page.every(
          (column) =>
            column.length <= 2 &&
            column.reduce(
              (itemCount, category) => itemCount + category.items.length,
              0,
            ) <= 9,
        ),
      ),
    [layout.columnCount, pages, viewport.height, viewport.width],
  );

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ height: window.innerHeight, width: window.innerWidth });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  // Lazy QR loading (same pattern as ScreenDisplay — cold boot optimization)
  useEffect(() => {
    const timer = setTimeout(() => setQrReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Cache to localStorage for offline support
  useEffect(() => {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          menuItems,
          storeInfo,
          contentVersion: contentVersionRef.current,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      logScreenDisplayFailure(
        "digital_screen_menuboard_cache_write_failed",
        error,
        {
          ...getBoundedScreenStringContext("token", token),
          ...getBoundedScreenStringContext("storeId", storeId),
          itemCount: menuItems.length,
        },
      );
    }
  }, [cacheKey, menuItems, storeId, storeInfo, token]);

  // Auto-pagination timer
  useEffect(() => {
    if (totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => {
        const currentTotalPages = totalPagesRef.current;
        return currentTotalPages > 0
          ? (prev + 1) % currentTotalPages
          : 0;
      });
    }, PAGE_DURATION_MS);

    return () => clearInterval(timer);
  }, [totalPages]);

  // Firebase onSnapshot listener for real-time updates
  // Per ChatGPT review v3: Added offline state + retry matching ScreenDisplay pattern
  useEffect(() => {
    if (!storeId || !firebaseClient) {
      setIsOffline(true);
      return;
    }

    try {
      let cancelScheduledReload: (() => void) | null = null;
      const scheduleImmediateReload = () => {
        cancelScheduledReload?.();
        cancelScheduledReload = _guardedReloadWithRetry("menuboard", token);
      };
      const docRef = doc(
        firebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        getPublicScreenStateDocId(storeId),
      );
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            scheduleImmediateReload();
            return;
          }
          const data = snapshot.data();
          if (data?.enabled !== true) {
            scheduleImmediateReload();
            return;
          }
          const newVersion = data?.contentVersion || 0;

          if (
            newVersion > contentVersionRef.current
            && cancelScheduledReload === null
          ) {
            contentVersionRef.current = newVersion;
            cancelScheduledReload = _guardedReloadWithJitter(
              "menuboard",
              token,
            );
          }
        },
        (error) => {
          logScreenDisplayFailure(
            "digital_screen_menuboard_listener_failed",
            error,
            {
              ...getBoundedScreenStringContext("storeId", storeId),
              currentVersion: contentVersionRef.current,
            },
          );
          setIsOffline(true);
        },
      );

      return () => {
        unsubscribe();
        cancelScheduledReload?.();
      };
    } catch (error) {
      logScreenDisplayFailure(
        "digital_screen_menuboard_listener_failed",
        error,
        {
          ...getBoundedScreenStringContext("storeId", storeId),
          currentVersion: contentVersionRef.current,
        },
      );
      setIsOffline(true);
    }
  }, [initialVersion, storeId, token]);

  // Fallback: Refresh every 30 minutes if listener fails (matching ScreenDisplay)
  useEffect(() => {
    const fallbackRefresh = setInterval(
      () => {
        if (isOffline) {
          _guardedReload("menuboard", token);
        }
      },
      30 * 60 * 1000,
    );
    return () => clearInterval(fallbackRefresh);
  }, [isOffline, token]);

  // Daily seen signal (same as ScreenDisplay — once per day per screen)
  useEffect(() => {
    const todayKey = `screen_seen_${token}_${new Date().toISOString().slice(0, 10)}`;
    let alreadySeenToday = false;
    try {
      alreadySeenToday = localStorage.getItem(todayKey) === "1";
    } catch (error) {
      logScreenDisplayFailure(
        "digital_screen_menuboard_seen_storage_read_failed",
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
              "digital_screen_menuboard_seen_signal_rejected",
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
          logScreenDisplayFailure(
            "digital_screen_menuboard_seen_signal_failed",
            error,
            {
              ...getBoundedScreenStringContext("token", token),
              ...getBoundedScreenStringContext("storeId", storeId),
            },
          );
        });
    }
  }, [token, storeId]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 6-hour proactive refresh (same as ScreenDisplay — picks up code deploys)
  useEffect(() => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const timer = setInterval(() => {
      _guardedReload("menuboard", token);
    }, SIX_HOURS_MS);
    return () => clearInterval(timer);
  }, [token]);

  // Per ChatGPT review v3: Auto-fullscreen recovery
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
          "digital_screen_menuboard_fullscreen_request_failed",
          error,
          {
            ...getBoundedScreenStringContext("token", token),
            ...getBoundedScreenStringContext("storeId", storeId),
            component: "menuboard",
          },
        );
      });
    }
    setShowFullscreenHint(false);
  };

  const currentColumns = pages[currentPage] || [[]];

  return (
    <div
      className={`${styles.menuBoard} menu-board`}
      data-columns={layout.columnCount}
      data-detail={showWideDescriptions ? "descriptions" : "compact"}
      style={{
        "--screen-brand-accent": storeInfo.accentColor || DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR,
        "--screen-columns": layout.columnCount,
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

      {/* Header */}
      <header className="board-header">
        <div className="store-identity">
          {storeInfo.logoUrl && (
            <div className="logo-glow">
              <img
                src={storeInfo.logoUrl}
                alt={storeInfo.name}
                className="store-logo"
              />
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
              <span className="qr-label">Scan for menu</span>
            </div>
          )}
        </div>
      </header>

      {/* Menu Content — animated page transitions */}
      <AnimatePresence mode="wait">
        <motion.main
          key={currentPage}
          className="board-content"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {currentColumns.every((column) => column.length === 0) ? (
            <div className="empty-state">
              <p>
                {menuItems.length > 0 && menuItems.every((i) => !i.available)
                  ? "Items are currently unavailable"
                  : "Menu is not available right now"}
              </p>
            </div>
          ) : (
            <div className="categories-layout">
              {currentColumns.map((column, columnIndex) => (
                <div className="menu-column" key={`column-${columnIndex}`}>
                  {column.map((category, catIdx) => {
                    return (
                      <motion.section
                        key={`${category.name}-${category.items[0]?.id || catIdx}`}
                        className="category-card"
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: catIdx * 0.1, duration: 0.5 }}
                      >
                        <div className="category-header">
                          <div className="category-accent-bar" />
                          <h2 className="category-name">{category.name}</h2>
                          <span className="category-count">
                            {category.items.length}
                          </span>
                        </div>
                        <div className="items-list">
                          {category.items.map((item, itemIdx) => (
                            <motion.div
                              key={item.id}
                              className="menu-item-row"
                              initial={false}
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
                                    const dietType = getScreenDietType(
                                      item.tags,
                                    );
                                    if (dietType === "veg")
                                      return <span className="diet-dot veg" />;
                                    if (dietType === "nonVeg")
                                      return (
                                        <span className="diet-dot non-veg" />
                                      );
                                    return null;
                                  })()}
                                  <span className="item-name">
                                    {truncateScreenText(
                                      item.name,
                                      64,
                                      "Menu item",
                                    )}
                                  </span>
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
                                <span
                                  className={`item-price ${hasScreenPrice(item.price) ? "" : "muted"}`}
                                >
                                  {formatScreenPrice(
                                    item.price,
                                    storeInfo.currencySymbol,
                                    storeInfo.locale,
                                  )}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.section>
                    );
                  })}
                </div>
              ))}
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
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: PAGE_DURATION_MS / 1000,
                ease: "linear",
              }}
            />
            <span className="page-label">
              {currentPage + 1} / {totalPages}
            </span>
          </div>
        )}
        {isOffline && <span className="offline-pill">Offline</span>}
      </footer>

      <ScreenAttribution activePlanType={storeInfo.activePlanType} />
    </div>
  );
}
