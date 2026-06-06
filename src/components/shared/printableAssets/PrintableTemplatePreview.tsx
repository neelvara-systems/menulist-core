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
            maxHeight: compact ? 118 : 164,
            width: compact ? '62%' : '56%',
        };
    }
    if (kind === 'landscape') {
        return {
            aspectRatio: '1.95 / 1',
            maxHeight: compact ? 112 : 150,
            width: compact ? '86%' : '82%',
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
        maxHeight: compact ? 130 : 188,
        width: compact ? '48%' : '42%',
    };
}

function shouldUseSerif(familyId: string): boolean {
    return familyId === 'classic-luxe' || familyId === 'botanical-heritage' || familyId === 'executive-dark';
}

function OrnamentDots({
    color,
    side,
}: {
    color: string;
    side: 'left' | 'right';
}) {
    return (
        <span
            aria-hidden="true"
            style={{
                bottom: '31%',
                display: 'grid',
                gap: 3,
                gridTemplateColumns: 'repeat(3, 3px)',
                opacity: 0.72,
                position: 'absolute',
                [side]: '9%',
            }}
        >
            {Array.from({ length: 9 }).map((_, index) => (
                <span
                    key={index}
                    style={{
                        background: color,
                        borderRadius: 999,
                        height: 3,
                        width: 3,
                    }}
                />
            ))}
        </span>
    );
}

function CornerLines({ color }: { color: string }) {
    const base: CSSProperties = {
        borderColor: color,
        height: 18,
        opacity: 0.86,
        position: 'absolute',
        width: 18,
    };

    return (
        <>
            <span aria-hidden="true" style={{ ...base, borderLeft: '2px solid', borderTop: '2px solid', left: 10, top: 10 }} />
            <span aria-hidden="true" style={{ ...base, borderRight: '2px solid', borderTop: '2px solid', right: 10, top: 10 }} />
            <span aria-hidden="true" style={{ ...base, borderBottom: '2px solid', borderLeft: '2px solid', bottom: 10, left: 10 }} />
            <span aria-hidden="true" style={{ ...base, borderBottom: '2px solid', borderRight: '2px solid', bottom: 10, right: 10 }} />
        </>
    );
}

function LeafSpray({ color, side }: { color: string; side: 'left' | 'right' }) {
    return (
        <span
            aria-hidden="true"
            style={{
                height: 44,
                opacity: 0.78,
                position: 'absolute',
                top: 12,
                transform: side === 'right' ? 'scaleX(-1)' : undefined,
                [side]: 10,
                width: 42,
            }}
        >
            {Array.from({ length: 5 }).map((_, index) => (
                <span
                    key={index}
                    style={{
                        background: color,
                        borderRadius: '100% 0 100% 0',
                        height: 15,
                        left: 4 + index * 6,
                        position: 'absolute',
                        top: 6 + index * 6,
                        transform: `rotate(${28 + index * 7}deg)`,
                        width: 7,
                    }}
                />
            ))}
            <span
                style={{
                    background: color,
                    height: 42,
                    left: 13,
                    opacity: 0.7,
                    position: 'absolute',
                    top: 2,
                    transform: 'rotate(-25deg)',
                    width: 1,
                }}
            />
        </span>
    );
}

function DiagonalStrips({ color }: { color: string }) {
    return (
        <span
            aria-hidden="true"
            style={{
                background: `repeating-linear-gradient(135deg, transparent 0 8px, ${color} 8px 11px, transparent 11px 18px)`,
                height: 32,
                opacity: 0.52,
                position: 'absolute',
                right: 0,
                top: '17%',
                width: 86,
            }}
        />
    );
}

function DecorativeLayer({
    family,
    isDark,
    muted,
}: {
    family: PrintableTemplateFamily;
    isDark: boolean;
    muted: string;
}) {
    if (family.id === 'botanical-heritage') {
        return (
            <>
                <LeafSpray color={muted} side="left" />
                <LeafSpray color={muted} side="right" />
                <CornerLines color={muted} />
            </>
        );
    }

    if (family.id === 'classic-luxe') {
        return (
            <>
                <CornerLines color={muted} />
                <OrnamentDots color={muted} side="left" />
                <OrnamentDots color={muted} side="right" />
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
                <CornerLines color={muted} />
                <DiagonalStrips color={muted} />
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
                <OrnamentDots color={muted} side="right" />
            </>
        );
    }

    if (family.id === 'brand-banner' || family.id === 'local-bold') {
        return <DiagonalStrips color={muted} />;
    }

    if (family.id === 'qr-first') {
        return (
            <>
                <CornerLines color={muted} />
                <span
                    aria-hidden="true"
                    style={{
                        background: muted,
                        borderRadius: 999,
                        height: 4,
                        left: '32%',
                        opacity: 0.5,
                        position: 'absolute',
                        top: 16,
                        width: '36%',
                    }}
                />
            </>
        );
    }

    return family.id === 'clean-utility' ? <CornerLines color={muted} /> : null;
}

function LogoBadge({
    accent,
    isDark,
    logo,
    storeName,
}: {
    accent: string;
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
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
                color: accent,
                display: 'inline-flex',
                fontSize: 11,
                fontWeight: 800,
                height: 34,
                justifyContent: 'center',
                margin: '0 auto 7px',
                overflow: 'hidden',
                width: 34,
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
        border: `${compact ? 3 : 4}px solid #111827`,
        height: compact ? 17 : 22,
        position: 'absolute',
        width: compact ? 17 : 22,
    };
    const innerStyle: CSSProperties = {
        background: '#111827',
        inset: compact ? 4 : 5,
        position: 'absolute',
    };

    return (
        <span
            aria-hidden="true"
            style={{
                aspectRatio: '1 / 1',
                background: 'repeating-conic-gradient(#111827 0 25%, #ffffff 0 50%) 50% / 12px 12px',
                border: `4px solid ${borderColor}`,
                borderRadius: 8,
                display: 'block',
                margin: '0 auto',
                maxHeight: compact ? 76 : 116,
                position: 'relative',
                width: size,
            }}
        >
            <span style={{ ...finderStyle, left: 8, top: 8 }}><span style={innerStyle} /></span>
            <span style={{ ...finderStyle, right: 8, top: 8 }}><span style={innerStyle} /></span>
            <span style={{ ...finderStyle, bottom: 8, left: 8 }}><span style={innerStyle} /></span>
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
                    <DecorativeLayer family={family} isDark={isDark} muted={muted} />
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
                padding: compact ? 10 : 18,
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
                    padding: kind === 'kit' ? 0 : compact ? 8 : 12,
                    position: 'relative',
                }}
            >
                {kind === 'kit' ? (
                    <KitStack accent={brand.accent} family={family} isDark={isDark} muted={brand.border} surface={surface} />
                ) : (
                    <>
                        <DecorativeLayer family={family} isDark={isDark} muted={brand.border} />
                        {family.id === 'brand-banner' || family.id === 'local-bold' ? (
                            <span
                                style={{
                                    background: `linear-gradient(90deg, ${brand.gradientFrom}, ${brand.gradientTo})`,
                                    display: 'block',
                                    height: kind === 'landscape' ? '22%' : '18%',
                                    left: 0,
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                }}
                            />
                        ) : null}
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                justifyContent: kind === 'square' ? 'center' : 'flex-start',
                                position: 'relative',
                                textAlign: 'center',
                                zIndex: 1,
                            }}
                        >
                            {kind !== 'square' ? (
                                <LogoBadge accent={brand.accent} isDark={isDark} logo={storeLogo} storeName={storeName} />
                            ) : null}
                            <div
                                style={{
                                    color: brand.text,
                                    fontSize: compact ? 10 : 15,
                                    fontWeight: isSerif ? 700 : 800,
                                    letterSpacing: family.id === 'classic-luxe' || family.id === 'botanical-heritage' ? 2.4 : 0,
                                    lineHeight: 1.08,
                                    maxWidth: '92%',
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
                                    fontSize: compact ? 8 : 12,
                                    fontWeight: 800,
                                    letterSpacing: family.id === 'classic-luxe' ? 1.8 : 0.6,
                                    margin: compact ? '6px 0' : '10px 0',
                                    maxWidth: '88%',
                                    overflow: 'hidden',
                                    padding: compact ? '2px 9px' : '4px 16px',
                                    textOverflow: 'ellipsis',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {title}
                            </div>
                            {assetTypeId === 'print_menu' ? (
                                <div style={{ display: 'grid', gap: compact ? 3 : 5, marginTop: compact ? 4 : 8, width: '78%' }}>
                                    {Array.from({ length: kind === 'landscape' ? 3 : 5 }).map((_, index) => (
                                        <span
                                            key={index}
                                            style={{
                                                alignItems: 'center',
                                                display: 'grid',
                                                gap: 6,
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
                                    size={kind === 'square' ? '62%' : kind === 'landscape' ? '34%' : '58%'}
                                />
                            )}
                            <div
                                style={{
                                    color: brand.text,
                                    fontSize: compact ? 8 : 11,
                                    fontWeight: 700,
                                    marginTop: compact ? 5 : 8,
                                    maxWidth: '92%',
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
