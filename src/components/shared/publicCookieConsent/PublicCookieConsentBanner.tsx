'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import styles from './PublicCookieConsentBanner.module.css';

export type PublicCookieConsentChoice = 'accepted' | 'declined';

type PublicCookieConsentProduct = 'menulist' | 'answerlattice' | 'campaigncue' | 'constantlayer' | 'neutral';

interface PublicCookieConsentBannerProps {
    storageKey: string;
    message: string;
    acceptLabel?: string;
    declineLabel?: string;
    privacyHref?: string;
    privacyLabel?: string;
    panelLabel?: string;
    statusAccepted?: string;
    statusDeclined?: string;
    closeLabel?: string;
    showDecline?: boolean;
    product?: PublicCookieConsentProduct;
    preferenceEventName?: string;
    children?: ReactNode;
    onConsentChange?: (choice: PublicCookieConsentChoice) => void;
}

function readStoredChoice(storageKey: string): PublicCookieConsentChoice | null {
    try {
        const stored = window.localStorage.getItem(storageKey);
        return stored === 'accepted' || stored === 'declined' ? stored : null;
    } catch {
        return null;
    }
}

export default function PublicCookieConsentBanner({
    storageKey,
    message,
    acceptLabel = 'Okay',
    declineLabel = 'Decline',
    privacyHref,
    privacyLabel = 'Privacy policy',
    panelLabel = 'Cookie preference',
    statusAccepted,
    statusDeclined,
    closeLabel = 'Close cookie preference',
    showDecline = true,
    product = 'neutral',
    preferenceEventName,
    children,
    onConsentChange,
}: PublicCookieConsentBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [choice, setChoice] = useState<PublicCookieConsentChoice | null>(null);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        const storedChoice = readStoredChoice(storageKey);

        setMounted(true);
        setChoice(storedChoice);
        setShowPanel(storedChoice === null);

        if (storedChoice) {
            onConsentChange?.(storedChoice);
        }

        if (!preferenceEventName) return undefined;

        const handleOpenPreferences = () => setShowPanel(true);
        window.addEventListener(preferenceEventName, handleOpenPreferences);
        return () => window.removeEventListener(preferenceEventName, handleOpenPreferences);
    }, [onConsentChange, preferenceEventName, storageKey]);

    function saveChoice(nextChoice: PublicCookieConsentChoice) {
        try {
            window.localStorage.setItem(storageKey, nextChoice);
        } catch {
            // If localStorage is unavailable, keep the runtime choice for this page.
        }

        setChoice(nextChoice);
        setShowPanel(false);
        onConsentChange?.(nextChoice);
    }

    if (!mounted) return null;

    const status = choice === 'accepted' ? statusAccepted : choice === 'declined' ? statusDeclined : undefined;

    return (
        <>
            {choice === 'accepted' ? children : null}
            {showPanel ? (
                <section
                    className={styles.banner}
                    data-product={product}
                    role="dialog"
                    aria-label={panelLabel}
                    aria-modal="false"
                >
                    <div className={styles.copy}>
                        <p className={styles.message}>{message}</p>
                        {status ? <p className={styles.status}>{status}</p> : null}
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.accept}
                            onClick={() => saveChoice('accepted')}
                        >
                            {acceptLabel}
                        </button>
                        {showDecline ? (
                            <button
                                type="button"
                                className={styles.decline}
                                onClick={() => saveChoice('declined')}
                            >
                                {declineLabel}
                            </button>
                        ) : null}
                        {privacyHref ? (
                            <a className={styles.privacyLink} href={privacyHref}>
                                {privacyLabel}
                            </a>
                        ) : null}
                        {choice ? (
                            <button
                                type="button"
                                className={styles.close}
                                aria-label={closeLabel}
                                onClick={() => setShowPanel(false)}
                            >
                                <LuX size={18} />
                            </button>
                        ) : null}
                    </div>
                </section>
            ) : null}
        </>
    );
}
