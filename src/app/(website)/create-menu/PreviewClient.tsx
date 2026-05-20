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
}

interface DraftData {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
    extractedData: {
        categories: ExtractedCategory[];
        items: ExtractedItem[];
        languages: string[];
    } | null;
    detectedBusinessName: string | null;
    detectedBusinessType: string | null;
    imageUrl: string | null;
    error: string | null;
}

interface PreviewClientProps {
    draftId: string;
}

export default function PreviewClient({ draftId }: PreviewClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('Website');
    const isClaimMode = searchParams.get('claim') === 'true';
    const { update: updateSession } = useSession();

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
        try {
            const res = await fetch(`/api/public/create-menu?draftId=${draftId}`);

            if (res.status === 410) {
                setDraft({ status: 'expired', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, imageUrl: null, error: 'Draft expired.' });
                setLoading(false);
                return 'expired';
            }

            if (res.status === 404) {
                setDraft({ status: 'expired', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, imageUrl: null, error: 'Draft not found.' });
                setLoading(false);
                return 'not_found';
            }

            if (!res.ok) {
                setDraft({ status: 'failed', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, imageUrl: null, error: 'Failed to load preview.' });
                setLoading(false);
                return 'error';
            }

            const data = await res.json();
            setDraft(data);
            setLoading(false);
            return data.status;
        } catch {
            setDraft({ status: 'failed', extractedData: null, detectedBusinessName: null, detectedBusinessType: null, imageUrl: null, error: 'Connection error.' });
            setLoading(false);
            return 'error';
        }
    }, [draftId]);

    // Poll for extraction completion
    useEffect(() => {
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
    }, [fetchDraft, pollCount]);

    const handleSignUp = () => {
        const callbackUrl = encodeURIComponent(`/create-menu/preview/${draftId}?claim=true`);
        router.push(`/signin?callbackUrl=${callbackUrl}`);
    };

    const handleClaim = async () => {
        if (!businessName.trim() || businessName.trim().length < 2) {
            setClaimError('Please enter your business name (at least 2 characters).');
            return;
        }
        if (!city.trim() || city.trim().length < 2) {
            setClaimError('Please enter your city or area.');
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
                    city: city.trim(),
                    phone: phone.trim() || undefined,
                    addressLine: addressLine.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setClaimError(data.error || 'Failed to publish. Please try again.');
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
                subdomain: data.subdomain || '',
                name: businessName.trim(),
            });
            router.push(`/create-menu/success?${params.toString()}`);
        } catch {
            setClaimError('Something went wrong. Please try again.');
            setClaiming(false);
        }
    };

    // Pre-fill business name from AI detection
    useEffect(() => {
        if (draft?.detectedBusinessName && !businessName) {
            setBusinessName(draft.detectedBusinessName);
        }
    }, [draft?.detectedBusinessName]);

    // Loading state
    if (loading) {
        return (
            <div style={containerStyle}>
                <LuLoader size={40} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '16px', color: 'var(--ws-text-secondary)', marginTop: '16px' }}>Loading your menu...</p>
                <style>{spinCSS}</style>
            </div>
        );
    }

    // Processing state
    if (draft?.status === 'pending' || draft?.status === 'processing') {
        return (
            <div style={containerStyle}>
                <LuLoader size={48} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '20px' }}>
                    Reading your menu...
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--ws-text-secondary)', marginTop: '8px' }}>
                    This can take a short moment.
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
        );
    }

    // Expired state
    if (draft?.status === 'expired') {
        return (
            <div style={containerStyle}>
                <LuAlertCircle size={48} color="var(--ws-warning)" />
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                    Draft expired
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                    This draft has expired. Upload your current menu again to create a fresh review.
                </p>
                <button onClick={() => router.push('/create-menu')} style={primaryBtnStyle}>
                    <LuUpload size={16} /> Upload menu
                </button>
            </div>
        );
    }

    // Failed state
    if (draft?.status === 'failed') {
        return (
            <div style={containerStyle}>
                <LuAlertCircle size={48} color="var(--ws-error)" />
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ws-text-primary)', marginTop: '16px' }}>
                    Could not read your menu
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)', marginTop: '8px', maxWidth: '360px', textAlign: 'center' }}>
                    {draft.error || 'Please try again with a clearer photo.'}
                </p>
                <button onClick={() => router.push('/create-menu')} style={primaryBtnStyle}>
                    <LuUpload size={16} /> Try Again
                </button>
            </div>
        );
    }

    // Success state — show menu preview
    const { extractedData, detectedBusinessName, detectedBusinessType } = draft || {};
    const categories = extractedData?.categories || [];
    const items = extractedData?.items || [];
    const lang = extractedData?.languages?.[0] || 'en';

    return (
        <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '24px 20px 100px',
        }}>
            {/* Success header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#f0fdf4',
                    color: 'var(--ws-success)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '16px',
                }}>
                    <LuCheck size={16} /> Ready for review
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>
                    {detectedBusinessName || 'Your menu source'}
                </h1>
                {detectedBusinessType && (
                    <p style={{ fontSize: '14px', color: 'var(--ws-text-secondary)' }}>{detectedBusinessType}</p>
                )}
            </div>

            {/* Menu preview */}
            <div style={{
                backgroundColor: 'var(--ws-bg-primary)',
                borderRadius: 'var(--ws-radius-xl)',
                border: '1px solid var(--ws-border-default)',
                overflow: 'hidden',
                marginBottom: '24px',
            }}>
                {categories.map((cat) => {
                    const catItems = items.filter(item => item.category === cat.id);
                    if (catItems.length === 0) return null;

                    return (
                        <div key={cat.id}>
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
                            {catItems.map((item, idx) => (
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
                            ))}
                        </div>
                    );
                })}

                {/* Empty state */}
                {categories.length === 0 && items.length > 0 && (
                    <div style={{ padding: '16px' }}>
                        {items.map((item) => (
                            <div key={item.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: '1px solid var(--ws-border-subtle)',
                            }}>
                                <span style={{ fontSize: '14px', color: 'var(--ws-text-primary)' }}>
                                    {item.name?.[lang] || item.name?.en || item.id}
                                </span>
                                {item.price && (
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.price}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {categories.length === 0 && items.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--ws-text-muted)', fontSize: '14px' }}>No items extracted. Try uploading a clearer photo.</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
            }}>
                <div style={statBoxStyle}>
                    <span style={statNumberStyle}>{categories.length}</span>
                    <span style={statLabelStyle}>Categories</span>
                </div>
                <div style={statBoxStyle}>
                    <span style={statNumberStyle}>{items.length}</span>
                    <span style={statLabelStyle}>Items</span>
                </div>
            </div>

            {/* Sticky CTA — switches between sign-up and claim form */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--ws-bg-primary)',
                borderTop: '1px solid var(--ws-border-default)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 100,
            }}>
                {isClaimMode ? (
                    /* Claim mode — user is authenticated, show publish form */
                    <div style={{ width: '100%', maxWidth: '520px' }}>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => { setBusinessName(e.target.value); setClaimError(null); }}
                            placeholder="Your business name"
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
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => { setCity(e.target.value); setClaimError(null); }}
                            placeholder="City or area"
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
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setClaimError(null); }}
                            placeholder="Public phone or WhatsApp number"
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
                        <input
                            type="text"
                            value={addressLine}
                            onChange={(e) => { setAddressLine(e.target.value); setClaimError(null); }}
                            placeholder="Address (optional)"
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
                        {claimError && (
                            <p style={{ fontSize: '13px', color: 'var(--ws-error)', margin: '0 0 8px', textAlign: 'center' }}>{claimError}</p>
                        )}
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
