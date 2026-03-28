import { theme } from 'antd';
import * as LuIcons from 'react-icons/lu';

interface CategoryIconProps {
    icon: string;
    defaultIcon?: keyof typeof LuIcons;
    style?: React.CSSProperties;
}

const CategoryIcon = ({ icon, defaultIcon = 'LuFolder', style = {} }: CategoryIconProps) => {
    const { token } = theme.useToken();

    if (!icon) {
        const DefaultIcon = LuIcons[defaultIcon];
        return DefaultIcon ? <DefaultIcon size={20} color={token.colorText} style={style} /> : null;
    }

    if (icon.startsWith('lu:')) {
        const iconName = icon.replace('lu:', '') as keyof typeof LuIcons;
        const IconComponent = LuIcons[iconName];
        const FallbackIcon = LuIcons['LuCircle'];
        return IconComponent ? <IconComponent size={20} color={token.colorText} style={style} /> : <FallbackIcon size={20} color={token.colorTextSecondary} style={style} />;
    }

    if (icon.startsWith('emoji:')) {
        const emoji = icon.replace('emoji:', '');
        return <span style={{ fontSize: '20px', ...style }}>{emoji}</span>;
    }

    // Fallback for icons that don't follow the prefix system (legacy)
    const LegacyIcon = LuIcons[icon as keyof typeof LuIcons];
    return LegacyIcon ? <LegacyIcon size={20} color={token.colorText} style={style} /> : <LuIcons.LuFolder size={20} color={token.colorText} style={style} />;
};

export default CategoryIcon;
