import { theme } from 'antd';
import * as LuIcons from 'react-icons/lu';

interface CategoryIconProps {
    icon: unknown;
    defaultIcon?: keyof typeof LuIcons | null;
    allowEmoji?: boolean;
    color?: string;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

function normalizeIconValue(icon: unknown): string {
    if (typeof icon === 'string') {
        return icon;
    }

    if (icon && typeof icon === 'object') {
        const candidateKeys = ['icon', 'value', 'name'];
        for (const key of candidateKeys) {
            const candidate = (icon as Record<string, unknown>)[key];
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
                return candidate;
            }
        }
    }

    return '';
}

const CategoryIcon = ({
    icon,
    defaultIcon = null,
    allowEmoji = true,
    color,
    size = 20,
    style = {},
    className,
}: CategoryIconProps) => {
    const { token } = theme.useToken();
    const resolvedColor = color || token.colorText;
    const normalizedIcon = normalizeIconValue(icon);

    if (!normalizedIcon) {
        if (!defaultIcon) return null;
        const DefaultIcon = LuIcons[defaultIcon];
        return DefaultIcon ? <DefaultIcon className={className} size={size} color={resolvedColor} style={style} /> : null;
    }

    if (normalizedIcon.startsWith('lu:')) {
        const iconName = normalizedIcon.replace('lu:', '') as keyof typeof LuIcons;
        const IconComponent = LuIcons[iconName];
        const FallbackIcon = LuIcons['LuCircle'];
        return IconComponent
            ? <IconComponent className={className} size={size} color={resolvedColor} style={style} />
            : <FallbackIcon className={className} size={size} color={token.colorTextSecondary} style={style} />;
    }

    if (normalizedIcon.startsWith('emoji:')) {
        if (!allowEmoji) {
            const FallbackIcon = defaultIcon ? LuIcons[defaultIcon] : LuIcons.LuFolder;
            return <FallbackIcon className={className} size={size} color={resolvedColor} style={style} />;
        }
        const emoji = normalizedIcon.replace('emoji:', '');
        return <span className={className} style={{ fontSize: `${size}px`, lineHeight: 1, ...style }}>{emoji}</span>;
    }

    // Fallback for icons that don't follow the prefix system (legacy)
    const LegacyIcon = LuIcons[normalizedIcon as keyof typeof LuIcons];
    return LegacyIcon
        ? <LegacyIcon className={className} size={size} color={resolvedColor} style={style} />
        : <LuIcons.LuFolder className={className} size={size} color={resolvedColor} style={style} />;
};

export default CategoryIcon;
