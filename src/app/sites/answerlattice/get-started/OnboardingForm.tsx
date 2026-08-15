'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/routes';
import { getAnswerlatticePlans } from '@data/answerlattice/plans';
import type { SelfReportedDiscoveryChannel } from '@data/shared/selfReportedDiscovery';
import {
    normalizeAnswerlatticeOnboardResult,
    type AnswerlatticeOnboardResult,
} from '@lib/answerlattice/onboardingResponse';
import {
    ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS,
    buildAnswerlatticeOnboardingProof,
    type AnswerlatticeOnboardingSurfaceKey,
} from '@lib/answerlattice/onboardingProof';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { trackGoogleMarketingEvent, trackPlausibleEvent } from '@lib/website/plausible';
import type { CSSProperties, FormEvent } from 'react';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

type OnboardingStep = 'auth' | 'details' | 'proof' | 'creating' | 'done';
type BillingModel = 'subscription' | 'usage' | 'one_time' | 'not_sure';
type BillingCurrency = 'INR' | 'USD';

interface OnboardErrorResult {
    code: string;
    error?: string;
}

const DISCOVERY_SOURCE_OPTIONS: Array<{ label: string; value: SelfReportedDiscoveryChannel }> = [
    { label: 'ChatGPT', value: 'chatgpt' },
    { label: 'Claude', value: 'claude' },
    { label: 'Gemini', value: 'gemini' },
    { label: 'Microsoft Copilot', value: 'microsoft_copilot' },
    { label: 'Perplexity', value: 'perplexity' },
    { label: 'Search engine', value: 'search_engine' },
    { label: 'Social media or community', value: 'social_or_community' },
    { label: 'Friend or colleague', value: 'friend_or_colleague' },
    { label: 'Other', value: 'other' },
];
const ONBOARDING_PLANS = getAnswerlatticePlans()
    .filter((plan) => plan.billingInterval === 'MONTH')
    .sort((left, right) => left.priceINR.price - right.priceINR.price);
const ONBOARDING_PLAN_IDS = new Set(ONBOARDING_PLANS.map((plan) => plan.planId));
const ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE = 'Could not create the workspace right now. Please try again.';
const ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const ANSWERLATTICE_ONBOARD_SESSION_REFRESH_TIMEOUT_MS = 3_000;

type AnswerlatticeOnboardResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isOnboardErrorResult = (value: unknown): value is OnboardErrorResult => (
    isPlainRecord(value) && isNonEmptyString(value.code)
);

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

interface OnboardingFormProps {
    basePath?: string;
    initialCurrency?: BillingCurrency;
    initialPlanId?: string;
}

export default function OnboardingForm({
    basePath = '',
    initialCurrency = 'INR',
    initialPlanId = 'answerlattice_starter',
}: OnboardingFormProps) {
    return (
        <SessionProvider>
            <OnboardingFormInner
                basePath={basePath}
                initialCurrency={initialCurrency}
                initialPlanId={initialPlanId}
            />
        </SessionProvider>
    );
}

function OnboardingFormInner({ basePath, initialCurrency, initialPlanId }: Required<OnboardingFormProps>) {
    const { data: session, status, update } = useSession();
    const [step, setStep] = useState<OnboardingStep>(status === 'authenticated' ? 'details' : 'auth');
    const [companyName, setCompanyName] = useState('');
    const [productName, setProductName] = useState('');
    const [productUrl, setProductUrl] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const [currency, setCurrency] = useState<BillingCurrency>(initialCurrency);
    const [planId, setPlanId] = useState(
        ONBOARDING_PLAN_IDS.has(initialPlanId) ? initialPlanId : 'answerlattice_starter',
    );
    const [billingModel, setBillingModel] = useState<BillingModel>('subscription');
    const [selfReportedDiscoveryChannel, setSelfReportedDiscoveryChannel] = useState<SelfReportedDiscoveryChannel | ''>('');
    const [primarySurfaces, setPrimarySurfaces] = useState<AnswerlatticeOnboardingSurfaceKey[]>(['billing', 'onboarding', 'settings']);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnswerlatticeOnboardResult | null>(null);
    const submissionInFlightRef = useRef(false);
    const selectedPlan = useMemo(
        () => ONBOARDING_PLANS.find((plan) => plan.planId === planId) || ONBOARDING_PLANS[0],
        [planId],
    );
    const selectedPlanPrice = currency === 'USD'
        ? `US$${Math.round(selectedPlan.priceUSD.price / 100).toLocaleString('en-US')}`
        : `₹${Math.round(selectedPlan.priceINR.price / 100).toLocaleString('en-IN')}`;
    const onboardingProof = useMemo(() => buildAnswerlatticeOnboardingProof({
        companyName,
        productName,
        primarySurfaces,
    }), [companyName, primarySurfaces, productName]);
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
        if (result.apiKey) trackPlausibleEvent('widget_key_generated');

        trackGoogleMarketingEvent('onboarding_completed', {
            event_category: 'answerlattice_website',
            event_label: result.plan.id,
        });
        if (result.apiKey) {
            trackGoogleMarketingEvent('widget_key_generated', {
                event_category: 'answerlattice_website',
                event_label: result.plan.id,
            });
        }
    }, [result, step]);

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: window.location.href }, { prompt: 'select_account' });
    };

    const handleUseAnotherAccount = () => {
        signOut({ callbackUrl: window.location.href });
    };

    const validateProductDetails = () => {
        const trimmedCompanyName = companyName.trim();
        const trimmedProductName = productName.trim();
        const trimmedProductUrl = productUrl.trim();
        const trimmedSupportEmail = supportEmail.trim();

        if (!trimmedCompanyName || trimmedCompanyName.length < 2) {
            setError('Company name must be at least 2 characters.');
            return null;
        }
        if (trimmedProductUrl) {
            try {
                const parsed = new URL(trimmedProductUrl);
                if (
                    !['http:', 'https:'].includes(parsed.protocol)
                    || parsed.username
                    || parsed.password
                ) throw new Error('Invalid URL');
            } catch {
                setError('Enter a valid product URL, for example https://app.example.com.');
                return null;
            }
        }
        if (primarySurfaces.length === 0) {
            setError('Choose at least one main product page.');
            return null;
        }

        return { trimmedCompanyName, trimmedProductName, trimmedProductUrl, trimmedSupportEmail };
    };

    const handlePreviewProof = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validatedDetails = validateProductDetails();
        if (!validatedDetails) return;

        setError(null);
        setStep('proof');
        const eventLabel = `${primarySurfaces.length}_surfaces`;
        trackPlausibleEvent('onboarding_proof_viewed');
        trackGoogleMarketingEvent('onboarding_proof_viewed', {
            event_category: 'answerlattice_website',
            event_label: eventLabel,
        });
    };

    const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submissionInFlightRef.current) return;
        const validatedDetails = validateProductDetails();
        if (!validatedDetails) {
            setStep('details');
            return;
        }
        const { trimmedCompanyName, trimmedProductName, trimmedProductUrl, trimmedSupportEmail } = validatedDetails;

        submissionInFlightRef.current = true;
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
            currency,
            hasSelfReportedDiscovery: Boolean(selfReportedDiscoveryChannel),
            planId,
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
                    selfReportedDiscoveryChannel: selfReportedDiscoveryChannel || undefined,
                    planId,
                    interval: 'MONTH',
                    currency,
                }),
            });

            const data = await readAnswerlatticeOnboardResponseJson(res, responseLogContext);

            if (!res.ok) {
                if (isOnboardErrorResult(data)) {
                    if (data.code === 'ANSWERLATTICE_SETUP_IN_PROGRESS') {
                        setError('Workspace setup is already running. Wait a moment, then try again.');
                        setStep('proof');
                        return;
                    }
                    if (data.code === 'ANSWERLATTICE_SETUP_REQUEST_CHANGED') {
                        setError('A setup attempt is already running with different details. Wait a moment, then refresh.');
                        setStep('proof');
                        return;
                    }
                    if (data.code === 'ANSWERLATTICE_PROVIDER_RECOVERY_PENDING') {
                        setError('Payment setup is still being verified. Wait a few minutes, then retry with the same details.');
                        setStep('proof');
                        return;
                    }
                    if (data.code === 'ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED') {
                        setError('The previous payment checkout is no longer usable. Submit the same details again to create a new checkout.');
                        setStep('proof');
                        return;
                    }
                    if (data.code === 'ANSWERLATTICE_ONBOARDING_RATE_LIMITED') {
                        setError('Too many setup attempts. Wait until the retry window ends, then try again.');
                        setStep('proof');
                        return;
                    }
                    if (data.code === 'ANSWERLATTICE_ACCOUNT_EXISTS') {
                        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
                        try {
                            await Promise.race([
                                update(),
                                new Promise((resolve) => {
                                    refreshTimer = setTimeout(resolve, ANSWERLATTICE_ONBOARD_SESSION_REFRESH_TIMEOUT_MS);
                                }),
                            ]);
                        } catch (refreshError) {
                            logRuntimeFailure('answerlattice_onboard_existing_session_refresh_failed', refreshError, responseLogContext);
                        } finally {
                            if (refreshTimer !== null) clearTimeout(refreshTimer);
                        }
                        setError('This Google account already has an AnswerLattice workspace. Refresh to open it.');
                        setStep('details');
                        return;
                    }
                }
                throw new Error(ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE);
            }
            const normalizedResult = normalizeAnswerlatticeOnboardResult(data);
            if (!normalizedResult) {
                logRuntimeFailure('answerlattice_onboard_response_invalid', new Error('answerlattice_onboard_response_invalid'), {
                    ...responseLogContext,
                    responseStatus: res.status,
                });
                throw new Error(ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE);
            }

            let refreshTimer: ReturnType<typeof setTimeout> | null = null;
            try {
                await Promise.race([
                    update(),
                    new Promise((resolve) => {
                        refreshTimer = setTimeout(resolve, ANSWERLATTICE_ONBOARD_SESSION_REFRESH_TIMEOUT_MS);
                    }),
                ]);
            } catch (refreshError) {
                logRuntimeFailure('answerlattice_onboard_session_refresh_failed', refreshError, responseLogContext);
            } finally {
                if (refreshTimer !== null) clearTimeout(refreshTimer);
            }
            setResult(normalizedResult);
            setStep('done');
        } catch {
            setError(ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE);
            setStep('proof');
        } finally {
            submissionInFlightRef.current = false;
        }
    };

    const toggleSurface = (surfaceKey: AnswerlatticeOnboardingSurfaceKey) => {
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
                        type="button"
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
                        By signing up, you agree to our{' '}
                        <a href={`${basePath}/terms-of-service`} style={styles.termsLink}>Terms of Service</a>
                        {' '}and{' '}
                        <a href={`${basePath}/privacy-policy`} style={styles.termsLink}>Privacy Policy</a>.
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
                <form style={styles.card} onSubmit={handlePreviewProof}>
                    <h2 style={styles.cardTitle}>Tell us about your product</h2>
                    <p style={styles.cardSubtext}>
                        Welcome{session?.user?.name ? `, ${session.user.name}` : ''}! Choose the areas where customers are most likely to need help.
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
                        <label htmlFor="answerlattice-company-name" style={styles.label}>Company name *</label>
                        <input
                            id="answerlattice-company-name"
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Company or studio name"
                            style={styles.input}
                            autoComplete="organization"
                            autoFocus
                            minLength={2}
                            maxLength={120}
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label htmlFor="answerlattice-product-name" style={styles.label}>Product name (optional)</label>
                        <input
                            id="answerlattice-product-name"
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Product, app, or workspace name"
                            style={styles.input}
                            maxLength={120}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label htmlFor="answerlattice-product-url" style={styles.label}>Product URL (optional)</label>
                        <input
                            id="answerlattice-product-url"
                            type="url"
                            value={productUrl}
                            onChange={(e) => setProductUrl(e.target.value)}
                            placeholder="https://app.example.com"
                            style={styles.input}
                            autoComplete="url"
                            maxLength={300}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label htmlFor="answerlattice-support-email" style={styles.label}>Support email (optional)</label>
                        <input
                            id="answerlattice-support-email"
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="support@example.com"
                            style={styles.input}
                            autoComplete="email"
                            maxLength={160}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label htmlFor="answerlattice-billing-model" style={styles.label}>Billing model</label>
                        <select
                            id="answerlattice-billing-model"
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

                    {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SELF_REPORTED_DISCOVERY && (
                        <div style={styles.fieldGroup}>
                            <label htmlFor="answerlattice-discovery-source" style={styles.label}>
                                Where did you first hear about AnswerLattice? (optional)
                            </label>
                            <select
                                id="answerlattice-discovery-source"
                                value={selfReportedDiscoveryChannel}
                                onChange={(event) => setSelfReportedDiscoveryChannel(event.target.value as SelfReportedDiscoveryChannel | '')}
                                style={styles.select}
                            >
                                <option value="">Select one source</option>
                                {DISCOVERY_SOURCE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <fieldset style={styles.fieldset}>
                        <legend style={styles.label}>Main product pages</legend>
                        <div style={styles.checkboxGrid}>
                            {ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS.map((surface) => (
                                <label key={surface.key} style={styles.checkboxOption}>
                                    <input
                                        type="checkbox"
                                        name="answerlattice-primary-surfaces"
                                        value={surface.key}
                                        checked={primarySurfaces.includes(surface.key)}
                                        onChange={() => toggleSurface(surface.key)}
                                        style={styles.checkboxInput}
                                    />
                                    {surface.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {error && <p style={styles.error} role="alert" aria-live="polite">{error}</p>}

                    <button
                        type="submit"
                        style={styles.primaryBtn}
                        data-answerlattice-event="onboarding_preview_clicked"
                        data-answerlattice-label={`${primarySurfaces.length}_surfaces`}
                    >
                        Preview my launch path
                    </button>
                </form>
            )}

            {/* Step 3: Personalized proof and paid plan choice */}
            {step === 'proof' && (!existingAnswerlatticeScope || status !== 'authenticated') && (
                <form style={styles.card} onSubmit={handleCreateAccount}>
                    <p style={styles.eyebrow}>Your launch preview</p>
                    <h2 style={styles.cardTitle}>Start with the questions {onboardingProof.subjectLabel} needs to answer.</h2>
                    <p style={styles.cardSubtext}>
                        Based on {onboardingProof.selectedSurfaces.map(surface => surface.label).join(', ')}, these are the first checks to prepare and verify.
                    </p>

                    <div style={styles.proofList}>
                        {onboardingProof.priorityQuestions.map((question, index) => (
                            <div key={question.id} style={styles.proofItem}>
                                <span style={styles.proofNumber}>{index + 1}</span>
                                <div style={styles.proofText}>
                                    <span style={styles.proofTitle}>{question.title}</span>
                                    <span style={styles.proofQuery}>{question.query}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p style={styles.proofBoundary}>
                        This is a client-only starter preview—not imported knowledge, generated answers, or approved guidance. After setup, teach AnswerLattice from your sources, review the drafts, run all {onboardingProof.totalStarterQuestionCount} First Trusted Answer checks, and verify the widget before going live.
                    </p>

                    <div style={styles.launchSequence}>
                        <span>1. Add sources</span>
                        <span>2. Review answers</span>
                        <span>3. Run First 10</span>
                        <span>4. Verify and go live</span>
                    </div>

                    <div style={styles.fieldGroup}>
                        <label htmlFor="answerlattice-plan" style={styles.label}>Choose a paid plan</label>
                        <select
                            id="answerlattice-plan"
                            value={planId}
                            onChange={(event) => setPlanId(event.target.value)}
                            style={styles.select}
                        >
                            {ONBOARDING_PLANS.map((plan) => (
                                <option key={plan.planId} value={plan.planId}>{plan.name}</option>
                            ))}
                        </select>
                    </div>

                    <fieldset style={styles.fieldset}>
                        <legend style={styles.label}>Checkout currency</legend>
                        <div style={styles.currencyGrid}>
                            {(['INR', 'USD'] as BillingCurrency[]).map((option) => (
                                <label key={option} style={styles.currencyOption}>
                                    <input
                                        type="radio"
                                        name="answerlattice-currency"
                                        value={option}
                                        checked={currency === option}
                                        onChange={() => setCurrency(option)}
                                        style={styles.checkboxInput}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div style={styles.planBadge}>
                        <span style={styles.planLabel}>{selectedPlan.name} plan</span>
                        <span style={styles.planPrice}>{selectedPlanPrice} / month</span>
                        <span style={styles.planDesc}>{selectedPlan.priceINR.monthlyCredits} support credits each month. Workspace setup creates a pending paid subscription and a one-time widget key.</span>
                    </div>

                    {error && <p style={styles.error} role="alert" aria-live="polite">{error}</p>}

                    <button
                        type="button"
                        style={styles.secondaryBtn}
                        onClick={() => {
                            setError(null);
                            setStep('details');
                        }}
                    >
                        Back to product details
                    </button>
                    <button
                        type="submit"
                        style={styles.primaryBtn}
                        data-answerlattice-event="onboarding_create_clicked"
                        data-answerlattice-label={`${planId}_${currency.toLowerCase()}`}
                    >
                        Choose {selectedPlan.name} and create workspace
                    </button>
                </form>
            )}

            {/* Step 4: Creating */}
            {step === 'creating' && (
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <h2 style={styles.cardTitle}>Setting up your account...</h2>
                    <p style={styles.cardSubtext}>Creating your workspace and preparing your widget key.</p>
                </div>
            )}

            {/* Step 5: Done */}
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
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Pending subscription</span>
                            <span style={styles.detailValue}>
                                {result.billing.currency === 'USD'
                                    ? `US$${Math.round(result.billing.amount / 100).toLocaleString('en-US')}`
                                    : `₹${Math.round(result.billing.amount / 100).toLocaleString('en-IN')}`} / month
                            </span>
                        </div>
                        {result.apiKey ? (
                            <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                                <span style={styles.detailLabel}>Widget key</span>
                                <code style={styles.apiKey}>{result.apiKey}</code>
                            </div>
                        ) : (
                            <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                                <span style={styles.detailLabel}>Widget key</span>
                                <span style={styles.detailValue}>
                                    The workspace was recovered safely. Create a new widget key from the dashboard before installation.
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={styles.nextSteps}>
                        <h3 style={styles.nextStepsTitle}>Next steps</h3>
                        <ol style={styles.stepsList}>
                            <li>Open Billing and continue the server-checked checkout</li>
                            <li>Check your activation dashboard</li>
                            <li>Teach AnswerLattice from selected links, docs, screenshots, recordings, or starter answers</li>
                            <li>Review generated product topics and answer drafts</li>
                            <li>Add the widget to your product and configure hosted help if needed</li>
                        </ol>
                    </div>

                    <a
                        href={result.subscription ? billingHref : mainDashboardHref}
                        style={styles.primaryBtn}
                        data-answerlattice-event="onboarding_dashboard_clicked"
                        data-answerlattice-label={result.subscription ? 'open_billing' : 'open_dashboard'}
                    >
                        {result.subscription ? 'Continue in Billing' : 'Open dashboard'}
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
        color: colors.textPrimary, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', minHeight: 44, justifyContent: 'center',
    },
    terms: { fontSize: 11, color: colors.textMuted, marginTop: 16, textAlign: 'center' },
    termsLink: { color: colors.primaryLight, fontWeight: 600 },
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
        minHeight: 44,
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
    fieldset: { width: '100%', margin: '0 0 16px 0', padding: 0, border: 0 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 },
    input: {
        width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${colors.borderStrong}`, background: colors.fieldBackground,
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    select: {
        width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${colors.borderStrong}`, background: colors.fieldBackground,
        color: colors.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' },
    checkboxOption: {
        minHeight: 44, borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', boxSizing: 'border-box',
    },
    checkboxInput: { width: 16, height: 16, accentColor: colors.primary },
    currencyGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' },
    currencyOption: {
        minHeight: 44, borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.surfaceRaised, color: colors.textBody, fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', boxSizing: 'border-box',
    },
    planBadge: {
        width: '100%', padding: '12px 16px', borderRadius: 8,
        border: '1px solid rgb(var(--al-primary-rgb) / 0.3)', background: 'rgb(var(--al-primary-rgb) / 0.08)',
        marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    },
    planLabel: { fontSize: 13, fontWeight: 600, color: colors.primaryLight },
    planPrice: { fontSize: 13, fontWeight: 700, color: colors.textPrimary },
    planDesc: { fontSize: 11, color: colors.textMuted, width: '100%' },
    eyebrow: {
        margin: '0 0 8px 0', color: colors.primaryLight, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center',
    },
    proofList: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
    proofItem: {
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px',
        borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surfaceRaised,
        boxSizing: 'border-box',
    },
    proofNumber: {
        width: 24, height: 24, flex: '0 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', background: 'rgb(var(--al-primary-rgb) / 0.14)', color: colors.primaryLight,
        fontSize: 12, fontWeight: 700,
    },
    proofText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
    proofTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: 700 },
    proofQuery: { color: colors.textSecondary, fontSize: 12, lineHeight: 1.5, overflowWrap: 'break-word' },
    proofBoundary: {
        width: '100%', margin: '0 0 16px 0', padding: '12px', borderRadius: 8,
        border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 11, lineHeight: 1.55,
        boxSizing: 'border-box',
    },
    launchSequence: {
        width: '100%', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8, color: colors.textBody, fontSize: 11, fontWeight: 600,
    },
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
