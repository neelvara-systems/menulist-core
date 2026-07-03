'use client';

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/routes';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { trackPlausibleEvent } from '@lib/website/plausible';
import type { CSSProperties } from 'react';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';

type OnboardingStep = 'auth' | 'details' | 'creating' | 'done';
type BillingModel = 'subscription' | 'usage' | 'one_time' | 'not_sure';

interface OnboardResult {
    tenantId: number;
    storeId: number;
    apiKey: string;
    subscription?: {
        id: string;
        shortUrl?: string | null;
        status?: string | null;
    } | null;
    plan: { id: string; name: string; isBeta: boolean };
}

type AnswerlatticeAnalyticsWindow = Window & {
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
const ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE = 'Could not create the workspace right now. Please try again.';
const ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024;

type AnswerlatticeOnboardResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isOnboardResult = (value: unknown): value is OnboardResult => {
    if (!isPlainRecord(value)) return false;
    if (!Number.isFinite(value.tenantId) || !Number.isFinite(value.storeId)) return false;
    if (!isNonEmptyString(value.apiKey)) return false;
    if (!isPlainRecord(value.plan)) return false;
    if (!isNonEmptyString(value.plan.id) || !isNonEmptyString(value.plan.name) || typeof value.plan.isBeta !== 'boolean') return false;

    if (value.subscription !== undefined && value.subscription !== null) {
        if (!isPlainRecord(value.subscription)) return false;
        if (!isNonEmptyString(value.subscription.id)) return false;
        if (value.subscription.shortUrl !== undefined && value.subscription.shortUrl !== null && typeof value.subscription.shortUrl !== 'string') return false;
        if (value.subscription.status !== undefined && value.subscription.status !== null && typeof value.subscription.status !== 'string') return false;
    }

    return true;
};

const readAnswerlatticeOnboardResponseJson = async (
    response: Response,
    context: AnswerlatticeOnboardResponseLogContext,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(response, ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logRuntimeFailure('answerlattice_onboard_response_parse_failed', error, {
            ...context,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES,
        });
        return null;
    }
};

const colors = {
    primary: 'var(--al-primary)',
    primaryLight: 'var(--al-primary-light)',
    border: 'var(--al-border)',
    borderStrong: 'var(--al-border-strong)',
    surface: 'var(--al-surface)',
    surfaceRaised: 'var(--al-surface-raised)',
    textPrimary: 'var(--al-text)',
    textBody: 'var(--al-text-body)',
    textSecondary: 'var(--al-text-secondary)',
    textMuted: 'var(--al-text-muted)',
    fieldBackground: 'var(--al-field-bg)',
    success: 'var(--al-success)',
    danger: 'var(--al-danger)',
} as const;

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
    const existingAnswerlatticeScope = useMemo(() => resolveAnswerlatticeSessionScope(session), [session]);
    const mainDashboardHref = useMemo(() => {
        const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
        return toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.DASHBOARD, hostname);
    }, []);
    const dashboardHref = useMemo(() => {
        const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
        return toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.ACTIVATION, hostname);
    }, []);
    const billingHref = useMemo(() => {
        const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
        return toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.BILLING, hostname);
    }, []);

    useEffect(() => {
        if (status === 'authenticated' && step === 'auth') {
            setStep('details');
        }
    }, [status, step]);

    useEffect(() => {
        if (step !== 'done' || !result) return;

        trackPlausibleEvent('onboarding_completed');
        trackPlausibleEvent('widget_key_generated');

        const win = window as AnswerlatticeAnalyticsWindow;
        if (typeof win.gtag !== 'function') return;

        win.gtag('event', 'onboarding_completed', {
            event_category: 'answerlattice_website',
            event_label: result.plan.id,
        });
        win.gtag('event', 'widget_key_generated', {
            event_category: 'answerlattice_website',
            event_label: result.plan.id,
        });
    }, [result, step]);

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: window.location.href }, { prompt: 'select_account' });
    };

    const handleUseAnotherAccount = () => {
        signOut({ callbackUrl: window.location.href });
    };

    const handleCreateAccount = async () => {
        const trimmedCompanyName = companyName.trim();
        const trimmedProductName = productName.trim();
        const trimmedProductUrl = productUrl.trim();
        const trimmedSupportEmail = supportEmail.trim();

        if (!trimmedCompanyName || trimmedCompanyName.length < 2) {
            setError('Company name must be at least 2 characters.');
            return;
        }
        if (trimmedProductUrl) {
            try {
                const parsed = new URL(trimmedProductUrl);
                if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL');
            } catch {
                setError('Enter a valid product URL, for example https://app.example.com.');
                return;
            }
        }

        setStep('creating');
        setError(null);
        const responseLogContext = {
            companyNameLength: trimmedCompanyName.length,
            hasProductName: Boolean(trimmedProductName),
            productNameLength: trimmedProductName.length,
            hasProductUrl: Boolean(trimmedProductUrl),
            productUrlLength: trimmedProductUrl.length,
            hasSupportEmail: Boolean(trimmedSupportEmail),
            supportEmailLength: trimmedSupportEmail.length,
            billingModel,
            primarySurfaceCount: primarySurfaces.length,
        };

        try {
            const res = await fetch('/api/answerlattice/onboard', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: trimmedCompanyName,
                    productName: trimmedProductName || undefined,
                    productUrl: trimmedProductUrl || undefined,
                    supportEmail: trimmedSupportEmail || undefined,
                    billingModel,
                    primarySurfaces,
                    planId: 'answerlattice_starter',
                    interval: 'MONTH',
                }),
            });

            const data = await readAnswerlatticeOnboardResponseJson(res, responseLogContext);

            if (!res.ok || !isOnboardResult(data)) {
                if (res.ok) {
                    logRuntimeFailure('answerlattice_onboard_response_invalid', new Error('answerlattice_onboard_response_invalid'), {
                        ...responseLogContext,
                        responseStatus: res.status,
                    });
                }
                throw new Error(ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE);
            }

            await update();
            setResult(data);
            setStep('done');
        } catch {
            setError(ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE);
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
                    <h2 style={styles.cardTitle}>Create your AnswerLattice account</h2>
                    <p style={styles.cardSubtext}>Sign in with Google to create your workspace and continue setup.</p>
                    <button
                        onClick={handleGoogleSignIn}
                        style={styles.googleBtn}
                        data-answerlattice-event="google_signin_clicked"
                        data-answerlattice-label="get_started_form"
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

            {status === 'authenticated' && existingAnswerlatticeScope && step !== 'creating' && step !== 'done' && (
                <div style={styles.card}>
                    <div style={styles.successIcon}>✓</div>
                    <h2 style={styles.cardTitle}>Your AnswerLattice workspace is ready</h2>
                    <p style={styles.cardSubtext}>
                        This Google account already has AnswerLattice access. Open your dashboard, continue setup, or switch accounts if you meant to create a different workspace.
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
                            href={mainDashboardHref}
                            style={styles.primaryBtn}
                            data-answerlattice-event="onboarding_existing_dashboard_clicked"
                            data-answerlattice-label="open_dashboard"
                        >
                            Open dashboard
                        </a>
                        <a
                            href={dashboardHref}
                            style={styles.secondaryBtn}
                            data-answerlattice-event="onboarding_existing_activation_clicked"
                            data-answerlattice-label="open_activation"
                        >
                            Continue setup
                        </a>
                        <a
                            href={billingHref}
                            style={styles.secondaryBtn}
                            data-answerlattice-event="onboarding_existing_billing_clicked"
                            data-answerlattice-label="open_billing"
                        >
                            View Billing
                        </a>
                    </div>
                </div>
            )}

            {/* Step 2: Company Details */}
            {step === 'details' && (!existingAnswerlatticeScope || status !== 'authenticated') && (
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
                            placeholder="Company or studio name"
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
                            placeholder="Product, app, or workspace name"
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
                        <span style={styles.planLabel}>Starter plan</span>
                        <span style={styles.planPrice}>Paid monthly setup</span>
                        <span style={styles.planDesc}>Creates the workspace, product account bridge, pending paid subscription, product surfaces, and one-time widget key.</span>
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button
                        onClick={handleCreateAccount}
                        style={styles.primaryBtn}
                        data-answerlattice-event="onboarding_create_clicked"
                        data-answerlattice-label="starter_workspace"
                    >
                        Create workspace
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
                    <h2 style={styles.cardTitle}>Your AnswerLattice workspace is created.</h2>
                    <p style={styles.cardSubtext}>Complete payment to activate the paid plan. Save your widget key now; AnswerLattice stores only the secure hash and will show the prefix later.</p>

                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Plan</span>
                            <span style={styles.detailValue}>{result.plan.name}</span>
                        </div>
                        <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                            <span style={styles.detailLabel}>Widget key</span>
                            <code style={styles.apiKey}>{result.apiKey}</code>
                        </div>
                    </div>

                    <div style={styles.nextSteps}>
                        <h3 style={styles.nextStepsTitle}>Next steps</h3>
                        <ol style={styles.stepsList}>
                            <li>Complete payment from the checkout link or billing screen</li>
                            <li>Check your activation dashboard</li>
                            <li>Teach AnswerLattice from selected links, docs, screenshots, recordings, or starter answers</li>
                            <li>Review generated product topics and answer drafts</li>
                            <li>Add the widget to your product and configure hosted help if needed</li>
                        </ol>
                    </div>

                    {result.subscription?.shortUrl && (
                        <a
                            href={result.subscription.shortUrl}
                            style={styles.primaryBtn}
                            data-answerlattice-event="onboarding_payment_clicked"
                            data-answerlattice-label="starter_checkout"
                        >
                            Complete payment
                        </a>
                    )}
                    <a
                        href={result.subscription?.shortUrl ? billingHref : mainDashboardHref}
                        style={result.subscription?.shortUrl ? styles.secondaryBtn : styles.primaryBtn}
                        data-answerlattice-event="onboarding_dashboard_clicked"
                        data-answerlattice-label={result.subscription?.shortUrl ? 'open_billing' : 'open_dashboard'}
                    >
                        {result.subscription?.shortUrl ? 'Open billing' : 'Open dashboard'}
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
        borderRadius: 8, border: `1px solid ${colors.borderStrong}`, background: colors.surface,
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
        background: colors.surface,
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
        background: 'rgb(var(--al-primary-rgb) / 0.1)',
        color: colors.primaryLight,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
    },
    fieldGroup: { width: '100%', marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 },
    input: {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${colors.borderStrong}`, background: colors.fieldBackground,
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    select: {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${colors.borderStrong}`, background: colors.fieldBackground,
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' },
    checkboxOption: {
        minHeight: 40, borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', boxSizing: 'border-box',
    },
    checkboxInput: { width: 16, height: 16, accentColor: colors.primary },
    planBadge: {
        width: '100%', padding: '12px 16px', borderRadius: 8,
        border: '1px solid rgb(var(--al-primary-rgb) / 0.3)', background: 'rgb(var(--al-primary-rgb) / 0.08)',
        marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    },
    planLabel: { fontSize: 13, fontWeight: 600, color: colors.primaryLight },
    planPrice: { fontSize: 13, fontWeight: 700, color: colors.textPrimary },
    planDesc: { fontSize: 11, color: colors.textMuted, width: '100%' },
    error: { fontSize: 13, color: colors.danger, margin: '0 0 12px 0', textAlign: 'center' },
    existingActions: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
    primaryBtn: {
        display: 'block', width: '100%', minHeight: 44, padding: '12px 24px', borderRadius: 10,
        background: colors.primary, color: '#ffffff', fontSize: 14, fontWeight: 600,
        border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
        marginTop: 8,
    },
    secondaryBtn: {
        display: 'block', width: '100%', minHeight: 44, padding: '12px 24px', borderRadius: 10,
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 14, fontWeight: 600,
        border: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
    },
    spinner: {
        width: 40, height: 40, border: `3px solid ${colors.border}`,
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
        background: 'rgb(var(--al-primary-rgb) / 0.1)', padding: '6px 10px', borderRadius: 6,
        wordBreak: 'break-all', marginTop: 4,
    },
    nextSteps: { width: '100%', marginBottom: 16 },
    nextStepsTitle: { fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' },
    stepsList: { margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textSecondary, lineHeight: 1.8 },
};
