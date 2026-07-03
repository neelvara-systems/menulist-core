'use client'

import BrandWordmark from '@/components/website/shared/BrandWordmark';
import { EMPTY_ERROR } from "@constant/common";
import { HOME_ROUTING, NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { useAppSelector } from "@hook/useAppSelector";
import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { getDarkModeState, toggleDarkMode } from "@reduxSlices/clientThemeConfig";
import { Button, Form, Input } from "antd";
import { sendPasswordResetEmail } from "firebase/auth";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LuArrowLeft, LuMail, LuMoon, LuSun } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import styles from '../loginPage/loginPage.module.scss';

const RESET_ERRORS = {
    INVALID_EMAIL: "auth/invalid-email",
}
const FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE = "Enter a valid email address.";
const FORGOT_PASSWORD_FAILED_MESSAGE = "We could not send the reset email. Check the email and try again.";
const FORGOT_PASSWORD_ERROR_MESSAGES = new Set([
    FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE,
    FORGOT_PASSWORD_FAILED_MESSAGE,
]);
const JOURNEY_MOTION_MEDIA = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

const getForgotPasswordErrorMessage = (message?: string) => {
    const normalized = String(message || '').trim();
    return FORGOT_PASSWORD_ERROR_MESSAGES.has(normalized) ? normalized : '';
};

function ForgotPasswordPage() {
    const session = useSession();
    const dispatch = useAppDispatch();
    const [error, setError] = useState({ id: '', message: '' });
    const [successMessage, setSuccessMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const isDarkMode = useAppSelector(getDarkModeState)
    const router = useRouter();
    const loginPageRef = useRef<HTMLDivElement | null>(null);
    const journeyArtRef = useRef<HTMLSpanElement | null>(null);
    const journeyMotionEnabledRef = useRef(false);
    const journeyMotionFrame = useRef<number | null>(null);

    const resetJourneyMotion = useCallback(() => {
        if (typeof window !== 'undefined' && journeyMotionFrame.current !== null) {
            window.cancelAnimationFrame(journeyMotionFrame.current);
            journeyMotionFrame.current = null;
        }

        const journeyArt = journeyArtRef.current;
        if (!journeyArt) return;

        journeyArt.style.setProperty('--auth-journey-shift-x', '0px');
        journeyArt.style.setProperty('--auth-journey-shift-y', '0px');
        journeyArt.style.setProperty('--auth-journey-tilt-x', '0deg');
        journeyArt.style.setProperty('--auth-journey-tilt-y', '0deg');
        journeyArt.style.setProperty('--auth-journey-rotate', '0deg');
    }, []);

    const handleJourneyPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || typeof window === 'undefined') return;
        if (!journeyMotionEnabledRef.current) return;

        const x = ((event.clientX / window.innerWidth) - 0.5) * 2;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 2;

        if (journeyMotionFrame.current !== null) {
            window.cancelAnimationFrame(journeyMotionFrame.current);
        }

        journeyMotionFrame.current = window.requestAnimationFrame(() => {
            const journeyArt = journeyArtRef.current;
            if (!journeyArt) return;

            journeyArt.style.setProperty('--auth-journey-shift-x', `${(x * 18).toFixed(2)}px`);
            journeyArt.style.setProperty('--auth-journey-shift-y', `${(y * 10).toFixed(2)}px`);
            journeyArt.style.setProperty('--auth-journey-tilt-x', `${(-y * 1.2).toFixed(2)}deg`);
            journeyArt.style.setProperty('--auth-journey-tilt-y', `${(x * 1.8).toFixed(2)}deg`);
            journeyArt.style.setProperty('--auth-journey-rotate', `${(x * 0.35).toFixed(2)}deg`);
            journeyMotionFrame.current = null;
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return resetJourneyMotion;

        const media = window.matchMedia(JOURNEY_MOTION_MEDIA);
        const syncJourneyMotionPreference = () => {
            journeyMotionEnabledRef.current = media.matches;
            if (!media.matches) resetJourneyMotion();
        };

        syncJourneyMotionPreference();
        media.addEventListener('change', syncJourneyMotionPreference);

        return () => {
            media.removeEventListener('change', syncJourneyMotionPreference);
            resetJourneyMotion();
        };
    }, [resetJourneyMotion]);

    useEffect(() => {
        if (Boolean(session?.data?.user)) {
            router.replace(HOME_ROUTING)
        }
    }, [router, session?.data?.user])

    const forgotPassword = async ({ email }: { email: string }) => {
        setIsSending(true);
        setSuccessMessage('');
        setError(EMPTY_ERROR);

        try {
            await sendPasswordResetEmail(firebaseAuth, email);
            setSuccessMessage("If this email is connected to MenuList, a reset link has been sent.");
        } catch (error: any) {
            if (error.code?.includes(RESET_ERRORS.INVALID_EMAIL)) {
                setError({ id: RESET_ERRORS.INVALID_EMAIL, message: FORGOT_PASSWORD_INVALID_EMAIL_MESSAGE });
            } else {
                setError({ id: 'RESET_FAILED', message: FORGOT_PASSWORD_FAILED_MESSAGE });
            }
        } finally {
            setIsSending(false);
        }
    }

    const onValuesChange = () => {
        setError(EMPTY_ERROR)
        setSuccessMessage('')
    };

    const validateMessages = {
        required: "'${name}' is required!",
    };
    const displayErrorMessage = getForgotPasswordErrorMessage(error.message);

    return <div
        ref={loginPageRef}
        className={`${styles.loginPageWrap} ${isDarkMode ? styles.loginPageDark : styles.loginPageLight}`}
        onPointerCancel={resetJourneyMotion}
        onPointerLeave={resetJourneyMotion}
        onPointerMove={handleJourneyPointerMove}
    >
        <div className={styles.staticBackdrop} aria-hidden="true">
            <span ref={journeyArtRef} className={styles.journeyArt} />
        </div>
        <header className={styles.topBar}>
            <div className={styles.headerWrap}>
                <Button
                    aria-label={isDarkMode ? 'Use light theme' : 'Use dark theme'}
                    icon={isDarkMode ? <LuSun /> : <LuMoon />}
                    size="large"
                    title={isDarkMode ? 'Use light theme' : 'Use dark theme'}
                    onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
                />
            </div>
        </header>
        <div className={styles.bodyWrap}>
            <div className={styles.bodyContent}>
                <section className={styles.heroPanel}>
                    <button
                        aria-label="Go to MenuList home"
                        className={styles.heroBrand}
                        type="button"
                        onClick={() => router.push(HOME_ROUTING)}
                    >
                        <BrandWordmark
                            className={styles.heroBrandMark}
                            iconHeight={118}
                            logoClassName={styles.heroBrandLogo}
                            textClassName={styles.heroBrandText}
                        />
                    </button>
                    <p>Take your business beyond the four walls.</p>
                </section>
                <div className={styles.rightContent}>
                    <div className={`${styles.formWrap} ${isDarkMode ? styles.formWrapDark : styles.formWrapLight}`}>
                        <div className={styles.normalBrandIntro}>
                            <span className={styles.cardLogoShell}>
                                <BrandWordmark
                                    showText={false}
                                    iconHeight={44}
                                    className={styles.cardLogoMark}
                                />
                            </span>
                            <h3 className={styles.heading}>Welcome to</h3>
                            <h1 className={`heading ${styles.heading} ${styles.title}`}>
                                <BrandWordmark
                                    showLogo={false}
                                    textClassName={styles.brandTitleText}
                                />
                            </h1>
                        </div>
                        <div className={styles.mobileAuthHeader}>
                            <h2>Reset access</h2>
                            <p>Enter the email connected to your account.</p>
                        </div>
                        <div className={styles.desktopAuthHeader}>
                            <h2>Reset access</h2>
                            <p>Enter the email connected to your MenuList account.</p>
                        </div>
                        <p className={styles.authCardNote}>
                            Staff ID or phone passcode users should ask the owner for a new temporary passcode.
                        </p>
                        <Form
                            name="forgot-password"
                            className={`${styles.form} login-form`}
                            initialValues={{}}
                            onFinish={forgotPassword}
                            onValuesChange={onValuesChange}
                            validateMessages={validateMessages}
                        >
                            <label className={styles.fieldLabel} htmlFor="forgot-password-email">Account email</label>
                            <Form.Item
                                className={styles.formItem}
                                name="email"
                                rules={[
                                    { required: true, message: 'Enter your account email.' },
                                    { type: 'email', message: 'Enter a valid email address.' },
                                ]}
                                validateTrigger={['onBlur', 'onChange']}
                            >
                                <Input
                                    id="forgot-password-email"
                                    className={styles.inputElement}
                                    size="large"
                                    prefix={<LuMail className="site-form-item-icon" />}
                                    allowClear
                                    placeholder="name@example.com"
                                />
                            </Form.Item>
                            {displayErrorMessage ? <div className={styles.authError}>{displayErrorMessage}</div> : null}
                            {successMessage ? <div className={styles.authSuccess}>{successMessage}</div> : null}
                            <Button loading={isSending} type="primary" size="large" htmlType="submit" style={{ width: '100%' }} className="login-form-button">Send reset link</Button>
                            <Button
                                type="text"
                                className={styles.secondaryAuthButton}
                                icon={<LuArrowLeft />}
                                onClick={() => router.push(NAVIGARIONS_ROUTINGS.SIGNIN)}
                            >
                                Return to sign in
                            </Button>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default ForgotPasswordPage;
