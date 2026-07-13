'use client';

import { getPublicBaseUrl } from '@constant/urls';
import {
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
} from '@data/shared/ownerReferralPolicy';
import { getContentCreditOutcomeExamples } from '@data/shared/contentCreditPolicy';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuCheck, LuGift, LuShieldCheck, LuSparkles } from 'react-icons/lu';

type InviteState = 'loading' | 'ready' | 'capturing' | 'invalid' | 'error';
const OWNER_REFERRAL_CAPTURE_RESPONSE_MAX_BYTES = 4 * 1024;

const isSuccessfulCaptureResponse = (value: unknown): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return record.success === true && record.continueTo === '/create-menu';
};

export default function OwnerReferralInviteClient({ enabled }: { enabled: boolean }) {
    const router = useRouter();
    const t = useTranslations('OwnerReferral.invite');
    const [state, setState] = useState<InviteState>('loading');
    const [token, setToken] = useState('');
    const canonicalInviteUrl = useMemo(() => `${getPublicBaseUrl().replace(/\/$/, '')}/invite`, []);
    const referredExamples = getContentCreditOutcomeExamples(OWNER_REFERRAL_REFERRED_CREDITS);

    useEffect(() => {
        if (!enabled) {
            setState('invalid');
            return;
        }

        const currentHash = window.location.hash;
        const canonical = new URL(canonicalInviteUrl);
        if (window.location.origin !== canonical.origin) {
            window.location.replace(`${canonicalInviteUrl}${currentHash}`);
            return;
        }

        const fragment = new URLSearchParams(currentHash.replace(/^#/, ''));
        const capturedToken = fragment.get('r') || '';
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        if (capturedToken.length < 32 || capturedToken.length > 1024) {
            setState('invalid');
            return;
        }
        setToken(capturedToken);
        setState('ready');
    }, [canonicalInviteUrl, enabled]);

    const capture = async () => {
        if (!token || state !== 'ready') return;
        setState('capturing');
        try {
            const response = await fetch('/api/public/owner-referrals/capture', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const body = await readJsonResponseWithLimit<unknown>(
                response,
                OWNER_REFERRAL_CAPTURE_RESPONSE_MAX_BYTES,
            ).catch(() => null);
            if (!response.ok || !isSuccessfulCaptureResponse(body)) {
                setState(response.status === 400 || response.status === 404 ? 'invalid' : 'error');
                return;
            }
            setToken('');
            router.push('/create-menu');
        } catch {
            setState('error');
        }
    };

    if (state === 'loading') {
        return <main style={{ minHeight: '62vh' }} aria-busy="true" />;
    }

    if (state === 'invalid' || state === 'error') {
        return (
            <main style={{ minHeight: '62vh', display: 'grid', placeItems: 'center', padding: '48px 20px' }}>
                <div style={{ maxWidth: 520, textAlign: 'center' }}>
                    <h1 className="ws-h1" style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t('unavailableTitle')}</h1>
                    <p className="ws-body" style={{ margin: '18px auto 28px', color: 'var(--ws-text-secondary)' }}>
                        {t('unavailableBody')}
                    </p>
                    <Link className="ws-btn ws-btn--primary" href="/create-menu">{t('createLink')}</Link>
                </div>
            </main>
        );
    }

    return (
        <main>
            <section className="owner-referral-invite-hero" style={{ padding: '36px 20px 28px' }}>
                <div className="owner-referral-invite-grid" style={{ width: 'min(1120px, 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))', gap: 'clamp(28px, 4vw, 48px)', alignItems: 'center' }}>
                    <div>
                        <p className="ws-eyebrow" style={{ marginBottom: 14 }}>{t('eyebrow')}</p>
                        <h1 className="ws-h1" style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.2rem)', lineHeight: 1.06, letterSpacing: 0 }}>
                            {t('title')}
                        </h1>
                        <p className="ws-body" style={{ marginTop: 16, maxWidth: 620, color: 'var(--ws-text-secondary)', fontSize: '1.08rem' }}>
                            {t('body')}
                        </p>

                        <div style={{ display: 'grid', gap: 10, margin: '20px 0' }}>
                            <p style={{ display: 'flex', gap: 10, alignItems: 'center', margin: 0 }}>
                                <LuGift size={20} style={{ flex: '0 0 auto' }} />
                                <span style={{ minWidth: 0 }}>{t.rich('referredReward', {
                                    credits: OWNER_REFERRAL_REFERRED_CREDITS,
                                    strong: (chunks) => <strong>{chunks}</strong>,
                                })}</span>
                            </p>
                            <p style={{ display: 'flex', gap: 10, alignItems: 'center', margin: 0 }}>
                                <LuGift size={20} style={{ flex: '0 0 auto' }} />
                                <span style={{ minWidth: 0 }}>{t.rich('referrerReward', {
                                    credits: OWNER_REFERRAL_REFERRER_CREDITS,
                                    strong: (chunks) => <strong>{chunks}</strong>,
                                })}</span>
                            </p>
                            <p style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: 0, color: 'var(--ws-text-secondary)' }}>
                                <LuSparkles size={20} style={{ flex: '0 0 auto' }} />
                                <span style={{ minWidth: 0 }}>{t('creditExample', {
                                    credits: OWNER_REFERRAL_REFERRED_CREDITS,
                                    descriptions: referredExamples.descriptionRewrites,
                                    images: referredExamples.generatedMenuImages,
                                })}</span>
                            </p>
                            <p style={{ display: 'flex', gap: 10, alignItems: 'center', margin: 0, color: 'var(--ws-text-secondary)' }}><LuCheck size={20} /> {t('rewardRule')}</p>
                        </div>

                        <p className="ws-caption" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 16px', maxWidth: 680 }}>
                            <LuShieldCheck size={18} style={{ flex: '0 0 auto' }} />
                            {t('privacy')}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <button
                                type="button"
                                className="ws-btn ws-btn--primary"
                                disabled={state === 'capturing'}
                                onClick={() => void capture()}
                            >
                                {state === 'capturing' ? t('preparing') : t('createLink')}
                                {state !== 'capturing' ? <LuArrowRight size={18} /> : null}
                            </button>
                            <Link className="ws-btn ws-btn--secondary" href="/create-menu">{t('continueWithoutReferral')}</Link>
                        </div>
                    </div>

                    <div className="owner-referral-invite-media" style={{ position: 'relative', height: 'min(64vh, 580px)', minHeight: 420, display: 'grid', placeItems: 'center', background: 'var(--ws-bg-secondary)', border: '1px solid var(--ws-border-default)', borderRadius: 8, overflow: 'hidden' }}>
                        <Image
                            src="/images/website/menulist-public-menu-mobile.webp"
                            alt={t('imageAlt')}
                            width={640}
                            height={760}
                            priority
                            style={{ width: 'auto', maxWidth: '88%', height: 'calc(100% - 32px)', maxHeight: 540, objectFit: 'contain' }}
                        />
                    </div>
                </div>
            </section>

            <section style={{ padding: '48px 20px 72px', background: 'var(--ws-bg-secondary)' }}>
                <div style={{ width: 'min(920px, 100%)', margin: '0 auto' }}>
                    <h2 className="ws-h2" style={{ textAlign: 'center', marginBottom: 32 }}>{t('stepsTitle')}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                        {[
                            ['1', t('steps.addTitle'), t('steps.addBody')],
                            ['2', t('steps.reviewTitle'), t('steps.reviewBody')],
                            ['3', t('steps.publishTitle'), t('steps.publishBody')],
                        ].map(([number, title, body]) => (
                            <div key={number} style={{ padding: '0 8px' }}>
                                <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--ws-text-primary)', color: 'var(--ws-bg-primary)', fontWeight: 700 }}>{number}</span>
                                <h3 className="ws-h3" style={{ marginTop: 16 }}>{title}</h3>
                                <p className="ws-body-sm" style={{ color: 'var(--ws-text-secondary)' }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
