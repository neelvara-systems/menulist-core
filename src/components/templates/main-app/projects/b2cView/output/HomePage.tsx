/**
 * Customer-Facing Home Page (B2C Output)
 * 
 * Mobile-first, performance-optimized
 * NO Ant Design - Minimal Framer Motion
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { DEFAULTS, HOME_STYLES, HomeStyle } from '../designSystem';

interface HomePageOutputProps {
    homeStyle?: HomeStyle;
    backgroundImage?: string;
    logoUrl?: string;
    storeName?: string;
    storeTagline?: string;
    onViewMenu?: () => void;
}

export default function HomePageOutput({
    homeStyle = DEFAULTS.home.style,
    backgroundImage,
    logoUrl,
    storeName = 'Restaurant Name',
    storeTagline,
    onViewMenu,
}: HomePageOutputProps) {
    const style = HOME_STYLES[homeStyle];

    const titleStyle: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: `clamp(24px, 7vw, ${style.fontSize}px)`,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        margin: 0,
        lineHeight: 1.2,
    };

    const taglineStyle: React.CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: 'clamp(11px, 3vw, 14px)',
        fontWeight: Math.max(300, style.fontWeight - 200),
        letterSpacing: '2px',
        color: style.taglineColor || style.color,
        marginTop: 12,
        opacity: 0.75,
    };

    const getButtonStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            fontFamily: style.fontFamily,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '1px',
            padding: '12px 32px',
            cursor: 'pointer',
            borderRadius: style.buttonRadius,
            transition: 'opacity 0.15s ease',
            marginTop: 28,
            textTransform: 'uppercase',
        };

        switch (style.buttonStyle) {
            case 'filled':
                return {
                    ...base,
                    background: style.color,
                    color: style.background,
                    border: 'none',
                };
            case 'outline':
                return {
                    ...base,
                    background: 'transparent',
                    color: style.color,
                    border: `1px solid ${style.borderColor || style.color}`,
                };
            default:
                return {
                    ...base,
                    background: style.color,
                    color: style.background,
                    border: 'none',
                };
        }
    };

    const frameStyle: React.CSSProperties = {
        padding: '40px 28px',
        textAlign: 'center',
        maxWidth: 380,
        width: '100%',
        ...(style.frameType === 'subtle' && {
            border: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
        }),
        ...(style.frameType === 'simple' && {
            borderTop: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
            borderBottom: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
        }),
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
            style={{
                background: backgroundImage
                    ? `url(${backgroundImage}) center/cover no-repeat`
                    : style.background,
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={frameStyle}
            >
                {logoUrl && (
                    <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-5">
                        <Image
                            src={logoUrl}
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                )}

                <h1 style={titleStyle}>
                    {storeName}
                </h1>

                {storeTagline && (
                    <p style={taglineStyle}>
                        {storeTagline}
                    </p>
                )}

                <button
                    onClick={onViewMenu}
                    style={getButtonStyle()}
                    className="active:opacity-80"
                >
                    View Menu
                </button>
            </motion.div>
        </div>
    );
}
