'use client';

import {
    fetchOwnerReferral,
    getOwnerReferralShareMessage,
    getOwnerReferralShareTitle,
    type OwnerReferralOwnerResponse,
} from '@lib/ownerReferral/ownerReferralClient';
import { useLocale } from 'next-intl';
import { useCallback, useState } from 'react';

export const useOwnerReferral = () => {
    const locale = useLocale();
    const [data, setData] = useState<OwnerReferralOwnerResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const next = await fetchOwnerReferral();
            setData(next);
            return next;
        } catch (loadError) {
            const code = loadError instanceof Error ? loadError.message : 'owner_referral_load_failed';
            setError(code);
            setData(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const copyInvite = useCallback(async () => {
        if (!data?.inviteUrl) throw new Error('owner_referral_copy_unavailable');
        const shareMessage = getOwnerReferralShareMessage(data.inviteUrl, locale);
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(shareMessage);
                return;
            } catch {
                // Embedded browsers can expose the API while denying clipboard access.
            }
        }
        const textarea = document.createElement('textarea');
        textarea.value = shareMessage;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('owner_referral_copy_unavailable');
    }, [data, locale]);

    const shareNative = useCallback(async () => {
        if (!data?.inviteUrl || typeof navigator.share !== 'function') return false;
        await navigator.share({
            title: getOwnerReferralShareTitle(locale),
            text: getOwnerReferralShareMessage(data.inviteUrl, locale),
        });
        return true;
    }, [data, locale]);

    const openWhatsApp = useCallback(() => {
        if (!data?.inviteUrl) return false;
        const target = `https://wa.me/?text=${encodeURIComponent(getOwnerReferralShareMessage(data.inviteUrl, locale))}`;
        window.open(target, '_blank', 'noopener,noreferrer');
        return true;
    }, [data, locale]);

    return {
        copyInvite,
        data,
        error,
        isLoading,
        load,
        openWhatsApp,
        shareNative,
    };
};
