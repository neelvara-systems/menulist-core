'use client';

import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { useState } from 'react';

type OnboardingStep = 'auth' | 'details' | 'creating' | 'done';

interface OnboardResult {
    tenantId: number;
    storeId: number;
    apiKey: string;
    plan: { id: string; name: string; isBeta: boolean };
}

export default function OnboardingForm() {
    return (
        <SessionProvider>
            <OnboardingFormInner />
        </SessionProvider>
    );
}

function OnboardingFormInner() {
    const { data: session, status } = useSession();
    const [step, setStep] = useState<OnboardingStep>(status === 'authenticated' ? 'details' : 'auth');
    const [companyName, setCompanyName] = useState('');
    const [productName, setProductName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OnboardResult | null>(null);

    // Update step when session loads
    if (status === 'authenticated' && step === 'auth') {
        setStep('details');
    }

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: window.location.href });
    };

    const handleCreateAccount = async () => {
        if (!companyName.trim() || companyName.trim().length < 2) {
            setError('Company name must be at least 2 characters.');
            return;
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
                    planId: 'canonica_beta',
                    interval: 'MONTH',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setResult(data);
            setStep('done');
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
            setStep('details');
        }
    };

    return (
        <div style={styles.container}>
            {/* Step 1: Auth */}
            {step === 'auth' && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Create your Canonica account</h2>
                    <p style={styles.cardSubtext}>Sign in with Google to get started. Free during beta.</p>
                    <button onClick={handleGoogleSignIn} style={styles.googleBtn}>
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

            {/* Step 2: Company Details */}
            {step === 'details' && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Set up your account</h2>
                    <p style={styles.cardSubtext}>
                        Welcome{session?.user?.name ? `, ${session.user.name}` : ''}! Tell us about your product.
                    </p>

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

                    <div style={styles.planBadge}>
                        <span style={styles.planLabel}>Beta Plan</span>
                        <span style={styles.planPrice}>$0/mo</span>
                        <span style={styles.planDesc}>All features included. 6 months free.</span>
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button onClick={handleCreateAccount} style={styles.primaryBtn}>
                        Create Account
                    </button>
                </div>
            )}

            {/* Step 3: Creating */}
            {step === 'creating' && (
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <h2 style={styles.cardTitle}>Setting up your account...</h2>
                    <p style={styles.cardSubtext}>Creating your tenant, configuring your workspace, and generating your API key.</p>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && result && (
                <div style={styles.card}>
                    <div style={styles.successIcon}>✓</div>
                    <h2 style={styles.cardTitle}>Your Canonica account is ready!</h2>
                    <p style={styles.cardSubtext}>Here are your account details. Save your API key — you will need it to embed the widget.</p>

                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Tenant ID</span>
                            <span style={styles.detailValue}>{result.tenantId}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Plan</span>
                            <span style={styles.detailValue}>{result.plan.name}{result.plan.isBeta ? ' (Free)' : ''}</span>
                        </div>
                        <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                            <span style={styles.detailLabel}>API Key (save this!)</span>
                            <code style={styles.apiKey}>{result.apiKey}</code>
                        </div>
                    </div>

                    <div style={styles.nextSteps}>
                        <h3 style={styles.nextStepsTitle}>Next steps</h3>
                        <ol style={styles.stepsList}>
                            <li>Upload your KB articles to the dashboard</li>
                            <li>Run entity extraction to bootstrap your ontology</li>
                            <li>Create canonical answers for your top entities</li>
                            <li>Embed the widget in your product using your API key</li>
                        </ol>
                    </div>

                    <a href="/dashboard" style={styles.primaryBtn}>
                        Go to Dashboard
                    </a>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { maxWidth: 480, width: '100%' },
    card: {
        padding: '2rem',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    cardTitle: { fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 8px 0', textAlign: 'center' },
    cardSubtext: { fontSize: 14, color: '#a0a0c0', margin: '0 0 24px 0', textAlign: 'center', lineHeight: 1.5 },
    googleBtn: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px',
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
        color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', justifyContent: 'center',
    },
    terms: { fontSize: 11, color: '#6b6b8a', marginTop: 16, textAlign: 'center' },
    fieldGroup: { width: '100%', marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 6 },
    input: {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
        color: '#fff', fontSize: 14, outline: 'none',
    },
    planBadge: {
        width: '100%', padding: '12px 16px', borderRadius: 8,
        border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)',
        marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    },
    planLabel: { fontSize: 13, fontWeight: 600, color: '#8b8bff' },
    planPrice: { fontSize: 13, fontWeight: 700, color: '#fff' },
    planDesc: { fontSize: 11, color: '#6b6b8a', width: '100%' },
    error: { fontSize: 13, color: '#f87171', margin: '0 0 12px 0', textAlign: 'center' },
    primaryBtn: {
        display: 'block', width: '100%', padding: '12px 24px', borderRadius: 10,
        background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600,
        border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
        marginTop: 8,
    },
    spinner: {
        width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #6366f1', borderRadius: '50%',
        animation: 'spin 1s linear infinite', marginBottom: 16,
    },
    successIcon: {
        width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
        color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700, marginBottom: 16,
    },
    detailsGrid: {
        width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
    },
    detailItem: {
        padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
    },
    detailLabel: { display: 'block', fontSize: 11, color: '#6b6b8a', marginBottom: 4 },
    detailValue: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
    apiKey: {
        display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#8b8bff',
        background: 'rgba(99,102,241,0.1)', padding: '6px 10px', borderRadius: 6,
        wordBreak: 'break-all', marginTop: 4,
    },
    nextSteps: { width: '100%', marginBottom: 16 },
    nextStepsTitle: { fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 8px 0' },
    stepsList: { margin: 0, paddingLeft: 20, fontSize: 13, color: '#a0a0c0', lineHeight: 1.8 },
};
