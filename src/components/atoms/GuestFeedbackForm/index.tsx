'use client';

import { DEFAULT_FEEDBACK_SETTINGS, FeedbackDefaults, GuestFeedbackSubmitState } from '@type/guestFeedback';
import { message } from 'antd';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import {
    LuBadgeCheck,
    LuChevronRight,
    LuExternalLink,
    LuLock,
    LuMail,
    LuMessageSquare,
    LuPhone,
    LuStar,
} from 'react-icons/lu';
import { StarRating } from './StarRating';
import styles from './index.module.scss';

interface GuestFeedbackFormProps {
    accentColor?: string;
    feedbackDefaults?: FeedbackDefaults;
    logoUrl?: string;
    onSuccess?: (reviewUrl?: string | null) => void;
    officialPageUrl?: string;
    phoneNumber?: string;
    projectId: string;
    sId: number;
    source: 'menu_footer' | 'feedback_qr' | 'direct_link';
    storeName?: string;
    tagline?: string;
    tId: number;
    whatsappNumber?: string;
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

const RATING_COPY: Record<number, { eyebrow: string; prompt: string }> = {
    1: {
        eyebrow: 'We want to improve this.',
        prompt: 'Tell us what felt off so the team can fix it quickly.',
    },
    2: {
        eyebrow: 'Thanks for being honest.',
        prompt: 'A quick note helps the team understand what to improve.',
    },
    3: {
        eyebrow: 'Good start.',
        prompt: 'What would have made the experience better for you?',
    },
    4: {
        eyebrow: 'Glad to hear it.',
        prompt: 'What stood out for you the most?',
    },
    5: {
        eyebrow: 'That is lovely to hear.',
        prompt: 'What should the team keep doing exactly like this?',
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

function getInsightCardCopy(rating: number): { description: string; title: string } {
    if (rating >= 4) {
        return {
            title: 'Help us repeat what worked',
            description: 'Mention one moment worth repeating so the team knows what guests truly notice.',
        };
    }

    if (rating > 0) {
        return {
            title: 'Small details help most',
            description: 'A short note about timing, service, taste, or atmosphere gives the team clear direction.',
        };
    }

    return {
        title: 'A short note goes a long way',
        description: 'Guests often mention service, taste, cleanliness, comfort, or wait time. Even one sentence helps.',
    };
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
    logoUrl,
    onSuccess,
    officialPageUrl,
    phoneNumber,
    projectId,
    sId,
    source,
    storeName,
    tagline,
    tId,
    whatsappNumber,
}) => {
    const [formValues, setFormValues] = useState<FormState>(DEFAULT_FORM_STATE);
    const [rating, setRating] = useState<number>(0);
    const [submitState, setSubmitState] = useState<GuestFeedbackSubmitState>('idle');
    const [reviewUrl, setReviewUrl] = useState<string | null>(null);
    const [ratingTouched, setRatingTouched] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof Omit<FormState, 'website'>, boolean>>>({});

    const settings = { ...DEFAULT_FEEDBACK_SETTINGS, ...feedbackDefaults };
    const ratingCopy = RATING_COPY[rating] || {
        eyebrow: 'Your feedback goes straight to the business.',
        prompt: 'Share what stood out, or what could have been better.',
    };
    const insightCard = useMemo(() => getInsightCardCopy(rating), [rating]);
    const formErrors = useMemo(() => getFormErrors(formValues, settings), [formValues, settings]);
    const hasVisibleErrors = Object.values(formErrors).some(Boolean);
    const primaryCtaColor = isValidHexColor(accentColor) ? accentColor : '#0f172a';
    const primaryCtaTextColor = getReadableTextColor(primaryCtaColor);
    const callHref = phoneNumber?.trim() ? `tel:${phoneNumber.trim().replace(/\s+/g, '')}` : '';
    const whatsappValue = whatsappNumber?.trim() || phoneNumber?.trim() || '';
    const whatsappHref = whatsappValue ? `https://wa.me/${whatsappValue.replace(/[^\d]/g, '')}` : '';

    const updateField = (field: keyof FormState, value: string) => {
        setFormValues((current) => ({ ...current, [field]: value }));
    };

    const markFieldTouched = (field: keyof Omit<FormState, 'website'>) => {
        setTouchedFields((current) => ({ ...current, [field]: true }));
    };

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

        setSubmitState('submitting');

        try {
            const response = await fetch('/api/public/feedback/submit', {
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
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitState('success');
                setReviewUrl(data.reviewUrl || null);
                onSuccess?.(data.reviewUrl);
                return;
            }

            setSubmitState('error');
            const validationMessage = Array.isArray(data.details) && data.details.length > 0
                ? data.details[0]?.message
                : '';
            message.error(validationMessage || data.error || 'Failed to submit feedback');
        } catch {
            setSubmitState('error');
            message.error('Network error. Please try again.');
        }
    };

    if (submitState === 'success') {
        return (
            <div className={styles.successWrap}>
                <div className={styles.successInner}>
                    {(logoUrl || storeName) ? (
                        <div className={styles.brandRow} style={{ justifyContent: 'center', marginBottom: 20 }}>
                            {logoUrl ? (
                                <div className={styles.brandLogo}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img alt={storeName || 'Business logo'} src={logoUrl} />
                                </div>
                            ) : null}
                            {storeName ? (
                                <div className={styles.brandMeta}>
                                    <p className={styles.brandName}>{storeName}</p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

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
                        Your note goes directly to {storeName || 'the team'} and helps improve the guest experience.
                    </p>

                    <div className={styles.successPanel}>
                        <div className={styles.successPanelRow}>
                            <div className={styles.successPanelIcon}>
                                <LuLock size={18} />
                            </div>
                            <div>
                                <p className={styles.successPanelTitle}>Private feedback</p>
                                <p className={styles.successPanelText}>
                                    No action needed. Your message stays with the business and is reviewed privately.
                                </p>
                            </div>
                        </div>
                    </div>

                    {reviewUrl ? (
                        <div className={`${styles.successPanel} ${styles.successPanelWarm}`}>
                            <p className={styles.successPanelTitle}>{getGoogleReviewTitle(rating)}</p>
                            <p className={styles.successPanelText}>
                                If you want, you can also leave a public review on Google.
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
                            <p className={styles.successPanelTitle}>Continue browsing</p>
                            <p className={styles.successPanelText}>
                                You can go back to the main business page anytime to view the latest menu and details.
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
            </div>
        );
    }

    return (
        <div className={styles.shell}>
            <div className={styles.content}>
                <div>
                    {(logoUrl || storeName || officialPageUrl) ? (
                        <div className={styles.brandRow}>
                            {logoUrl ? (
                                <div className={styles.brandLogo}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img alt={storeName || 'Business logo'} src={logoUrl} />
                                </div>
                            ) : null}
                            <div className={styles.brandMeta}>
                                {storeName ? <p className={styles.brandName}>{storeName}</p> : null}
                                {officialPageUrl ? (
                                    <a className={styles.brandLink} href={officialPageUrl} rel="noopener noreferrer" target="_blank">
                                        View official page
                                        <LuExternalLink size={14} />
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <h1 className={styles.heroTitle}>
                        Share your experience
                    </h1>

                    <p className={styles.heroText}>
                        {tagline?.trim()
                            ? `${tagline.trim()} A quick note helps ${storeName || 'the team'} understand what felt great and what can be improved.`
                            : `A quick note helps ${storeName || 'the team'} understand what felt great and what can be improved.`}
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

                            {rating > 0 ? (
                                <div className={styles.hintBox}>
                                    <p className={styles.hintTitle}>{ratingCopy.eyebrow}</p>
                                    <p className={styles.hintText}>{ratingCopy.prompt}</p>
                                </div>
                            ) : null}
                        </section>

                        {settings.collectComment ? (
                        <section className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <div className={styles.panelIcon}>
                                    <LuMessageSquare size={18} />
                                </div>
                                <div>
                                <h2 className={styles.panelTitle}>Tell us more</h2>
                                <p className={styles.panelText}>
                                    {settings.collectCommentRequired
                                        ? 'Required. Share what stood out or what could be better.'
                                        : 'Optional. Share what stood out or what could be better.'}
                                </p>
                            </div>
                        </div>

                            <div style={{ marginTop: 16 }}>
                                <textarea
                                    className={`${styles.textarea} ${touchedFields.message && formErrors.message ? styles.inputInvalid : ''}`}
                                    disabled={submitState === 'submitting'}
                                    maxLength={300}
                                    onBlur={() => markFieldTouched('message')}
                                    onChange={(event) => updateField('message', event.target.value)}
                                    placeholder="What stood out for you? What could have been better?"
                                    value={formValues.message}
                                />
                            {touchedFields.message && formErrors.message ? (
                                <p className={styles.fieldError}>{formErrors.message}</p>
                            ) : null}
                            <div className={styles.inlineTip}>
                                <span className={styles.inlineTipTitle}>{insightCard.title}</span>
                                <span className={styles.inlineTipText}>{insightCard.description}</span>
                            </div>
                            <div className={styles.metaRow}>
                                <span>{formValues.message.length > 0 ? `${formValues.message.length}/300` : 'Up to 300 characters'}</span>
                                <span>Your feedback stays private.</span>
                                </div>
                            </div>
                        </section>
                        ) : null}

                        {(settings.collectName || settings.collectPhone || settings.collectEmail) ? (
                            <section className={`${styles.panel} ${styles.panelMuted}`}>
                                <div className={styles.panelHeader}>
                                    <div className={`${styles.panelIcon} ${styles.panelIconWhite}`}>
                                        <LuLock size={18} />
                                    </div>
                                <div>
                                    <h2 className={styles.panelTitle}>Want a follow-up?</h2>
                                    <p className={styles.panelText}>
                                        Add your contact details below.
                                    </p>
                                </div>
                            </div>

                                <div className={styles.fields}>
                                    {settings.collectName ? (
                                    <Field
                                        error={touchedFields.customerName ? formErrors.customerName : ''}
                                        onChange={(value) => updateField('customerName', value)}
                                        onBlur={() => markFieldTouched('customerName')}
                                            placeholder="Your name"
                                            type="text"
                                            value={formValues.customerName}
                                        />
                                    ) : null}

                                    {settings.collectPhone ? (
                                    <Field
                                        icon={<LuPhone size={16} />}
                                        error={touchedFields.customerPhone ? formErrors.customerPhone : ''}
                                        onChange={(value) => updateField('customerPhone', value)}
                                        onBlur={() => markFieldTouched('customerPhone')}
                                            placeholder="+1 (555) 000-0000"
                                            type="tel"
                                            value={formValues.customerPhone}
                                        />
                                    ) : null}

                                    {settings.collectEmail ? (
                                    <Field
                                        icon={<LuMail size={16} />}
                                        error={touchedFields.customerEmail ? formErrors.customerEmail : ''}
                                        onChange={(value) => updateField('customerEmail', value)}
                                        onBlur={() => markFieldTouched('customerEmail')}
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

                    <button
                        className={[
                            styles.cta,
                            rating === 0 || submitState === 'submitting' ? styles.ctaDisabled : '',
                        ].filter(Boolean).join(' ')}
                        disabled={rating === 0 || submitState === 'submitting'}
                        style={rating === 0 || submitState === 'submitting'
                            ? undefined
                            : { background: primaryCtaColor, color: primaryCtaTextColor }}
                        type="submit"
                    >
                            {submitState === 'submitting' ? 'Submitting feedback...' : 'Submit feedback'}
                            {submitState === 'submitting' ? null : <LuChevronRight size={18} />}
                        </button>
                    </div>
                </form>

                <div className={styles.footer}>
                    <div className={styles.privacyLine}>
                        <LuLock size={16} />
                        <span>Your feedback is private and goes directly to the business.</span>
                    </div>

                    <Link className={styles.powered} href="https://menulist.ai" rel="noopener noreferrer" target="_blank">
                        Powered by MenuList
                    </Link>

                    {(callHref || whatsappHref) ? (
                        <div className={styles.quickActions}>
                            {callHref ? (
                                <a className={styles.quickAction} href={callHref}>
                                    <LuPhone size={14} />
                                    Call
                                </a>
                            ) : null}
                            {whatsappHref ? (
                                <a className={styles.quickAction} href={whatsappHref} rel="noopener noreferrer" target="_blank">
                                    <LuMessageSquare size={14} />
                                    WhatsApp
                                </a>
                            ) : null}
                        </div>
                    ) : null}

                    <div className={styles.footerLinks}>
                        <Link className={styles.footerLink} href="/privacy-policy" target="_blank">
                            Privacy
                        </Link>
                        <Link className={styles.footerLink} href="/terms-of-service" target="_blank">
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

function Field({
    icon,
    error,
    onChange,
    onBlur,
    placeholder,
    type,
    value,
}: {
    icon?: React.ReactNode;
    error?: string;
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
                    className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${error ? styles.inputInvalid : ''}`}
                    inputMode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text'}
                    maxLength={type === 'email' ? 120 : type === 'tel' ? 20 : 60}
                    onBlur={onBlur}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    type={type}
                    value={value}
                />
            </div>
            {error ? <p className={styles.fieldError}>{error}</p> : null}
        </label>
    );
}

export default GuestFeedbackForm;
