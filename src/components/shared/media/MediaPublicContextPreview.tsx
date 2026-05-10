import { theme } from 'antd';
import React from 'react';
import type { MediaImageType } from '@lib/media/imageProfiles';

interface MediaPublicContextPreviewProps {
    accentColor?: string;
    imageType: Extract<MediaImageType, 'businessCover' | 'menuBackground'>;
    imageUrl?: string | null;
    subtitle?: string;
    title?: string;
}

function MenuBackgroundPreview({
    accentColor,
    imageUrl,
    subtitle,
    title,
}: Omit<MediaPublicContextPreviewProps, 'imageType'>) {
    const { token } = theme.useToken();
    const accent = accentColor || token.colorPrimary;

    return (
        <div
            aria-label="Customer menu preview"
            style={{
                aspectRatio: '9 / 16',
                background: imageUrl
                    ? `linear-gradient(180deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.48)), url(${imageUrl}) center / cover no-repeat`
                    : token.colorFillQuaternary,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 22,
                boxShadow: token.boxShadowTertiary,
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: 220,
                minHeight: 300,
                overflow: 'hidden',
                padding: 16,
                width: '100%',
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>
                {title || 'Your digital menu'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: 12, lineHeight: 1.35, marginTop: 4 }}>
                {subtitle || 'Customer view'}
            </div>
            <div
                style={{
                    background: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 999,
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: 11,
                    marginTop: 14,
                    padding: '8px 10px',
                }}
            >
                Search menu
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <span
                    style={{
                        background: accent,
                        borderRadius: 999,
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '5px 9px',
                    }}
                >
                    Popular
                </span>
                <span
                    style={{
                        background: 'rgba(255,255,255,0.12)',
                        borderRadius: 999,
                        color: 'rgba(255,255,255,0.76)',
                        fontSize: 11,
                        padding: '5px 9px',
                    }}
                >
                    All
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                {['Signature item', 'Customer favorite'].map((label, index) => (
                    <div
                        key={label}
                        style={{
                            background: 'rgba(255,255,255,0.92)',
                            border: '1px solid rgba(255,255,255,0.34)',
                            borderRadius: 14,
                            color: '#111827',
                            padding: 10,
                        }}
                    >
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
                            <span style={{ color: accent, fontSize: 12, fontWeight: 800 }}>{index === 0 ? 'Rs 299' : 'Rs 149'}</span>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>Short description stays readable.</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BusinessCoverPreview({
    accentColor,
    imageUrl,
    subtitle,
    title,
}: Omit<MediaPublicContextPreviewProps, 'imageType'>) {
    const { token } = theme.useToken();
    const accent = accentColor || token.colorPrimary;

    return (
        <div
            aria-label="Official business page preview"
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 18,
                boxShadow: token.boxShadowTertiary,
                maxWidth: 360,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <div
                style={{
                    aspectRatio: '16 / 9',
                    background: imageUrl
                        ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22)), url(${imageUrl}) center / cover no-repeat`
                        : token.colorFillQuaternary,
                }}
            />
            <div style={{ padding: 14 }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                    <div
                        aria-hidden
                        style={{
                            background: accent,
                            border: `2px solid ${token.colorBgContainer}`,
                            borderRadius: 18,
                            height: 36,
                            marginTop: -28,
                            width: 36,
                        }}
                    />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: token.colorText, fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>
                            {title || 'Business page'}
                        </div>
                        <div style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.35 }}>
                            {subtitle || 'Customer view'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
                    {['Call', 'Directions', 'Menu'].map((label) => (
                        <span
                            key={label}
                            style={{
                                background: label === 'Menu' ? accent : token.colorFillQuaternary,
                                borderRadius: 999,
                                color: label === 'Menu' ? '#ffffff' : token.colorTextSecondary,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '6px 10px',
                            }}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MediaPublicContextPreview(props: MediaPublicContextPreviewProps) {
    if (!props.imageUrl) return null;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {props.imageType === 'menuBackground'
                ? <MenuBackgroundPreview {...props} />
                : <BusinessCoverPreview {...props} />}
        </div>
    );
}
