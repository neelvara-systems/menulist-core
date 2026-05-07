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
import { AnalyticsContext } from '@template/website/clientWebsite/AnalyticsContext';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { getLocalizedText } from '@lib/localization/text';
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString } from '@lib/menu/itemDecisionFacts';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';

interface PDPModalProps {
    item: any;
    onClose: () => void;
    language: string;
    moodConfig: MenuMoodConfig;
    projectData: Project;
    showItemPrices?: boolean;
    currencySymbol?: string;
    currencyCode?: string;
    unavailableLabel?: string;
    trackView?: boolean;
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
    language,
    moodConfig,
    projectData,
    showItemPrices = true,
    currencySymbol = '₹',
    currencyCode = 'INR',
    unavailableLabel,
    trackView = true,
    recoveryActions = [],
}: PDPModalProps) {
    const { trackMenuItemView } = useContext(AnalyticsContext);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [category, setCategory] = useState<ExtractedDataCategory>();
    const [mounted, setMounted] = useState(false);
    const primaryLanguage = projectData?.defaultLanguage || projectData?.languages?.[0] || 'en';
    const getModalText = useCallback(
        (value: unknown, fallback = '') => getLocalizedText(value as any, language, primaryLanguage, fallback),
        [language, primaryLanguage],
    );

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (item) {
            setCurrentImageIndex(0);
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

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
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [currencyCode, getModalText, item, trackMenuItemView, projectData, showItemPrices, trackView]);

    useEffect(() => {
        if (!item) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, onClose]);

    if (!item || !mounted) return null;

    const images = item.images || [];
    const hasMultipleImages = images.length > 1;
    const isAvailable = item.available !== false;
    const allergens = getDecisionFactArray(item, 'allergens');
    const dietaryTags = getDecisionFactArray(item, 'dietaryTags');
    const spiceLevel = getDecisionFactString(item, 'spiceLevel');
    const duration = getDecisionFactNumber(item, 'duration');
    const targetAudience = getDecisionFactString(item, 'targetAudience');
    const skillLevel = getDecisionFactString(item, 'skillLevel');
    const materials = getDecisionFactString(item, 'materials');
    const warranty = getDecisionFactString(item, 'warranty');

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

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
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed z-[60] flex items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        aria-label={getModalText(item.name, 'Menu item details')}
                        style={{
                            position: 'fixed',
                            inset: 'calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)) 16px',
                            zIndex: 10001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl shadow-2xl"
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '42rem',
                                maxHeight: '100%',
                                overflowY: 'auto',
                                borderRadius: '16px',
                                background: moodConfig.background,
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                                WebkitOverflowScrolling: 'touch',
                            }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                aria-label="Close"
                                style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    zIndex: 3,
                                    width: 44,
                                    height: 44,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 0,
                                    borderRadius: 999,
                                    background: 'rgba(0, 0, 0, 0.56)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <LuX size={24} color="#fff" />
                            </button>

                            {/* Image Section */}
                            {images.length > 0 && (
                                <div
                                    className="relative w-full aspect-[4/3] bg-black/20"
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '4 / 3',
                                        minHeight: 220,
                                        maxHeight: '52vh',
                                        overflow: 'hidden',
                                        background: 'rgba(0, 0, 0, 0.12)',
                                    }}
                                >
                                    <Image
                                        src={images[currentImageIndex]?.url}
                                        alt={getModalText(item.name, 'Menu item')}
                                        fill
                                        className="object-cover"
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width: 768px) 100vw, 42rem"
                                        priority
                                    />

                                    {/* Image Navigation */}
                                    {hasMultipleImages && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                                aria-label="Previous image"
                                                style={{
                                                    position: 'absolute',
                                                    left: 12,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: 40,
                                                    height: 40,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: 0,
                                                    borderRadius: 999,
                                                    background: 'rgba(0, 0, 0, 0.56)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <LuChevronLeft size={20} color="#fff" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                                aria-label="Next image"
                                                style={{
                                                    position: 'absolute',
                                                    right: 12,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: 40,
                                                    height: 40,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: 0,
                                                    borderRadius: 999,
                                                    background: 'rgba(0, 0, 0, 0.56)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <LuChevronRight size={20} color="#fff" />
                                            </button>

                                            {/* Dots indicator */}
                                            <div
                                                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    bottom: 12,
                                                    transform: 'translateX(-50%)',
                                                    display: 'flex',
                                                    gap: 6,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImageIndex(idx)}
                                                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'
                                                            }`}
                                                        aria-label={`Go to image ${idx + 1}`}
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            padding: 0,
                                                            border: 0,
                                                            borderRadius: 999,
                                                            background: idx === currentImageIndex ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                                                            cursor: 'pointer',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
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
                                            display: 'block',
                                            marginBottom: 6,
                                            color: moodConfig.bodyColor,
                                            fontSize: 14,
                                            lineHeight: '20px',
                                            opacity: 0.76,
                                        }}
                                    >
                                        {getModalText(category.name)}
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
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}

export default PDPModal;
