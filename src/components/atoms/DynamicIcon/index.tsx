import React from 'react';
import { FaCreditCard, FaUser } from 'react-icons/fa';

interface DynamicIconProps {
    icon: string;
    style?: React.CSSProperties;
}

const iconMap: { [key: string]: React.ComponentType<any> } = {
    FaCreditCard,
    FaUser,
};

const DynamicIcon: React.FC<DynamicIconProps> = ({ icon, style }) => {
    const IconComponent = iconMap[icon];

    if (!IconComponent) {
        return null; // Or a fallback icon
    }

    return <IconComponent style={style} />;
};

export default DynamicIcon;
