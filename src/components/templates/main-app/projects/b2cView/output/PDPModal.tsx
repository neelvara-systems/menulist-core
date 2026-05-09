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

import { ExtractedDataCategory } from '@template/main-app/projects/types';
import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { AnalyticsContext } from '@template/website/clientWebsite/AnalyticsContext';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { getLocalizedText } from '@lib/localization/text';
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString } from '@lib/menu/itemDecisionFacts';
import { normalizePublicMenuImages } from '@lib/menu/publicMenuImages';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuChevronLeft, LuChevronRight, LuMaximize2, LuMinus, LuPlus, LuRotateCcw, LuX } from 'react-icons/lu';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';
import { menuBottomSheetMotion, menuDialogMotion, menuFadeTransition, menuSpringTransition } from './menuMotion';

interface PDPModalProps {
    item: any;
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
}

function PDPModal({
    item,
    onClose,
    onClosed,
    language,
    moodConfig,
    projectData,
    showItemPrices = true,
    currencySymbol = '₹',
    currencyCode = 'INR',
    unavailableLabel,
    trackView = true,
    showCategoryIcons = true,
    recoveryActions = [],
}: PDPModalProps) {
    const { trackMenuItemView } = useContext(AnalyticsContext);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [displayedImageIndex, setDisplayedImageIndex] = useState(0);
    const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [imageViewerZoom, setImageViewerZoom] = useState(1);
    const [imageViewerPan, setImageViewerPan] = useState({ x: 0, y: 0 });
    const [category, setCategory] = useState<ExtractedDataCategory>();
    const [mounted, setMounted] = useState(false);
    const [isMobileSheet, setIsMobileSheet] = useState(false);
    const imageTouchStartXRef = useRef<number | null>(null);
    const imageViewerDragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const primaryLanguage = projectData?.defaultLanguage || projectData?.languages?.[0] || 'en';
    const images = useMemo(() => normalizePublicMenuImages(item?.images), [item?.images]);
    const imageCount = images.length;
    const getModalText = useCallback(
        (value: unknown, fallback = '') => getLocalizedText(value as any, language, primaryLanguage, fallback),
        [language, primaryLanguage],
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
        if (!item || typeof window === 'undefined') return;

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
                document.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('scroll'));
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

            // Mobile browsers can defer repainting sticky/fixed descendants
            // after a fixed-body modal closes at scrollY 0. Force a cheap
            // two-frame repaint so the command row is immediately visible and
            // clickable instead of waiting for the customer's next scroll.
            window.requestAnimationFrame(() => {
                restoreScrollPosition();
                window.requestAnimationFrame(() => {
                    window.dispatchEvent(new Event('resize'));
                    onClosed?.();
                });
            });
        };
    }, [item?.id, onClosed]);

    useEffect(() => {
        if (item) {
            setCurrentImageIndex(0);
            setDisplayedImageIndex(0);
            setLoadedImageUrls(new Set());
            setIsImageViewerOpen(false);
            setImageViewerZoom(1);
            setImageViewerPan({ x: 0, y: 0 });
            imageViewerDragRef.current = null;

            if (trackView) {
                const file = projectData?.files?.find(f => (
                    f.extractedData?.data?.items?.some((i: any) => i.id === item.id)
                ));
                const categoryId = typeof item.category === 'string' ? item.category : '';
                const categoryRecord = file?.extractedData?.data?.categories?.find((cat: any) => cat.id === categoryId);
                const categoryName = getModalText(categoryRecord?.name)
                    || (typeof item.category === 'object' ? getModalText(item.category) : undefined);

                trackMenuItemView({
                    itemId: item.id,
                    name: getModalText(item.name, 'Unknown Item'),
                    category: categoryName,
                    categoryId,
                    categoryName,
                    price: showItemPrices
                        ? (typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price)
                        : undefined,
                    currency: currencyCode,
                    attributes: showItemPrices
                        ? item.attributes?.reduce((acc: Record<string, string>, attr: any) => {
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
                return f.extractedData?.data?.items?.find((i: any) => i.id === item.id);
            });
            setCategory(file?.extractedData?.data?.categories?.find((cat: any) => cat.id === item.category));
        }
    }, [currencyCode, getModalText, item, trackMenuItemView, projectData, showItemPrices, trackView]);

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
        if (!item) return;

        const targetUrl = images[currentImageIndex]?.url;
        if (targetUrl && loadedImageUrls.has(targetUrl) && displayedImageIndex !== currentImageIndex) {
            setDisplayedImageIndex(currentImageIndex);
        }
    }, [currentImageIndex, displayedImageIndex, images, item, loadedImageUrls]);

    useEffect(() => {
        if (!item) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isImageViewerOpen) {
                    setIsImageViewerOpen(false);
                    setImageViewerZoom(1);
                    setImageViewerPan({ x: 0, y: 0 });
                    imageViewerDragRef.current = null;
                    return;
                }

                onClose();
                return;
            }

            if (isImageViewerOpen && event.key === 'ArrowRight' && imageCount > 1) {
                event.preventDefault();
                nextImage();
                return;
            }

            if (isImageViewerOpen && event.key === 'ArrowLeft' && imageCount > 1) {
                event.preventDefault();
                prevImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageCount, isImageViewerOpen, item, nextImage, onClose, prevImage]);

    useEffect(() => {
        setImageViewerZoom(1);
        setImageViewerPan({ x: 0, y: 0 });
        imageViewerDragRef.current = null;
    }, [currentImageIndex, item?.id]);

    if (!item || !mounted) return null;

    const hasMultipleImages = images.length > 1;
    const targetImageUrl = images[currentImageIndex]?.url;
    const currentViewerImageUrl = images[displayedImageIndex]?.url || targetImageUrl;
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

    const closeImageViewer = () => {
        setIsImageViewerOpen(false);
        setImageViewerZoom(1);
        setImageViewerPan({ x: 0, y: 0 });
        imageViewerDragRef.current = null;
    };

    const setViewerZoom = (nextZoom: number | ((current: number) => number)) => {
        setImageViewerZoom((current) => {
            const resolved = typeof nextZoom === 'function' ? nextZoom(current) : nextZoom;
            const clamped = Math.min(3, Math.max(1, resolved));

            if (clamped === 1) {
                setImageViewerPan({ x: 0, y: 0 });
            }

            return clamped;
        });
    };

    const resetImageViewer = () => {
        setImageViewerZoom(1);
        setImageViewerPan({ x: 0, y: 0 });
        imageViewerDragRef.current = null;
    };

    const startImageViewerPan = (clientX: number, clientY: number) => {
        if (imageViewerZoom <= 1) return;

        imageViewerDragRef.current = {
            x: clientX,
            y: clientY,
            panX: imageViewerPan.x,
            panY: imageViewerPan.y,
        };
    };

    const moveImageViewerPan = (clientX: number, clientY: number) => {
        const dragState = imageViewerDragRef.current;
        if (!dragState || imageViewerZoom <= 1) return;

        setImageViewerPan({
            x: dragState.panX + clientX - dragState.x,
            y: dragState.panY + clientY - dragState.y,
        });
    };

    const endImageViewerPan = () => {
        imageViewerDragRef.current = null;
    };

    const handleViewerWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        setViewerZoom((current) => current + (event.deltaY < 0 ? 0.2 : -0.2));
    };

    const handleViewerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (imageViewerZoom <= 1) return;

        event.preventDefault();
        startImageViewerPan(event.clientX, event.clientY);
    };

    const handleViewerMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        moveImageViewerPan(event.clientX, event.clientY);
    };

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

    const handleViewerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (!touch) return;

        startImageViewerPan(touch.clientX, touch.clientY);
    };

    const handleViewerTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (imageViewerZoom <= 1) return;

        event.preventDefault();
        const touch = event.touches[0];
        if (!touch) return;

        moveImageViewerPan(touch.clientX, touch.clientY);
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

    const imageViewerControlStyle = (positionStyle: React.CSSProperties, disabled = false): React.CSSProperties => ({
        ...pdpIconButtonStyle(positionStyle, disabled),
        background: moodConfig.itemStyle.background,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
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
        right: 12,
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
    const imageViewerToolbarStyle: React.CSSProperties = {
        ...imageActionBarStyle,
        bottom: `calc(14px + env(safe-area-inset-bottom))`,
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        zIndex: 3,
    };
    const stickyCloseButtonStyle = pdpIconButtonStyle({
        position: 'sticky',
        top: 12,
        zIndex: 8,
        marginTop: 12,
        marginRight: 12,
        marginBottom: -44,
        marginLeft: 'auto',
    });

    const modalContent = (
        <AnimatePresence>
            {item && (
                <>
                    {/* Backdrop */}
                    <motion.div
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
                        initial={isMobileSheet ? menuBottomSheetMotion.initial : menuDialogMotion.initial}
                        animate={isMobileSheet ? menuBottomSheetMotion.animate : menuDialogMotion.animate}
                        exit={isMobileSheet ? menuBottomSheetMotion.exit : menuDialogMotion.exit}
                        transition={menuSpringTransition}
                        className="fixed z-[60] flex items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        aria-label={getModalText(item.name, 'Menu item details')}
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
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="rounded-full transition-opacity hover:opacity-80"
                                aria-label="Close item details"
                                style={stickyCloseButtonStyle}
                            >
                                <LuX size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                            </button>

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
                                                alt={getModalText(item.name, 'Menu item')}
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
                                        aria-label="Image controls"
                                        style={imageActionBarStyle}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {hasMultipleImages && (
                                            <button
                                                type="button"
                                                onClick={prevImage}
                                                aria-label="Previous image"
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
                                                aria-label="Next image"
                                                style={imageActionButtonStyle()}
                                            >
                                                <LuChevronRight size={18} color={moodConfig.accentColor} strokeWidth={2.4} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsImageViewerOpen(true)}
                                            aria-label="Enlarge image"
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
                                    padding: images.length > 0 ? '20px 20px 24px' : '24px 72px 24px 20px',
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
                                            background: '#ef444420',
                                            color: '#ef4444',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            lineHeight: '16px',
                                        }}
                                    >
                                        {unavailableLabel || 'Unavailable'}
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
                                        {getModalText(item.name, 'Menu Item')}
                                    </h2>
                                    {showItemPrices && !item.attributes?.length && item.price !== undefined && item.price !== null && String(item.price).trim() !== '' && (
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
                                            {formatMenuPrice(item.price, currencySymbol, { fractionDigits: 2 })}
                                        </span>
                                    )}
                                </div>

                                {/* Tags */}
                                {item.tags?.length > 0 && (
                                    <div
                                        className="flex flex-wrap gap-2 mb-4"
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {item.tags.map((tag: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    background: `${moodConfig.accentColor}20`,
                                                    color: moodConfig.accentColor,
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
                                {(allergens.length || dietaryTags.length || spiceLevel || duration || targetAudience || skillLevel || materials || warranty) && (
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
                                            <span key={`dt-${idx}`} className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: '#22c55e20', color: '#16a34a', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                                            </span>
                                        ))}
                                        {spiceLevel && spiceLevel !== 'none' && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: '#ef444420', color: '#ef4444', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                🌶️ {spiceLevel.charAt(0).toUpperCase() + spiceLevel.slice(1).replace('-', ' ')}
                                            </span>
                                        )}
                                        {allergens.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: '#f59e0b20', color: '#d97706', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                ⚠️ {allergens.join(', ')}
                                            </span>
                                        )}
                                        {duration && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                ⏱ {duration} min
                                            </span>
                                        )}
                                        {targetAudience && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {targetAudience.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {skillLevel && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {skillLevel.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {materials && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                {materials}
                                            </span>
                                        )}
                                        {warranty && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
                                                Warranty: {warranty}
                                            </span>
                                        )}
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
                                            Need help instead?
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
                                {item.attributes?.length > 0 && (
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
                                            Options
                                        </h3>
                                        {item.attributes.map((attr: any, idx: number) => (
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
                                                    {getModalText(attr.name, 'Option')}
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

                    {isImageViewerOpen && currentViewerImageUrl && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={menuFadeTransition}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Image viewer"
                            onClick={closeImageViewer}
                            style={{
                                alignItems: 'center',
                                background: 'rgba(0, 0, 0, 0.92)',
                                display: 'flex',
                                inset: 0,
                                justifyContent: 'center',
                                padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))',
                                position: 'fixed',
                                zIndex: 10030,
                            }}
                        >
                            <div
                                onClick={(event) => event.stopPropagation()}
                                style={imageViewerToolbarStyle}
                            >
                                <button
                                    type="button"
                                    disabled={imageViewerZoom <= 1}
                                    onClick={() => setViewerZoom((current) => current - 0.25)}
                                    aria-label="Zoom out"
                                    style={imageViewerControlStyle({ position: 'relative' }, imageViewerZoom <= 1)}
                                >
                                    <LuMinus size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                                </button>
                                <button
                                    type="button"
                                    onClick={resetImageViewer}
                                    aria-label="Reset image zoom"
                                    style={imageViewerControlStyle({ position: 'relative' })}
                                >
                                    <LuRotateCcw size={16} color={moodConfig.accentColor} strokeWidth={2.4} />
                                </button>
                                <button
                                    type="button"
                                    disabled={imageViewerZoom >= 3}
                                    onClick={() => setViewerZoom((current) => current + 0.25)}
                                    aria-label="Zoom in"
                                    style={imageViewerControlStyle({ position: 'relative' }, imageViewerZoom >= 3)}
                                >
                                    <LuPlus size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                                </button>
                                <button
                                    type="button"
                                    onClick={closeImageViewer}
                                    aria-label="Close image viewer"
                                    style={imageViewerControlStyle({ position: 'relative' })}
                                >
                                    <LuX size={17} color={moodConfig.accentColor} strokeWidth={2.4} />
                                </button>
                            </div>

                            {hasMultipleImages && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            prevImage();
                                        }}
                                        aria-label="Previous image"
                                        style={imageViewerControlStyle({
                                            left: 'calc(12px + env(safe-area-inset-left))',
                                            position: 'absolute',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            zIndex: 2,
                                        })}
                                    >
                                        <LuChevronLeft size={18} color={moodConfig.accentColor} strokeWidth={2.4} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            nextImage();
                                        }}
                                        aria-label="Next image"
                                        style={imageViewerControlStyle({
                                            position: 'absolute',
                                            right: 'calc(12px + env(safe-area-inset-right))',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            zIndex: 2,
                                        })}
                                    >
                                        <LuChevronRight size={18} color={moodConfig.accentColor} strokeWidth={2.4} />
                                    </button>
                                </>
                            )}

                            <div
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={handleViewerMouseDown}
                                onMouseMove={handleViewerMouseMove}
                                onMouseUp={endImageViewerPan}
                                onMouseLeave={endImageViewerPan}
                                onTouchStart={handleViewerTouchStart}
                                onTouchMove={handleViewerTouchMove}
                                onTouchEnd={endImageViewerPan}
                                onWheel={handleViewerWheel}
                                style={{
                                    cursor: imageViewerZoom > 1 ? 'grab' : 'default',
                                    height: '100%',
                                    maxHeight: 'calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
                                    maxWidth: 'min(100%, 980px)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    touchAction: 'none',
                                    userSelect: 'none',
                                    width: '100%',
                                }}
                            >
                                <Image
                                    src={currentViewerImageUrl}
                                    alt={getModalText(item.name, 'Menu item image')}
                                    fill
                                    sizes="100vw"
                                    style={{
                                        objectFit: 'contain',
                                        transform: `translate(${imageViewerPan.x}px, ${imageViewerPan.y}px) scale(${imageViewerZoom})`,
                                        transition: imageViewerDragRef.current ? 'none' : 'transform 0.12s ease',
                                    }}
                                    priority
                                    onLoad={() => markImageLoaded(currentViewerImageUrl)}
                                    onError={() => markImageLoaded(currentViewerImageUrl)}
                                />
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}

export default PDPModal;
