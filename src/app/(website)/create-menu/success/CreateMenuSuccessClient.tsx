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
import {
    assertStarterActivationSignalUpdateSucceeded,
    recordStarterActivationSignal,
} from '@database/stores';
import {
    STARTER_ACTIVATION_SIGNALS,
    type StarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { secureError } from '@lib/security/secureLogger';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import {
    parsePublicCreateMenuLastClaimHandoff,
    PUBLIC_CREATE_MENU_LAST_CLAIM_KEY,
} from '@lib/publicCreateMenu/lastClaimHandoff';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMapPin, LuMessageCircle, LuQrCode } from 'react-icons/lu';
import AnimateOnScroll from '@/components/website/shared/AnimateOnScroll';

const CREATE_MENU_SUCCESS_ERROR_FIELD_LIMIT = 80;
const CREATE_MENU_SUCCESS_BUSINESS_NAME_MAX_LENGTH = 80;
const CREATE_MENU_SUCCESS_URL_MAX_LENGTH = 2048;
const CREATE_MENU_SUCCESS_INVALID_BUSINESS_NAME_REPORT_LIMIT = 100;
const CREATE_MENU_SUCCESS_INVALID_URL_REPORT_LIMIT = 100;
const CREATE_MENU_SUCCESS_SESSION_REFRESH_TIMEOUT_MS = 3_000;

type CreateMenuSuccessUrlKind = 'menuUrl' | 'officialPageUrl';
type CreateMenuSuccessBusinessNameInvalidReason = 'control_chars' | 'too_long';
type CreateMenuSuccessUrlInvalidReason = 'too_long' | 'contains_whitespace' | 'parse_failed' | 'non_https' | 'credentialed';

const reportedCreateMenuSuccessInvalidBusinessNames = new Set<string>();
const reportedCreateMenuSuccessInvalidUrls = new Set<string>();

function getBoundedCreateMenuSuccessStringContext(label: string, value: unknown) {
    if (typeof value !== 'string') {
        return {
            [`${label}Present`]: false,
            [`${label}Length`]: 0,
        };
    }

    return {
        [`${label}Present`]: value.length > 0,
        [`${label}Length`]: value.length,
    };
}

function getCreateMenuSuccessErrorContext(error: unknown) {
    if (!error || typeof error !== 'object') return {};

    const record = error as Record<string, unknown>;

    return {
        sourceErrorName: typeof record.name === 'string'
            ? record.name.slice(0, CREATE_MENU_SUCCESS_ERROR_FIELD_LIMIT)
            : undefined,
        sourceErrorCode: typeof record.code === 'string'
            ? record.code.slice(0, CREATE_MENU_SUCCESS_ERROR_FIELD_LIMIT)
            : undefined,
    };
}

function logCreateMenuSuccessFailure(
    failureCode: string,
    error: unknown,
    context: Record<string, unknown> = {},
) {
    secureError('[create-menu/success] Browser handoff failed', new Error(failureCode), {
        failureCode,
        ...context,
        ...getCreateMenuSuccessErrorContext(error),
    });
}

function logCreateMenuSuccessUrlNormalizationFailure(
    kind: CreateMenuSuccessUrlKind,
    value: string,
    reason: CreateMenuSuccessUrlInvalidReason,
    error?: unknown,
) {
    if (!value) return;

    const trimmed = value.trim();
    const reportKey = [
        kind,
        reason,
        value.length,
        trimmed.length,
        /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? 'protocol' : 'no-protocol',
    ].join(':');

    if (reportedCreateMenuSuccessInvalidUrls.has(reportKey)) return;
    if (reportedCreateMenuSuccessInvalidUrls.size >= CREATE_MENU_SUCCESS_INVALID_URL_REPORT_LIMIT) return;

    reportedCreateMenuSuccessInvalidUrls.add(reportKey);

    logCreateMenuSuccessFailure('public_create_menu_success_url_invalid', error, {
        urlKind: kind,
        invalidUrlReason: reason,
        trimmedValueLength: trimmed.length,
        hasExplicitProtocol: /^[a-z][a-z0-9+.-]*:/i.test(trimmed),
        hasWhitespace: /\s/.test(trimmed),
        ...getBoundedCreateMenuSuccessStringContext(kind, value),
    });
}

function logCreateMenuSuccessBusinessNameNormalizationFailure(
    value: string,
    reason: CreateMenuSuccessBusinessNameInvalidReason,
) {
    if (!value) return;

    const trimmed = value.trim();
    const reportKey = [
        'businessName',
        reason,
        value.length,
        trimmed.length,
    ].join(':');

    if (reportedCreateMenuSuccessInvalidBusinessNames.has(reportKey)) return;
    if (reportedCreateMenuSuccessInvalidBusinessNames.size >= CREATE_MENU_SUCCESS_INVALID_BUSINESS_NAME_REPORT_LIMIT) return;

    reportedCreateMenuSuccessInvalidBusinessNames.add(reportKey);

    logCreateMenuSuccessFailure('public_create_menu_success_business_name_invalid', undefined, {
        businessNameInvalidReason: reason,
        businessNameTrimmedLength: trimmed.length,
        businessNameMaxLength: CREATE_MENU_SUCCESS_BUSINESS_NAME_MAX_LENGTH,
        ...getBoundedCreateMenuSuccessStringContext('businessName', value),
    });
}

function normalizeCreateMenuSuccessBusinessName(value: string, fallback: string) {
    const trimmed = value.trim();

    if (!trimmed) return fallback;

    const withoutControl = trimmed.replace(/[\x00-\x1F\x7F]+/g, ' ');
    const normalized = withoutControl.replace(/\s+/g, ' ').trim();

    if (!normalized) {
        logCreateMenuSuccessBusinessNameNormalizationFailure(value, 'control_chars');
        return fallback;
    }

    if (withoutControl !== trimmed) {
        logCreateMenuSuccessBusinessNameNormalizationFailure(value, 'control_chars');
    }

    if (normalized.length <= CREATE_MENU_SUCCESS_BUSINESS_NAME_MAX_LENGTH) {
        return normalized;
    }

    logCreateMenuSuccessBusinessNameNormalizationFailure(value, 'too_long');
    return `${normalized.slice(0, CREATE_MENU_SUCCESS_BUSINESS_NAME_MAX_LENGTH - 3).trimEnd()}...`;
}

function normalizeCreateMenuSuccessUrl(kind: CreateMenuSuccessUrlKind, value: string) {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (value.length > CREATE_MENU_SUCCESS_URL_MAX_LENGTH || trimmed.length > CREATE_MENU_SUCCESS_URL_MAX_LENGTH) {
        logCreateMenuSuccessUrlNormalizationFailure(kind, value, 'too_long');
        return '';
    }

    if (/\s/.test(trimmed)) {
        logCreateMenuSuccessUrlNormalizationFailure(kind, value, 'contains_whitespace');
        return '';
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch (error) {
        logCreateMenuSuccessUrlNormalizationFailure(kind, value, 'parse_failed', error);
        return '';
    }

    if (parsed.protocol !== 'https:') {
        logCreateMenuSuccessUrlNormalizationFailure(kind, value, 'non_https');
        return '';
    }

    if (parsed.username || parsed.password) {
        logCreateMenuSuccessUrlNormalizationFailure(kind, value, 'credentialed');
        return '';
    }

    return parsed.toString();
}

function getCreateMenuSuccessStarterSignalContext(
    signal: StarterActivationSignal,
    rawClaim: string | null,
    storeId?: unknown,
) {
    const numericStoreId = Number(storeId);

    return {
        signal,
        storeIdPresent: Number.isFinite(numericStoreId) && numericStoreId > 0,
        ...getBoundedCreateMenuSuccessStringContext('rawClaim', rawClaim),
    };
}

function hasCreateMenuSuccessClipboardWrite() {
    return typeof navigator !== 'undefined'
        && typeof navigator.clipboard?.writeText === 'function';
}

function hasCreateMenuSuccessCopyFallback() {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyCreateMenuSuccessLinkToClipboard(menuUrl: string) {
    if (hasCreateMenuSuccessClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(menuUrl);
            return;
        } catch {
            // Fall through to the acknowledged textarea fallback for restricted browsers.
        }
    }

    if (!hasCreateMenuSuccessCopyFallback()) {
        throw new Error('public_create_menu_success_copy_unavailable');
    }

    const input = document.createElement('input');
    input.value = menuUrl;
    input.readOnly = true;
    document.body.appendChild(input);
    input.select();

    try {
        const copiedViaFallback = document.execCommand('copy');
        if (!copiedViaFallback) {
            throw new Error('public_create_menu_success_copy_fallback_failed');
        }
    } finally {
        input.remove();
    }
}

export default function CreateMenuSuccessClient() {
    const t = useTranslations('Website');
    const searchParams = useSearchParams();
    const { data: session, update: updateSession } = useSession();
    const defaultBusinessName = t('CreateMenuSuccess.defaultBusinessName');
    const rawMenuUrl = searchParams.get('menuUrl') || '';
    const rawOfficialPageUrl = searchParams.get('officialPageUrl') || '';
    const rawBusinessName = searchParams.get('name') || '';
    const menuUrl = useMemo(() => normalizeCreateMenuSuccessUrl('menuUrl', rawMenuUrl), [rawMenuUrl]);
    const officialPageUrl = useMemo(
        () => normalizeCreateMenuSuccessUrl('officialPageUrl', rawOfficialPageUrl),
        [rawOfficialPageUrl],
    );
    const businessName = useMemo(
        () => normalizeCreateMenuSuccessBusinessName(rawBusinessName, defaultBusinessName),
        [rawBusinessName, defaultBusinessName],
    );
    const hasMenuUrl = Boolean(menuUrl);
    const hasOfficialPageUrl = Boolean(officialPageUrl);

    const [copied, setCopied] = useState(false);
    const [handoffError, setHandoffError] = useState<string | null>(null);
    const recordedSignalsRef = useRef(new Set<StarterActivationSignal>());

    const recordStarterSignal = useCallback((signal: StarterActivationSignal) => {
        if (recordedSignalsRef.current.has(signal)) return;
        let rawClaim: string | null = null;
        try {
            rawClaim = window.sessionStorage.getItem(PUBLIC_CREATE_MENU_LAST_CLAIM_KEY);
            const claim = parsePublicCreateMenuLastClaimHandoff(rawClaim);
            const sessionScope = resolveStorePermissionSessionScope(session);
            if (!claim) {
                if (rawClaim) window.sessionStorage.removeItem(PUBLIC_CREATE_MENU_LAST_CLAIM_KEY);
                return;
            }
            if (
                !sessionScope
                || claim.tenantId !== sessionScope.tenantScope.numericId
                || claim.storeId !== sessionScope.storeScope.numericId
            ) {
                return;
            }
            const storeId = claim.storeId;

            recordedSignalsRef.current.add(signal);
            recordStarterActivationSignal(storeId, signal)
                .then((result) => {
                    assertStarterActivationSignalUpdateSucceeded(result, storeId, signal);
                })
                .catch((error) => {
                    recordedSignalsRef.current.delete(signal);
                    logCreateMenuSuccessFailure(
                        'public_create_menu_success_starter_signal_write_failed',
                        error,
                        getCreateMenuSuccessStarterSignalContext(signal, rawClaim, storeId),
                    );
                });
        } catch (error) {
            logCreateMenuSuccessFailure(
                'public_create_menu_success_starter_signal_claim_read_failed',
                error,
                getCreateMenuSuccessStarterSignalContext(signal, rawClaim),
            );
        }
    }, [session]);

    const handleCopyLink = useCallback(async () => {
        if (!menuUrl) return;

        try {
            await copyCreateMenuSuccessLinkToClipboard(menuUrl);

            setHandoffError(null);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            recordStarterSignal(STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED);
        } catch (error) {
            logCreateMenuSuccessFailure('public_create_menu_success_copy_failed', error, {
                ...getBoundedCreateMenuSuccessStringContext('menuUrl', menuUrl),
                ...getBoundedCreateMenuSuccessStringContext('officialPageUrl', officialPageUrl),
                hasClipboardWrite: hasCreateMenuSuccessClipboardWrite(),
                hasCopyFallback: hasCreateMenuSuccessCopyFallback(),
                hasOfficialPageUrl,
            });
            setHandoffError(t('CreateMenuSuccess.copyFailed'));
        }
    }, [hasOfficialPageUrl, menuUrl, officialPageUrl, recordStarterSignal, t]);

    const handleWhatsAppShare = useCallback(() => {
        if (!menuUrl) return;

        const message = t('CreateMenuSuccess.whatsAppMessage', { menuUrl });
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

        try {
            const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('public_create_menu_success_whatsapp_open_blocked');
            }

            setHandoffError(null);
            recordStarterSignal(STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED);
        } catch (error) {
            logCreateMenuSuccessFailure('public_create_menu_success_whatsapp_open_failed', error, {
                ...getBoundedCreateMenuSuccessStringContext('menuUrl', menuUrl),
                ...getBoundedCreateMenuSuccessStringContext('officialPageUrl', officialPageUrl),
                hasOfficialPageUrl,
                messageLength: message.length,
                whatsappUrlLength: whatsappUrl.length,
            });
            setHandoffError(t('CreateMenuSuccess.whatsAppFailed'));
        }
    }, [hasOfficialPageUrl, menuUrl, officialPageUrl, recordStarterSignal, t]);

    const handleDashboardHandoff = useCallback(async () => {
        try {
            await Promise.race([
                updateSession(),
                new Promise((resolve) => setTimeout(resolve, CREATE_MENU_SUCCESS_SESSION_REFRESH_TIMEOUT_MS)),
            ]);
        } catch (error) {
            logCreateMenuSuccessFailure('public_create_menu_success_session_refresh_failed', error, {
                hasMenuUrl,
                hasOfficialPageUrl,
            });
        } finally {
            window.location.assign('/use-menulist');
        }
    }, [hasMenuUrl, hasOfficialPageUrl, updateSession]);

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
                                {handoffError && (
                                    <p style={{
                                        margin: 0,
                                        color: 'var(--ws-danger, #b91c1c)',
                                        fontSize: '13px',
                                        lineHeight: 1.4,
                                    }}>
                                        {handoffError}
                                    </p>
                                )}
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
                            onClick={(event) => {
                                event.preventDefault();
                                void handleDashboardHandoff();
                            }}
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
