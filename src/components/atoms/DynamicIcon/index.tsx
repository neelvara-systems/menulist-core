import React from 'react';
import { LuCreditCard, LuUser } from 'react-icons/lu';

interface DynamicIconProps {
    icon: string;
    style?: React.CSSProperties;
}

const iconMap: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
    FaCreditCard: LuCreditCard,
    FaUser: LuUser,
};

const DynamicIcon: React.FC<DynamicIconProps> = ({ icon, style }) => {
    const IconComponent = iconMap[icon];

    if (!IconComponent) {
        return null; // Or a fallback icon
    }

    return <IconComponent style={style} />;
};

export default DynamicIcon;
