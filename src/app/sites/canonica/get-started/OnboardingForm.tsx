'use client';

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/routes';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import type { CSSProperties } from 'react';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { CANONICA_THEME } from '../theme';

type OnboardingStep = 'auth' | 'details' | 'creating' | 'done';
type BillingModel = 'free' | 'subscription' | 'usage' | 'one_time' | 'not_sure';

interface OnboardResult {
    tenantId: number;
    storeId: number;
    apiKey: string;
    plan: { id: string; name: string; isBeta: boolean };
}

type CanonicaAnalyticsWindow = Window & {
    gtag?: (...args: unknown[]) => void;
};

const SURFACE_OPTIONS = [
    { key: 'billing', label: 'Billing' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'settings', label: 'Settings' },
    { key: 'team', label: 'Team' },
    { key: 'integrations', label: 'Connected apps' },
    { key: 'release_notes', label: 'Release notes' },
];

const { colors } = CANONICA_THEME;

export default function OnboardingForm() {
    return (
        <SessionProvider>
            <OnboardingFormInner />
        </SessionProvider>
    );
}

function OnboardingFormInner() {
    const { data: session, status, update } = useSession();
    const [step, setStep] = useState<OnboardingStep>(status === 'authenticated' ? 'details' : 'auth');
    const [companyName, setCompanyName] = useState('');
    const [productName, setProductName] = useState('');
    const [productUrl, setProductUrl] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const [billingModel, setBillingModel] = useState<BillingModel>('subscription');
    const [primarySurfaces, setPrimarySurfaces] = useState<string[]>(['billing', 'onboarding', 'settings']);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OnboardResult | null>(null);
    const existingCanonicaScope = useMemo(() => resolveCanonicaSessionScope(session), [session]);
    const dashboardHref = useMemo(() => {
        const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
        return toCanonicaDashboardRoute(CANONICA_ROUTES.ACTIVATION, hostname);
    }, []);
    const billingHref = useMemo(() => {
        const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
        return toCanonicaDashboardRoute(CANONICA_ROUTES.BILLING, hostname);
    }, []);

    useEffect(() => {
        if (status === 'authenticated' && step === 'auth') {
            setStep('details');
        }
    }, [status, step]);

    useEffect(() => {
        if (step !== 'done' || !result) return;

        const win = window as CanonicaAnalyticsWindow;
        if (typeof win.gtag !== 'function') return;

        win.gtag('event', 'onboarding_completed', {
            event_category: 'canonica_website',
            event_label: result.plan.id,
        });
        win.gtag('event', 'widget_key_generated', {
            event_category: 'canonica_website',
            event_label: result.apiKey.slice(0, 8),
        });
    }, [result, step]);

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: window.location.href }, { prompt: 'select_account' });
    };

    const handleUseAnotherAccount = () => {
        signOut({ callbackUrl: window.location.href });
    };

    const handleCreateAccount = async () => {
        if (!companyName.trim() || companyName.trim().length < 2) {
            setError('Company name must be at least 2 characters.');
            return;
        }
        if (productUrl.trim()) {
            try {
                const parsed = new URL(productUrl.trim());
                if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL');
            } catch {
                setError('Enter a valid product URL, for example https://app.example.com.');
                return;
            }
        }

        setStep('creating');
        setError(null);

        try {
            const res = await fetch('/api/canonica/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: companyName.trim(),
                    productName: productName.trim() || undefined,
                    productUrl: productUrl.trim() || undefined,
                    supportEmail: supportEmail.trim() || undefined,
                    billingModel,
                    primarySurfaces,
                    planId: 'canonica_beta',
                    interval: 'MONTH',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            await update();
            setResult(data);
            setStep('done');
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
            setStep('details');
        }
    };

    const toggleSurface = (surfaceKey: string) => {
        setPrimarySurfaces(prev => prev.includes(surfaceKey)
            ? prev.filter(item => item !== surfaceKey)
            : [...prev, surfaceKey]);
    };

    return (
        <div style={styles.container}>
            {/* Step 1: Auth */}
            {step === 'auth' && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Create your Canonica account</h2>
                    <p style={styles.cardSubtext}>Sign in with Google to get started. Free during beta.</p>
                    <button
                        onClick={handleGoogleSignIn}
                        style={styles.googleBtn}
                        data-canonica-event="google_signin_clicked"
                        data-canonica-label="get_started_form"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continue with Google</span>
                    </button>
                    <p style={styles.terms}>
                        By signing up, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            )}

            {status === 'authenticated' && existingCanonicaScope && step !== 'creating' && step !== 'done' && (
                <div style={styles.card}>
                    <div style={styles.successIcon}>✓</div>
                    <h2 style={styles.cardTitle}>Your Canonica workspace is ready</h2>
                    <p style={styles.cardSubtext}>
                        This Google account already has Canonica access. Continue to your activation dashboard, or switch accounts if you meant to set up a different workspace.
                    </p>

                    {session?.user?.email && (
                        <div style={styles.signedInBox}>
                            <div style={styles.signedInText}>
                                <span style={styles.signedInLabel}>Signed in with Google</span>
                                <span style={styles.signedInEmail}>{session.user.email}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleUseAnotherAccount}
                                style={styles.switchAccountBtn}
                            >
                                Use another account
                            </button>
                        </div>
                    )}

                    <div style={styles.existingActions}>
                        <a
                            href={dashboardHref}
                            style={styles.primaryBtn}
                            data-canonica-event="onboarding_existing_dashboard_clicked"
                            data-canonica-label="open_activation"
                        >
                            Open Activation
                        </a>
                        <a
                            href={billingHref}
                            style={styles.secondaryBtn}
                            data-canonica-event="onboarding_existing_billing_clicked"
                            data-canonica-label="open_billing"
                        >
                            View Billing
                        </a>
                    </div>
                </div>
            )}

            {/* Step 2: Company Details */}
            {step === 'details' && (!existingCanonicaScope || status !== 'authenticated') && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Set up your account</h2>
                    <p style={styles.cardSubtext}>
                        Welcome{session?.user?.name ? `, ${session.user.name}` : ''}! Tell us about your product.
                    </p>

                    {session?.user?.email && (
                        <div style={styles.signedInBox}>
                            <div style={styles.signedInText}>
                                <span style={styles.signedInLabel}>Signed in with Google</span>
                                <span style={styles.signedInEmail}>{session.user.email}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleUseAnotherAccount}
                                style={styles.switchAccountBtn}
                            >
                                Use another account
                            </button>
                        </div>
                    )}

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Company name *</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g., Acme Inc."
                            style={styles.input}
                            autoFocus
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Product name (optional)</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g., Acme CRM"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Product URL (optional)</label>
                        <input
                            type="url"
                            value={productUrl}
                            onChange={(e) => setProductUrl(e.target.value)}
                            placeholder="https://app.example.com"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Support email (optional)</label>
                        <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="support@example.com"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Billing model</label>
                        <select
                            value={billingModel}
                            onChange={(e) => setBillingModel(e.target.value as BillingModel)}
                            style={styles.select}
                        >
                            <option value="subscription">Subscription</option>
                            <option value="usage">Usage based</option>
                            <option value="one_time">One-time payment</option>
                            <option value="free">Free product</option>
                            <option value="not_sure">Not sure yet</option>
                        </select>
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Main product pages</label>
                        <div style={styles.checkboxGrid}>
                            {SURFACE_OPTIONS.map((surface) => (
                                <label key={surface.key} style={styles.checkboxOption}>
                                    <input
                                        type="checkbox"
                                        checked={primarySurfaces.includes(surface.key)}
                                        onChange={() => toggleSurface(surface.key)}
                                        style={styles.checkboxInput}
                                    />
                                    {surface.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={styles.planBadge}>
                        <span style={styles.planLabel}>Beta Plan</span>
                        <span style={styles.planPrice}>Free during beta</span>
                        <span style={styles.planDesc}>Creates the workspace, product account bridge, beta subscription, product surfaces, and one-time widget key.</span>
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button
                        onClick={handleCreateAccount}
                        style={styles.primaryBtn}
                        data-canonica-event="onboarding_create_clicked"
                        data-canonica-label="beta_workspace"
                    >
                        Create Account
                    </button>
                </div>
            )}

            {/* Step 3: Creating */}
            {step === 'creating' && (
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <h2 style={styles.cardTitle}>Setting up your account...</h2>
                    <p style={styles.cardSubtext}>Creating your workspace and preparing your widget key.</p>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && result && (
                <div style={styles.card}>
                    <div style={styles.successIcon}>✓</div>
                    <h2 style={styles.cardTitle}>Your Canonica account is ready!</h2>
                    <p style={styles.cardSubtext}>Save your widget key now. Canonica stores only the secure hash and will show the prefix later.</p>

                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Plan</span>
                            <span style={styles.detailValue}>{result.plan.name}{result.plan.isBeta ? ' (Free)' : ''}</span>
                        </div>
                        <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                            <span style={styles.detailLabel}>Widget key</span>
                            <code style={styles.apiKey}>{result.apiKey}</code>
                        </div>
                    </div>

                    <div style={styles.nextSteps}>
                        <h3 style={styles.nextStepsTitle}>Next steps</h3>
                        <ol style={styles.stepsList}>
                            <li>Check your activation dashboard</li>
                            <li>Teach Canonica from selected links, docs, screenshots, recordings, or starter answers</li>
                            <li>Review generated product topics and answer drafts</li>
                            <li>Add the widget to your product and configure hosted help if needed</li>
                        </ol>
                    </div>

                    <a
                        href="/canonica/activation"
                        style={styles.primaryBtn}
                        data-canonica-event="onboarding_activation_clicked"
                        data-canonica-label="open_activation"
                    >
                        Open Activation
                    </a>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    container: { maxWidth: 480, width: '100%', boxSizing: 'border-box' },
    card: {
        padding: '2rem',
        borderRadius: '1rem',
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
    },
    cardTitle: { fontSize: 20, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0', textAlign: 'center', maxWidth: '100%', overflowWrap: 'break-word' },
    cardSubtext: { fontSize: 14, color: colors.textSecondary, margin: '0 0 24px 0', textAlign: 'center', lineHeight: 1.5, maxWidth: '100%', overflowWrap: 'break-word' },
    googleBtn: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px',
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
        color: colors.textPrimary, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', justifyContent: 'center',
    },
    terms: { fontSize: 11, color: colors.textMuted, marginTop: 16, textAlign: 'center' },
    signedInBox: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: 'rgba(255,255,255,0.035)',
        marginBottom: 18,
        boxSizing: 'border-box',
    },
    signedInText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
    signedInLabel: { fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' },
    signedInEmail: { fontSize: 13, fontWeight: 600, color: colors.textPrimary, overflowWrap: 'anywhere' },
    switchAccountBtn: {
        flexShrink: 0,
        minHeight: 36,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${colors.primaryLight}`,
        background: 'rgba(20,184,166,0.1)',
        color: colors.primaryLight,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
    },
    fieldGroup: { width: '100%', marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 },
    input: {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    select: {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${colors.borderStrong}`, background: colors.fieldBackground,
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' },
    checkboxOption: {
        minHeight: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', boxSizing: 'border-box',
    },
    checkboxInput: { width: 16, height: 16, accentColor: colors.primary },
    planBadge: {
        width: '100%', padding: '12px 16px', borderRadius: 8,
        border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.08)',
        marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    },
    planLabel: { fontSize: 13, fontWeight: 600, color: colors.primaryLight },
    planPrice: { fontSize: 13, fontWeight: 700, color: colors.textPrimary },
    planDesc: { fontSize: 11, color: colors.textMuted, width: '100%' },
    error: { fontSize: 13, color: colors.danger, margin: '0 0 12px 0', textAlign: 'center' },
    existingActions: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
    primaryBtn: {
        display: 'block', width: '100%', minHeight: 44, padding: '12px 24px', borderRadius: 10,
        background: colors.primary, color: colors.textPrimary, fontSize: 14, fontWeight: 600,
        border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
        marginTop: 8,
    },
    secondaryBtn: {
        display: 'block', width: '100%', minHeight: 44, padding: '12px 24px', borderRadius: 10,
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 14, fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
    },
    spinner: {
        width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
        borderTop: `3px solid ${colors.primary}`, borderRadius: '50%',
        animation: 'spin 1s linear infinite', marginBottom: 16,
    },
    successIcon: {
        width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
        color: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700, marginBottom: 16,
    },
    detailsGrid: {
        width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 20,
    },
    detailItem: {
        padding: '10px 12px', borderRadius: 8, background: colors.surface,
        border: `1px solid ${colors.border}`,
    },
    detailLabel: { display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    detailValue: { display: 'block', fontSize: 14, fontWeight: 600, color: colors.textPrimary },
    apiKey: {
        display: 'block', fontSize: 12, fontFamily: 'monospace', color: colors.primaryLight,
        background: 'rgba(20,184,166,0.1)', padding: '6px 10px', borderRadius: 6,
        wordBreak: 'break-all', marginTop: 4,
    },
    nextSteps: { width: '100%', marginBottom: 16 },
    nextStepsTitle: { fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' },
    stepsList: { margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textSecondary, lineHeight: 1.8 },
};
