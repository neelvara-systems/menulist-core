'use client';

import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import {
    ANSWERLATTICE_EARLY_ACCESS_STAGE_LABELS,
    ANSWERLATTICE_EARLY_ACCESS_STAGES,
    ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREA_LABELS,
    ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREAS,
    type AnswerlatticeEarlyAccessStage,
    type AnswerlatticeEarlyAccessSupportArea,
} from '@lib/answerlattice/earlyAccessContracts';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { FormEvent, useCallback, useState } from 'react';
import { LuArrowRight, LuLoader } from 'react-icons/lu';

type EarlyAccessFormState = {
    name: string;
    workEmail: string;
    productUrl: string;
    productStage: AnswerlatticeEarlyAccessStage;
    supportArea: AnswerlatticeEarlyAccessSupportArea;
    supportQuestions: string;
    featureIdea: string;
    consent: boolean;
    website: string;
};

const initialForm: EarlyAccessFormState = {
    name: '',
    workEmail: '',
    productUrl: '',
    productStage: 'building',
    supportArea: 'onboarding_setup',
    supportQuestions: '',
    featureIdea: '',
    consent: false,
    website: '',
};

const fieldClass = 'min-h-12 w-full rounded-xl border border-white/[0.09] bg-[#0f1023] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6b6b8a] focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15';
const labelClass = 'mb-2 block text-sm font-semibold text-[#f4f4ff]';
const MAX_RESPONSE_BYTES = 8 * 1024;
const FAILURE_MESSAGE = 'Could not register your request right now. Please try again.';

const getSourcePath = () => {
    if (typeof window === 'undefined') return '/early-access';
    return window.location.pathname.replace(/^\/__answerlattice/, '') || '/early-access';
};

export default function AnswerlatticeEarlyAccessForm({ basePath = '' }: { basePath?: string }) {
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
    const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
    const captchaRequired = isTurnstileClientEnabled();

    const updateField = <K extends keyof EarlyAccessFormState>(field: K, value: EarlyAccessFormState[K]) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const resetCaptcha = useCallback(() => {
        if (!captchaRequired) return;
        setCaptchaToken(null);
        setCaptchaResetSignal((current) => current + 1);
    }, [captchaRequired]);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (captchaRequired && !captchaToken) {
            setError('Complete the security check and try again.');
            return;
        }

        const logContext = {
            captchaRequired,
            hasCaptchaToken: Boolean(captchaToken),
            hasFeatureIdea: Boolean(form.featureIdea.trim()),
            productStage: form.productStage,
            supportArea: form.supportArea,
        };
        setSubmitting(true);

        try {
            const response = await fetch('/api/answerlattice/public/early-access', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    captchaToken: captchaToken || undefined,
                    featureIdea: form.featureIdea || null,
                    sourcePath: getSourcePath(),
                }),
            });
            const result = await readJsonResponseWithLimit<{ accepted?: boolean }>(response, MAX_RESPONSE_BYTES);
            resetCaptcha();

            if (!response.ok || result?.accepted !== true) {
                throw new Error(FAILURE_MESSAGE);
            }

            setSubmitted(true);
            setForm(initialForm);
        } catch (submissionError) {
            logRuntimeFailure('answerlattice_early_access_form_failed', submissionError, logContext);
            setError(FAILURE_MESSAGE);
            resetCaptcha();
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="rounded-3xl border border-teal-300/20 bg-teal-400/[0.045] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
                <ContextualStateIllustration
                    className="mx-auto mb-5 text-teal-300"
                    color="currentColor"
                    size={112}
                    treatment="plain"
                    variant="onboardingSuccessContext"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Request received</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">You&apos;re on the early-access list.</h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#b7b7d2]">
                    We&apos;re opening AnswerLattice to a small number of founder-led products at a time. If your product fits the current testing group, we&apos;ll email you a private setup invitation.
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-white">
                    No account, workspace, subscription, or payment has been created.
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    <a
                        href={`${basePath}/demo`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                        See how it works
                        <LuArrowRight aria-hidden size={16} />
                    </a>
                    <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="min-h-11 rounded-xl border border-white/[0.12] px-5 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24] hover:text-white"
                    >
                        Update my request
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-8">
            <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="answerlattice-early-access-name" className={labelClass}>Your name</label>
                        <input
                            id="answerlattice-early-access-name"
                            value={form.name}
                            onChange={(event) => updateField('name', event.target.value)}
                            className={fieldClass}
                            autoComplete="name"
                            placeholder="Your name"
                            required
                            minLength={2}
                            maxLength={120}
                        />
                    </div>
                    <div>
                        <label htmlFor="answerlattice-early-access-email" className={labelClass}>Work email</label>
                        <input
                            id="answerlattice-early-access-email"
                            type="email"
                            value={form.workEmail}
                            onChange={(event) => updateField('workEmail', event.target.value)}
                            className={fieldClass}
                            autoComplete="email"
                            placeholder="you@company.com"
                            required
                            maxLength={180}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="answerlattice-early-access-url" className={labelClass}>Product URL</label>
                    <input
                        id="answerlattice-early-access-url"
                        type="url"
                        value={form.productUrl}
                        onChange={(event) => updateField('productUrl', event.target.value)}
                        className={fieldClass}
                        autoComplete="url"
                        placeholder="https://yourproduct.com"
                        required
                        maxLength={300}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-[#6b6b8a]">We use this only to understand the product and its likely support flow.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="answerlattice-early-access-stage" className={labelClass}>Product stage</label>
                        <select
                            id="answerlattice-early-access-stage"
                            value={form.productStage}
                            onChange={(event) => updateField('productStage', event.target.value as AnswerlatticeEarlyAccessStage)}
                            className={fieldClass}
                        >
                            {ANSWERLATTICE_EARLY_ACCESS_STAGES.map((stage) => (
                                <option key={stage} value={stage}>{ANSWERLATTICE_EARLY_ACCESS_STAGE_LABELS[stage]}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="answerlattice-early-access-area" className={labelClass}>Where do users need help first?</label>
                        <select
                            id="answerlattice-early-access-area"
                            value={form.supportArea}
                            onChange={(event) => updateField('supportArea', event.target.value as AnswerlatticeEarlyAccessSupportArea)}
                            className={fieldClass}
                        >
                            {ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREAS.map((area) => (
                                <option key={area} value={area}>{ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREA_LABELS[area]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="answerlattice-early-access-questions" className={labelClass}>What are users asking, or likely to ask?</label>
                    <textarea
                        id="answerlattice-early-access-questions"
                        value={form.supportQuestions}
                        onChange={(event) => updateField('supportQuestions', event.target.value)}
                        className={`${fieldClass} min-h-32 resize-y`}
                        placeholder="Tell us where support is already repeating, or what you expect users to struggle with at launch."
                        required
                        minLength={10}
                        maxLength={1600}
                    />
                </div>

                <div>
                    <label htmlFor="answerlattice-early-access-idea" className={labelClass}>
                        What feature or idea would make AnswerLattice more useful for you? <span className="font-normal text-[#6b6b8a]">(optional)</span>
                    </label>
                    <textarea
                        id="answerlattice-early-access-idea"
                        value={form.featureIdea}
                        onChange={(event) => updateField('featureIdea', event.target.value)}
                        className={`${fieldClass} min-h-28 resize-y`}
                        placeholder="Share a workflow, integration, or support problem you wish the product handled."
                        maxLength={1200}
                    />
                    <div className="mt-2 text-right text-xs text-[#6b6b8a]">{form.featureIdea.length}/1200</div>
                </div>

                <div className="hidden" aria-hidden>
                    <label htmlFor="answerlattice-early-access-website">Website</label>
                    <input
                        id="answerlattice-early-access-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.website}
                        onChange={(event) => updateField('website', event.target.value)}
                    />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#0f1023] p-4 text-sm leading-relaxed text-[#a0a0c0]">
                    <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(event) => updateField('consent', event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/[0.14] bg-transparent accent-teal-400"
                        required
                    />
                    <span>
                        AnswerLattice can contact me about early access and this request. I agree to the{' '}
                        <a href={`${basePath}/privacy-policy`} className="font-semibold text-teal-300 hover:text-teal-200">privacy policy</a>
                        {' '}and{' '}
                        <a href={`${basePath}/terms-of-service`} className="font-semibold text-teal-300 hover:text-teal-200">terms</a>.
                    </span>
                </label>

                {error ? (
                    <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-100" role="alert">{error}</p>
                ) : null}

                <TurnstileWidget
                    action="answerlattice_early_access"
                    className="flex min-h-[65px] justify-center rounded-xl border border-white/[0.06] bg-[#0f1023] p-3"
                    onStatusChange={setCaptchaStatus}
                    onTokenChange={setCaptchaToken}
                    resetSignal={captchaResetSignal}
                    theme="dark"
                />

                {captchaRequired && captchaStatus === 'error' ? (
                    <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-100" role="alert">
                        Security check did not load. Refresh the page and try again.
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={submitting || (captchaRequired && !captchaToken)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {submitting ? <LuLoader aria-hidden className="animate-spin" size={17} /> : null}
                    {submitting ? 'Sending request...' : 'Request early access'}
                </button>

                <p className="text-center text-xs leading-relaxed text-[#6b6b8a]">
                    Requesting access does not create an account or start a payment.
                </p>
            </div>
        </form>
    );
}
