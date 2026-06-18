'use client';

/**
 * Public Menu Entry — Success Page
 * 
 * /create-menu/success — Shows after successful claim + publish.
 * Displays live URL, QR code, share options, and next steps.
 * Requires authentication (redirected here after claim).
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.3
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import '@/styles/website.css';
import { recordStarterActivationSignal } from '@database/stores';
import {
    STARTER_ACTIVATION_SIGNALS,
    type StarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMapPin, LuMessageCircle, LuQrCode } from 'react-icons/lu';
import AnimateOnScroll from '@/components/website/shared/AnimateOnScroll';

export default function CreateMenuSuccessClient() {
    const t = useTranslations('Website');
    const searchParams = useSearchParams();
    const menuUrl = searchParams.get('menuUrl') || '';
    const officialPageUrl = searchParams.get('officialPageUrl') || '';
    const businessName = searchParams.get('name') || t('CreateMenuSuccess.defaultBusinessName');
    const hasMenuUrl = Boolean(menuUrl);
    const hasOfficialPageUrl = Boolean(officialPageUrl);

    const [copied, setCopied] = useState(false);
    const recordedSignalsRef = useRef(new Set<StarterActivationSignal>());

    const recordStarterSignal = useCallback((signal: StarterActivationSignal) => {
        if (recordedSignalsRef.current.has(signal)) return;
        try {
            const rawClaim = window.sessionStorage.getItem('menulist:create-menu:last-claim');
            const claim = rawClaim ? JSON.parse(rawClaim) : null;
            const storeId = Number(claim?.storeId);
            if (!storeId) return;

            recordedSignalsRef.current.add(signal);
            recordStarterActivationSignal(storeId, signal).catch(() => {
                recordedSignalsRef.current.delete(signal);
            });
        } catch {
            // Non-blocking: the success page remains useful even if telemetry cannot be recorded.
        }
    }, []);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(menuUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = menuUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        recordStarterSignal(STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED);
    }, [menuUrl, recordStarterSignal]);

    const handleWhatsAppShare = useCallback(() => {
        const msg = t('CreateMenuSuccess.whatsAppMessage', { menuUrl });
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        recordStarterSignal(STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED);
    }, [menuUrl, recordStarterSignal, t]);

    return (
        <div className="ws-page">
            <Header />
            <AnimateOnScroll>
                <div style={{
                    maxWidth: '560px',
                    margin: '0 auto',
                    padding: '40px 20px 60px',
                    textAlign: 'center',
                }}>
                    {/* Success badge */}
                    <AnimateOnScroll delay={0.03}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--ws-bg-success-soft)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <LuCheck size={32} color="var(--ws-success)" />
                        </div>
                    </AnimateOnScroll>

                    <WebsiteHeadline
                        as="h1"
                        size="compact"
                        text={t('CreateMenuSuccess.title')}
                        highlightedText={t('CreateMenuSuccess.titleHighlight')}
                        style={{ marginBottom: '8px' }}
                    />

                    <p style={{
                        fontSize: '15px',
                        color: 'var(--ws-text-secondary)',
                        marginBottom: '28px',
                    }}>
                        {hasMenuUrl
                            ? t('CreateMenuSuccess.liveSubtitle', { businessName })
                            : t('CreateMenuSuccess.pendingSubtitle')}
                    </p>

                    {/* Live URL Card */}
                    {hasMenuUrl && (
                        <AnimateOnScroll delay={0.1}>
                            <div style={{
                                backgroundColor: 'var(--ws-bg-subtle)',
                                borderRadius: 'var(--ws-radius-lg)',
                                padding: '20px',
                                marginBottom: '24px',
                            }}>
                                <p style={{ fontSize: '12px', color: 'var(--ws-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: 0 }}>
                                    {t('CreateMenuSuccess.linkLabel')}
                                </p>
                                <a
                                    href={menuUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--ws-brand-secondary)',
                                        textDecoration: 'none',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {menuUrl} <LuExternalLink size={14} style={{ verticalAlign: 'middle' }} />
                                </a>
                                {hasOfficialPageUrl && (
                                    <div style={{
                                        borderTop: '1px solid var(--ws-border-default)',
                                        marginTop: '16px',
                                        paddingTop: '14px',
                                    }}>
                                        <p style={{ fontSize: '12px', color: 'var(--ws-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: 0 }}>
                                            {t('CreateMenuSuccess.officialPageLabel')}
                                        </p>
                                        <a
                                            href={officialPageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'var(--ws-text-secondary)',
                                                textDecoration: 'none',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {officialPageUrl} <LuExternalLink size={13} style={{ verticalAlign: 'middle' }} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </AnimateOnScroll>
                    )}

                    {/* Action Buttons */}
                    {hasMenuUrl && (
                        <AnimateOnScroll delay={0.16}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                marginBottom: '32px',
                            }}>
                                <button
                                    onClick={handleCopyLink}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px 24px',
                                        backgroundColor: copied ? 'var(--ws-success)' : 'var(--ws-cta-default)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--ws-radius-xl)',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background-color var(--ws-transition-fast)',
                                        width: '100%',
                                    }}
                                >
                                    {copied ? <><LuCheck size={18} /> {t('CreateMenuSuccess.copied')}</> : <><LuCopy size={18} /> {t('CreateMenuSuccess.copyLink')}</>}
                                </button>

                                <button
                                    onClick={handleWhatsAppShare}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px 24px',
                                        backgroundColor: 'var(--ws-bg-primary)',
                                        color: '#25D366',
                                        border: '1px solid #25D366',
                                        borderRadius: 'var(--ws-radius-xl)',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        width: '100%',
                                    }}
                                >
                                    <LuMessageCircle size={18} /> {t('CreateMenuSuccess.whatsAppCta')}
                                </button>
                            </div>
                        </AnimateOnScroll>
                    )}

                    {/* QR Code hint */}
                    <AnimateOnScroll delay={0.22}>
                        <div style={{
                            backgroundColor: 'var(--ws-bg-warning-soft)',
                            borderRadius: 'var(--ws-radius-xl)',
                            padding: '16px 20px',
                            marginBottom: '20px',
                            textAlign: 'left',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                        }}>
                            <LuQrCode size={20} color="var(--ws-warning)" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-warning-text)', marginBottom: '4px' }}>
                                    {t('CreateMenuSuccess.qrTitle')}
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--ws-warning-text)', lineHeight: 1.4 }}>
                                    {t('CreateMenuSuccess.qrBody')}
                                </p>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Google Maps hint */}
                    <AnimateOnScroll delay={0.28}>
                        <div style={{
                            backgroundColor: 'var(--ws-bg-accent)',
                            borderRadius: 'var(--ws-radius-xl)',
                            padding: '16px 20px',
                            marginBottom: '32px',
                            textAlign: 'left',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                        }}>
                            <LuMapPin size={20} color="var(--ws-brand-secondary)" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-brand-secondary)', marginBottom: '4px' }}>
                                    {t('CreateMenuSuccess.mapsTitle')}
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--ws-brand-secondary)', lineHeight: 1.4 }}>
                                    {t('CreateMenuSuccess.mapsBody')}
                                </p>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Go to dashboard */}
                    <AnimateOnScroll delay={0.34}>
                        <a
                            href="/use-menulist"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 28px',
                                backgroundColor: 'var(--ws-bg-primary)',
                                color: 'var(--ws-text-secondary)',
                                border: '1px solid var(--ws-border-default)',
                                borderRadius: 'var(--ws-radius-xl)',
                                fontSize: '14px',
                                fontWeight: 500,
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {t('CreateMenuSuccess.dashboardCta')}
                        </a>
                    </AnimateOnScroll>
                </div>
            </AnimateOnScroll>
            <Footer />
        </div>
    );
}
