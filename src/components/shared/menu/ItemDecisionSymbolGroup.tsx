import type { CSSProperties } from 'react';
import {
    FaChildReaching,
    FaMars,
    FaPerson,
    FaPersonCane,
    FaVenus,
    FaVenusMars,
} from 'react-icons/fa6';
import { GiChiliPepper } from 'react-icons/gi';
import { LuVegan, LuWheat } from 'react-icons/lu';
import {
    getItemDecisionSymbolDefinition,
    type ItemDecisionSymbolId,
    type ItemDecisionSymbolLabels,
} from '@lib/menu/itemDecisionSymbols';
import { getContrastRatio } from '@lib/colorEnforcement';

type ItemDecisionSymbolGroupProps = {
    backgroundColor?: string;
    color?: string;
    labelled?: boolean;
    labels?: ItemDecisionSymbolLabels;
    size?: number;
    symbols: readonly ItemDecisionSymbolId[];
};

const SEMANTIC_COLORS = {
    green: ['#15803d', '#4ade80'],
    neutral: ['#475569', '#e2e8f0'],
    red: ['#b91c1c', '#f87171'],
} as const;

function resolveReadableColor(candidates: readonly string[], backgroundColor?: string): string {
    if (!backgroundColor) return candidates[0];
    return candidates.reduce((best, candidate) => (
        getContrastRatio(candidate, backgroundColor) > getContrastRatio(best, backgroundColor)
            ? candidate
            : best
    ));
}

function AudienceIcon({ id, size }: { id: ItemDecisionSymbolId; size: number }) {
    if (id === 'for-men') return <FaMars aria-hidden="true" size={size} />;
    if (id === 'for-women') return <FaVenus aria-hidden="true" size={size} />;
    if (id === 'unisex') return <FaVenusMars aria-hidden="true" size={size * 1.12} />;
    if (id === 'kids') return <FaChildReaching aria-hidden="true" size={size} />;
    if (id === 'seniors') return <FaPersonCane aria-hidden="true" size={size} />;
    return <FaPerson aria-hidden="true" size={size} />;
}

function ItemDecisionSymbolMark({
    backgroundColor,
    color,
    id,
    size,
}: {
    backgroundColor?: string;
    color?: string;
    id: ItemDecisionSymbolId;
    size: number;
}) {
    const definition = getItemDecisionSymbolDefinition(id);
    const semanticColor = definition.semanticColor === 'neutral' && color
        ? color
        : resolveReadableColor(SEMANTIC_COLORS[definition.semanticColor], backgroundColor);
    const commonStyle: CSSProperties = {
        alignItems: 'center',
        color: semanticColor,
        display: 'inline-flex',
        flex: '0 0 auto',
        height: size,
        justifyContent: 'center',
        lineHeight: 1,
        width: definition.kind === 'spice'
            ? Math.max(size, (definition.spiceMarks || 1) * (size * 0.78))
            : id === 'unisex'
                ? size * 1.12
                : size,
    };

    if (definition.kind === 'dietary-dot') {
        return (
            <span aria-hidden="true" style={{ ...commonStyle, border: `1.5px solid ${semanticColor}`, borderRadius: 2 }}>
                <span style={{ background: semanticColor, borderRadius: '50%', height: size * 0.42, width: size * 0.42 }} />
            </span>
        );
    }

    if (definition.kind === 'leaf') {
        return (
            <span
                aria-hidden="true"
                data-item-decision-symbol-visual="lucide-vegan"
                style={commonStyle}
            >
                <LuVegan aria-hidden="true" size={Math.max(10, size * 0.94)} strokeWidth={2.15} />
            </span>
        );
    }

    if (definition.kind === 'gluten-free') {
        return (
            <span
                aria-hidden="true"
                data-item-decision-symbol-visual="lucide-wheat"
                style={commonStyle}
            >
                <LuWheat aria-hidden="true" size={Math.max(10, size * 0.94)} strokeWidth={2.15} />
            </span>
        );
    }

    if (definition.kind === 'spice') {
        return (
            <span aria-hidden="true" style={{ ...commonStyle, gap: 0 }}>
                {Array.from({ length: definition.spiceMarks || 1 }, (_, index) => (
                    <GiChiliPepper key={index} size={Math.max(10, size * 0.84)} />
                ))}
            </span>
        );
    }

    return <span aria-hidden="true" style={commonStyle}><AudienceIcon id={id} size={Math.max(10, size * 0.82)} /></span>;
}

export default function ItemDecisionSymbolGroup({
    backgroundColor,
    color,
    labelled = false,
    labels,
    size = 14,
    symbols,
}: ItemDecisionSymbolGroupProps) {
    if (symbols.length === 0) return null;
    const definitions = symbols.map(getItemDecisionSymbolDefinition);
    const accessibleLabel = definitions.map((definition) => labels?.[definition.id] || definition.label).join(', ');

    return (
        <span
            aria-label={accessibleLabel}
            data-item-decision-symbol-group="true"
            role="img"
            style={{
                alignItems: 'center',
                display: 'inline-flex',
                flex: '0 0 auto',
                flexWrap: labelled ? 'wrap' : 'nowrap',
                gap: labelled ? 8 : 5,
                maxWidth: '100%',
                verticalAlign: 'middle',
            }}
            title={accessibleLabel}
        >
            {definitions.map((definition) => (
                <span
                    data-item-decision-symbol={definition.id}
                    key={definition.id}
                    style={{ alignItems: 'center', display: 'inline-flex', gap: labelled ? 4 : 0 }}
                >
                    <ItemDecisionSymbolMark backgroundColor={backgroundColor} color={color} id={definition.id} size={size} />
                    {labelled ? (
                        <span style={{ fontSize: Math.max(11, size * 0.78), fontWeight: 600 }}>
                            {labels?.[definition.id] || definition.label}
                        </span>
                    ) : null}
                </span>
            ))}
        </span>
    );
}
