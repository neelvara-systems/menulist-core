'use client';

import {
    fetchOwnerReferral,
    getOwnerReferralShareMessage,
    getOwnerReferralShareTitle,
    type OwnerReferralOwnerResponse,
} from '@lib/ownerReferral/ownerReferralClient';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useOwnerReferral = () => {
    const locale = useLocale();
    const session = useClientAuthSession();
    const scopeKey = getTenantStoreStorageKey('owner-referral-scope', session?.tId, session?.sId);
    const scopeKeyRef = useRef(scopeKey);
    const loadInFlightRef = useRef(false);
    scopeKeyRef.current = scopeKey;
    const [data, setData] = useState<OwnerReferralOwnerResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setData(null);
        setError(null);
        setIsLoading(false);
    }, [scopeKey]);

    const load = useCallback(async () => {
        const requestScopeKey = scopeKeyRef.current;
        if (!requestScopeKey || loadInFlightRef.current) return null;
        loadInFlightRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const next = await fetchOwnerReferral();
            if (scopeKeyRef.current !== requestScopeKey) return null;
            setData(next);
            return next;
        } catch (loadError) {
            if (scopeKeyRef.current !== requestScopeKey) return null;
            const code = loadError instanceof Error ? loadError.message : 'owner_referral_load_failed';
            setError(code);
            setData(null);
            return null;
        } finally {
            loadInFlightRef.current = false;
            if (scopeKeyRef.current === requestScopeKey) setIsLoading(false);
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
        let copied = false;
        try {
            textarea.select();
            copied = typeof document.execCommand === 'function' && document.execCommand('copy');
        } finally {
            textarea.remove();
        }
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
        if (!data?.inviteUrl) throw new Error('owner_referral_whatsapp_unavailable');
        const target = `https://wa.me/?text=${encodeURIComponent(getOwnerReferralShareMessage(data.inviteUrl, locale))}`;
        const opened = window.open(target, '_blank', 'noopener,noreferrer');
        if (!opened) throw new Error('owner_referral_whatsapp_unavailable');
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
