
type GradientConfig = {
    colors: readonly string[];
    props?: {
        direction?: string;
        type?: string;
    };
    type: string;
};

export const getGradientValue = (configObj: GradientConfig): string => {
    const colors = configObj.colors
        .filter((color) => typeof color === 'string' && color.trim().length > 0)
        .map((color) => color.trim());
    const direction = configObj.props?.direction?.trim() || '';
    const sourceType = configObj.props?.type?.trim() || configObj.type.trim();
    const type = sourceType.toLowerCase().includes('radial') ? 'radial' : sourceType;

    if (!type || colors.length === 0) return '';
    return `${type}-gradient(${[direction, ...colors].filter(Boolean).join(', ')})`;
};

export type StyleValueAndType = {
    type: '%' | 'px';
    value: number | string;
};

export const getStyleValueAndType = (propertyValue: unknown): StyleValueAndType => {
    if (typeof propertyValue === 'number' && Number.isFinite(propertyValue)) {
        return { value: propertyValue, type: 'px' };
    }
    if (typeof propertyValue !== 'string') return { value: 0, type: 'px' };

    const match = propertyValue.trim().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(%|px)$/i);
    if (!match) return { value: 0, type: 'px' };
    const unit = match[2].toLowerCase();
    if (unit !== '%' && unit !== 'px') return { value: 0, type: 'px' };

    return {
        value: match[1],
        type: unit,
    };
};
