'use client';

import { resolvePrintableTemplateBrandTokens } from '@lib/printable-asset-templates/templateStyles';
import type { PrintableAssetTypeId, PrintableTemplateFamily } from '@lib/printable-asset-templates/types';
import type { CSSProperties } from 'react';

type PrintableTemplatePreviewProps = {
    actionLabel: string;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    compact?: boolean;
    family: PrintableTemplateFamily;
    instructionLabel: string;
    shortLink?: string;
    storeLogo?: string | null;
    storeName: string;
};

type SheetKind = 'portrait' | 'square' | 'landscape' | 'kit';

function getInitials(value: string): string {
    const initials = value
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'ML';
}

function getSheetKind(assetTypeId: PrintableAssetTypeId): SheetKind {
    if (assetTypeId === 'counter_sticker') return 'square';
    if (assetTypeId === 'table_tent') return 'landscape';
    if (assetTypeId === 'complete_menu_kit') return 'kit';
    return 'portrait';
}

function getPreviewTitle(assetTypeId: PrintableAssetTypeId, actionLabel: string): string {
    if (assetTypeId === 'feedback_qr') return 'Feedback QR';
    if (assetTypeId === 'counter_sticker') return actionLabel.replace(/^OUR\s+/i, 'Scan for ');
    if (assetTypeId === 'print_menu') return 'Print Menu';
    if (assetTypeId === 'complete_menu_kit') return 'Menu Kit';
    return actionLabel;
}

function getShellStyle(kind: SheetKind, compact?: boolean): CSSProperties {
    if (kind === 'square') {
        return {
            aspectRatio: '1 / 1',
            height: compact ? '78%' : '72%',
            maxHeight: compact ? 112 : 164,
            maxWidth: compact ? '78%' : '56%',
            width: 'auto',
        };
    }
    if (kind === 'landscape') {
        return {
            aspectRatio: '1.42 / 1',
            height: compact ? '78%' : '76%',
            maxHeight: compact ? 176 : 236,
            maxWidth: compact ? '86%' : '82%',
            width: 'auto',
        };
    }
    if (kind === 'kit') {
        return {
            aspectRatio: '1.25 / 1',
            maxHeight: compact ? 118 : 158,
            width: compact ? '76%' : '68%',
        };
    }
    return {
        aspectRatio: '0.71 / 1',
        height: compact ? 'calc(100% - 4px)' : '88%',
        maxHeight: compact ? 212 : 204,
        maxWidth: compact ? '74%' : '58%',
        width: 'auto',
    };
}

function shouldUseSerif(familyId: string): boolean {
    return familyId === 'classic-luxe' || familyId === 'botanical-heritage' || familyId === 'executive-dark';
}

function OrnamentDots({
    compact,
    color,
    side,
}: {
    compact?: boolean;
    color: string;
    side: 'left' | 'right';
}) {
    return (
        <span
            aria-hidden="true"
            style={{
                bottom: compact ? '25%' : '31%',
                display: 'grid',
                gap: compact ? 2 : 3,
                gridTemplateColumns: `repeat(3, ${compact ? 2 : 3}px)`,
                opacity: 0.72,
                position: 'absolute',
                [side]: compact ? '8%' : '9%',
            }}
        >
            {Array.from({ length: 9 }).map((_, index) => (
                <span
                    key={index}
                    style={{
                        background: color,
                        borderRadius: 999,
                        height: compact ? 2 : 3,
                        width: compact ? 2 : 3,
                    }}
                />
            ))}
        </span>
    );
}

function CornerLines({ color, compact }: { color: string; compact?: boolean }) {
    const base: CSSProperties = {
        borderColor: color,
        height: compact ? 12 : 18,
        opacity: 0.86,
        position: 'absolute',
        width: compact ? 12 : 18,
    };
    const offset = compact ? 7 : 10;
    const borderWidth = compact ? 1 : 2;

    return (
        <>
            <span aria-hidden="true" style={{ ...base, borderLeft: `${borderWidth}px solid`, borderTop: `${borderWidth}px solid`, left: offset, top: offset }} />
            <span aria-hidden="true" style={{ ...base, borderRight: `${borderWidth}px solid`, borderTop: `${borderWidth}px solid`, right: offset, top: offset }} />
            <span aria-hidden="true" style={{ ...base, borderBottom: `${borderWidth}px solid`, borderLeft: `${borderWidth}px solid`, bottom: offset, left: offset }} />
            <span aria-hidden="true" style={{ ...base, borderBottom: `${borderWidth}px solid`, borderRight: `${borderWidth}px solid`, bottom: offset, right: offset }} />
        </>
    );
}

function LeafSpray({ color, compact, side }: { color: string; compact?: boolean; side: 'left' | 'right' }) {
    return (
        <span
            aria-hidden="true"
            style={{
                height: compact ? 25 : 44,
                opacity: 0.78,
                position: 'absolute',
                top: compact ? 8 : 12,
                transform: side === 'right' ? 'scaleX(-1)' : undefined,
                [side]: compact ? 8 : 10,
                width: compact ? 25 : 42,
            }}
        >
            {Array.from({ length: 5 }).map((_, index) => (
                <span
                    key={index}
                    style={{
                        background: color,
                        borderRadius: '100% 0 100% 0',
                        height: compact ? 8 : 15,
                        left: compact ? 2 + index * 4 : 4 + index * 6,
                        position: 'absolute',
                        top: compact ? 4 + index * 3 : 6 + index * 6,
                        transform: `rotate(${28 + index * 7}deg)`,
                        width: compact ? 4 : 7,
                    }}
                />
            ))}
            <span
                style={{
                    background: color,
                    height: compact ? 24 : 42,
                    left: compact ? 8 : 13,
                    opacity: 0.7,
                    position: 'absolute',
                    top: compact ? 1 : 2,
                    transform: 'rotate(-25deg)',
                    width: 1,
                }}
            />
        </span>
    );
}

function DiagonalStrips({ color, compact }: { color: string; compact?: boolean }) {
    return (
        <span
            aria-hidden="true"
            style={{
                background: `repeating-linear-gradient(135deg, transparent 0 8px, ${color} 8px 11px, transparent 11px 18px)`,
                height: compact ? 22 : 32,
                opacity: 0.52,
                position: 'absolute',
                right: 0,
                top: '17%',
                width: compact ? 58 : 86,
            }}
        />
    );
}

function DecorativeLayer({
    compact,
    family,
    isDark,
    muted,
}: {
    compact?: boolean;
    family: PrintableTemplateFamily;
    isDark: boolean;
    muted: string;
}) {
    if (family.id === 'botanical-heritage') {
        return (
            <>
                <LeafSpray color={muted} compact={compact} side="left" />
                <LeafSpray color={muted} compact={compact} side="right" />
                <CornerLines color={muted} compact={compact} />
            </>
        );
    }

    if (family.id === 'classic-luxe') {
        return (
            <>
                <CornerLines color={muted} compact={compact} />
                <OrnamentDots color={muted} compact={compact} side="left" />
                <OrnamentDots color={muted} compact={compact} side="right" />
            </>
        );
    }

    if (family.id === 'executive-dark') {
        return (
            <>
                <span
                    aria-hidden="true"
                    style={{
                        background: `repeating-linear-gradient(45deg, transparent 0 16px, ${muted} 17px, transparent 18px 34px)`,
                        inset: 0,
                        opacity: 0.08,
                        position: 'absolute',
                    }}
                />
                <CornerLines color={muted} compact={compact} />
                <DiagonalStrips color={muted} compact={compact} />
            </>
        );
    }

    if (family.id === 'soft-curve') {
        return (
            <>
                <span
                    aria-hidden="true"
                    style={{
                        background: muted,
                        borderRadius: '55% 45% 0 70%',
                        height: '32%',
                        opacity: isDark ? 0.18 : 0.16,
                        position: 'absolute',
                        right: '-12%',
                        top: '9%',
                        width: '45%',
                    }}
                />
                <OrnamentDots color={muted} compact={compact} side="right" />
            </>
        );
    }

    if (family.id === 'brand-banner' || family.id === 'local-bold') {
        return <DiagonalStrips color={muted} compact={compact} />;
    }

    if (family.id === 'qr-first') {
        return (
            <>
                <CornerLines color={muted} compact={compact} />
                <span
                    aria-hidden="true"
                    style={{
                        background: muted,
                        borderRadius: 999,
                        height: compact ? 3 : 4,
                        left: '32%',
                        opacity: 0.5,
                        position: 'absolute',
                        top: compact ? 11 : 16,
                        width: '36%',
                    }}
                />
            </>
        );
    }

    return family.id === 'clean-utility' ? <CornerLines color={muted} compact={compact} /> : null;
}

function LogoBadge({
    accent,
    compact,
    isDark,
    logo,
    storeName,
}: {
    accent: string;
    compact?: boolean;
    isDark: boolean;
    logo?: string | null;
    storeName: string;
}) {
    return (
        <span
            aria-hidden="true"
            style={{
                alignItems: 'center',
                background: isDark ? '#111827' : '#ffffff',
                border: `2px solid ${accent}`,
                borderRadius: 999,
                boxShadow: compact ? '0 2px 7px rgba(15, 23, 42, 0.14)' : '0 4px 12px rgba(15, 23, 42, 0.16)',
                color: accent,
                display: 'inline-flex',
                fontSize: compact ? 6 : 11,
                fontWeight: 800,
                height: compact ? 18 : 34,
                justifyContent: 'center',
                margin: compact ? '0 auto 3px' : '0 auto 7px',
                overflow: 'hidden',
                width: compact ? 18 : 34,
            }}
        >
            {logo ? (
                <img
                    alt=""
                    src={logo}
                    style={{ height: '82%', objectFit: 'contain', width: '82%' }}
                />
            ) : getInitials(storeName)}
        </span>
    );
}

function QrMock({
    borderColor,
    compact,
    size = '52%',
}: {
    borderColor: string;
    compact?: boolean;
    size?: string;
}) {
    const finderStyle: CSSProperties = {
        background: '#ffffff',
        border: `${compact ? 2 : 4}px solid #111827`,
        height: compact ? 10 : 22,
        position: 'absolute',
        width: compact ? 10 : 22,
    };
    const innerStyle: CSSProperties = {
        background: '#111827',
        inset: compact ? 2 : 5,
        position: 'absolute',
    };
    const finderOffset = compact ? 5 : 8;

    return (
        <span
            aria-hidden="true"
            style={{
                aspectRatio: '1 / 1',
                background: `repeating-conic-gradient(#111827 0 25%, #ffffff 0 50%) 50% / ${compact ? 7 : 12}px ${compact ? 7 : 12}px`,
                border: `${compact ? 2 : 4}px solid ${borderColor}`,
                borderRadius: compact ? 7 : 8,
                display: 'block',
                margin: '0 auto',
                maxHeight: compact ? 54 : 116,
                position: 'relative',
                width: size,
            }}
        >
            <span style={{ ...finderStyle, left: finderOffset, top: finderOffset }}><span style={innerStyle} /></span>
            <span style={{ ...finderStyle, right: finderOffset, top: finderOffset }}><span style={innerStyle} /></span>
            <span style={{ ...finderStyle, bottom: finderOffset, left: finderOffset }}><span style={innerStyle} /></span>
        </span>
    );
}

function KitStack({
    accent,
    family,
    isDark,
    muted,
    surface,
}: {
    accent: string;
    family: PrintableTemplateFamily;
    isDark: boolean;
    muted: string;
    surface: string;
}) {
    return (
        <div style={{ height: '100%', position: 'relative', width: '100%' }}>
            {[0, 1, 2].map((index) => (
                <span
                    key={index}
                    style={{
                        background: surface,
                        border: `1px solid ${index === 0 ? accent : muted}`,
                        borderRadius: 8,
                        boxShadow: '0 8px 18px rgba(15,23,42,0.14)',
                        height: '76%',
                        left: `${18 + index * 13}%`,
                        position: 'absolute',
                        top: `${18 - index * 5}%`,
                        transform: `rotate(${(index - 1) * 6}deg)`,
                        width: '42%',
                    }}
                >
                    <DecorativeLayer compact family={family} isDark={isDark} muted={muted} />
                    <span style={{ background: accent, borderRadius: 999, display: 'block', height: 7, margin: '18% auto 12%', width: '56%' }} />
                    <QrMock borderColor={muted} compact size="50%" />
                </span>
            ))}
        </div>
    );
}

export default function PrintableTemplatePreview({
    actionLabel,
    assetTypeId,
    brandColor,
    compact,
    family,
    instructionLabel,
    shortLink,
    storeLogo,
    storeName,
}: PrintableTemplatePreviewProps) {
    const brand = resolvePrintableTemplateBrandTokens(brandColor, family.id);
    const kind = getSheetKind(assetTypeId);
    const isDark = family.tone === 'dark';
    const isSerif = shouldUseSerif(family.id);
    const title = getPreviewTitle(assetTypeId, actionLabel);
    const shellStyle = getShellStyle(kind, compact);
    const fontFamily = isSerif ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const outerGradient = isDark
        ? `linear-gradient(135deg, ${brand.gradientFrom}, ${brand.gradientTo})`
        : family.tone === 'utility'
            ? 'linear-gradient(135deg, #ffffff, #eef2f7)'
            : `linear-gradient(135deg, ${brand.gradientFrom}, ${brand.gradientTo})`;
    const surface = isDark ? brand.surface : brand.surface;
    const compactTitleFontSize = kind === 'portrait' ? 6.5 : 7;
    const compactPillFontSize = kind === 'portrait' ? 5.5 : 6;
    const compactInstructionFontSize = kind === 'portrait' ? 5.5 : 6;
    const showMenuRows = assetTypeId === 'print_menu';

    return (
        <div
            aria-hidden="true"
            style={{
                alignItems: 'center',
                background: outerGradient,
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
                minHeight: compact ? 94 : 210,
                overflow: 'hidden',
                padding: compact ? 6 : 18,
                position: 'relative',
                width: '100%',
            }}
        >
            <span
                style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                    borderRadius: '50%',
                    height: compact ? 90 : 170,
                    position: 'absolute',
                    right: compact ? -38 : -58,
                    top: compact ? -32 : -54,
                    width: compact ? 90 : 170,
                }}
            />
            <div
                style={{
                    ...shellStyle,
                    background: kind === 'kit' ? 'transparent' : surface,
                    border: kind === 'kit' ? 'none' : `1px solid ${brand.border}`,
                    borderRadius: kind === 'square' ? 18 : kind === 'landscape' ? 14 : 16,
                    boxShadow: kind === 'kit' ? 'none' : '0 14px 28px rgba(15, 23, 42, 0.18)',
                    color: brand.text,
                    fontFamily,
                    minWidth: compact ? 86 : 140,
                    overflow: 'hidden',
                    padding: kind === 'kit' ? 0 : compact ? 7 : 12,
                    position: 'relative',
                }}
            >
                {kind === 'kit' ? (
                    <KitStack accent={brand.accent} family={family} isDark={isDark} muted={brand.border} surface={surface} />
                ) : (
                    <>
                        <DecorativeLayer compact={compact} family={family} isDark={isDark} muted={brand.border} />
                        {family.id === 'brand-banner' ? (
                            <span
                                style={{
                                    background: `linear-gradient(90deg, ${brand.gradientFrom}, ${brand.gradientTo})`,
                                    display: 'block',
                                    height: compact ? (kind === 'landscape' ? '24%' : '16%') : kind === 'landscape' ? '22%' : '18%',
                                    left: 0,
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                }}
                            />
                        ) : null}
                        {family.id === 'local-bold' ? (
                            <span
                                style={{
                                    background: brand.accent,
                                    borderRadius: 999,
                                    display: 'block',
                                    height: compact ? 5 : 8,
                                    left: '31%',
                                    opacity: 0.95,
                                    position: 'absolute',
                                    right: '31%',
                                    top: compact ? 10 : 16,
                                }}
                            />
                        ) : null}
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                justifyContent: kind === 'square' ? 'center' : compact ? 'space-between' : 'flex-start',
                                minHeight: 0,
                                overflow: 'hidden',
                                position: 'relative',
                                textAlign: 'center',
                                zIndex: 1,
                            }}
                        >
                            {kind !== 'square' ? (
                                <LogoBadge accent={brand.accent} compact={compact} isDark={isDark} logo={storeLogo} storeName={storeName} />
                            ) : null}
                            <div
                                style={{
                                    color: brand.text,
                                    fontSize: compact ? compactTitleFontSize : 15,
                                    fontWeight: isSerif ? 700 : 800,
                                    letterSpacing: compact
                                        ? family.id === 'classic-luxe' || family.id === 'botanical-heritage'
                                            ? 0.7
                                            : 0
                                        : family.id === 'classic-luxe' || family.id === 'botanical-heritage'
                                            ? 2.4
                                            : 0,
                                    lineHeight: 1.08,
                                    maxWidth: compact ? '86%' : '92%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textTransform: family.id === 'local-bold' ? 'uppercase' : undefined,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {storeName}
                            </div>
                            <div
                                style={{
                                    background: family.id === 'executive-dark' ? brand.accent : brand.softAccent,
                                    border: `1px solid ${brand.border}`,
                                    borderRadius: 999,
                                    color: family.id === 'executive-dark' ? brand.accentText : brand.accent,
                                    fontSize: compact ? compactPillFontSize : 12,
                                    fontWeight: 800,
                                    letterSpacing: compact ? 0.5 : family.id === 'classic-luxe' ? 1.8 : 0.6,
                                    margin: compact ? '2px 0' : '10px 0',
                                    maxWidth: compact ? '82%' : '88%',
                                    overflow: 'hidden',
                                    padding: compact ? '1px 6px' : '4px 16px',
                                    textOverflow: 'ellipsis',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {title}
                            </div>
                            {showMenuRows ? (
                                <div style={{ display: 'grid', gap: compact ? 2 : 5, marginTop: compact ? 1 : 8, width: compact ? '70%' : '78%' }}>
                                    {Array.from({ length: kind === 'landscape' ? 3 : 5 }).map((_, index) => (
                                        <span
                                            key={index}
                                            style={{
                                                alignItems: 'center',
                                                display: 'grid',
                                                gap: compact ? 3 : 6,
                                                gridTemplateColumns: '1fr 26%',
                                            }}
                                        >
                                            <span style={{ background: brand.muted, borderRadius: 999, height: compact ? 3 : 4, opacity: 0.55 }} />
                                            <span style={{ background: brand.accent, borderRadius: 999, height: compact ? 3 : 4, opacity: 0.75 }} />
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <QrMock
                                    borderColor={brand.border}
                                    compact={compact}
                                    size={
                                        kind === 'square'
                                            ? compact
                                                ? '54%'
                                                : '62%'
                                            : kind === 'landscape'
                                                ? compact
                                                    ? '30%'
                                                    : '34%'
                                                : compact
                                                    ? '52%'
                                                    : '52%'
                                    }
                                />
                            )}
                            <div
                                style={{
                                    color: brand.text,
                                    fontSize: compact ? compactInstructionFontSize : 11,
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    marginTop: compact ? 2 : 8,
                                    maxWidth: compact ? '84%' : '92%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {instructionLabel}
                            </div>
                            {shortLink && !compact ? (
                                <div
                                    style={{
                                        background: brand.paper,
                                        border: `1px solid ${brand.border}`,
                                        borderRadius: 999,
                                        color: brand.muted,
                                        fontSize: 9,
                                        marginTop: 7,
                                        maxWidth: '86%',
                                        overflow: 'hidden',
                                        padding: '3px 9px',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {shortLink}
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
