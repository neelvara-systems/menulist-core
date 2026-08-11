'use client';

/**
 * Public Menu Entry — Preview Client Component
 * 
 * Polls extraction status, displays menu preview, and shows CTA to claim.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.2
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuAlertCircle, LuCheck, LuLoader, LuLogIn, LuSend, LuUpload } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '@/components/website/shared/AnimateOnScroll';
import { useWebsitePath } from '@/components/website/shared/WebsiteProductPathProvider';
import { buildWebsiteSignInPath } from '@/lib/website/signInLinks';
import type { ExtractedBusinessProfile } from '@data/shared/extractedBusinessProfile';
import type {
    PublicMenuDraftExtractedData,
    PublicMenuDraftItem,
} from '@data/shared/publicMenuDraftData';
import type { OwnerDetectedDetail } from '@lib/menu-intake-identity/ownerPresentation';
import { getLocaleDirection } from '@lib/localization/config';
import { getLocalizedText } from '@lib/localization/text';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    PUBLIC_CREATE_MENU_LAST_CLAIM_KEY,
    serializePublicCreateMenuLastClaimHandoff,
} from '@lib/publicCreateMenu/lastClaimHandoff';
import {
    normalizePublicCreateMenuPreviewDraft,
} from '@lib/publicCreateMenu/previewDraftResponse';

interface DraftData {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
    extractedData: PublicMenuDraftExtractedData | null;
    detectedBusinessName: string | null;
    detectedBusinessType: string | null;
    detectedBusinessCategory: string | null;
    detectedCurrencyCode?: string | null;
    detectedBrandAccentColor?: string | null;
    detectedImageBackgroundColor?: string | null;
    suggestedProjectName?: string | null;
    extractedBusinessProfile: ExtractedBusinessProfile | null;
    imageUrl: string | null;
    sourceType: string | null;
    error: string | null;
}

interface PreviewClientProps {
    draftId: string;
}

const CREATE_MENU_PREVIEW_RESPONSE_JSON_MAX_BYTES = 4 * 1024 * 1024;
const CREATE_MENU_PREVIEW_CLAIM_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const CREATE_MENU_PREVIEW_POLL_INTERVAL_MS = 5_000;
const CREATE_MENU_PREVIEW_MAX_POLLS = 36;
const CREATE_MENU_SESSION_REFRESH_TIMEOUT_MS = 3_000;

type PreviewResponsePhase = 'status' | 'full' | 'claim';

const isNonEmptyResponseString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const getPreviewResponseByteCap = (phase: PreviewResponsePhase) => (
    phase === 'claim'
        ? CREATE_MENU_PREVIEW_CLAIM_RESPONSE_JSON_MAX_BYTES
        : CREATE_MENU_PREVIEW_RESPONSE_JSON_MAX_BYTES
);

const getPreviewResponseLogContext = (
    draftId: string,
    phase: PreviewResponsePhase,
    response: Response,
) => ({
    ...getBoundedRuntimeStringContext('draftId', draftId),
    maxBytes: getPreviewResponseByteCap(phase),
    phase,
    responseOk: response.ok,
    responseStatus: response.status,
});

async function readPreviewResponseJson(
    response: Response,
    draftId: string,
    phase: PreviewResponsePhase,
): Promise<Record<string, unknown> | null> {
    const maxBytes = getPreviewResponseByteCap(phase);
    const parseFailureCode = phase === 'claim'
        ? 'public_create_menu_preview_claim_response_parse_failed'
        : 'public_create_menu_preview_response_parse_failed';
    const invalidFailureCode = phase === 'claim'
        ? 'public_create_menu_preview_claim_response_invalid'
        : 'public_create_menu_preview_response_invalid';

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, maxBytes);
    } catch (error) {
        logRuntimeFailure(parseFailureCode, error, getPreviewResponseLogContext(draftId, phase, response));
        return null;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logRuntimeFailure(
            invalidFailureCode,
            new Error(invalidFailureCode),
            getPreviewResponseLogContext(draftId, phase, response),
        );
        return null;
    }

    return payload as Record<string, unknown>;
}

function cleanPreviewText(value: unknown): string {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function getSuggestionText(suggestion: unknown): string {
    if (suggestion && typeof suggestion === 'object' && !Array.isArray(suggestion)) {
        return cleanPreviewText((suggestion as Record<string, unknown>).value);
    }
    return cleanPreviewText(suggestion);
}

function addPreviewDetail(
    details: OwnerDetectedDetail[],
    key: string,
    label: string,
    value: unknown,
    color?: string | null,
) {
    const normalized = cleanPreviewText(value);
    if (!normalized) return;
    details.push({
        key,
        label,
        value: normalized,
        ...(color ? { color } : {}),
    });
}

function buildPreviewFailureDraft(status: DraftData['status'], error: string): DraftData {
    return {
        status,
        extractedData: null,
        detectedBusinessName: null,
        detectedBusinessType: null,
        detectedBusinessCategory: null,
        imageUrl: null,
        sourceType: null,
        extractedBusinessProfile: null,
        error,
    };
}

function buildPublicPreviewDetectedDetails(
    draft: DraftData | null,
    t: ReturnType<typeof useTranslations>,
): OwnerDetectedDetail[] {
    const profile = draft?.extractedBusinessProfile;
    const details: OwnerDetectedDetail[] = [];
    addPreviewDetail(details, 'projectName', t('CreateMenu.previewDetailMenuName'), getSuggestionText(profile?.project?.projectName) || draft?.suggestedProjectName);
    addPreviewDetail(details, 'phoneNumber', t('CreateMenu.previewDetailPhone'), getSuggestionText(profile?.identity?.phoneNumber));
    addPreviewDetail(details, 'addressLine', t('CreateMenu.previewDetailAddress'), getSuggestionText(profile?.identity?.addressLine));
    addPreviewDetail(details, 'currencyCode', t('CreateMenu.previewDetailCurrency'), getSuggestionText(profile?.identity?.currencyCode) || draft?.detectedCurrencyCode);
    const brandColor = getSuggestionText(profile?.visualBrand?.brandAccentColor) || draft?.detectedBrandAccentColor || '';
    const imageBackground = getSuggestionText(profile?.visualBrand?.imageBackgroundColor) || draft?.detectedImageBackgroundColor || '';
    addPreviewDetail(details, 'brandAccentColor', t('CreateMenu.previewDetailBrandColor'), brandColor, brandColor);
    addPreviewDetail(details, 'imageBackgroundColor', t('CreateMenu.previewDetailImageBackground'), imageBackground, imageBackground);
    return details;
}

function normalizePreviewTag(tag: unknown): string {
    if (typeof tag !== 'string') return '';
    return tag.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
}

function formatPreviewTag(tag: string, t: ReturnType<typeof useTranslations>): string {
    switch (tag) {
        case 'non-vegetarian':
        case 'non-veg':
        case 'nonveg':
            return t('CreateMenu.previewTagNonVeg');
        case 'gluten-free':
        case 'glutenfree':
            return t('CreateMenu.previewTagGlutenFree');
        case 'dairy-free':
        case 'dairyfree':
            return t('CreateMenu.previewTagDairyFree');
        case 'keto':
            return t('CreateMenu.previewTagKeto');
        case 'vegetarian':
            return t('CreateMenu.previewTagVegetarian');
        case 'vegan':
            return t('CreateMenu.previewTagVegan');
        case 'halal':
            return t('CreateMenu.previewTagHalal');
        case 'kosher':
            return t('CreateMenu.previewTagKosher');
        case 'organic':
            return t('CreateMenu.previewTagOrganic');
        default:
            return tag
                .split('-')
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
    }
}

function getPreviewItemTags(item: PublicMenuDraftItem): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    [...(item.dietaryTags || []), ...(item.tags || [])].forEach((rawTag) => {
        const tag = normalizePreviewTag(rawTag);
        if (!tag) return;
        const canonical = ['non-veg', 'nonveg'].includes(tag) ? 'non-vegetarian' : tag;
        if (seen.has(canonical)) return;
        seen.add(canonical);
        output.push(canonical);
    });
    return output;
}

export default function PreviewClient({ draftId }: PreviewClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('Website');
    const isClaimMode = searchParams?.get('claim') === 'true';
    const { data: session, status: sessionStatus, update: updateSession } = useSession();
    const createMenuPath = useWebsitePath('/create-menu');
    const createMenuSuccessPath = useWebsitePath('/create-menu/success');
    const previewCallbackUrl = useWebsitePath(`/create-menu/preview/${draftId}${isClaimMode ? '?claim=true' : ''}`);
    const previewClaimPath = useWebsitePath(`/create-menu/preview/${draftId}?claim=true`);
    const signInUrl = buildWebsiteSignInPath(previewCallbackUrl);

    const [draft, setDraft] = useState<DraftData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pollCount, setPollCount] = useState(0);
    const [pollCycle, setPollCycle] = useState(0);
    const [pollTimedOut, setPollTimedOut] = useState(false);
    const hasExistingAccount = Boolean(session?.user?.tenantId && session?.user?.storeId);

    // Claim form state
    const [businessName, setBusinessName] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const claimInFlightRef = useRef(false);

    const handlePreviewDraftResponseStatus = useCallback((res: Response, signal: AbortSignal) => {
        if (signal.aborted) return 'cancelled';
        if (res.status === 401) {
            window.location.replace(signInUrl);
            return 'auth_required';
        }

        if (res.status === 410) {
            setDraft(buildPreviewFailureDraft('expired', t('CreateMenu.previewErrorExpired')));
            setLoading(false);
            return 'expired';
        }

        if (res.status === 404) {
            setDraft(buildPreviewFailureDraft('expired', t('CreateMenu.previewErrorNotFound')));
            setLoading(false);
            return 'not_found';
        }

        if (!res.ok) {
            setDraft(buildPreviewFailureDraft('failed', t('CreateMenu.previewErrorLoadFailed')));
            setLoading(false);
            return 'error';
        }

        return null;
    }, [signInUrl, t]);

    const fetchDraft = useCallback(async (signal: AbortSignal, statusOnly = true) => {
        if (sessionStatus !== 'authenticated') {
            return 'waiting_for_auth';
        }

        try {
            const requestDraft = async (statusOnlyRequest: boolean) => {
                const params = new URLSearchParams({ draftId });
                if (statusOnlyRequest) params.set('statusOnly', '1');
                return fetch(`/api/public/create-menu?${params.toString()}`, {
                    cache: 'no-store',
                    credentials: 'same-origin',
                    redirect: 'manual',
                    signal,
                });
            };

            let res = await requestDraft(statusOnly);

            const previewFailure = handlePreviewDraftResponseStatus(res, signal);
            if (previewFailure) return previewFailure;

            let payload = await readPreviewResponseJson(
                res,
                draftId,
                statusOnly ? 'status' : 'full',
            );
            let data = normalizePublicCreateMenuPreviewDraft(payload);
            if (!data) {
                logRuntimeFailure('public_create_menu_preview_response_invalid', new Error('public_create_menu_preview_status_invalid'), {
                    ...getPreviewResponseLogContext(draftId, statusOnly ? 'status' : 'full', res),
                    hasValidStatus: false,
                });
                setDraft(buildPreviewFailureDraft('failed', t('CreateMenu.previewErrorLoadFailed')));
                setLoading(false);
                return 'error';
            }
            if (data.status === 'completed' && !data.extractedData && statusOnly) {
                res = await requestDraft(false);
                const fullPreviewFailure = handlePreviewDraftResponseStatus(res, signal);
                if (fullPreviewFailure) return fullPreviewFailure;

                payload = await readPreviewResponseJson(res, draftId, 'full');
                data = normalizePublicCreateMenuPreviewDraft(payload);
                if (!data || (data.status === 'completed' && !data.extractedData)) {
                    logRuntimeFailure('public_create_menu_preview_response_invalid', new Error('public_create_menu_preview_status_invalid'), {
                        ...getPreviewResponseLogContext(draftId, 'full', res),
                        hasValidStatus: Boolean(data),
                        completedDataPresent: Boolean(data?.extractedData),
                    });
                    setDraft(buildPreviewFailureDraft('failed', t('CreateMenu.previewErrorLoadFailed')));
                    setLoading(false);
                    return 'error';
                }
            }
            if (signal.aborted) return 'cancelled';
            const nextStatus = data.status;
            setDraft((previous) => ({
                ...previous,
                ...data,
                status: nextStatus,
                extractedData: data.extractedData ?? previous?.extractedData ?? null,
            }));
            setLoading(false);
            return nextStatus;
        } catch (error) {
            if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
                return 'cancelled';
            }
            setDraft(buildPreviewFailureDraft('failed', t('CreateMenu.previewErrorConnection')));
            setLoading(false);
            return 'error';
        }
    }, [draftId, handlePreviewDraftResponseStatus, sessionStatus, t]);

    // Poll for extraction completion
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            window.location.replace(signInUrl);
            return;
        }

        if (sessionStatus !== 'authenticated') return;

        let timer: ReturnType<typeof setTimeout> | undefined;
        let active = true;
        let attempts = 0;
        const controller = new AbortController();
        setPollTimedOut(false);

        const poll = async () => {
            if (!active) return;
            if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS) {
                setPollTimedOut(true);
                return;
            }
            attempts += 1;
            setPollCount(attempts);
            const status = await fetchDraft(controller.signal);
            if (!active || (status !== 'pending' && status !== 'processing')) return;
            if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS) {
                setPollTimedOut(true);
                return;
            }
            timer = setTimeout(poll, CREATE_MENU_PREVIEW_POLL_INTERVAL_MS);
        };

        poll();

        return () => {
            active = false;
            controller.abort();
            if (timer) clearTimeout(timer);
        };
    }, [fetchDraft, pollCycle, router, sessionStatus, signInUrl]);

    const handleSignUp = () => {
        if (sessionStatus === 'authenticated') {
            router.push(previewClaimPath);
            return;
        }

        window.location.assign(buildWebsiteSignInPath(previewClaimPath));
    };

    const handleClaim = async () => {
        if (claimInFlightRef.current) return;
        if (!businessName.trim() || businessName.trim().length < 2) {
            setClaimError(t('CreateMenu.previewClaimBusinessNameRequired'));
            return;
        }
        if (!hasExistingAccount && (!city.trim() || city.trim().length < 2)) {
            setClaimError(t('CreateMenu.previewClaimCityRequired'));
            return;
        }
        claimInFlightRef.current = true;
        setClaiming(true);
        setClaimError(null);

        try {
            const res = await fetch('/api/public/create-menu/claim', {
                body: JSON.stringify({
                    draftId,
                    businessName: businessName.trim(),
                    businessType: draft?.detectedBusinessType || undefined,
                    businessCategory: draft?.detectedBusinessCategory || undefined,
                    city: hasExistingAccount ? undefined : city.trim(),
                    phone: phone.trim() || undefined,
                    addressLine: addressLine.trim() || undefined,
                }),
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                redirect: 'manual',
            });

            if (!res.ok) {
                setClaimError(t('CreateMenu.previewClaimFailed'));
                return;
            }

            const data = await readPreviewResponseJson(res, draftId, 'claim');
            if (
                data?.success !== true
                || !isNonEmptyResponseString(data.menuUrl)
                || !isNonEmptyResponseString(data.officialPageUrl)
                || !isNonEmptyResponseString(data.subdomain)
            ) {
                logRuntimeFailure('public_create_menu_preview_claim_response_invalid', new Error('public_create_menu_preview_claim_ack_invalid'), {
                    ...getPreviewResponseLogContext(draftId, 'claim', res),
                    hasMenuUrl: isNonEmptyResponseString(data?.menuUrl),
                    hasOfficialPageUrl: isNonEmptyResponseString(data?.officialPageUrl),
                    hasSubdomain: isNonEmptyResponseString(data?.subdomain),
                    success: data?.success === true,
                });
                setClaimError(t('CreateMenu.previewClaimFailed'));
                return;
            }
            if (typeof window !== 'undefined') {
                try {
                    const serializedHandoff = data.isNewAccount === true
                        ? serializePublicCreateMenuLastClaimHandoff({
                            projectId: data.projectId,
                            storeId: data.storeId,
                            subdomain: data.subdomain,
                            tenantId: data.tenantId,
                        })
                        : null;
                    if (data.isNewAccount === true && !serializedHandoff) {
                        throw new Error('public_create_menu_claim_handoff_invalid');
                    }
                    if (serializedHandoff) {
                        window.sessionStorage.setItem(PUBLIC_CREATE_MENU_LAST_CLAIM_KEY, serializedHandoff);
                    } else {
                        window.sessionStorage.removeItem(PUBLIC_CREATE_MENU_LAST_CLAIM_KEY);
                    }
                } catch (error) {
                    logRuntimeFailure('public_create_menu_claim_handoff_storage_failed', error, {
                        ...getBoundedRuntimeStringContext('draftId', draftId),
                        isNewAccount: data.isNewAccount === true,
                    });
                }
            }
            let refreshTimer: ReturnType<typeof setTimeout> | null = null;
            try {
                await Promise.race([
                    updateSession(),
                    new Promise((resolve) => {
                        refreshTimer = setTimeout(resolve, CREATE_MENU_SESSION_REFRESH_TIMEOUT_MS);
                    }),
                ]);
            } catch (error) {
                // Non-blocking: the next authenticated page can refresh session state again.
                logRuntimeFailure('public_create_menu_claim_session_refresh_failed', error, {
                    ...getBoundedRuntimeStringContext('draftId', draftId),
                    isNewAccount: data.isNewAccount === true,
                });
            } finally {
                if (refreshTimer !== null) clearTimeout(refreshTimer);
            }
            const params = new URLSearchParams({
                menuUrl: data.menuUrl,
                officialPageUrl: data.officialPageUrl,
                subdomain: data.subdomain,
                name: businessName.trim(),
            });
            router.push(`${createMenuSuccessPath}?${params.toString()}`);
        } catch {
            setClaimError(t('CreateMenu.genericError'));
        } finally {
            setClaiming(false);
            claimInFlightRef.current = false;
        }
    };

    // Pre-fill business name from AI detection
    useEffect(() => {
        const profileBusinessName = getSuggestionText(draft?.extractedBusinessProfile?.identity?.businessName);
        const detectedName = draft?.detectedBusinessName || profileBusinessName;
        if (detectedName && !businessName) {
            setBusinessName(detectedName);
        }
    }, [businessName, draft?.detectedBusinessName, draft?.extractedBusinessProfile]);

    useEffect(() => {
        const profileIdentity = draft?.extractedBusinessProfile?.identity;
        const detectedPhone = profileIdentity?.phoneNumber?.value;
        const detectedAddress = profileIdentity?.addressLine?.value;
        if (detectedPhone && !phone) {
            setPhone(String(detectedPhone));
        }
        if (detectedAddress && !addressLine) {
            setAddressLine(String(detectedAddress));
        }
    }, [addressLine, draft?.extractedBusinessProfile, phone]);

    // Loading state
    if (loading) {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuLoader aria-hidden="true" size={40} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)', marginTop: '16px' }}>{t('CreateMenu.previewLoading')}</p>
                    <style>{spinCSS}</style>
                </div>
            </AnimateOnScroll>
        );
    }

    if ((draft?.status === 'pending' || draft?.status === 'processing') && pollTimedOut) {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuAlertCircle aria-hidden="true" size={48} color="var(--ws-warning)" />
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '16px', maxWidth: '360px', textAlign: 'center' }}>
                        {t('CreateMenu.previewErrorConnection')}
                    </p>
                    <button
                        onClick={() => {
                            setPollCount(0);
                            setPollTimedOut(false);
                            setPollCycle((cycle) => cycle + 1);
                        }}
                        style={primaryBtnStyle}
                        type="button"
                    >
                        {t('CreateMenu.tryAgain')}
                    </button>
                </div>
            </AnimateOnScroll>
        );
    }

    // Processing state
    if (draft?.status === 'pending' || draft?.status === 'processing') {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuLoader aria-hidden="true" size={48} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '20px' }}>
                        {t('CreateMenu.previewReadingTitle')}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--ws-text-secondary)', marginTop: '8px' }}>
                        {t('CreateMenu.previewReadingSubtitle')}
                    </p>
                    <div style={{
                        width: '200px',
                        height: '4px',
                        backgroundColor: 'var(--ws-border-default)',
                        borderRadius: '2px',
                        marginTop: '20px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${Math.min(pollCount * 7, 90)}%`,
                            height: '100%',
                            backgroundColor: 'var(--ws-brand-secondary)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <style>{spinCSS}</style>
                </div>
            </AnimateOnScroll>
        );
    }

    // Expired state
    if (draft?.status === 'expired') {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuAlertCircle aria-hidden="true" size={48} color="var(--ws-warning)" />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                        {t('CreateMenu.previewExpiredTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                        {t('CreateMenu.previewExpiredBody')}
                    </p>
                    <button onClick={() => router.push(createMenuPath)} style={primaryBtnStyle} type="button">
                        <LuUpload aria-hidden="true" size={16} /> {t('CreateMenu.previewUploadCta')}
                    </button>
                </div>
            </AnimateOnScroll>
        );
    }

    // Failed state
    if (draft?.status === 'failed') {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuAlertCircle aria-hidden="true" size={48} color="var(--ws-error)" />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                        {t('CreateMenu.previewFailedTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                        {t('CreateMenu.previewFailedFallback')}
                    </p>
                    <button onClick={() => router.push(createMenuPath)} style={primaryBtnStyle} type="button">
                        <LuUpload aria-hidden="true" size={16} /> {t('CreateMenu.tryAgain')}
                    </button>
                </div>
            </AnimateOnScroll>
        );
    }

    // Success state — show menu preview
    const { extractedData, detectedBusinessName, detectedBusinessType } = draft || {};
    const categories = extractedData?.categories || [];
    const items = extractedData?.items || [];
    const detectedDetails = buildPublicPreviewDetectedDetails(draft, t);
    const menuLanguage = extractedData?.languages?.find((language) => language.isPrimary)?.code
        || extractedData?.languages?.[0]?.code
        || 'en';
    const menuDirection = getLocaleDirection(menuLanguage);

    return (
        <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '24px 20px 100px',
        }}>
            {/* Success header */}
            <AnimateOnScroll>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'var(--ws-bg-success-soft)',
                        color: 'var(--ws-success)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '16px',
                    }}>
                        <LuCheck aria-hidden="true" size={16} /> {t('CreateMenu.previewReadyForReview')}
                    </div>
                    <h1 dir="auto" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>
                        {detectedBusinessName || t('CreateMenu.previewDefaultMenuSource')}
                    </h1>
                    {detectedBusinessType && (
                        <p dir="auto" style={{ fontSize: '14px', color: 'var(--ws-text-secondary)' }}>{detectedBusinessType}</p>
                    )}
                    {detectedDetails.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            justifyContent: 'center',
                            marginTop: '14px',
                        }}>
                            {detectedDetails.map((detail) => (
                                <span
                                    key={detail.key}
                                    style={{
                                        alignItems: 'center',
                                        backgroundColor: 'var(--ws-bg-subtle)',
                                        border: '1px solid var(--ws-border-default)',
                                        borderRadius: '999px',
                                        color: 'var(--ws-text-secondary)',
                                        display: 'inline-flex',
                                        fontSize: '12px',
                                        gap: '6px',
                                        maxWidth: '100%',
                                        padding: '6px 10px',
                                    }}
                                >
                                    {detail.color ? (
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                background: detail.color,
                                                border: '1px solid rgba(0,0,0,0.12)',
                                                borderRadius: '999px',
                                                display: 'inline-block',
                                                flex: '0 0 auto',
                                                height: '10px',
                                                width: '10px',
                                            }}
                                        />
                                    ) : null}
                                    <span style={{ overflowWrap: 'anywhere' }}>
                                        {detail.label}: <bdi>{detail.value}</bdi>
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </AnimateOnScroll>

            {/* Menu preview */}
            <AnimateOnScroll delay={0.1}>
                <div style={{
                    backgroundColor: 'var(--ws-bg-primary)',
                    borderRadius: 'var(--ws-radius-xl)',
                    border: '1px solid var(--ws-border-default)',
                    overflow: 'hidden',
                    marginBottom: '24px',
                    textAlign: 'start',
                }} dir={menuDirection} lang={menuLanguage}>
                    {categories.map((cat, categoryIndex) => {
                        const catItems = items.filter(item => item.category === cat.id);
                        if (catItems.length === 0) return null;

                        return (
                            <AnimateStaggerChild key={cat.id} index={categoryIndex}>
                                <div>
                                    {/* Category header */}
                                    <div style={{
                                        backgroundColor: 'var(--ws-bg-subtle)',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--ws-border-default)',
                                    }}>
                                        <h3 dir="auto" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>
                                            {getLocalizedText(cat.name, menuLanguage, menuLanguage, cat.id)}
                                        </h3>
                                    </div>

                                    {/* Items */}
                                    {catItems.map((item, idx) => {
                                        const itemTags = getPreviewItemTags(item);
                                        const itemName = getLocalizedText(item.name, menuLanguage, menuLanguage, item.id);
                                        const itemDescription = getLocalizedText(item.description, menuLanguage, menuLanguage);
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: idx < catItems.length - 1 ? '1px solid var(--ws-border-subtle)' : undefined,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '12px',
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <p dir="auto" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ws-text-primary)', margin: 0 }}>
                                                        {itemName}
                                                    </p>
                                                    {itemDescription && (
                                                        <p dir="auto" style={{ fontSize: '12px', color: 'var(--ws-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                                                            {itemDescription}
                                                        </p>
                                                    )}
                                                    {itemTags.length > 0 && (
                                                        <div style={{ marginTop: '5px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {itemTags.map((tag) => (
                                                                <span dir="auto" key={tag} style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--ws-text-secondary)',
                                                                    backgroundColor: 'var(--ws-bg-subtle)',
                                                                    border: '1px solid var(--ws-border-subtle)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '999px',
                                                                }}>
                                                                    {formatPreviewTag(tag, t)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Attributes/variants */}
                                                    {item.attributes && item.attributes.length > 0 && (
                                                        <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {item.attributes.map((attr) => (
                                                                <span dir="auto" key={attr.id} style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--ws-text-secondary)',
                                                                    backgroundColor: 'var(--ws-border-subtle)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                }}>
                                                                    {getLocalizedText(attr.name, menuLanguage, menuLanguage, attr.id)}
                                                                    {attr.price ? <> — <bdi>{attr.price}</bdi></> : null}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {item.price && (
                                                    <span style={{
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: 'var(--ws-text-primary)',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        <bdi>{item.price}</bdi>
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </AnimateStaggerChild>
                        );
                    })}

                    {/* Empty state */}
                    {categories.length === 0 && items.length > 0 && (
                        <div style={{ padding: '16px' }}>
                            {items.map((item) => {
                                const itemTags = getPreviewItemTags(item);
                                const itemName = getLocalizedText(item.name, menuLanguage, menuLanguage, item.id);
                                return (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--ws-border-subtle)',
                                        gap: '12px',
                                    }}>
                                        <span dir="auto" style={{ fontSize: '14px', color: 'var(--ws-text-primary)' }}>
                                            {itemName}
                                            {itemTags.length > 0 && (
                                                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
                                                    {itemTags.map((tag) => (
                                                        <span dir="auto" key={tag} style={{
                                                            fontSize: '11px',
                                                            color: 'var(--ws-text-secondary)',
                                                            backgroundColor: 'var(--ws-bg-subtle)',
                                                            border: '1px solid var(--ws-border-subtle)',
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                        }}>
                                                            {formatPreviewTag(tag, t)}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </span>
                                        {item.price && (
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-text-primary)' }}><bdi>{item.price}</bdi></span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {categories.length === 0 && items.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--ws-text-muted)', fontSize: '14px' }}>{t('CreateMenu.previewNoItems')}</p>
                        </div>
                    )}
                </div>
            </AnimateOnScroll>

            {/* Stats */}
            <AnimateOnScroll delay={0.15}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                }}>
                    <div style={statBoxStyle}>
                        <span style={statNumberStyle}>{categories.length}</span>
                        <span style={statLabelStyle}>{t('CreateMenu.previewStatsCategories')}</span>
                    </div>
                    <div style={statBoxStyle}>
                        <span style={statNumberStyle}>{items.length}</span>
                        <span style={statLabelStyle}>{t('CreateMenu.previewStatsItems')}</span>
                    </div>
                </div>
            </AnimateOnScroll>

            {/* Setup CTA — switches between sign-up and claim form */}
            <AnimateOnScroll delay={0.2}>
                <div style={{
                    width: '100%',
                    maxWidth: '560px',
                    backgroundColor: 'var(--ws-bg-primary)',
                    border: '1px solid var(--ws-border-default)',
                    borderRadius: 'var(--ws-radius-xl)',
                    boxShadow: 'var(--ws-shadow-sm)',
                    padding: '16px',
                    marginBottom: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                }}>
                {(isClaimMode || sessionStatus === 'authenticated') ? (
                    /* Claim mode — user is authenticated, show publish form */
                    <div style={{ width: '100%', maxWidth: '520px' }}>
                        <AnimateStaggerChild index={0}>
                            <input
                                dir="auto"
                                type="text"
                                value={businessName}
                                onChange={(e) => { setBusinessName(e.target.value); setClaimError(null); }}
                                placeholder={t('CreateMenu.previewBusinessNamePlaceholder')}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    border: `1px solid ${claimError ? 'var(--ws-error)' : 'var(--ws-border-default)'}`,
                                    borderRadius: 'var(--ws-radius-xl)',
                                    marginBottom: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </AnimateStaggerChild>
                        {!hasExistingAccount ? <AnimateStaggerChild index={1}>
                            <input
                                dir="auto"
                                type="text"
                                value={city}
                                onChange={(e) => { setCity(e.target.value); setClaimError(null); }}
                                placeholder={t('CreateMenu.previewCityPlaceholder')}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    border: `1px solid ${claimError ? 'var(--ws-error)' : 'var(--ws-border-default)'}`,
                                    borderRadius: 'var(--ws-radius-xl)',
                                    marginBottom: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </AnimateStaggerChild> : null}
                        <AnimateStaggerChild index={2}>
                            <input
                                dir="ltr"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setClaimError(null); }}
                                placeholder={t('CreateMenu.previewPhonePlaceholder')}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    border: '1px solid var(--ws-border-default)',
                                    borderRadius: 'var(--ws-radius-xl)',
                                    marginBottom: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </AnimateStaggerChild>
                        <AnimateStaggerChild index={3}>
                            <input
                                dir="auto"
                                type="text"
                                value={addressLine}
                                onChange={(e) => { setAddressLine(e.target.value); setClaimError(null); }}
                                placeholder={t('CreateMenu.previewAddressPlaceholder')}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    border: '1px solid var(--ws-border-default)',
                                    borderRadius: 'var(--ws-radius-xl)',
                                    marginBottom: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </AnimateStaggerChild>
                        {claimError && (
                            <p style={{ fontSize: '13px', color: 'var(--ws-error)', margin: '0 0 8px', textAlign: 'center' }}>{claimError}</p>
                        )}
                        <AnimateStaggerChild index={4}>
                            <button
                                onClick={handleClaim}
                                disabled={claiming}
                                style={{
                                    ...primaryBtnStyle,
                                    width: '100%',
                                    marginTop: 0,
                                    opacity: claiming ? 0.7 : 1,
                                    cursor: claiming ? 'default' : 'pointer',
                                }}
                                type="button"
                            >
                                {claiming
                                    ? <><LuLoader aria-hidden="true" size={18} style={{ animation: 'spin 1s linear infinite' }} /> {t('CreateMenu.previewClaiming')}</>
                                    : <><LuSend aria-hidden="true" size={18} /> {t('CreateMenu.previewClaimCta')}</>}
                            </button>
                        </AnimateStaggerChild>
                    </div>
                ) : (
                    /* Pre-auth mode — show sign-up CTA */
                    <>
                        <button onClick={handleSignUp} style={{
                            ...primaryBtnStyle,
                            width: '100%',
                            maxWidth: '520px',
                            marginTop: 0,
                        }} type="button">
                            <LuLogIn aria-hidden="true" size={18} /> {t('CreateMenu.previewSignupCta')}
                        </button>
                        <p style={{ fontSize: '12px', color: 'var(--ws-text-muted)', margin: 0 }}>
                            {t('CreateMenu.previewSignupCaption')}
                        </p>
                    </>
                )}
                </div>
            </AnimateOnScroll>

            <style>{spinCSS}</style>
        </div>
    );
}

// Shared styles
const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '40px 20px',
};

const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 28px',
    backgroundColor: 'var(--ws-cta-default)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--ws-radius-xl)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
};

const statBoxStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'var(--ws-bg-subtle)',
    borderRadius: 'var(--ws-radius-xl)',
    padding: '14px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
};

const statNumberStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--ws-text-primary)',
};

const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--ws-text-secondary)',
};

const spinCSS = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
