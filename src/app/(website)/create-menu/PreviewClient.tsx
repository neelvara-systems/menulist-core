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
import { useCallback, useEffect, useState } from 'react';
import { LuAlertCircle, LuCheck, LuLoader, LuLogIn, LuSend, LuUpload } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '@/components/website/shared/AnimateOnScroll';
import type { OwnerDetectedDetail } from '@lib/menu-intake-identity/ownerPresentation';

interface ExtractedCategory {
    id: string;
    name: Record<string, string>;
}

interface ExtractedItem {
    id: string;
    category: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    price?: string;
    attributes?: Array<{ id: string; name: Record<string, string>; price?: string }>;
    tags?: string[];
    dietaryTags?: string[];
}

interface DraftData {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
    extractedData: {
        categories: ExtractedCategory[];
        items: ExtractedItem[];
        languages: Array<string | { code: string; name?: string; isPrimary?: boolean }>;
    } | null;
    detectedBusinessName: string | null;
    detectedBusinessType: string | null;
    detectedBusinessCategory: string | null;
    detectedCurrencyCode?: string | null;
    detectedBrandAccentColor?: string | null;
    detectedImageBackgroundColor?: string | null;
    suggestedProjectName?: string | null;
    extractedBusinessProfile?: any;
    imageUrl: string | null;
    sourceType?: string;
    error: string | null;
}

interface PreviewClientProps {
    draftId: string;
}

function cleanPreviewText(value: unknown): string {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function getSuggestionText(suggestion: any): string {
    return cleanPreviewText(suggestion?.value ?? suggestion);
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

function getPreviewItemTags(item: ExtractedItem): string[] {
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
    const isClaimMode = searchParams.get('claim') === 'true';
    const { status: sessionStatus, update: updateSession } = useSession();
    const previewCallbackUrl = `/create-menu/preview/${draftId}${isClaimMode ? '?claim=true' : ''}`;
    const signInUrl = `/signin?callbackUrl=${encodeURIComponent(previewCallbackUrl)}`;

    const [draft, setDraft] = useState<DraftData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pollCount, setPollCount] = useState(0);

    // Claim form state
    const [businessName, setBusinessName] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);

    const fetchDraft = useCallback(async () => {
        if (sessionStatus !== 'authenticated') {
            return 'waiting_for_auth';
        }

        try {
            const res = await fetch(`/api/public/create-menu?draftId=${draftId}`);

            if (res.status === 401) {
                router.replace(signInUrl);
                return 'auth_required';
            }

            if (res.status === 410) {
                setDraft({ status: 'expired', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, detectedBusinessCategory: null, imageUrl: null, sourceType: undefined, error: t('CreateMenu.previewErrorExpired') });
                setLoading(false);
                return 'expired';
            }

            if (res.status === 404) {
                setDraft({ status: 'expired', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, detectedBusinessCategory: null, imageUrl: null, sourceType: undefined, error: t('CreateMenu.previewErrorNotFound') });
                setLoading(false);
                return 'not_found';
            }

            if (!res.ok) {
                setDraft({ status: 'failed', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, detectedBusinessCategory: null, imageUrl: null, sourceType: undefined, error: t('CreateMenu.previewErrorLoadFailed') });
                setLoading(false);
                return 'error';
            }

            const data = await res.json();
            setDraft(data);
            setLoading(false);
            return data.status;
        } catch {
            setDraft({ status: 'failed', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, detectedBusinessCategory: null, imageUrl: null, sourceType: undefined, error: t('CreateMenu.previewErrorConnection') });
            setLoading(false);
            return 'error';
        }
    }, [draftId, router, sessionStatus, signInUrl, t]);

    // Poll for extraction completion
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.replace(signInUrl);
            return;
        }

        if (sessionStatus !== 'authenticated') return;

        let timer: NodeJS.Timeout;
        let active = true;

        const poll = async () => {
            const status = await fetchDraft();
            if (active && (status === 'pending' || status === 'processing') && pollCount < 30) {
                timer = setTimeout(() => {
                    setPollCount(prev => prev + 1);
                    poll();
                }, 2000); // Poll every 2 seconds
            }
        };

        poll();

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [fetchDraft, pollCount, router, sessionStatus, signInUrl]);

    const handleSignUp = () => {
        if (sessionStatus === 'authenticated') {
            router.push(`/create-menu/preview/${draftId}?claim=true`);
            return;
        }

        const callbackUrl = encodeURIComponent(`/create-menu/preview/${draftId}?claim=true`);
        router.push(`/signin?callbackUrl=${callbackUrl}`);
    };

    const handleClaim = async () => {
        if (!businessName.trim() || businessName.trim().length < 2) {
            setClaimError(t('CreateMenu.previewClaimBusinessNameRequired'));
            return;
        }
        if (!city.trim() || city.trim().length < 2) {
            setClaimError(t('CreateMenu.previewClaimCityRequired'));
            return;
        }
        setClaiming(true);
        setClaimError(null);

        try {
            const res = await fetch('/api/public/create-menu/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftId,
                    businessName: businessName.trim(),
                    businessType: draft?.detectedBusinessType || undefined,
                    businessCategory: draft?.detectedBusinessCategory || undefined,
                    city: city.trim(),
                    phone: phone.trim() || undefined,
                    addressLine: addressLine.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setClaimError(data.error || t('CreateMenu.previewClaimFailed'));
                setClaiming(false);
                return;
            }

            const data = await res.json();
            if (typeof window !== 'undefined') {
                if (data.storeId && data.isNewAccount) {
                    window.sessionStorage.setItem('menulist:create-menu:last-claim', JSON.stringify({
                        projectId: data.projectId,
                        storeId: data.storeId,
                        subdomain: data.subdomain,
                    }));
                } else {
                    window.sessionStorage.removeItem('menulist:create-menu:last-claim');
                }
            }
            try {
                await updateSession();
            } catch {
                // Non-blocking: the next authenticated page can refresh session state again.
            }
            const params = new URLSearchParams({
                menuUrl: data.menuUrl || '',
                officialPageUrl: data.officialPageUrl || '',
                subdomain: data.subdomain || '',
                name: businessName.trim(),
            });
            router.push(`/create-menu/success?${params.toString()}`);
        } catch {
            setClaimError(t('CreateMenu.genericError'));
            setClaiming(false);
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
                    <LuLoader size={40} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)', marginTop: '16px' }}>{t('CreateMenu.previewLoading')}</p>
                    <style>{spinCSS}</style>
                </div>
            </AnimateOnScroll>
        );
    }

    // Processing state
    if (draft?.status === 'pending' || draft?.status === 'processing') {
        return (
            <AnimateOnScroll>
                <div style={containerStyle}>
                    <LuLoader size={48} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
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
                    <LuAlertCircle size={48} color="var(--ws-warning)" />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                        {t('CreateMenu.previewExpiredTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                        {t('CreateMenu.previewExpiredBody')}
                    </p>
                    <button onClick={() => router.push('/create-menu')} style={primaryBtnStyle}>
                        <LuUpload size={16} /> {t('CreateMenu.previewUploadCta')}
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
                    <LuAlertCircle size={48} color="var(--ws-error)" />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                        {t('CreateMenu.previewFailedTitle')}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                        {draft.error || t('CreateMenu.previewFailedFallback')}
                    </p>
                    <button onClick={() => router.push('/create-menu')} style={primaryBtnStyle}>
                        <LuUpload size={16} /> {t('CreateMenu.tryAgain')}
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
    const firstLanguage = extractedData?.languages?.[0];
    const lang = typeof firstLanguage === 'string'
        ? firstLanguage
        : firstLanguage?.code || 'en';

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
                        <LuCheck size={16} /> {t('CreateMenu.previewReadyForReview')}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>
                        {detectedBusinessName || t('CreateMenu.previewDefaultMenuSource')}
                    </h1>
                    {detectedBusinessType && (
                        <p style={{ fontSize: '14px', color: 'var(--ws-text-secondary)' }}>{detectedBusinessType}</p>
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
                                        {detail.label}: {detail.value}
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
                }}>
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
                                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>
                                            {cat.name?.[lang] || cat.name?.en || cat.id}
                                        </h3>
                                    </div>

                                    {/* Items */}
                                    {catItems.map((item, idx) => {
                                        const itemTags = getPreviewItemTags(item);
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
                                                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ws-text-primary)', margin: 0 }}>
                                                        {item.name?.[lang] || item.name?.en || item.id}
                                                    </p>
                                                    {item.description?.[lang] && (
                                                        <p style={{ fontSize: '12px', color: 'var(--ws-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                                                            {item.description[lang]}
                                                        </p>
                                                    )}
                                                    {itemTags.length > 0 && (
                                                        <div style={{ marginTop: '5px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {itemTags.map((tag) => (
                                                                <span key={tag} style={{
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
                                                                <span key={attr.id} style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--ws-text-secondary)',
                                                                    backgroundColor: 'var(--ws-border-subtle)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                }}>
                                                                    {attr.name?.[lang] || attr.name?.en || attr.id}
                                                                    {attr.price ? ` — ${attr.price}` : ''}
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
                                                        {item.price}
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
                                return (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--ws-border-subtle)',
                                        gap: '12px',
                                    }}>
                                        <span style={{ fontSize: '14px', color: 'var(--ws-text-primary)' }}>
                                            {item.name?.[lang] || item.name?.en || item.id}
                                            {itemTags.length > 0 && (
                                                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
                                                    {itemTags.map((tag) => (
                                                        <span key={tag} style={{
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
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.price}</span>
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
                        <AnimateStaggerChild index={1}>
                            <input
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
                        </AnimateStaggerChild>
                        <AnimateStaggerChild index={2}>
                            <input
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
                            >
                                {claiming
                                    ? <><LuLoader size={18} style={{ animation: 'spin 1s linear infinite' }} /> {t('CreateMenu.previewClaiming')}</>
                                    : <><LuSend size={18} /> {t('CreateMenu.previewClaimCta')}</>}
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
                        }}>
                            <LuLogIn size={18} /> {t('CreateMenu.previewSignupCta')}
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
