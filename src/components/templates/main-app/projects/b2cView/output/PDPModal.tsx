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
import { getDecisionFactArray, getDecisionFactNumber, getDecisionFactString } from '@lib/menu/itemDecisionFacts';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
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
                const categoryName = categoryRecord?.name?.[language]
                    || categoryRecord?.name?.en
                    || (typeof item.category === 'object' ? item.category?.[language] || item.category?.en : undefined);

                trackMenuItemView({
                    itemId: item.id,
                    name: item.name?.[language] || 'Unknown Item',
                    category: categoryName,
                    categoryId,
                    categoryName,
                    price: showItemPrices
                        ? (typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price)
                        : undefined,
                    currency: currencyCode,
                    attributes: showItemPrices
                        ? item.attributes?.reduce((acc: Record<string, string>, attr: any) => {
                            if (attr.name?.[language]) {
                                acc[attr.name[language]] = String(attr.price);
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
    }, [currencyCode, item, language, trackMenuItemView, projectData, showItemPrices, trackView]);

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
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed z-[60] flex items-center justify-center"
                        style={{
                            inset: 'calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)) 16px',
                        }}
                    >
                        <div
                            className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl shadow-2xl"
                            style={{ background: moodConfig.background }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                aria-label="Close"
                            >
                                <LuX size={24} color="#fff" />
                            </button>

                            {/* Image Section */}
                            {images.length > 0 && (
                                <div className="relative w-full aspect-[4/3] bg-black/20">
                                    <Image
                                        src={images[currentImageIndex]?.url}
                                        alt={item.name?.[language] || 'Menu item'}
                                        fill
                                        className="object-cover"
                                        priority
                                    />

                                    {/* Image Navigation */}
                                    {hasMultipleImages && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                                aria-label="Previous image"
                                            >
                                                <LuChevronLeft size={20} color="#fff" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                                aria-label="Next image"
                                            >
                                                <LuChevronRight size={20} color="#fff" />
                                            </button>

                                            {/* Dots indicator */}
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImageIndex(idx)}
                                                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'
                                                            }`}
                                                        aria-label={`Go to image ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Content Section */}
                            <div className="p-5 md:p-6">
                                {/* Unavailable Badge */}
                                {!isAvailable && (
                                    <span
                                        className="inline-block px-2 py-1 text-xs font-medium rounded mb-3"
                                        style={{ background: '#ef444420', color: '#ef4444' }}
                                    >
                                        {unavailableLabel || 'Unavailable'}
                                    </span>
                                )}

                                {/* Category Name */}
                                {category && (
                                    <span
                                        className="text-sm mb-1 block"
                                        style={{ color: moodConfig.bodyColor }}
                                    >
                                        {category.name?.[language]}
                                    </span>
                                )}

                                {/* Name & Price */}
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <h2
                                        className="text-xl md:text-2xl font-semibold"
                                        style={{
                                            fontFamily: moodConfig.headingFont,
                                            color: moodConfig.headingColor,
                                        }}
                                    >
                                        {item.name?.[language] || 'Menu Item'}
                                    </h2>
                                    {showItemPrices && !item.attributes?.length && item.price !== undefined && item.price !== null && String(item.price).trim() !== '' && (
                                        <span
                                            className="text-lg md:text-xl font-semibold whitespace-nowrap"
                                            style={{ color: moodConfig.priceColor }}
                                        >
                                            {formatMenuPrice(item.price, currencySymbol, { fractionDigits: 2 })}
                                        </span>
                                    )}
                                </div>

                                {/* Tags */}
                                {item.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {item.tags.map((tag: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{
                                                    background: `${moodConfig.accentColor}20`,
                                                    color: moodConfig.accentColor,
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Structured Metadata Badges — render owner-provided details when present */}
                                {(allergens.length || dietaryTags.length || spiceLevel || duration || targetAudience || skillLevel || materials || warranty) && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {dietaryTags.map((tag: string, idx: number) => (
                                            <span key={`dt-${idx}`} className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#22c55e20', color: '#16a34a' }}>
                                                {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                                            </span>
                                        ))}
                                        {spiceLevel && spiceLevel !== 'none' && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                                                🌶️ {spiceLevel.charAt(0).toUpperCase() + spiceLevel.slice(1).replace('-', ' ')}
                                            </span>
                                        )}
                                        {allergens.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#f59e0b20', color: '#d97706' }}>
                                                ⚠️ {allergens.join(', ')}
                                            </span>
                                        )}
                                        {duration && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                ⏱ {duration} min
                                            </span>
                                        )}
                                        {targetAudience && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {targetAudience.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {skillLevel && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {skillLevel.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {materials && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {materials}
                                            </span>
                                        )}
                                        {warranty && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                Warranty: {warranty}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Description */}
                                {item.description?.[language] && (
                                    <p
                                        className="text-sm md:text-base mb-4 whitespace-pre-line"
                                        style={{
                                            fontFamily: moodConfig.bodyFont,
                                            color: moodConfig.bodyColor,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {item.description[language]}
                                    </p>
                                )}

                                {!isAvailable && recoveryActions.length > 0 && (
                                    <div className="mt-4">
                                        <h3
                                            className="text-sm font-medium mb-2"
                                            style={{ color: moodConfig.headingColor }}
                                        >
                                            Need help instead?
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
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
                                                        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                        color: moodConfig.accentColor,
                                                        textDecoration: 'none',
                                                        fontFamily: moodConfig.bodyFont,
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
                                    <div className="space-y-2 mt-4">
                                        <h3
                                            className="text-sm font-medium mb-2"
                                            style={{ color: moodConfig.headingColor }}
                                        >
                                            Options
                                        </h3>
                                        {item.attributes.map((attr: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-center p-3 rounded-lg"
                                                style={{
                                                    background: moodConfig.itemStyle.background,
                                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontFamily: moodConfig.bodyFont,
                                                        color: moodConfig.bodyColor,
                                                    }}
                                                >
                                                    {attr.name?.[language]}
                                                </span>
                                                {showItemPrices ? (
                                                    <span
                                                        className="font-medium"
                                                        style={{ color: moodConfig.priceColor }}
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
