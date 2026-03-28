/**
 * Home Page (New Design System)
 * 
 * Renders the home page using the new simplified style system.
 * Style is determined by HomeStyle enum (simple/premium/bold).
 */

import { LOGO_SMALL } from '@constant/common';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ANIMATION_DURATION, DEFAULTS, getHomeStyleWithBrandColor, HomeStyle } from '../designSystem';
import { DeviceTypes, PageType } from '../types';

const DummyStoreDetails = {
    logo: LOGO_SMALL,
    name: 'La Belle Cuisine',
    tagline: 'FINE DINING RESTAURANT',
};

interface HomePageNewProps {
    homeStyle?: HomeStyle;
    brandAccentColor?: string;
    backgroundImage?: string;
    logoUrl?: string;
    storeName?: string;
    storeTagline?: string;
    setActivePage?: (page: PageType) => void;
    from: string;
    activeDeviceType: DeviceTypes;
}

function HomePageNew({
    homeStyle = DEFAULTS.home.style,
    brandAccentColor,
    backgroundImage,
    logoUrl,
    storeName,
    storeTagline,
    setActivePage,
    from,
    activeDeviceType
}: HomePageNewProps) {
    const style = getHomeStyleWithBrandColor(homeStyle, brandAccentColor);
    const animationDuration = ANIMATION_DURATION.medium;

    const logo = logoUrl || DummyStoreDetails.logo;
    const name = storeName || DummyStoreDetails.name;
    const tagline = storeTagline || DummyStoreDetails.tagline;

    const containerStyle: React.CSSProperties = {
        height: from === 'main-website' ? '100vh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '40px 20px',
        background: backgroundImage
            ? `url(${backgroundImage}) center/cover no-repeat`
            : style.background,
        overflow: 'hidden',
    };

    const frameStyle: React.CSSProperties = {
        padding: '40px 30px',
        textAlign: 'center',
        position: 'relative',
        maxWidth: '400px',
        width: '100%',
        ...(style.frameType === 'subtle' && {
            border: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
        }),
        ...(style.frameType === 'simple' && {
            borderBottom: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
            borderTop: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
        }),
    };

    const textStyle: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: activeDeviceType === 'mobile' ? style.fontSize * 0.85 : style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        margin: 0,
        lineHeight: 1.2,
    };

    const taglineStyle: React.CSSProperties = {
        ...textStyle,
        fontSize: activeDeviceType === 'mobile' ? 12 : 14,
        fontWeight: Math.max(300, style.fontWeight - 200),
        letterSpacing: '3px',
        marginTop: '16px',
        opacity: 0.8,
    };

    const buttonStyle: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '1px',
        padding: '12px 32px',
        cursor: 'pointer',
        borderRadius: style.buttonRadius,
        transition: 'all 0.2s ease',
        marginTop: '24px',
        ...(style.buttonStyle === 'filled' ? {
            background: style.borderColor,
            color: style.background.includes('gradient') ? '#000' : '#fff',
            border: 'none',
        } : {
            background: 'transparent',
            color: style.color,
            border: `1px solid ${style.borderColor}`,
        }),
    };

    return (
        <div style={containerStyle}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={homeStyle}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: animationDuration }}
                    style={frameStyle}
                >
                    {logo && (
                        <motion.div
                            style={{
                                width: '80px',
                                height: '80px',
                                position: 'relative',
                                margin: '0 auto 20px',
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Image
                                src={logo}
                                alt="Logo"
                                fill
                                style={{ objectFit: 'contain' }}
                                priority
                            />
                        </motion.div>
                    )}

                    <motion.h1
                        style={textStyle}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        {name}
                    </motion.h1>

                    {tagline && (
                        <motion.p
                            style={taglineStyle}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {tagline}
                        </motion.p>
                    )}

                    <motion.button
                        style={buttonStyle}
                        onClick={() => setActivePage?.(PageType.MENU)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        View Menu
                    </motion.button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default HomePageNew;
