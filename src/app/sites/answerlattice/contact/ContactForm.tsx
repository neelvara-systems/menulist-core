'use client';

import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { FormEvent, useCallback, useState } from 'react';
import { LuCheckCircle, LuLoader, LuSend } from 'react-icons/lu';

type ContactTopic = 'setup' | 'demo' | 'pricing' | 'partnership' | 'security' | 'other';

type ContactFormState = {
    name: string;
    workEmail: string;
    phoneNumber: string;
    productUrl: string;
    helpTopic: ContactTopic;
    message: string;
    consent: boolean;
    website: string;
};

const HELP_TOPICS: Array<{ value: ContactTopic; label: string }> = [
    { value: 'setup', label: 'Setup help' },
    { value: 'demo', label: 'Product demo' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'security', label: 'Security review' },
    { value: 'other', label: 'Other' },
];

const initialForm: ContactFormState = {
    name: '',
    workEmail: '',
    phoneNumber: '',
    productUrl: '',
    helpTopic: 'setup',
    message: '',
    consent: false,
    website: '',
};

const fieldClass =
    'min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1023] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6b6b8a] focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15';

const labelClass = 'mb-2 block text-sm font-semibold text-[#f4f4ff]';
const ANSWERLATTICE_CONTACT_FAILED_MESSAGE = 'Could not send right now. Please email hello@answerlattice.com.';
const ANSWERLATTICE_SECURITY_CHECK_REQUIRED_MESSAGE = 'Complete the security check and try again.';
const ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

type AnswerlatticeContactResponse = {
    accepted?: boolean;
};

type AnswerlatticeContactResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const readAnswerlatticeContactResponseJson = async (
    response: Response,
    context: AnswerlatticeContactResponseLogContext,
): Promise<AnswerlatticeContactResponse | null> => {
    try {
        return await readJsonResponseWithLimit<AnswerlatticeContactResponse>(
            response,
            ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_public_contact_response_parse_failed', error, {
            ...context,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES,
        });
        return null;
    }
};

const getSourcePath = () => {
    if (typeof window === 'undefined') return '/contact';
    return window.location.pathname.replace(/^\/__answerlattice/, '') || '/contact';
};

export default function AnswerlatticeContactForm({ basePath = '' }: { basePath?: string }) {
    const [form, setForm] = useState<ContactFormState>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
    const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
    const captchaRequired = isTurnstileClientEnabled();

    const linkTo = (path: string) => `${basePath}${path}`;

    const updateField = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => {
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
        const sourcePath = getSourcePath();
        const responseLogContext = {
            captchaRequired,
            captchaStatus,
            hasCaptchaToken: Boolean(captchaToken),
            hasPhoneNumber: Boolean(form.phoneNumber),
            hasProductUrl: Boolean(form.productUrl),
            messageLength: form.message.length,
            helpTopic: form.helpTopic,
            sourcePathLength: sourcePath.length,
        };

        if (captchaRequired && !captchaToken) {
            setError(ANSWERLATTICE_SECURITY_CHECK_REQUIRED_MESSAGE);
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/answerlattice/public/contact', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    sourcePath,
                    phoneNumber: form.phoneNumber || null,
                    productUrl: form.productUrl || null,
                    captchaToken: captchaToken || undefined,
                }),
            });
            const result = await readAnswerlatticeContactResponseJson(response, responseLogContext);
            resetCaptcha();

            if (!response.ok || !result?.accepted) {
                if (response.ok) {
                    logRuntimeFailure('answerlattice_public_contact_response_invalid', new Error('answerlattice_public_contact_response_invalid'), {
                        ...responseLogContext,
                        responseStatus: response.status,
                    });
                }
                throw new Error(ANSWERLATTICE_CONTACT_FAILED_MESSAGE);
            }

            setSubmitted(true);
            setForm(initialForm);
        } catch {
            setError(ANSWERLATTICE_CONTACT_FAILED_MESSAGE);
            resetCaptcha();
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="rounded-2xl border border-teal-300/20 bg-teal-400/[0.04] p-8 text-center shadow-2xl shadow-black/30">
                <LuCheckCircle size={48} className="mx-auto mb-5 text-teal-300" aria-hidden />
                <h2 className="text-2xl font-semibold text-white">Message received.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                    We will review the details and reply from hello@answerlattice.com. Include your product URL in the next message if you missed it.
                </p>
                <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-7 min-h-11 rounded-xl border border-white/[0.1] px-5 py-3 text-sm font-semibold text-white transition hover:border-teal-300/35 hover:bg-white/[0.04]"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-7">
            <div className="grid gap-5">
                <div>
                    <label htmlFor="answerlattice-contact-name" className={labelClass}>Name</label>
                    <input
                        id="answerlattice-contact-name"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        className={fieldClass}
                        placeholder="Your name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="answerlattice-contact-email" className={labelClass}>Work email</label>
                        <input
                            id="answerlattice-contact-email"
                            type="email"
                            value={form.workEmail}
                            onChange={(event) => updateField('workEmail', event.target.value)}
                            className={fieldClass}
                            placeholder="you@company.com"
                            autoComplete="email"
                            required
                            maxLength={180}
                        />
                    </div>
                    <div>
                        <label htmlFor="answerlattice-contact-phone" className={labelClass}>Phone</label>
                        <input
                            id="answerlattice-contact-phone"
                            type="tel"
                            value={form.phoneNumber}
                            onChange={(event) => updateField('phoneNumber', event.target.value)}
                            className={fieldClass}
                            placeholder="Optional"
                            autoComplete="tel"
                            maxLength={40}
                        />
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="answerlattice-contact-url" className={labelClass}>Product URL</label>
                        <input
                            id="answerlattice-contact-url"
                            type="url"
                            value={form.productUrl}
                            onChange={(event) => updateField('productUrl', event.target.value)}
                            className={fieldClass}
                            placeholder="https://yourapp.com"
                            autoComplete="url"
                            maxLength={240}
                        />
                    </div>
                    <div>
                        <label htmlFor="answerlattice-contact-topic" className={labelClass}>What do you need?</label>
                        <select
                            id="answerlattice-contact-topic"
                            value={form.helpTopic}
                            onChange={(event) => updateField('helpTopic', event.target.value as ContactTopic)}
                            className={fieldClass}
                        >
                            {HELP_TOPICS.map((topic) => (
                                <option key={topic.value} value={topic.value}>{topic.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="answerlattice-contact-message" className={labelClass}>Message</label>
                    <textarea
                        id="answerlattice-contact-message"
                        value={form.message}
                        onChange={(event) => updateField('message', event.target.value)}
                        className={`${fieldClass} min-h-36 resize-y`}
                        placeholder="Tell us what you are launching, where support breaks today, and what you need next."
                        required
                        minLength={10}
                        maxLength={2000}
                    />
                </div>

                <div className="hidden" aria-hidden>
                    <label htmlFor="answerlattice-contact-website">Website</label>
                    <input
                        id="answerlattice-contact-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.website}
                        onChange={(event) => updateField('website', event.target.value)}
                    />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0f1023] p-4 text-sm leading-relaxed text-[#a0a0c0]">
                    <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(event) => updateField('consent', event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/[0.14] bg-transparent accent-teal-400"
                        required
                    />
                    <span>
                        AnswerLattice can contact me about this request. I agree to the{' '}
                        <a href={linkTo('/privacy-policy')} className="font-semibold text-teal-300 hover:text-teal-200">privacy policy</a>
                        {' '}and{' '}
                        <a href={linkTo('/terms-of-service')} className="font-semibold text-teal-300 hover:text-teal-200">terms</a>.
                    </span>
                </label>

                {error && (
                    <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-100" role="alert">
                        {error}
                    </p>
                )}

                <TurnstileWidget
                    action="answerlattice_contact"
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
                    {submitting ? <LuLoader size={17} className="animate-spin" aria-hidden /> : <LuSend size={17} aria-hidden />}
                    {submitting ? 'Sending...' : 'Send message'}
                </button>
            </div>
        </form>
    );
}
