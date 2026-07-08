import type { CSSProperties } from 'react';
import { MENU_MOODS, MenuLayout } from '@config/designSystem';
import type { MenuDesignPreset } from '@lib/menu/menuDesignPresets';

interface MenuStylePresetPreviewProps {
    compact?: boolean;
    preset: MenuDesignPreset;
    selected?: boolean;
}

const toRgba = (hex: string, alpha: number): string => {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#0051d1';
    const red = parseInt(normalized.slice(1, 3), 16);
    const green = parseInt(normalized.slice(3, 5), 16);
    const blue = parseInt(normalized.slice(5, 7), 16);
    const safeAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

export default function MenuStylePresetPreview({
    compact = false,
    preset,
    selected = false,
}: MenuStylePresetPreviewProps) {
    const mood = MENU_MOODS[preset.mood];
    const accentColor = preset.accentColor || mood.accentColor;
    const isGrid = preset.layout === MenuLayout.GRID;
    const isCard = preset.layout === MenuLayout.CARD;
    const itemCount = compact ? 2 : isGrid ? 4 : 3;
    const previewHeight = compact ? 64 : 128;

    const itemGridStyle: CSSProperties = {
        display: 'grid',
        gap: compact ? 5 : 7,
        gridTemplateColumns: isGrid ? 'repeat(2, minmax(0, 1fr))' : '1fr',
    };

    return (
        <div
            aria-hidden="true"
            style={{
                background: mood.background,
                border: `1px solid ${selected ? accentColor : mood.categoryStyle.borderColor || mood.itemStyle.borderColor}`,
                borderRadius: 14,
                boxShadow: selected ? `0 0 0 3px ${toRgba(accentColor, 0.14)}` : 'none',
                color: mood.bodyColor,
                fontFamily: mood.bodyFont,
                minHeight: previewHeight,
                overflow: 'hidden',
                padding: compact ? 8 : 12,
                position: 'relative',
                width: '100%',
            }}
        >
            <div
                style={{
                    background: `linear-gradient(135deg, ${toRgba(accentColor, 0.2)}, transparent 58%)`,
                    inset: 0,
                    opacity: selected ? 1 : 0.76,
                    position: 'absolute',
                }}
            />
            <div style={{ position: 'relative' }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: compact ? 6 : 8 }}>
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                background: mood.headingColor,
                                borderRadius: 999,
                                height: compact ? 5 : 8,
                                opacity: 0.82,
                                width: compact ? 54 : 92,
                            }}
                        />
                        <div
                            style={{
                                background: mood.descriptionColor || mood.bodyColor,
                                borderRadius: 999,
                                height: compact ? 3 : 5,
                                marginTop: compact ? 4 : 5,
                                opacity: 0.48,
                                width: compact ? 34 : 62,
                            }}
                        />
                    </div>
                    <div
                        style={{
                            background: accentColor,
                            borderRadius: 999,
                            boxShadow: `0 0 0 4px ${toRgba(accentColor, 0.16)}`,
                            height: compact ? 10 : 16,
                            width: compact ? 10 : 16,
                        }}
                    />
                </div>

                {preset.showCategoryTabs ? (
                    <div style={{ display: 'flex', gap: 4, marginBottom: compact ? 6 : 8 }}>
                        {[0, 1, 2].map((tab) => (
                            <span
                                key={tab}
                                style={{
                                    background: tab === 0 ? accentColor : toRgba(accentColor, 0.18),
                                    borderRadius: 999,
                                    display: 'block',
                                    height: compact ? 5 : 8,
                                    width: tab === 0 ? (compact ? 24 : 34) : compact ? 16 : 22,
                                }}
                            />
                        ))}
                    </div>
                ) : null}

                <div style={itemGridStyle}>
                    {Array.from({ length: itemCount }).map((_, itemIndex) => (
                        <div
                            key={itemIndex}
                            style={{
                                background: mood.itemStyle.background,
                                border: `${mood.itemStyle.borderWidth || 1}px solid ${mood.itemStyle.borderColor}`,
                                borderRadius: Math.max(6, mood.itemStyle.borderRadius),
                                display: isCard || isGrid ? 'grid' : 'flex',
                                gap: compact ? 5 : 7,
                                minHeight: isGrid ? (compact ? 22 : 48) : compact ? 18 : 34,
                                padding: compact ? 4 : 8,
                            }}
                        >
                            {preset.showImages ? (
                                <div
                                    style={{
                                        background: `linear-gradient(135deg, ${toRgba(accentColor, 0.8)}, ${toRgba(accentColor, 0.2)})`,
                                        borderRadius: mood.itemStyle.imageRadius || 6,
                                        flex: '0 0 auto',
                                        height: isCard || isGrid ? (compact ? 7 : 18) : compact ? 10 : 22,
                                        width: isCard || isGrid ? '100%' : compact ? 14 : 28,
                                    }}
                                />
                            ) : null}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: 5, justifyContent: 'space-between' }}>
                                    <div style={{ alignItems: 'center', display: 'flex', gap: 5, minWidth: 0 }}>
                                        {preset.showCategoryIcons ? (
                                            <span
                                                style={{
                                                    background: accentColor,
                                                    borderRadius: 999,
                                                    display: 'block',
                                                    flex: '0 0 auto',
                                                    height: compact ? 5 : 7,
                                                    width: compact ? 5 : 7,
                                                }}
                                            />
                                        ) : null}
                                        <span
                                            style={{
                                                background: mood.headingColor,
                                                borderRadius: 999,
                                                display: 'block',
                                                height: compact ? 4 : 6,
                                                opacity: 0.8,
                                                width: isGrid ? (compact ? 28 : 42) : compact ? 44 : 70,
                                            }}
                                        />
                                    </div>
                                    {preset.showItemPrices ? (
                                        <span
                                            style={{
                                                background: mood.itemStyle.priceStyle === 'badge'
                                                    ? toRgba(accentColor, 0.14)
                                                    : mood.priceColor,
                                                borderRadius: 999,
                                                display: 'block',
                                                height: compact ? 4 : 7,
                                                opacity: mood.itemStyle.priceStyle === 'badge' ? 1 : 0.8,
                                                width: compact ? 18 : 30,
                                            }}
                                        />
                                    ) : null}
                                </div>
                                <div
                                    style={{
                                        background: mood.descriptionColor || mood.bodyColor,
                                        borderRadius: 999,
                                        height: compact ? 3 : 4,
                                        marginTop: compact ? 4 : 6,
                                        opacity: 0.38,
                                        width: isGrid ? '72%' : '58%',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
