'use client';

import { DEFAULT_FEEDBACK_SETTINGS, FeedbackDefaults, GuestFeedbackSubmitState } from '@type/guestFeedback';
import type { StoreDataType } from '@type/platform/store';
import OBPThemeToggle from '@/app/client/obp/OBPThemeToggle';
import { getMoodWithBrandColor, MenuMood } from '@template/main-app/projects/b2cView/designSystem';
import MenuFooter from '@template/main-app/projects/b2cView/output/MenuFooter';
import { message } from 'antd';
import React, { useMemo, useState } from 'react';
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

const RATING_COPY: Record<number, { eyebrow: string; prompt: string }> = {
    1: {
        eyebrow: 'Needs attention',
        prompt: 'Share what felt off during the visit.',
    },
    2: {
        eyebrow: 'Could be better',
        prompt: 'Share the detail the team should know.',
    },
    3: {
        eyebrow: 'Good',
        prompt: 'What would have made the experience better for you?',
    },
    4: {
        eyebrow: 'Very good',
        prompt: 'What stood out for you the most?',
    },
    5: {
        eyebrow: 'Excellent',
        prompt: 'What should the team keep doing?',
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
            title: 'What worked',
            description: 'Mention one part of the visit worth repeating.',
        };
    }

    if (rating > 0) {
        return {
            title: 'What needs attention',
            description: 'A short note about timing, service, taste, or atmosphere is enough.',
        };
    }

    return {
        title: 'Common details',
        description: 'Guests often mention service, taste, cleanliness, comfort, or wait time.',
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

    const settings = { ...DEFAULT_FEEDBACK_SETTINGS, ...feedbackDefaults };
    const ratingCopy = RATING_COPY[rating] || {
        eyebrow: 'Your feedback goes straight to the business.',
        prompt: 'Share what stood out, or what could have been better.',
    };
    const insightCard = useMemo(() => getInsightCardCopy(rating), [rating]);
    const formErrors = useMemo(() => getFormErrors(formValues, settings), [formValues, settings]);
    const hasVisibleErrors = Object.values(formErrors).some(Boolean);
    const moodConfig = useMemo(() => getMoodWithBrandColor(MenuMood.CLEAN, accentColor), [accentColor]);
    const primaryCtaColor = accentColor || moodConfig.accentColor;
    const primaryCtaTextColor = getReadableTextColor(primaryCtaColor);

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

    const publicFooter = storeDetails ? (
        <div className={styles.menuFooter}>
            <MenuFooter
                storeDetails={storeDetails as StoreDataType}
                moodConfig={moodConfig}
                projectId={projectId}
                feedbackEnabled
                showLanguageSelector={false}
                showUpdateMeta={false}
                trackingEnabled={false}
            />
            <div className={styles.themeToggleWrap}>
                <OBPThemeToggle
                    switchToDarkLabel="Switch to dark theme"
                    switchToLightLabel="Switch to light theme"
                />
            </div>
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

                                {rating > 0 ? (
                                    <div className={styles.hintBox}>
                                        <p className={styles.hintTitle}>{insightCard.title}</p>
                                        <p className={styles.hintText}>{insightCard.description}</p>
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
                                                    ? 'Required. Share what stood out or what needs attention.'
                                                    : 'Optional. Share what stood out or what needs attention.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.fieldBlock}>
                                        <textarea
                                            className={`${styles.textarea} ${touchedFields.message && formErrors.message ? styles.inputInvalid : ''}`}
                                            disabled={submitState === 'submitting'}
                                            maxLength={300}
                                            onBlur={() => markFieldTouched('message')}
                                            onChange={(event) => updateField('message', event.target.value)}
                                            placeholder="What stood out? What needs attention?"
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
                </div>
            </main>
            {publicFooter}
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
