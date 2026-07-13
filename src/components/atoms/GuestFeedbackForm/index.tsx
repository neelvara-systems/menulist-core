'use client';

import { DEFAULT_FEEDBACK_SETTINGS, FeedbackDefaults, GuestFeedbackSubmitState } from '@type/guestFeedback';
import type { StoreDataType } from '@type/platform/store';
import OBPThemeToggle from '@/app/client/obp/OBPThemeToggle';
import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import {
    GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES,
    isGuestFeedbackSubmitResponse,
    isSuccessfulGuestFeedbackSubmitResponse,
    normalizeGuestFeedbackReviewUrl,
    type GuestFeedbackSubmitResponse,
} from '@lib/feedback/guestFeedbackSubmitResponse';
import {
    getBoundedPublicFeedbackStringContext,
    logPublicFeedbackFormFailure,
} from '@lib/feedback/publicFeedbackDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getMoodWithBrandColor, MenuMood } from '@template/main-app/projects/b2cView/designSystem';
import MenuFooter from '@template/main-app/projects/b2cView/output/MenuFooter';
import { message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuBadgeCheck,
    LuChevronRight,
    LuExternalLink,
    LuLock,
    LuMail,
    LuMessageSquare,
    LuPhone,
} from 'react-icons/lu';
import { StarRating } from './StarRating';
import styles from './index.module.scss';

interface GuestFeedbackFormProps {
    accentColor?: string;
    feedbackDefaults?: FeedbackDefaults;
    onSuccess?: (reviewUrl?: string | null) => void;
    officialPageUrl?: string;
    projectId: string;
    sId: number;
    source: 'menu_footer' | 'feedback_qr' | 'direct_link';
    storeDetails?: Record<string, any>;
    storeName?: string;
    tagline?: string;
    tId: number;
}

type FormState = {
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    message: string;
    website: string;
};

type FormErrors = Partial<Record<keyof Omit<FormState, 'website'>, string>>;

const DEFAULT_FORM_STATE: FormState = {
    customerEmail: '',
    customerName: '',
    customerPhone: '',
    message: '',
    website: '',
};

const GUEST_FEEDBACK_SUBMIT_FAILED_MESSAGE = 'Failed to submit feedback';
const GUEST_FEEDBACK_MESSAGE_MAX_LENGTH = 300;
const GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

const RATING_COPY: Record<number, { eyebrow: string; notePrompt: string; placeholder: string; prompt: string }> = {
    1: {
        eyebrow: 'Needs attention',
        prompt: 'Tell the team what needs attention.',
        notePrompt: 'A short note about what went wrong helps the business fix it.',
        placeholder: 'What went wrong, and what should the team improve?',
    },
    2: {
        eyebrow: 'Could be better',
        prompt: 'Tell the team what could be better.',
        notePrompt: 'Mention the main detail that would have improved your visit.',
        placeholder: 'What could have been better?',
    },
    3: {
        eyebrow: 'Good',
        prompt: 'Tell the team what would make it better next time.',
        notePrompt: 'Share one thing that was good and one thing that could improve.',
        placeholder: 'What was good, and what would make it better?',
    },
    4: {
        eyebrow: 'Very good',
        prompt: 'Tell the team what stood out.',
        notePrompt: 'Your note helps the team repeat what worked well.',
        placeholder: 'What stood out for you?',
    },
    5: {
        eyebrow: 'Excellent',
        prompt: 'Tell the team what they should keep doing.',
        notePrompt: 'A quick note helps the business understand what customers value.',
        placeholder: 'What should the team keep doing?',
    },
};

function getRatingLabel(rating: number): string {
    switch (rating) {
        case 1:
            return 'Needs attention';
        case 2:
            return 'Could be better';
        case 3:
            return 'Good';
        case 4:
            return 'Very good';
        case 5:
            return 'Excellent';
        default:
            return 'Tap a star to rate';
    }
}

function getGoogleReviewTitle(rating: number): string {
    return rating >= 4 ? 'Enjoyed your visit?' : 'Want to share more publicly?';
}

function isValidHexColor(value?: string): value is string {
    return !!value && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value);
}

function getReadableTextColor(backgroundColor?: string): string {
    if (!isValidHexColor(backgroundColor)) return '#ffffff';

    const hex = backgroundColor.length === 4
        ? `#${backgroundColor[1]}${backgroundColor[1]}${backgroundColor[2]}${backgroundColor[2]}${backgroundColor[3]}${backgroundColor[3]}`
        : backgroundColor;

    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

    return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

function createGuestFeedbackSubmitStatusError(code: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(code), {
        code,
        status,
    });
}

function buildGuestFeedbackSubmitLogContext({
    projectId,
    rating,
    responseOk,
    responseStatus,
    sId,
    source,
    tId,
}: {
    projectId: string;
    rating: number;
    responseOk?: boolean;
    responseStatus?: number;
    sId: number;
    source: GuestFeedbackFormProps['source'];
    tId: number;
}) {
    return {
        ...getBoundedPublicFeedbackStringContext('tenantId', tId),
        ...getBoundedPublicFeedbackStringContext('storeId', sId),
        ...getBoundedPublicFeedbackStringContext('projectId', projectId),
        ...getBoundedPublicFeedbackStringContext('source', source),
        maxBytes: GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES,
        rating,
        responseOk,
        responseStatus,
    };
}

async function readGuestFeedbackSubmitResponse(
    response: Response,
    context: {
        projectId: string;
        rating: number;
        sId: number;
        source: GuestFeedbackFormProps['source'];
        tId: number;
    },
): Promise<GuestFeedbackSubmitResponse | null> {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logPublicFeedbackFormFailure(
            'public_guest_feedback_submit_response_parse_failed',
            error,
            buildGuestFeedbackSubmitLogContext({
                ...context,
                responseOk: response.ok,
                responseStatus: response.status,
            }),
        );
        return null;
    }

    if (!isGuestFeedbackSubmitResponse(payload)) {
        logPublicFeedbackFormFailure(
            'public_guest_feedback_submit_response_invalid',
            createGuestFeedbackSubmitStatusError('public_guest_feedback_submit_response_invalid', response.status),
            buildGuestFeedbackSubmitLogContext({
                ...context,
                responseOk: response.ok,
                responseStatus: response.status,
            }),
        );
        return null;
    }

    return payload;
}

function validateField(field: keyof Omit<FormState, 'website'>, value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) return '';

    if (field === 'message') {
        return trimmedValue.length > 0 && trimmedValue.length < 3
            ? 'Please add a little more detail or leave this blank.'
            : '';
    }

    if (field === 'customerName') {
        if (trimmedValue.length < 2) return 'Please enter at least 2 characters.';
        if (!/^[A-Za-z\s'.-]+$/.test(trimmedValue)) return 'Please enter a valid name.';
        return '';
    }

    if (field === 'customerEmail') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? '' : 'Please enter a valid email address.';
    }

    if (field === 'customerPhone') {
        if (trimmedValue.length > 0) {
            const digitsOnly = trimmedValue.replace(/\D/g, '');
            if (digitsOnly.length < 7) return 'Please enter a valid phone number.';
            if (!/^[0-9+\-\s()]+$/.test(trimmedValue)) return 'Please enter a valid phone number.';
        }
        return '';
    }

    return '';
}

function getFormErrors(values: FormState, settings: FeedbackDefaults): FormErrors {
    return {
        customerEmail: settings.collectEmail
            ? (!values.customerEmail.trim() && settings.collectEmailRequired ? 'Email is required.' : validateField('customerEmail', values.customerEmail))
            : '',
        customerName: settings.collectName
            ? (!values.customerName.trim() && settings.collectNameRequired ? 'Name is required.' : validateField('customerName', values.customerName))
            : '',
        customerPhone: settings.collectPhone
            ? (!values.customerPhone.trim() && settings.collectPhoneRequired ? 'Phone is required.' : validateField('customerPhone', values.customerPhone))
            : '',
        message: settings.collectComment
            ? (!values.message.trim() && settings.collectCommentRequired ? 'Comment is required.' : validateField('message', values.message))
            : '',
    };
}

export const GuestFeedbackForm: React.FC<GuestFeedbackFormProps> = ({
    accentColor,
    feedbackDefaults,
    onSuccess,
    officialPageUrl,
    projectId,
    sId,
    source,
    storeDetails,
    storeName,
    tagline,
    tId,
}) => {
    const [formValues, setFormValues] = useState<FormState>(DEFAULT_FORM_STATE);
    const [rating, setRating] = useState<number>(0);
    const [submitState, setSubmitState] = useState<GuestFeedbackSubmitState>('idle');
    const [reviewUrl, setReviewUrl] = useState<string | null>(null);
    const [ratingTouched, setRatingTouched] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof Omit<FormState, 'website'>, boolean>>>({});
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
    const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
    const captchaRequired = isTurnstileClientEnabled();

    const settings = { ...DEFAULT_FEEDBACK_SETTINGS, ...feedbackDefaults };
    const ratingCopy = RATING_COPY[rating] || {
        eyebrow: 'Your feedback goes straight to the business.',
        notePrompt: 'After choosing a rating, add a short note so the team knows what to act on.',
        placeholder: 'What stood out, or what could have been better?',
        prompt: 'Share what stood out, or what could have been better.',
    };
    const formErrors = useMemo(() => getFormErrors(formValues, settings), [formValues, settings]);
    const hasVisibleErrors = Object.values(formErrors).some(Boolean);
    const moodConfig = useMemo(() => getMoodWithBrandColor(MenuMood.CLEAN, accentColor), [accentColor]);
    const primaryCtaColor = accentColor || moodConfig.accentColor;
    const primaryCtaTextColor = getReadableTextColor(primaryCtaColor);

    useEffect(() => {
        if (submitState !== 'success') return;

        const scrollToTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };

        requestAnimationFrame(scrollToTop);
        const fallbackTimer = window.setTimeout(scrollToTop, 80);

        return () => {
            window.clearTimeout(fallbackTimer);
        };
    }, [submitState]);

    const updateField = (field: keyof FormState, value: string) => {
        setFormValues((current) => ({ ...current, [field]: value }));
    };

    const markFieldTouched = (field: keyof Omit<FormState, 'website'>) => {
        setTouchedFields((current) => ({ ...current, [field]: true }));
    };

    const resetCaptcha = useCallback(() => {
        if (!captchaRequired) return;
        setCaptchaToken(null);
        setCaptchaResetSignal((current) => current + 1);
    }, [captchaRequired]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (rating === 0) {
            setRatingTouched(true);
            message.error('Please select a rating');
            return;
        }

        if (hasVisibleErrors) {
            setTouchedFields({
                customerEmail: true,
                customerName: true,
                customerPhone: true,
                message: true,
            });
            message.error('Please check the highlighted fields');
            return;
        }

        if (captchaRequired && !captchaToken) {
            message.error('Complete the security check and try again.');
            return;
        }

        setSubmitState('submitting');

        try {
            const response = await fetch('/api/public/feedback/submit', {
                ...GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tId,
                    sId,
                    projectId,
                    source,
                    rating,
                    message: settings.collectComment ? formValues.message.trim() || undefined : undefined,
                    customerName: formValues.customerName.trim() || undefined,
                    customerPhone: formValues.customerPhone.trim() || undefined,
                    customerEmail: formValues.customerEmail.trim() || undefined,
                    website: formValues.website,
                    captchaToken: captchaToken || undefined,
                }),
            });

            const data = await readGuestFeedbackSubmitResponse(response, {
                projectId,
                rating,
                sId,
                source,
                tId,
            });
            resetCaptcha();

            if (response.ok && isSuccessfulGuestFeedbackSubmitResponse(data)) {
                const nextReviewUrl = normalizeGuestFeedbackReviewUrl(data.reviewUrl, 'submit_response_review_url');
                setSubmitState('success');
                setReviewUrl(nextReviewUrl);
                onSuccess?.(nextReviewUrl);
                return;
            }

            setSubmitState('error');
            message.error(GUEST_FEEDBACK_SUBMIT_FAILED_MESSAGE);
        } catch (error) {
            logPublicFeedbackFormFailure(
                'public_guest_feedback_submit_request_failed',
                error,
                buildGuestFeedbackSubmitLogContext({
                    projectId,
                    rating,
                    sId,
                    source,
                    tId,
                }),
            );
            resetCaptcha();
            setSubmitState('error');
            message.error('Network error. Please try again.');
        }
    };

    const submitDisabled = rating === 0 || submitState === 'submitting' || (captchaRequired && !captchaToken);

    const publicFooter = storeDetails ? (
        <div className={styles.menuFooter}>
            <MenuFooter
                storeDetails={storeDetails as StoreDataType}
                moodConfig={moodConfig}
                projectId={projectId}
                feedbackEnabled
                showLanguageSelector={false}
                showUpdateMeta={false}
                showFeedbackLink={false}
                trackingEnabled={false}
                footerExtraAction={(
                    <OBPThemeToggle
                        switchToDarkLabel="Switch to dark theme"
                        switchToLightLabel="Switch to light theme"
                    />
                )}
            />
        </div>
    ) : null;

    if (submitState === 'success') {
        return (
            <div className={styles.surface} style={{ '--feedback-accent': primaryCtaColor } as React.CSSProperties}>
                <section className={styles.successWrap}>
                    <div className={styles.successInner}>
                        <div className={styles.successIcon}>
                            <LuBadgeCheck size={30} strokeWidth={2.4} />
                        </div>
                        <span className={styles.successBadge}>
                            Feedback received
                        </span>
                        <h2 className={styles.successTitle}>
                            Thank you for sharing.
                        </h2>
                        <p className={styles.successText}>
                            Your note goes directly to {storeName || 'the team'}.
                        </p>

                        <div className={styles.successPanel}>
                            <div className={styles.successPanelRow}>
                                <div className={styles.successPanelIcon}>
                                    <LuLock size={18} />
                                </div>
                                <div>
                                    <p className={styles.successPanelTitle}>Private feedback</p>
                                    <p className={styles.successPanelText}>
                                        No action needed. Your message stays with the business.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {reviewUrl ? (
                            <div className={`${styles.successPanel} ${styles.successPanelWarm}`}>
                                <p className={styles.successPanelTitle}>{getGoogleReviewTitle(rating)}</p>
                                <p className={styles.successPanelText}>
                                    You can also leave a public review on Google.
                                </p>
                                <a
                                    className={styles.reviewLink}
                                    href={reviewUrl}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    Leave a Google review
                                    <LuExternalLink size={16} />
                                </a>
                                {officialPageUrl ? (
                                    <a
                                        className={styles.secondaryLink}
                                        href={officialPageUrl}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        View business page
                                        <LuExternalLink size={16} />
                                    </a>
                                ) : null}
                            </div>
                        ) : officialPageUrl ? (
                            <div className={styles.successPanel}>
                                <p className={styles.successPanelTitle}>Business page</p>
                                <p className={styles.successPanelText}>
                                    View the latest menu and business details.
                                </p>
                                <a
                                    className={styles.secondaryLink}
                                    href={officialPageUrl}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    View business page
                                    <LuExternalLink size={16} />
                                </a>
                            </div>
                        ) : null}
                    </div>
                </section>
                {publicFooter}
            </div>
        );
    }

    return (
        <div className={styles.surface} style={{ '--feedback-accent': primaryCtaColor } as React.CSSProperties}>
            <main className={styles.shell}>
                <div className={styles.content}>
                    <div className={styles.hero}>
                        <h1 className={styles.heroTitle}>
                            Share feedback
                        </h1>

                        <p className={styles.heroText}>
                            {tagline?.trim()
                                ? `${tagline.trim()} Your note goes directly to ${storeName || 'the team'}.`
                                : `Your note goes directly to ${storeName || 'the team'}.`}
                        </p>
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.stack}>
                            <section className={`${styles.panel} ${styles.panelSoft}`}>
                                <div className={styles.ratingIntro}>
                                    <p className={styles.eyebrow}>
                                        How was your visit?
                                    </p>
                                    <p className={styles.ratingTitle}>
                                        {getRatingLabel(rating)}
                                    </p>
                                    <p className={styles.ratingText}>
                                        {ratingCopy.prompt}
                                    </p>
                                </div>

                                <div className={styles.ratingBox}>
                                    <StarRating
                                        disabled={submitState === 'submitting'}
                                        onChange={(nextRating) => {
                                            setRating(nextRating);
                                            setRatingTouched(true);
                                        }}
                                        size={28}
                                        value={rating}
                                    />
                                </div>

                                {ratingTouched && rating === 0 ? (
                                    <p className={styles.errorText}>
                                        Please select a rating to continue.
                                    </p>
                                ) : null}

                                {settings.collectComment ? (
                                    <div className={`${styles.fieldBlock} ${styles.noteBlock}`}>
                                        <div className={styles.notePromptRow}>
                                            <div className={styles.panelIcon}>
                                                <LuMessageSquare size={18} />
                                            </div>
                                            <div>
                                                <label className={styles.notePromptTitle} htmlFor="guest-feedback-message">
                                                    {settings.collectCommentRequired ? 'Add a note' : 'Add a note if you want'}
                                                </label>
                                                <p className={styles.notePromptText} id="guest-feedback-message-prompt">{ratingCopy.notePrompt}</p>
                                            </div>
                                        </div>
                                        <textarea
                                            aria-describedby={[
                                                'guest-feedback-message-prompt',
                                                'guest-feedback-message-meta',
                                                touchedFields.message && formErrors.message ? 'guest-feedback-message-error' : '',
                                            ].filter(Boolean).join(' ')}
                                            aria-invalid={Boolean(touchedFields.message && formErrors.message)}
                                            className={`${styles.textarea} ${touchedFields.message && formErrors.message ? styles.inputInvalid : ''}`}
                                            disabled={submitState === 'submitting'}
                                            id="guest-feedback-message"
                                            maxLength={GUEST_FEEDBACK_MESSAGE_MAX_LENGTH}
                                            name="message"
                                            onBlur={() => markFieldTouched('message')}
                                            onChange={(event) => updateField(
                                                'message',
                                                event.target.value.slice(0, GUEST_FEEDBACK_MESSAGE_MAX_LENGTH),
                                            )}
                                            placeholder={ratingCopy.placeholder}
                                            value={formValues.message}
                                        />
                                        {touchedFields.message && formErrors.message ? (
                                            <p className={styles.fieldError} id="guest-feedback-message-error">{formErrors.message}</p>
                                        ) : null}
                                        <div className={styles.metaRow} id="guest-feedback-message-meta">
                                            <span>
                                                {formValues.message.length > 0
                                                    ? `${formValues.message.length}/${GUEST_FEEDBACK_MESSAGE_MAX_LENGTH}`
                                                    : `Up to ${GUEST_FEEDBACK_MESSAGE_MAX_LENGTH} characters`}
                                            </span>
                                            <span>Your feedback stays private.</span>
                                        </div>
                                    </div>
                                ) : null}
                            </section>

                            {(settings.collectName || settings.collectPhone || settings.collectEmail) ? (
                                <section className={`${styles.panel} ${styles.panelMuted}`}>
                                    <div className={styles.panelHeader}>
                                        <div className={`${styles.panelIcon} ${styles.panelIconWhite}`}>
                                            <LuLock size={18} />
                                        </div>
                                        <div>
                                            <h2 className={styles.panelTitle}>Contact details</h2>
                                            <p className={styles.panelText}>
                                                Add your contact details below.
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.fields}>
                                        {settings.collectName ? (
                                            <Field
                                                error={touchedFields.customerName ? formErrors.customerName : ''}
                                                label="Name"
                                                name="customerName"
                                                onBlur={() => markFieldTouched('customerName')}
                                                onChange={(value) => updateField('customerName', value)}
                                                placeholder="Your name"
                                                type="text"
                                                value={formValues.customerName}
                                            />
                                        ) : null}

                                        {settings.collectPhone ? (
                                            <Field
                                                icon={<LuPhone size={16} />}
                                                error={touchedFields.customerPhone ? formErrors.customerPhone : ''}
                                                label="Phone number"
                                                name="customerPhone"
                                                onBlur={() => markFieldTouched('customerPhone')}
                                                onChange={(value) => updateField('customerPhone', value)}
                                                placeholder="+1 (555) 000-0000"
                                                type="tel"
                                                value={formValues.customerPhone}
                                            />
                                        ) : null}

                                        {settings.collectEmail ? (
                                            <Field
                                                icon={<LuMail size={16} />}
                                                error={touchedFields.customerEmail ? formErrors.customerEmail : ''}
                                                label="Email address"
                                                name="customerEmail"
                                                onBlur={() => markFieldTouched('customerEmail')}
                                                onChange={(value) => updateField('customerEmail', value)}
                                                placeholder="name@example.com"
                                                type="email"
                                                value={formValues.customerEmail}
                                            />
                                        ) : null}
                                    </div>
                                </section>
                            ) : null}

                            <input
                                aria-hidden="true"
                                autoComplete="off"
                                className={styles.hiddenField}
                                onChange={(event) => updateField('website', event.target.value)}
                                tabIndex={-1}
                                value={formValues.website}
                            />

                            <TurnstileWidget
                                action="guest_feedback"
                                onStatusChange={setCaptchaStatus}
                                onTokenChange={setCaptchaToken}
                                resetSignal={captchaResetSignal}
                                theme="auto"
                            />

                            {captchaRequired && captchaStatus === 'error' ? (
                                <p className={styles.errorText}>
                                    Security check did not load. Refresh the page and try again.
                                </p>
                            ) : null}

                            <button
                                className={[
                                    styles.cta,
                                    submitDisabled ? styles.ctaDisabled : '',
                                ].filter(Boolean).join(' ')}
                                disabled={submitDisabled}
                                style={submitDisabled
                                    ? undefined
                                    : { background: primaryCtaColor, color: primaryCtaTextColor }}
                                type="submit"
                            >
                                {submitState === 'submitting' ? 'Submitting feedback...' : 'Submit feedback'}
                                {submitState === 'submitting' ? null : <LuChevronRight size={18} />}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            {publicFooter}
        </div>
    );
};

function Field({
    icon,
    error,
    label,
    name,
    onChange,
    onBlur,
    placeholder,
    type,
    value,
}: {
    icon?: React.ReactNode;
    error?: string;
    label: string;
    name: 'customerEmail' | 'customerName' | 'customerPhone';
    onChange: (value: string) => void;
    onBlur: () => void;
    placeholder: string;
    type: React.HTMLInputTypeAttribute;
    value: string;
}) {
    return (
        <label className={styles.field}>
            <div className={styles.inputWrap}>
                {icon ? <span className={styles.inputIcon}>{icon}</span> : null}
                <input
                    aria-describedby={error ? `guest-feedback-${name}-error` : undefined}
                    aria-invalid={Boolean(error)}
                    aria-label={label}
                    autoComplete={name === 'customerName' ? 'name' : name === 'customerPhone' ? 'tel' : 'email'}
                    className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${error ? styles.inputInvalid : ''}`}
                    id={`guest-feedback-${name}`}
                    inputMode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text'}
                    maxLength={type === 'email' ? 120 : type === 'tel' ? 20 : 60}
                    name={name}
                    onBlur={onBlur}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    type={type}
                    value={value}
                />
            </div>
            {error ? <p className={styles.fieldError} id={`guest-feedback-${name}-error`}>{error}</p> : null}
        </label>
    );
}

export default GuestFeedbackForm;
