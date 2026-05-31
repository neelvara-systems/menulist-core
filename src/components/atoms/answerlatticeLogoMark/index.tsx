import type { CSSProperties } from 'react';

type AnswerlatticeLogoMarkProps = {
    height?: number | string;
    width?: number | string;
    idPrefix?: string;
    className?: string;
    style?: CSSProperties;
    title?: string;
};

const ANSWERLATTICE_LOGO_SRC = '/answerlattice-logo.svg';
const ANSWERLATTICE_LOGO_ASPECT_RATIO = 8367 / 5131;

export default function AnswerlatticeLogoMark({
    height = 28,
    width,
    className,
    style,
    title,
}: AnswerlatticeLogoMarkProps) {
    const resolvedWidth = width ?? (typeof height === 'number' ? Math.round(height * ANSWERLATTICE_LOGO_ASPECT_RATIO) : '100%');
    const numericHeight = typeof height === 'number' ? height : undefined;
    const numericWidth = typeof resolvedWidth === 'number' ? resolvedWidth : undefined;

    return (
        <img
            alt={title || ''}
            aria-hidden={title ? undefined : true}
            className={className}
            draggable={false}
            height={numericHeight}
            src={ANSWERLATTICE_LOGO_SRC}
            style={{
                display: 'block',
                flexShrink: 0,
                height,
                objectFit: 'contain',
                width: resolvedWidth,
                ...style,
            }}
            title={title}
            width={numericWidth}
        />
    );
}
