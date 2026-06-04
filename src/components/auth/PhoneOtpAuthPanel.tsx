'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    DEFAULT_PHONE_COUNTRY_CODE,
    buildInternationalPhoneDigits,
    getDialCodeForCountry,
    getPhoneCountryInfo,
    getUniquePhoneCountries,
    inferPhoneCountryFromInternationalNumber,
} from '@lib/phone/phoneNumber';
import { signIn } from 'next-auth/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuLoader, LuMessageCircle, LuPhone } from 'react-icons/lu';
import styles from './PhoneOtpAuthPanel.module.scss';

type PhoneOtpPurpose = 'dashboard_login' | 'create_menu' | 'login';

type PhoneOtpAuthPanelProps = {
    buttonLabel?: string;
    className?: string;
    defaultCountryCode?: string;
    defaultDialCode?: string;
    defaultPhone?: string;
    fallbackLabel?: string;
    hidePhoneInput?: boolean;
    hint?: string;
    onAuthenticated?: () => Promise<void> | void;
    onFallback?: () => void;
    purpose: PhoneOtpPurpose;
    showHeader?: boolean;
    title?: string;
    wrapInForm?: boolean;
};

type Step = 'phone' | 'code' | 'success';

const normalizeCode = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 6);

const formatPhoneForDisplay = (phone: string, countryCode: string, dialCode: string) => {
    const raw = String(phone || '').trim();
    if (!raw) return 'this phone number';
    if (raw.startsWith('+')) return raw;
    return `${getDialCodeForCountry(countryCode, dialCode)} ${raw}`.trim();
};

export default function PhoneOtpAuthPanel({
    buttonLabel = 'Send WhatsApp code',
    className,
    defaultCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
    defaultDialCode,
    defaultPhone = '',
    fallbackLabel,
    hidePhoneInput = false,
    hint = 'Use the phone number you use for WhatsApp. We will send a one-time code.',
    onAuthenticated,
    onFallback,
    purpose,
    showHeader = true,
    title = 'Continue with phone',
    wrapInForm = true,
}: PhoneOtpAuthPanelProps) {
    const initialCountry = inferPhoneCountryFromInternationalNumber(defaultPhone)?.code || defaultCountryCode || DEFAULT_PHONE_COUNTRY_CODE;
    const [phone, setPhone] = useState(defaultPhone);
    const [countryCode, setCountryCode] = useState(initialCountry);
    const [dialCode, setDialCode] = useState(getDialCodeForCountry(initialCountry, defaultDialCode));
    const [code, setCode] = useState('');
    const [challengeId, setChallengeId] = useState('');
    const [phoneMasked, setPhoneMasked] = useState('');
    const [step, setStep] = useState<Step>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const interval = window.setInterval(() => {
            setCooldown((value) => Math.max(0, value - 1));
        }, 1000);
        return () => window.clearInterval(interval);
    }, [cooldown]);

    useEffect(() => {
        if (step !== 'phone') return;
        setPhone(defaultPhone);
        const inferredCountry = inferPhoneCountryFromInternationalNumber(defaultPhone);
        const nextCountryCode = inferredCountry?.code || defaultCountryCode || DEFAULT_PHONE_COUNTRY_CODE;
        setCountryCode(nextCountryCode);
        setDialCode(inferredCountry?.dialCode || getDialCodeForCountry(nextCountryCode, defaultDialCode));
    }, [defaultCountryCode, defaultDialCode, defaultPhone, step]);

    const isEnabled = FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH;
    const normalizedPhoneDigits = useMemo(() => buildInternationalPhoneDigits({
        countryCode,
        dialCode,
        phoneNumber: phone,
    }), [countryCode, dialCode, phone]);
    const canSubmitPhone = normalizedPhoneDigits.length >= 10 && normalizedPhoneDigits.length <= 15;
    const canSubmitCode = code.length === 6 && Boolean(challengeId);

    if (!isEnabled) return null;

    const requestCode = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!canSubmitPhone || loading) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/phone-otp/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, dialCode, phone, purpose }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Could not send code. Please try again.');
            }

            setChallengeId(data.challengeId);
            setPhoneMasked(data.phoneMasked || '');
            setCode('');
            setStep('code');
            setCooldown(Number(data.resendAfterSeconds || 60));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not send code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!canSubmitCode || loading) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/phone-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId, code }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success || !data.loginToken) {
                throw new Error(data.error || 'Invalid verification code.');
            }

            const signInResult = await signIn('credentials', {
                phoneOtpLoginToken: data.loginToken,
                redirect: false,
            });

            if (signInResult?.error) {
                throw new Error('Could not open your account. Please request a new code.');
            }

            setStep('success');
            await onAuthenticated?.();
        } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : 'Could not verify code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetPhone = () => {
        if (loading) return;
        setStep('phone');
        setChallengeId('');
        setCode('');
        setError('');
    };

    const handleCountryChange = (value: string) => {
        const nextCountry = getPhoneCountryInfo(value);
        setCountryCode(nextCountry?.code || DEFAULT_PHONE_COUNTRY_CODE);
        setDialCode(nextCountry?.dialCode || '+91');
    };

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        const inferredCountry = inferPhoneCountryFromInternationalNumber(value);
        if (!inferredCountry) return;
        setCountryCode(inferredCountry.code);
        setDialCode(inferredCountry.dialCode);
    };

    const countrySelect = (
        <select
            className={styles.countrySelect}
            disabled={loading}
            onChange={(event) => handleCountryChange(event.target.value)}
            value={countryCode}
        >
            {getUniquePhoneCountries().map((country) => (
                <option key={country.code} value={country.code}>
                    {country.flag} {country.code} ({country.dialCode})
                </option>
            ))}
        </select>
    );

    const phoneStepFields = (buttonType: 'button' | 'submit') => (
        <>
            {hidePhoneInput ? (
                <>
                    <label className={styles.label}>
                        Country code
                        {countrySelect}
                    </label>
                    <p className={styles.message}>
                        We will send a code to {formatPhoneForDisplay(phone, countryCode, dialCode)}.
                    </p>
                </>
            ) : (
                <label className={styles.label}>
                    WhatsApp phone number
                    <div className={styles.phoneRow}>
                        {countrySelect}
                        <input
                            autoComplete="tel"
                            className={styles.input}
                            disabled={loading}
                            inputMode="tel"
                            onChange={(event) => handlePhoneChange(event.target.value)}
                            placeholder={`${dialCode || '+91'} 98765 43210`}
                            type="tel"
                            value={phone}
                        />
                    </div>
                </label>
            )}
            {error ? <p className={styles.error}>{error}</p> : null}
            <button
                className={styles.primaryButton}
                disabled={!canSubmitPhone || loading}
                onClick={buttonType === 'button' ? () => requestCode() : undefined}
                type={buttonType}
            >
                {loading ? <LuLoader className={styles.spin} size={17} /> : <LuPhone size={17} />}
                {buttonLabel}
            </button>
            {fallbackLabel && onFallback ? (
                <button className={styles.secondaryButton} disabled={loading} onClick={onFallback} type="button">
                    {fallbackLabel}
                </button>
            ) : null}
        </>
    );

    const codeStepFields = (buttonType: 'button' | 'submit') => (
        <>
            <label className={styles.label}>
                Verification code
                <input
                    autoComplete="one-time-code"
                    className={styles.input}
                    disabled={loading}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setCode(normalizeCode(event.target.value))}
                    placeholder="6-digit code"
                    type="text"
                    value={code}
                />
            </label>
            <p className={styles.message}>
                Code sent to {phoneMasked || 'your phone'}.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button
                className={styles.primaryButton}
                disabled={!canSubmitCode || loading}
                onClick={buttonType === 'button' ? () => verifyCode() : undefined}
                type={buttonType}
            >
                {loading ? <LuLoader className={styles.spin} size={17} /> : <LuCheck size={17} />}
                Verify and continue
            </button>
            <div className={styles.inlineActions}>
                <button className={styles.textButton} disabled={loading} onClick={resetPhone} type="button">
                    <LuArrowLeft size={14} /> Change number
                </button>
                <button className={styles.textButton} disabled={loading || cooldown > 0} onClick={() => requestCode()} type="button">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
            </div>
        </>
    );

    return (
        <div className={`${styles.phoneOtpPanel} ${className || ''}`}>
            {showHeader ? (
                <div className={styles.header}>
                    <span className={styles.iconWrap}>
                        {step === 'success' ? <LuCheck size={19} /> : <LuMessageCircle size={19} />}
                    </span>
                    <div>
                        <p className={styles.title}>{title}</p>
                        <p className={styles.hint}>{hint}</p>
                    </div>
                </div>
            ) : null}

            {step === 'phone' ? (
                wrapInForm ? (
                    <form className={styles.form} onSubmit={requestCode}>
                        {phoneStepFields('submit')}
                    </form>
                ) : (
                    <div className={styles.form}>
                        {phoneStepFields('button')}
                    </div>
                )
            ) : null}

            {step === 'code' ? (
                wrapInForm ? (
                    <form className={styles.form} onSubmit={verifyCode}>
                        {codeStepFields('submit')}
                    </form>
                ) : (
                    <div className={styles.form}>
                        {codeStepFields('button')}
                    </div>
                )
            ) : null}

            {step === 'success' ? (
                <p className={styles.success}>Phone verified. Opening your account...</p>
            ) : null}
        </div>
    );
}
