/**
 * Product Detail Page Modal (New Design System)
 *
 * Full-screen modal for viewing menu item details.
 * No Ant Design - uses Tailwind + Framer Motion only.
 *
 * Preserves all functional logic:
 * - Analytics tracking (trackMenuItemView)
 * - Category lookup from projectData
 */

import { ExtractedDataCategory, ExtractedDataItem } from '@template/main-app/projects/types';
import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { AnalyticsContext } from '@template/website/clientWebsite/AnalyticsContext';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { getLocalizedText } from '@lib/localization/text';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
    getPublicSpiceLevelLabel,
    type PublicCustomerTranslator,
} from '@lib/localization/publicCustomerMessages';
import { getMenuItemImageAltText } from '@lib/media/altText';
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString, getNutritionFact } from '@lib/menu/itemDecisionFacts';
import { normalizePublicMenuImages } from '@lib/menu/publicMenuImages';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import PublicImageViewer from '@/components/shared/media/PublicImageViewer';
import { formatMenuPrice, parseSingleMenuPrice } from '@lib/pricing/formatMenuPrice';
import { getActivePublicItemPriceAttributes, getPublicItemListPriceLabel } from '@lib/pricing/publicItemPricePresentation';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { LuChevronLeft, LuChevronRight, LuMaximize2, LuShare2, LuX } from 'react-icons/lu';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';
import { menuBottomSheetMotion, menuDialogMotion, menuSpringTransition } from './menuMotion';

type ItemShareMethod = 'native_share' | 'copy_link';
const PUBLIC_MENU_PDP_ITEM_SHARE_CLIPBOARD_UNAVAILABLE = 'public_menu_pdp_item_share_clipboard_unavailable';
const PUBLIC_MENU_PDP_ITEM_SHARE_COPY_FALLBACK_FAILED = 'public_menu_pdp_item_share_copy_fallback_failed';
const PDP_FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

interface PDPModalProps {
    item: ExtractedDataItem | null;
    onClose: () => void;
    onClosed?: () => void;
    language: string;
    moodConfig: MenuMoodConfig;
    projectData: Project;
    showItemPrices?: boolean;
    currencySymbol?: string;
    currencyCode?: string;
    unavailableLabel?: string;
    trackView?: boolean;
    showCategoryIcons?: boolean;
    recoveryActions?: Array<{
        label: string;
        href: string;
        external?: boolean;
        track: () => Promise<void>;
    }>;
    itemShareUrl?: string;
    onShare?: (method: ItemShareMethod) => void;
}

function hasPdpItemShareClipboardWrite(): boolean {
    return (
        typeof navigator !== 'undefined'
        && Boolean(navigator.clipboard)
        && typeof navigator.clipboard.writeText === 'function'
    );
}

function hasPdpItemShareCopyFallback(): boolean {
    return (
        typeof document !== 'undefined'
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function'
        && Boolean(document.body)
    );
}

async function copyTextToClipboard(text: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasPdpItemShareClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasPdpItemShareCopyFallback()) {
        const unavailableError = clipboardWriteError || new Error(PUBLIC_MENU_PDP_ITEM_SHARE_CLIPBOARD_UNAVAILABLE);
        throw Object.assign(unavailableError instanceof Error ? unavailableError : new Error(PUBLIC_MENU_PDP_ITEM_SHARE_CLIPBOARD_UNAVAILABLE), {
            code: PUBLIC_MENU_PDP_ITEM_SHARE_CLIPBOARD_UNAVAILABLE,
        });
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', 'true');
    try {
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand('copy');
        if (!copied) {
            throw Object.assign(new Error(PUBLIC_MENU_PDP_ITEM_SHARE_COPY_FALLBACK_FAILED), {
                code: PUBLIC_MENU_PDP_ITEM_SHARE_COPY_FALLBACK_FAILED,
            });
        }
    } finally {
        if (textArea.parentNode) {
            textArea.parentNode.removeChild(textArea);
        }
    }
}

function getCompactShareText(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 140) return normalized;
    return `${normalized.slice(0, 137).trim()}...`;
}

function sanitizePdpTags(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.reduce((acc: string[], rawTag) => {
        if (typeof rawTag !== 'string') return acc;
        const tag = rawTag.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
        if (!tag) return acc;
        if (/^\d+(\.\d+)?$/.test(tag)) return acc;
        const key = tag.toLowerCase();
        if (seen.has(key)) return acc;
        seen.add(key);
        acc.push(tag);
        return acc;
    }, []);
}

function normalizeDietaryTagKey(tag: string): string {
    return tag.toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
}

function getDietaryTagLabel(tag: string, t: PublicCustomerTranslator): string {
    const key = normalizeDietaryTagKey(tag);
    if (['non-vegetarian', 'non-veg', 'nonveg'].includes(key)) return t('menu.nonVeg');
    if (key === 'vegetarian') return t('menu.vegetarian');
    if (key === 'gluten-free') return t('menu.glutenFree');
    if (key === 'dairy-free') return t('menu.dairyFree');
    if (key === 'sugar-free') return t('menu.sugarFree');
    return tag.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDietaryTagStyle(tag: string): CSSProperties {
    const key = normalizeDietaryTagKey(tag);
    if (['non-vegetarian', 'non-veg', 'nonveg'].includes(key)) {
        return { background: '#11182710', color: '#374151' };
    }
    return { background: '#dcfce7', color: '#166534' };
}

function PDPModal({
    item,
    onClose,
    onClosed,
    language,
    moodConfig,
    projectData,
    showItemPrices = true,
    currencySymbol = '',
    currencyCode = 'INR',
    unavailableLabel,
    trackView = true,
    showCategoryIcons = true,
    recoveryActions = [],
    itemShareUrl,
    onShare,
}: PDPModalProps) {
    const t = createPublicCustomerTranslator(language);
    const languageDirection = getPublicCustomerLanguageDirection(language);
    const { trackMenuItemView } = useContext(AnalyticsContext);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [displayedImageIndex, setDisplayedImageIndex] = useState(0);
    const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isSharingItem, setIsSharingItem] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [category, setCategory] = useState<ExtractedDataCategory>();
    const [mounted, setMounted] = useState(false);
    const [isMobileSheet, setIsMobileSheet] = useState(false);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
    const imageTouchStartXRef = useRef<number | null>(null);
    const isOpen = Boolean(item);
    const primaryLanguage = projectData?.defaultLanguage || projectData?.languages?.[0] || 'en';
    const images = useMemo(() => normalizePublicMenuImages(item?.images), [item?.images]);
    const imageCount = images.length;
    const getModalText = useCallback(
        (value: unknown, fallback = '') => getLocalizedText(value, language, primaryLanguage, fallback),
        [language, primaryLanguage],
    );
    const getAnalyticsText = useCallback(
        (value: unknown, fallback = '') => getLocalizedText(value, primaryLanguage, primaryLanguage, fallback),
        [primaryLanguage],
    );
    const activePriceAttributes = useMemo(
        () => getActivePublicItemPriceAttributes(item),
        [item],
    );
    const itemListPriceLabel = useMemo(
        () => getPublicItemListPriceLabel(item, currencySymbol),
        [currencySymbol, item],
    );
    const markImageLoaded = useCallback((url?: string) => {
        if (!url) return;

        setLoadedImageUrls((previous) => {
            if (previous.has(url)) return previous;

            const next = new Set(previous);
            next.add(url);
            return next;
        });
    }, []);
    const nextImage = useCallback(() => {
        if (imageCount <= 0) return;

        setCurrentImageIndex((prev) => (prev + 1) % imageCount);
    }, [imageCount]);
    const prevImage = useCallback(() => {
        if (imageCount <= 0) return;

        setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
    }, [imageCount]);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const updateViewportMode = () => {
            setIsMobileSheet(window.matchMedia('(max-width: 767px)').matches);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);
        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;

        const html = document.documentElement;
        const body = document.body;
        const scrollY = Math.max(window.scrollY || 0, html.scrollTop || 0, body.scrollTop || 0);
        const previousStyles = {
            htmlOverflow: html.style.overflow,
            htmlOverscrollBehavior: html.style.overscrollBehavior,
            bodyOverflow: body.style.overflow,
            bodyOverscrollBehavior: body.style.overscrollBehavior,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
        };
        const shouldFixBody = scrollY > 1;

        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'none';

        if (shouldFixBody) {
            body.style.position = 'fixed';
            body.style.top = `-${scrollY}px`;
            body.style.left = '0';
            body.style.right = '0';
            body.style.width = '100%';
        }

        return () => {
            const restoreScrollPosition = () => {
                if (shouldFixBody) {
                    window.scrollTo(0, scrollY);
                }
            };

            html.style.overflow = previousStyles.htmlOverflow;
            html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
            body.style.overflow = previousStyles.bodyOverflow;
            body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
            body.style.position = previousStyles.bodyPosition;
            body.style.top = previousStyles.bodyTop;
            body.style.left = previousStyles.bodyLeft;
            body.style.right = previousStyles.bodyRight;
            body.style.width = previousStyles.bodyWidth;
            restoreScrollPosition();
            window.requestAnimationFrame(() => onClosed?.());
        };
    }, [isOpen, onClosed]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;

        const activeElement = document.activeElement;
        previouslyFocusedElementRef.current = activeElement instanceof HTMLElement
            ? activeElement
            : null;
        const focusFrame = window.requestAnimationFrame(() => {
            closeButtonRef.current?.focus({ preventScroll: true });
        });

        return () => {
            window.cancelAnimationFrame(focusFrame);
            const focusTarget = previouslyFocusedElementRef.current;
            previouslyFocusedElementRef.current = null;
            window.requestAnimationFrame(() => {
                if (focusTarget?.isConnected) {
                    focusTarget.focus({ preventScroll: true });
                }
            });
        };
    }, [isOpen]);

    useEffect(() => {
        if (item) {
            setCurrentImageIndex(0);
            setDisplayedImageIndex(0);
            setLoadedImageUrls(new Set());
            setIsImageViewerOpen(false);
            setShareStatus(null);

            if (trackView) {
                const file = projectData?.files?.find(f => (
                    f.extractedData?.data?.items?.some((candidate) => candidate.id === item.id)
                ));
                const categoryId = typeof item.category === 'string' ? item.category : '';
                const categoryRecord = file?.extractedData?.data?.categories?.find((candidate) => candidate.id === categoryId);
                const analyticsCategoryName = getAnalyticsText(categoryRecord?.name)
                    || (typeof item.category === 'object' ? getAnalyticsText(item.category) : undefined);

                trackMenuItemView({
                    itemId: item.id,
                    name: getAnalyticsText(item.name, 'Unknown Item'),
                    category: analyticsCategoryName,
                    categoryId,
                    categoryName: analyticsCategoryName,
                    price: showItemPrices && activePriceAttributes.length === 0
                        ? (parseSingleMenuPrice(item.price) ?? undefined)
                        : undefined,
                    currency: currencyCode,
                    attributes: showItemPrices
                        ? activePriceAttributes.reduce((acc: Record<string, string>, attr) => {
                            const attributeName = getModalText(attr.name);
                            if (attributeName) {
                                acc[attributeName] = String(attr.price);
                            }
                            return acc;
                        }, {})
                        : undefined
                });
            }

            // Find category for this item
            const file = projectData?.files?.find(f => {
                return f.extractedData?.data?.items?.find((candidate) => candidate.id === item.id);
            });
            setCategory(file?.extractedData?.data?.categories?.find((candidate) => candidate.id === item.category));
        }
    }, [activePriceAttributes, currencyCode, getAnalyticsText, getModalText, item, trackMenuItemView, projectData, showItemPrices, trackView]);

    useEffect(() => {
        if (!item || typeof window === 'undefined') return;

        const urls = images.map((image) => image.url);

        if (urls.length === 0) return;

        let cancelled = false;
        const markLoaded = (url: string) => {
            if (!cancelled) {
                markImageLoaded(url);
            }
        };

        urls.forEach((url: string) => {
            const preloadImage = new window.Image();
            preloadImage.decoding = 'async';
            preloadImage.loading = 'eager';
            preloadImage.onload = () => markLoaded(url);
            preloadImage.onerror = () => markLoaded(url);
            preloadImage.src = url;

            if (preloadImage.complete) {
                markLoaded(url);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [images, item?.id, markImageLoaded]);

    useEffect(() => {
        if (!shareStatus) return;

        const timer = window.setTimeout(() => setShareStatus(null), 2200);
        return () => window.clearTimeout(timer);
    }, [shareStatus]);

    useEffect(() => {
        if (!isOpen) return;

        const targetUrl = images[currentImageIndex]?.url;
        if (targetUrl && loadedImageUrls.has(targetUrl) && displayedImageIndex !== currentImageIndex) {
            setDisplayedImageIndex(currentImageIndex);
        }
    }, [currentImageIndex, displayedImageIndex, images, isOpen, loadedImageUrls]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (isImageViewerOpen) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key === 'Tab' && dialogRef.current) {
                const focusableElements = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(PDP_FOCUSABLE_SELECTOR),
                ).filter((element) => (
                    element.getAttribute('aria-hidden') !== 'true'
                    && element.getClientRects().length > 0
                ));
                if (focusableElements.length === 0) {
                    event.preventDefault();
                    dialogRef.current.focus({ preventScroll: true });
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                const activeElement = document.activeElement;
                if (!dialogRef.current.contains(activeElement)) {
                    event.preventDefault();
                    (event.shiftKey ? lastElement : firstElement).focus();
                } else if (event.shiftKey && activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                } else if (!event.shiftKey && activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isImageViewerOpen, isOpen, onClose]);

    const safeTags = useMemo(() => sanitizePdpTags(item?.tags), [item?.tags]);

    if (!item || !mounted) return null;

    const hasMultipleImages = images.length > 1;
    const targetImageUrl = images[currentImageIndex]?.url;
    const isWaitingForTargetImage = Boolean(
        targetImageUrl &&
        currentImageIndex !== displayedImageIndex &&
        !loadedImageUrls.has(targetImageUrl),
    );
    const isAvailable = item.available !== false;
    const allergens = getDecisionFactArray(item, 'allergens');
    const dietaryTags = getDecisionFactArray(item, 'dietaryTags');
    const spiceLevel = getDecisionFactString(item, 'spiceLevel');
    const duration = getDecisionFactNumber(item, 'duration');
    const targetAudience = getDecisionFactString(item, 'targetAudience');
    const skillLevel = getDecisionFactString(item, 'skillLevel');
    const materials = getDecisionFactString(item, 'materials');
    const warranty = getDecisionFactString(item, 'warranty');
    const nutritionInfo = getNutritionFact(item);
    const nutritionBadges = nutritionInfo
        ? [
            nutritionInfo.calories ? t('menu.calories', { count: String(nutritionInfo.calories) }) : '',
            nutritionInfo.protein ? t('menu.protein', { value: String(nutritionInfo.protein) }) : '',
            nutritionInfo.carbs ? t('menu.carbs', { value: String(nutritionInfo.carbs) }) : '',
            nutritionInfo.fat ? t('menu.fat', { value: String(nutritionInfo.fat) }) : '',
            nutritionInfo.servingSize ? t('menu.serving', { value: String(nutritionInfo.servingSize) }) : '',
            ].filter(Boolean)
        : [];
    const hasStructuredMetadata = (
        allergens.length > 0
        || dietaryTags.length > 0
        || Boolean(spiceLevel)
        || Boolean(duration)
        || Boolean(targetAudience)
        || Boolean(skillLevel)
        || Boolean(materials)
        || Boolean(warranty)
        || nutritionBadges.length > 0
    );
    const handleImageTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        imageTouchStartXRef.current = event.touches[0]?.clientX ?? null;
    };

    const handleImageTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        if (!hasMultipleImages || imageTouchStartXRef.current === null) return;

        const endX = event.changedTouches[0]?.clientX ?? imageTouchStartXRef.current;
        const deltaX = endX - imageTouchStartXRef.current;
        imageTouchStartXRef.current = null;

        if (Math.abs(deltaX) < 42) return;
        if (deltaX < 0) {
            nextImage();
        } else {
            prevImage();
        }
    };

    const handleShareItem = async () => {
        if (!itemShareUrl || isSharingItem) return;

        const shareTitle = getModalText(item.name, t('menu.menuItem'));
        const description = getCompactShareText(getModalText(item.description, ''));
        const shareData: ShareData = {
            title: shareTitle,
            text: description || shareTitle,
            url: itemShareUrl,
        };

        setIsSharingItem(true);
        setShareStatus(null);

        try {
            if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
                await navigator.share(shareData);
                onShare?.('native_share');
                return;
            }
        } catch (error) {
            if ((error as DOMException)?.name === 'AbortError') {
                return;
            }
        } finally {
            setIsSharingItem(false);
        }

        try {
            setIsSharingItem(true);
            await copyTextToClipboard(itemShareUrl);
            onShare?.('copy_link');
            setShareStatus(t('menu.linkCopied'));
        } catch (error) {
            logRuntimeFailure('public_menu_pdp_item_share_copy_failed', error, {
                ...getBoundedRuntimeStringContext('itemId', item?.id),
                ...getBoundedRuntimeStringContext('itemShareUrl', itemShareUrl),
                ...getBoundedRuntimeStringContext('shareTitle', shareTitle),
                ...getBoundedRuntimeStringContext('language', language),
                imageCount,
                hasNativeShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
                hasClipboardWrite: hasPdpItemShareClipboardWrite(),
                hasCopyFallback: hasPdpItemShareCopyFallback(),
            });
            setShareStatus(t('menu.couldNotShare'));
        } finally {
            setIsSharingItem(false);
        }
    };

    const pdpIconButtonStyle = (positionStyle: React.CSSProperties, disabled = false): React.CSSProperties => ({
        ...positionStyle,
        alignItems: 'center',
        background: `${moodConfig.accentColor}18`,
        border: `1px solid ${moodConfig.accentColor}30`,
        borderRadius: 999,
        color: moodConfig.accentColor,
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex',
        height: 32,
        justifyContent: 'center',
        opacity: disabled ? 0.48 : positionStyle.opacity,
        padding: 0,
        WebkitTapHighlightColor: 'transparent',
        width: 32,
    });

    const imageActionBarStyle: React.CSSProperties = {
        alignItems: 'center',
        background: 'rgba(10, 14, 24, 0.68)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: 999,
        bottom: 12,
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
        display: 'inline-flex',
        gap: 6,
        padding: 6,
        position: 'absolute',
        insetInlineEnd: 12,
        zIndex: 4,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    };
    const imageActionButtonStyle = (disabled = false): React.CSSProperties => ({
        ...pdpIconButtonStyle({ position: 'relative' }, disabled),
        background: moodConfig.itemStyle.background,
        border: `1px solid ${moodConfig.accentColor}42`,
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
    });
    const imageCountStyle: React.CSSProperties = {
        color: '#fff',
        fontFamily: moodConfig.bodyFont,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: '18px',
        minWidth: 34,
        padding: '0 4px',
        textAlign: 'center',
    };
    const stickyActionGroupStyle: React.CSSProperties = {
        alignItems: 'center',
        display: 'flex',
        gap: 8,
        marginBottom: -44,
        marginInlineStart: 'auto',
        marginInlineEnd: 12,
        marginTop: 12,
        position: 'sticky',
        top: 12,
        width: 'max-content',
        zIndex: 8,
    };
    const stickyCloseButtonStyle = pdpIconButtonStyle({
        position: 'relative',
    });
    const shareStatusStyle: React.CSSProperties = {
        background: moodConfig.itemStyle.background,
        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: 999,
        color: moodConfig.bodyColor,
        fontFamily: moodConfig.bodyFont,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: '16px',
        padding: '6px 9px',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
    };

    const modalContent = (
        <AnimatePresence>
            {item && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10000,
                            background: 'rgba(0, 0, 0, 0.8)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        ref={dialogRef}
                        dir={languageDirection}
                        lang={language}
                        initial={isMobileSheet ? menuBottomSheetMotion.initial : menuDialogMotion.initial}
                        animate={isMobileSheet ? menuBottomSheetMotion.animate : menuDialogMotion.animate}
                        exit={isMobileSheet ? menuBottomSheetMotion.exit : menuDialogMotion.exit}
                        transition={menuSpringTransition}
                        className="fixed z-[60] flex items-center justify-center"
                        role="dialog"
                        tabIndex={-1}
                        aria-modal="true"
                        aria-label={getModalText(item.name, t('menu.menuItemDetails'))}
                        style={{
                            position: 'fixed',
                            inset: isMobileSheet
                                ? 'auto 0 0 0'
                                : 'calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)) 16px',
                            zIndex: 10001,
                            display: 'flex',
                            alignItems: isMobileSheet ? 'flex-end' : 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl shadow-2xl"
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: isMobileSheet ? '100%' : '42rem',
                                maxHeight: isMobileSheet
                                    ? 'min(92dvh, calc(100dvh - env(safe-area-inset-top) - 12px))'
                                    : '100%',
                                overflowY: 'auto',
                                minHeight: 0,
                                borderRadius: isMobileSheet ? '18px 18px 0 0' : '16px',
                                background: moodConfig.background,
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                                overscrollBehavior: 'contain',
                                overscrollBehaviorY: 'contain',
                                touchAction: 'pan-y',
                                WebkitOverflowScrolling: 'touch',
                            }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {/* Item actions */}
                            <div style={stickyActionGroupStyle}>
                                {shareStatus && (
                                    <span aria-live="polite" style={shareStatusStyle}>
                                        {shareStatus}
                                    </span>
                                )}
                                {itemShareUrl && (
                                    <button
                                        type="button"
                                        onClick={handleShareItem}
                                        className="rounded-full transition-opacity hover:opacity-80"
                                        aria-label={t('menu.shareItem')}
                                        title={t('menu.shareItem')}
                                        disabled={isSharingItem}
                                        style={pdpIconButtonStyle({ position: 'relative' }, isSharingItem)}
                                    >
                                        <LuShare2 size={16} color={moodConfig.accentColor} strokeWidth={2.4} />
                                    </button>
                                )}
                                <button
                                    ref={closeButtonRef}
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    aria-label={t('menu.closeItemDetails')}
                                    style={stickyCloseButtonStyle}
                                >
                                    <LuX size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                                </button>
                            </div>

                            {/* Image Section */}
                            {images.length > 0 && (
                                <div
                                    className="relative w-full aspect-[4/3] bg-black/20"
                                    onTouchStart={handleImageTouchStart}
                                    onTouchEnd={handleImageTouchEnd}
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: isMobileSheet ? 'min(72vw, 46dvh)' : 'min(58vw, 52vh)',
                                        minHeight: isMobileSheet ? 240 : 260,
                                        overflow: 'hidden',
                                        background: 'rgba(0, 0, 0, 0.12)',
                                        touchAction: hasMultipleImages ? 'pan-y' : 'auto',
                                    }}
                                >
                                    {images.map((image: any, imageIndex: number) => {
                                        const imageUrl = image?.url;
                                        if (!imageUrl) return null;

                                        return (
                                            <Image
                                                key={`${imageUrl}-${imageIndex}`}
                                                src={imageUrl}
                                                alt={getMenuItemImageAltText(getModalText(item.name, t('menu.menuItem')))}
                                                fill
                                                className="object-contain"
                                                style={{
                                                    objectFit: 'contain',
                                                    opacity: imageIndex === displayedImageIndex ? 1 : 0,
                                                    transition: 'opacity 0.18s ease',
                                                }}
                                                sizes="(max-width: 768px) 100vw, 42rem"
                                                priority={imageIndex === 0}
                                                loading={imageIndex === 0 ? undefined : 'eager'}
                                                onLoad={() => markImageLoaded(imageUrl)}
                                                onError={() => markImageLoaded(imageUrl)}
                                            />
                                        );
                                    })}

                                    {isWaitingForTargetImage && (
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: `${moodConfig.accentColor}10`,
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    )}

                                    <div
                                        aria-label={t('menu.imageControls')}
                                        style={imageActionBarStyle}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {hasMultipleImages && (
                                            <button
                                                type="button"
                                                onClick={prevImage}
                                                aria-label={t('menu.previousImage')}
                                                style={imageActionButtonStyle()}
                                            >
                                                <LuChevronLeft size={18} color={moodConfig.accentColor} strokeWidth={2.4} />
                                            </button>
                                        )}
                                        {hasMultipleImages && (
                                            <span style={imageCountStyle} aria-live="polite">
                                                {currentImageIndex + 1}/{imageCount}
                                            </span>
                                        )}
                                        {hasMultipleImages && (
                                            <button
                                                type="button"
                                                onClick={nextImage}
                                                aria-label={t('menu.nextImage')}
                                                style={imageActionButtonStyle()}
                                            >
                                                <LuChevronRight size={18} color={moodConfig.accentColor} strokeWidth={2.4} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsImageViewerOpen(true)}
                                            aria-label={t('menu.enlargeImage')}
                                            style={imageActionButtonStyle()}
                                        >
                                            <LuMaximize2 size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Content Section */}
                            <div
                                className="p-5 md:p-6"
                                style={{
                                    padding: images.length > 0 ? '20px 20px 24px' : '24px 112px 24px 20px',
                                    fontFamily: moodConfig.bodyFont,
                                }}
                            >
                                {/* Unavailable Badge */}
                                {!isAvailable && (
                                    <span
                                        className="inline-block px-2 py-1 text-xs font-medium rounded mb-3"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            minHeight: 24,
                                            padding: '4px 8px',
                                            marginBottom: 12,
                                            borderRadius: 6,
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            lineHeight: '16px',
                                        }}
                                    >
                                        {unavailableLabel || t('menu.unavailable')}
                                    </span>
                                )}

                                {/* Category Name */}
                                {category && (
                                    <span
                                        className="text-sm mb-1 block"
                                        style={{
                                            alignItems: 'center',
                                            display: 'inline-flex',
                                            gap: 7,
                                            marginBottom: 6,
                                            color: moodConfig.bodyColor,
                                            fontSize: 14,
                                            lineHeight: '20px',
                                            opacity: 0.76,
                                        }}
                                    >
                                        {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && category.icon ? (
                                            <CategoryIcon
                                                color={moodConfig.bodyColor}
                                                defaultIcon="LuTag"
                                                icon={category.icon}
                                                size={14}
                                            />
                                        ) : null}
                                        <span>{getModalText(category.name)}</span>
                                    </span>
                                )}

                                {/* Name & Price */}
                                <div
                                    className="flex justify-between items-start gap-4 mb-3"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 16,
                                        marginBottom: 12,
                                    }}
                                >
                                    <h2
                                        className="text-xl md:text-2xl font-semibold"
                                        style={{
                                            flex: '1 1 auto',
                                            minWidth: 0,
                                            margin: 0,
                                            fontFamily: moodConfig.headingFont,
                                            color: moodConfig.headingColor,
                                            fontSize: 'clamp(20px, 5vw, 28px)',
                                            lineHeight: 1.15,
                                            fontWeight: 700,
                                            overflowWrap: 'anywhere',
                                        }}
                                    >
                                        {getModalText(item.name, t('menu.menuItem'))}
                                    </h2>
                                    {showItemPrices && itemListPriceLabel && (
                                        <span
                                            className="text-lg md:text-xl font-semibold whitespace-nowrap"
                                            style={{
                                                flex: '0 0 auto',
                                                color: moodConfig.priceColor,
                                                fontFamily: moodConfig.bodyFont,
                                                fontSize: 'clamp(18px, 4.5vw, 24px)',
                                                lineHeight: 1.2,
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {itemListPriceLabel}
                                        </span>
                                    )}
                                </div>

                                {/* Tags */}
                                {safeTags.length > 0 && (
                                    <div
                                        className="flex flex-wrap gap-2 mb-4"
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {safeTags.map((tag: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    background: `${moodConfig.accentColor}20`,
                                                    color: moodConfig.headingColor,
                                                    fontSize: 12,
                                                    lineHeight: '16px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Structured Metadata Badges — render owner-provided details when present */}
                                {hasStructuredMetadata && (
                                    <div
                                        className="flex flex-wrap gap-1.5 mb-4"
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {dietaryTags.map((tag: string, idx: number) => (
                                            <span key={`dt-${idx}`} className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, ...getDietaryTagStyle(tag), fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {getDietaryTagLabel(tag, t)}
                                            </span>
                                        ))}
                                        {spiceLevel && spiceLevel !== 'none' && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                🌶️ {t('menu.spice', {
                                                    value: getPublicSpiceLevelLabel(spiceLevel, t),
                                                })}
                                            </span>
                                        )}
                                        {allergens.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                ⚠️ {allergens.join(', ')}
                                            </span>
                                        )}
                                        {duration && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                ⏱ {t('menu.minutesShort', { count: duration })}
                                            </span>
                                        )}
                                        {targetAudience && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {targetAudience.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {skillLevel && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {skillLevel.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {materials && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {materials}
                                            </span>
                                        )}
                                        {warranty && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {t('menu.warranty', { value: warranty })}
                                            </span>
                                        )}
                                        {nutritionBadges.map((badge) => (
                                            <span key={`nutrition-${badge}`} className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}12`, color: moodConfig.headingColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {badge}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Description */}
                                {getModalText(item.description) && (
                                    <p
                                        className="text-sm md:text-base mb-4 whitespace-pre-line"
                                        style={{
                                            margin: '0 0 16px',
                                            fontFamily: moodConfig.bodyFont,
                                            color: moodConfig.bodyColor,
                                            fontSize: 15,
                                            lineHeight: 1.6,
                                            whiteSpace: 'pre-line',
                                        }}
                                    >
                                        {getModalText(item.description)}
                                    </p>
                                )}

                                {!isAvailable && recoveryActions.length > 0 && (
                                    <div className="mt-4" style={{ marginTop: 16 }}>
                                        <h3
                                            className="text-sm font-medium mb-2"
                                            style={{
                                                margin: '0 0 8px',
                                                color: moodConfig.headingColor,
                                                fontSize: 14,
                                                lineHeight: '20px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {t('menu.needHelpInstead')}
                                        </h3>
                                        <div
                                            className="flex flex-wrap gap-2"
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                            }}
                                        >
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
                                                    className="px-3 py-2 text-sm rounded-lg"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        minHeight: 40,
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                        color: moodConfig.accentColor,
                                                        textDecoration: 'none',
                                                        fontFamily: moodConfig.bodyFont,
                                                        fontSize: 14,
                                                        lineHeight: '20px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {action.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Attributes/Variants */}
                                {activePriceAttributes.length > 0 && (
                                    <div
                                        className="space-y-2 mt-4"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            marginTop: 16,
                                        }}
                                    >
                                        <h3
                                            className="text-sm font-medium mb-2"
                                            style={{
                                                margin: '0 0 2px',
                                                color: moodConfig.headingColor,
                                                fontSize: 14,
                                                lineHeight: '20px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {t('menu.options')}
                                        </h3>
                                        {activePriceAttributes.map((attr, idx) => (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-center p-3 rounded-lg"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    padding: 12,
                                                    borderRadius: 10,
                                                    background: moodConfig.itemStyle.background,
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        minWidth: 0,
                                                        fontFamily: moodConfig.bodyFont,
                                                        color: moodConfig.bodyColor,
                                                        fontSize: 14,
                                                        lineHeight: '20px',
                                                    }}
                                                >
                                                    {getModalText(attr.name, t('menu.option'))}
                                                </span>
                                                {showItemPrices ? (
                                                    <span
                                                        className="font-medium"
                                                        style={{
                                                            flex: '0 0 auto',
                                                            color: moodConfig.priceColor,
                                                            fontSize: 14,
                                                            lineHeight: '20px',
                                                            fontWeight: 700,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {formatMenuPrice(attr.price, currencySymbol, { fractionDigits: 2 })}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    <PublicImageViewer
                        accentColor={moodConfig.accentColor}
                        closeLabel={t('menu.closeImageViewer')}
                        direction={languageDirection}
                        images={images.map((image) => ({
                            alt: getMenuItemImageAltText(getModalText(item.name, t('menu.menuItem'))),
                            url: image.url,
                        }))}
                        initialIndex={displayedImageIndex}
                        language={language}
                        nextLabel={t('menu.nextImage')}
                        onClose={() => setIsImageViewerOpen(false)}
                        onIndexChange={(index) => {
                            setCurrentImageIndex(index);
                            setDisplayedImageIndex(index);
                        }}
                        open={isImageViewerOpen && images.length > 0}
                        previousLabel={t('menu.previousImage')}
                        resetZoomLabel={t('menu.resetImageZoom')}
                        title={t('menu.imageViewer')}
                        zoomInLabel={t('menu.zoomIn')}
                        zoomOutLabel={t('menu.zoomOut')}
                    />
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}

export default PDPModal;
