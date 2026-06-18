/**
 * Customer-Facing Menu Item (B2C Output)
 * 
 * Mobile-first, performance-optimized
 * NO Ant Design - Minimal styling
 */

import Image from 'next/image';
import { getMenuItemImageAltText } from '@lib/media/altText';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { MenuMoodConfig } from '../designSystem';

interface MenuItemOutputProps {
    item: {
        id: string;
        name: string;
        description?: string;
        price?: number | string;
        image?: string;
        available?: boolean;
    };
    moodConfig: MenuMoodConfig;
    showImage?: boolean;
    imagePosition?: 'left' | 'top';
    currency?: string;
}

export default function MenuItemOutput({
    item,
    moodConfig,
    showImage = true,
    imagePosition = 'left',
    currency = '',
}: MenuItemOutputProps) {
    const isAvailable = item.available !== false;
    const itemStyle = moodConfig.itemStyle;
    const itemBorderWidth = itemStyle.borderWidth ?? 0;

    const isVertical = imagePosition === 'top';

    return (
        <article
            className={`
                flex flex-col gap-2 p-3 md:p-4 transition-opacity duration-150
                active:scale-[0.98] active:opacity-90
                ${!isAvailable ? 'opacity-50' : ''}
            `}
            style={{
                background: itemStyle.background,
                border: itemBorderWidth > 0 && itemStyle.borderColor
                    ? `${itemBorderWidth}px solid ${itemStyle.borderColor}`
                    : 'none',
                borderRadius: itemStyle.borderRadius,
            }}
        >
            {/* ROW 1: NAME + PRICE (Constitutional guarantee - always first) */}
            <div className="flex justify-between items-start gap-3">
                <h3
                    className="m-0 text-sm md:text-base font-semibold leading-tight flex-1"
                    style={{
                        fontFamily: moodConfig.headingFont,
                        color: moodConfig.headingColor,
                    }}
                >
                    {item.name}
                </h3>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                        className="text-sm md:text-base font-semibold whitespace-nowrap"
                        style={{
                            fontFamily: moodConfig.bodyFont,
                            color: moodConfig.priceColor,
                            ...(itemStyle.priceStyle === 'badge' && itemStyle.priceBadgeColor && {
                                background: itemStyle.priceBadgeColor,
                                padding: '2px 8px',
                                borderRadius: 4,
                            }),
                        }}
                    >
                        {formatMenuPrice(item.price, currency, { fractionDigits: 2 })}
                    </span>

                    {!isAvailable && (
                        <span className="text-xs font-medium text-red-500 whitespace-nowrap">
                            Sold Out
                        </span>
                    )}
                </div>
            </div>

            {/* ROW 2: IMAGE (if enabled, always BELOW price) */}
            {showImage && item.image && (
                <div
                    className={`
                        relative overflow-hidden w-full
                        ${imagePosition === 'top' ? 'h-32 md:h-40' : 'h-24 md:h-28'}
                    `}
                    style={{ borderRadius: itemStyle.imageRadius || 6 }}
                >
                    <Image
                        src={item.image}
                        alt={getMenuItemImageAltText(item.name)}
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>
            )}

            {/* ROW 3: DESCRIPTION */}
            {item.description && (
                <p
                    className="m-0 text-xs md:text-sm leading-relaxed line-clamp-2"
                    style={{
                        fontFamily: moodConfig.bodyFont,
                        color: moodConfig.descriptionColor || moodConfig.bodyColor,
                    }}
                >
                    {item.description}
                </p>
            )}
        </article>
    );
}
