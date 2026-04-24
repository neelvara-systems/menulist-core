import { theme } from 'antd';
import * as LuIcons from 'react-icons/lu';

interface CategoryIconProps {
    icon: string;
    defaultIcon?: keyof typeof LuIcons | null;
    color?: string;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

const CategoryIcon = ({
    icon,
    defaultIcon = null,
    color,
    size = 20,
    style = {},
    className,
}: CategoryIconProps) => {
    const { token } = theme.useToken();
    const resolvedColor = color || token.colorText;

    if (!icon) {
        if (!defaultIcon) return null;
        const DefaultIcon = LuIcons[defaultIcon];
        return DefaultIcon ? <DefaultIcon className={className} size={size} color={resolvedColor} style={style} /> : null;
    }

    if (icon.startsWith('lu:')) {
        const iconName = icon.replace('lu:', '') as keyof typeof LuIcons;
        const IconComponent = LuIcons[iconName];
        const FallbackIcon = LuIcons['LuCircle'];
        return IconComponent
            ? <IconComponent className={className} size={size} color={resolvedColor} style={style} />
            : <FallbackIcon className={className} size={size} color={token.colorTextSecondary} style={style} />;
    }

    if (icon.startsWith('emoji:')) {
        const emoji = icon.replace('emoji:', '');
        return <span className={className} style={{ fontSize: `${size}px`, lineHeight: 1, ...style }}>{emoji}</span>;
    }

    // Fallback for icons that don't follow the prefix system (legacy)
    const LegacyIcon = LuIcons[icon as keyof typeof LuIcons];
    return LegacyIcon
        ? <LegacyIcon className={className} size={size} color={resolvedColor} style={style} />
        : <LuIcons.LuFolder className={className} size={size} color={resolvedColor} style={style} />;
};

export default CategoryIcon;
