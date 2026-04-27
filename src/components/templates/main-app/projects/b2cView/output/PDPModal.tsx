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
    unavailableLabel?: string;
}

function PDPModal({ item, onClose, language, moodConfig, projectData, showItemPrices = true, unavailableLabel }: PDPModalProps) {
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

            // Track menu item view for analytics
            trackMenuItemView({
                itemId: item.id,
                name: item.name?.[language] || 'Unknown Item',
                category: item.category?.[language] || undefined,
                price: typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price,
                currency: 'USD',
                attributes: item.attributes?.reduce((acc: Record<string, string>, attr: any) => {
                    if (attr.name?.[language]) {
                        acc[attr.name[language]] = String(attr.price);
                    }
                    return acc;
                }, {})
            });

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
    }, [item, language, trackMenuItemView, projectData]);

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
                        className="fixed inset-4 md:inset-8 lg:inset-16 z-[60] flex items-center justify-center"
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
                                    {showItemPrices && !item.attributes?.length && item.price && (
                                        <span
                                            className="text-lg md:text-xl font-semibold whitespace-nowrap"
                                            style={{ color: moodConfig.priceColor }}
                                        >
                                            {item.price}
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

                                {/* Structured Metadata Badges — only render if data exists */}
                                {(item.allergens?.length || item.dietaryTags?.length || item.spiceLevel || item.duration || item.targetAudience || item.skillLevel || item.materials) && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {item.dietaryTags?.map((tag: string, idx: number) => (
                                            <span key={`dt-${idx}`} className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#22c55e20', color: '#16a34a' }}>
                                                {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                                            </span>
                                        ))}
                                        {item.spiceLevel && item.spiceLevel !== 'none' && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                                                🌶️ {item.spiceLevel.charAt(0).toUpperCase() + item.spiceLevel.slice(1).replace('-', ' ')}
                                            </span>
                                        )}
                                        {item.allergens?.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#f59e0b20', color: '#d97706' }}>
                                                ⚠️ {item.allergens.join(', ')}
                                            </span>
                                        )}
                                        {item.duration && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                ⏱ {item.duration} min
                                            </span>
                                        )}
                                        {item.targetAudience && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {item.targetAudience.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {item.skillLevel && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {item.skillLevel.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </span>
                                        )}
                                        {item.materials && (
                                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: `${moodConfig.accentColor}15`, color: moodConfig.accentColor }}>
                                                {item.materials}
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
                                                        {attr.price}
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
