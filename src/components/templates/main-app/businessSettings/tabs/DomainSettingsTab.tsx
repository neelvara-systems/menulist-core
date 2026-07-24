'use client';

import { getMenuUrl, normalizeBaseUrl, PLATFORM_DOMAIN } from '@constant/urls';
import { checkCustomDomainAvailability } from '@database/stores';
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { normalizeVercelDomainDnsRecords } from '@lib/domains/vercelDnsRecords';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Alert, Button, Card, Divider, Input, List, message, Space, Steps, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuRefreshCw, LuSearch, LuTrash2 } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const DOMAIN_SETTINGS_ADD_ERROR = 'Failed to add domain.';
const DOMAIN_SETTINGS_COPY_ERROR = 'Could not copy. Select and copy manually.';
const DOMAIN_SETTINGS_OPEN_ERROR = 'Could not open link.';
const DESKTOP_DOMAIN_SETTINGS_COPY_UNAVAILABLE = 'desktop_domain_settings_copy_unavailable';
const DESKTOP_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED = 'desktop_domain_settings_copy_fallback_failed';

interface DomainSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
    onStoreStateUpdate?: (updates: any) => void;
    onStoreUpdate?: (updates: any) => void | Promise<void>;
}

type DesktopDomainSettingsSubdomainAvailabilityResponse = {
    available?: boolean;
    reason?: string;
    normalized?: string;
    preview?: string;
};
type DesktopDomainSettingsResponsePhase = 'add' | 'status' | 'remove';
type DesktopDomainSettingsAddResponse = {
    success?: unknown;
    domain?: unknown;
    verified?: unknown;
    verification?: unknown;
    projectDomain?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};
type DesktopDomainSettingsStatusResponse = {
    hasDomain?: unknown;
    domain?: unknown;
    verified?: unknown;
    config?: unknown;
    projectDomain?: unknown;
    providerStatusPending?: unknown;
    refreshPending?: unknown;
};
type DesktopDomainSettingsRemoveResponse = {
    removed?: unknown;
    success?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};

const DESKTOP_DOMAIN_SETTINGS_SUBDOMAIN_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const DESKTOP_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES = 32 * 1024;

const hasDesktopDomainSettingsClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasDesktopDomainSettingsCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyDesktopDomainSettingsText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasDesktopDomainSettingsClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasDesktopDomainSettingsCopyFallback()) {
        throw clipboardWriteError || new Error(DESKTOP_DOMAIN_SETTINGS_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(DESKTOP_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

function getAxiosStatus(error: any): number | undefined {
    const status = Number(error?.status ?? error?.response?.status);
    return Number.isFinite(status) ? status : undefined;
}

function createDomainSettingsError(failureCode: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(failureCode), {
        code: failureCode,
        status,
    });
}

function buildDomainSettingsLogContext(storeDetails: any, action: string, value?: unknown) {
    return {
        action,
        ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStoreStringContext('tenantId', storeDetails?.tenantId),
        ...getBoundedStoreStringContext('domain', value),
    };
}

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

function normalizeSubdomainAvailabilityResponse(data: DesktopDomainSettingsSubdomainAvailabilityResponse) {
    return {
        available: data.available,
        reason: typeof data.reason === 'string' ? data.reason : undefined,
        normalized: typeof data.normalized === 'string' ? data.normalized : undefined,
        preview: typeof data.preview === 'string' ? data.preview : undefined,
    };
}

const getDesktopDomainSettingsDomainResponseFailureCodes = (phase: DesktopDomainSettingsResponsePhase) => {
    switch (phase) {
        case 'add':
            return {
                invalid: 'desktop_domain_settings_add_response_invalid',
                parse: 'desktop_domain_settings_add_response_parse_failed',
            };
        case 'remove':
            return {
                invalid: 'desktop_domain_settings_remove_response_invalid',
                parse: 'desktop_domain_settings_remove_response_parse_failed',
            };
        case 'status':
        default:
            return {
                invalid: 'desktop_domain_settings_status_response_invalid',
                parse: 'desktop_domain_settings_status_response_parse_failed',
            };
    }
};

async function readDesktopDomainSettingsDomainResponseJson<T>(
    response: Response,
    phase: DesktopDomainSettingsResponsePhase,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<T | null> {
    const failureCodes = getDesktopDomainSettingsDomainResponseFailureCodes(phase);
    const logContext = {
        ...context,
        maxBytes: DESKTOP_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        phase,
        responseOk: response.ok,
        responseStatus: response.status,
    };

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            DESKTOP_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logStoreDataFailure(failureCodes.parse, error, logContext);
        return null;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logStoreDataFailure(
            failureCodes.invalid,
            createDomainSettingsError(failureCodes.invalid, response.status),
            logContext,
        );
        return null;
    }

    return payload as T;
}

function DomainSettingsTab({ scrollRef, storeDetails, onStoreStateUpdate, onStoreUpdate }: DomainSettingsTabProps) {
    const t = useTranslations('BusinessSettings');
    const domainScopeKey = `${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`;
    const domainScopeKeyRef = useRef(domainScopeKey);
    domainScopeKeyRef.current = domainScopeKey;
    const componentActiveRef = useRef(true);
    const subdomainCheckGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!subdomainCheckGuardRef.current) subdomainCheckGuardRef.current = createLatestRequestGuard();
    const domainStatusGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!domainStatusGuardRef.current) domainStatusGuardRef.current = createLatestRequestGuard();
    const domainCheckGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!domainCheckGuardRef.current) domainCheckGuardRef.current = createLatestRequestGuard();
    const [subdomainValue, setSubdomainValue] = useState(storeDetails?.subdomain || '');
    const [availability, setAvailability] = useState<{
        available?: boolean;
        reason?: string;
        normalized?: string;
        preview?: string;
    } | null>(null);
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [savingSubdomain, setSavingSubdomain] = useState(false);
    const [subdomainCopied, setSubdomainCopied] = useState(false);

    const [domainInput, setDomainInput] = useState(storeDetails?.customDomain || '');
    const [domainAvailability, setDomainAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string } | null>(null);
    const [domainLoading, setDomainLoading] = useState(false);
    const [checkingDomain, setCheckingDomain] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);
    const [copiedDnsValue, setCopiedDnsValue] = useState<string | null>(null);
    const [domainLinkCopied, setDomainLinkCopied] = useState(false);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
            subdomainCheckGuardRef.current!.invalidate();
            domainStatusGuardRef.current!.invalidate();
            domainCheckGuardRef.current!.invalidate();
        };
    }, []);

    const subdomainUrl = storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null;
    const currentSubdomain = (storeDetails?.subdomain || '').trim().toLowerCase();
    const normalizedInputSubdomain = subdomainValue.trim().toLowerCase();
    const hasSubdomainChanged = normalizedInputSubdomain !== currentSubdomain;
    const canCheckSubdomain = normalizedInputSubdomain.length >= 3 && (!storeDetails?.subdomain || hasSubdomainChanged);
    const canSaveSubdomain = Boolean(
        availability?.available
        && availability?.normalized === normalizedInputSubdomain
        && (!storeDetails?.subdomain || hasSubdomainChanged)
    );
    const activeDomain = domainStatus
        ? (domainStatus.hasDomain === true && isNonEmptyString(domainStatus.domain) ? domainStatus.domain : undefined)
        : storeDetails?.customDomain;
    const normalizedDomainInput = domainInput.trim().toLowerCase();
    const canCheckDomain = !activeDomain && normalizedDomainInput.length >= 4;
    const canConnectDomain = Boolean(
        !activeDomain
        && domainAvailability?.available
        && domainAvailability?.normalized === normalizedDomainInput
    );
    const customDomainVerified = typeof domainStatus?.verified === 'boolean'
        ? domainStatus.verified
        : Boolean(storeDetails?.domainVerified);
    const dnsRecords = useMemo(
        () => normalizeVercelDomainDnsRecords(
            domainStatus?.config || domainStatus?.verification,
            domainStatus?.projectDomain,
            activeDomain || domainInput,
        ),
        [activeDomain, domainInput, domainStatus]
    );

    useEffect(() => {
        if (storeDetails?.customDomain) {
            setDomainInput(storeDetails.customDomain);
        }
    }, [storeDetails?.customDomain]);

    const checkAvailability = useCallback(async (value: string) => {
        if (!value || value.trim().length < 3) {
            setAvailability(null);
            return;
        }

        const requestScopeKey = domainScopeKey;
        const requestId = subdomainCheckGuardRef.current!.begin();
        setCheckingSubdomain(true);
        try {
            const response = await fetch(
                `/api/subdomain/check?subdomain=${encodeURIComponent(value.trim())}`,
                AUTH_BROWSER_REQUEST_POLICY,
            );
            let data: DesktopDomainSettingsSubdomainAvailabilityResponse | null = null;
            try {
                data = await readJsonResponseWithLimit<DesktopDomainSettingsSubdomainAvailabilityResponse>(
                    response,
                    DESKTOP_DOMAIN_SETTINGS_SUBDOMAIN_RESPONSE_JSON_MAX_BYTES,
                );
            } catch (error) {
                logStoreDataFailure('desktop_domain_settings_subdomain_check_response_parse_failed', error, {
                    ...buildDomainSettingsLogContext(storeDetails, 'check_subdomain_response_parse', value),
                    responseOk: response.ok,
                    responseStatus: response.status,
                    maxBytes: DESKTOP_DOMAIN_SETTINGS_SUBDOMAIN_RESPONSE_JSON_MAX_BYTES,
                });
            }
            if (
                !subdomainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            if (!response.ok) {
                if (response.status === 429 && data?.available === false) {
                    setAvailability({
                        available: false,
                        reason: typeof data.reason === 'string' && data.reason.length <= 120
                            ? data.reason
                            : 'Could not check availability',
                    });
                    return;
                }
                throw createDomainSettingsError('desktop_domain_settings_subdomain_check_rejected', response.status);
            }
            if (typeof data?.available !== 'boolean') {
                logStoreDataFailure(
                    'desktop_domain_settings_subdomain_check_response_invalid',
                    createDomainSettingsError('desktop_domain_settings_subdomain_check_response_invalid', response.status),
                    buildDomainSettingsLogContext(storeDetails, 'check_subdomain_response_shape', value),
                );
                setAvailability({ available: false, reason: 'Could not check availability' });
                return;
            }
            const normalizedAvailability = normalizeSubdomainAvailabilityResponse(data);
            setAvailability(normalizedAvailability);
            if (normalizedAvailability.normalized) {
                setSubdomainValue(normalizedAvailability.normalized);
            }
        } catch (error) {
            if (
                !subdomainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('desktop_domain_settings_subdomain_check_failed', error, buildDomainSettingsLogContext(
                storeDetails,
                'check_subdomain',
                value,
            ));
            setAvailability({ available: false, reason: 'Could not check availability' });
        } finally {
            if (
                subdomainCheckGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setCheckingSubdomain(false);
            }
        }
    }, [domainScopeKey, storeDetails?.storeId, storeDetails?.tenantId]);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || subdomainValue.trim();
        if (!nextSubdomain) return;
        const requestScopeKey = domainScopeKey;
        setSavingSubdomain(true);
        try {
            await Promise.resolve(onStoreUpdate?.({ subdomain: nextSubdomain }));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setAvailability((previous) => previous ? { ...previous, normalized: nextSubdomain, preview: nextSubdomain } : previous);
            }
        } catch (error) {
            logStoreDataFailure('desktop_domain_settings_subdomain_save_failed', error, buildDomainSettingsLogContext(
                storeDetails,
                'save_subdomain',
                nextSubdomain,
            ));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                message.error('Could not save public link.');
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setSavingSubdomain(false);
            }
        }
    }, [availability?.normalized, domainScopeKey, onStoreUpdate, storeDetails, subdomainValue]);

    const refreshDomainStatus = useCallback(async () => {
        if (!storeDetails?.customDomain) return;
        const requestScopeKey = domainScopeKey;
        const requestId = domainStatusGuardRef.current!.begin();
        setStatusLoading(true);
        setDomainError(null);
        try {
            const response = await fetch('/api/domain', AUTH_BROWSER_REQUEST_POLICY);
            const data = await readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsStatusResponse>(
                response,
                'status',
                buildDomainSettingsLogContext(storeDetails, 'refresh_domain_status_response', storeDetails?.customDomain),
            );
            if (
                !domainStatusGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            if (!response.ok) {
                throw createDomainSettingsError('desktop_domain_settings_status_load_rejected', response.status);
            }
            if (
                typeof data?.hasDomain !== 'boolean'
                || (data.hasDomain && (!isNonEmptyString(data.domain) || typeof data.verified !== 'boolean'))
            ) {
                logStoreDataFailure(
                    'desktop_domain_settings_status_response_invalid',
                    createDomainSettingsError('desktop_domain_settings_status_response_invalid', response.status),
                    {
                        ...buildDomainSettingsLogContext(storeDetails, 'refresh_domain_status_response_shape', storeDetails?.customDomain),
                        hasDomainFlag: typeof data?.hasDomain === 'boolean',
                        hasDomain: isNonEmptyString(data?.domain),
                    },
                );
                throw createDomainSettingsError('desktop_domain_settings_status_response_invalid', response.status);
            }
            setDomainStatus(data);
            if (data.hasDomain) {
                onStoreStateUpdate?.({
                    customDomain: data.domain,
                    domainVerified: data.verified === true,
                });
            } else {
                setDomainInput('');
                onStoreStateUpdate?.({ customDomain: undefined, domainVerified: undefined });
            }
        } catch (error) {
            if (
                !domainStatusGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('desktop_domain_settings_status_load_failed', error, buildDomainSettingsLogContext(
                storeDetails,
                'refresh_domain_status',
                storeDetails?.customDomain,
            ));
            setDomainError(t('dnsVerificationDesc'));
        } finally {
            if (
                domainStatusGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setStatusLoading(false);
            }
        }
    }, [domainScopeKey, onStoreStateUpdate, storeDetails, t]);

    useEffect(() => {
        void refreshDomainStatus();
        return () => {
            domainStatusGuardRef.current!.invalidate();
        };
    }, [refreshDomainStatus]);

    const handleAddDomain = useCallback(async () => {
        if (!domainInput.trim()) return;
        const requestScopeKey = domainScopeKey;
        setDomainLoading(true);
        setDomainError(null);
        try {
            const requestedDomain = domainAvailability?.normalized || domainInput.trim();
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify({ domain: requestedDomain }),
            });
            const data = await readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsAddResponse>(
                response,
                'add',
                buildDomainSettingsLogContext(storeDetails, 'add_domain_response', requestedDomain),
            );
            if (!componentActiveRef.current || domainScopeKeyRef.current !== requestScopeKey) return;
            if (!response.ok) {
                throw createDomainSettingsError('desktop_domain_settings_add_rejected', response.status);
            }
            if (data?.success !== true || !isNonEmptyString(data.domain)) {
                logStoreDataFailure(
                    'desktop_domain_settings_add_response_invalid',
                    createDomainSettingsError('desktop_domain_settings_add_response_invalid', response.status),
                    {
                        ...buildDomainSettingsLogContext(storeDetails, 'add_domain_response_shape', requestedDomain),
                        hasDomain: isNonEmptyString(data?.domain),
                        success: data?.success === true,
                    },
                );
                throw createDomainSettingsError('desktop_domain_settings_add_response_invalid', response.status);
            }
            const nextDomain = data.domain;
            setDomainInput(nextDomain);
            setDomainAvailability({ available: true, normalized: nextDomain });
            setDomainStatus({
                hasDomain: true,
                domain: nextDomain,
                verified: data.verified === true,
                config: data.verification,
                projectDomain: data.projectDomain,
            });
            onStoreStateUpdate?.({ customDomain: nextDomain, domainVerified: data.verified === true });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                message.warning('Domain saved. Background refresh is still finishing.');
            }
        } catch (err: any) {
            logStoreDataFailure(
                'desktop_domain_settings_add_failed',
                createDomainSettingsError('desktop_domain_settings_add_rejected', getAxiosStatus(err)),
                buildDomainSettingsLogContext(storeDetails, 'add_domain', domainAvailability?.normalized || domainInput),
            );
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainError(DOMAIN_SETTINGS_ADD_ERROR);
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainLoading(false);
            }
        }
    }, [domainAvailability?.normalized, domainInput, domainScopeKey, onStoreStateUpdate, storeDetails]);

    const handleCheckDomain = useCallback(async () => {
        if (!normalizedDomainInput) return;
        const requestScopeKey = domainScopeKey;
        const requestId = domainCheckGuardRef.current!.begin();
        setCheckingDomain(true);
        setDomainError(null);
        try {
            const result = await checkCustomDomainAvailability(normalizedDomainInput, storeDetails?.storeId);
            if (
                !domainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            setDomainAvailability(result);
            if (result?.normalized) {
                setDomainInput(result.normalized);
            }
        } catch (error) {
            if (
                !domainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('desktop_domain_settings_custom_domain_check_failed', error, buildDomainSettingsLogContext(
                storeDetails,
                'check_custom_domain',
                normalizedDomainInput,
            ));
            setDomainAvailability({ available: false, reason: 'Could not check domain right now.' });
        } finally {
            if (
                domainCheckGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setCheckingDomain(false);
            }
        }
    }, [domainScopeKey, normalizedDomainInput, storeDetails]);

    const handleRemoveDomain = useCallback(async () => {
        const requestScopeKey = domainScopeKey;
        setDomainLoading(true);
        setDomainError(null);
        try {
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'DELETE',
            });
            const data = await readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsRemoveResponse>(
                response,
                'remove',
                buildDomainSettingsLogContext(storeDetails, 'remove_domain_response', activeDomain),
            );
            if (!componentActiveRef.current || domainScopeKeyRef.current !== requestScopeKey) return;
            if (!response.ok) {
                throw createDomainSettingsError('desktop_domain_settings_remove_rejected', response.status);
            }
            if (data?.success !== true || data.removed !== true) {
                logStoreDataFailure(
                    'desktop_domain_settings_remove_response_invalid',
                    createDomainSettingsError('desktop_domain_settings_remove_response_invalid', response.status),
                    {
                        ...buildDomainSettingsLogContext(storeDetails, 'remove_domain_response_shape', activeDomain),
                        removed: data?.removed === true,
                        success: data?.success === true,
                    },
                );
                throw createDomainSettingsError('desktop_domain_settings_remove_response_invalid', response.status);
            }
            setDomainStatus(null);
            setDomainInput('');
            onStoreStateUpdate?.({ customDomain: undefined, domainVerified: undefined });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                message.warning('Domain removed. Background cleanup is still finishing.');
            }
        } catch (error) {
            logStoreDataFailure('desktop_domain_settings_remove_failed', error, buildDomainSettingsLogContext(
                storeDetails,
                'remove_domain',
                activeDomain,
            ));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainError('Failed to remove domain.');
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainLoading(false);
            }
        }
    }, [activeDomain, domainScopeKey, onStoreStateUpdate, storeDetails]);

    const handleCopySubdomain = useCallback(async () => {
        if (!subdomainUrl) return;
        try {
            await copyDesktopDomainSettingsText(subdomainUrl);
            setSubdomainCopied(true);
            setTimeout(() => setSubdomainCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure(
                'desktop_domain_settings_subdomain_copy_failed',
                error,
                {
                    ...buildDomainSettingsLogContext(storeDetails, 'copy_subdomain', subdomainUrl),
                    ...getBoundedStoreStringContext('copyValue', subdomainUrl),
                    hasClipboardWrite: hasDesktopDomainSettingsClipboardWrite(),
                    hasCopyFallback: hasDesktopDomainSettingsCopyFallback(),
                },
            );
            message.error(DOMAIN_SETTINGS_COPY_ERROR);
        }
    }, [storeDetails, subdomainUrl]);

    const handleOpenSubdomain = useCallback(() => {
        if (!subdomainUrl) return;
        try {
            const opened = window.open(subdomainUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw createDomainSettingsError('desktop_domain_settings_subdomain_open_blocked');
            }
        } catch (error) {
            logStoreDataFailure(
                'desktop_domain_settings_subdomain_open_failed',
                error,
                {
                    ...buildDomainSettingsLogContext(storeDetails, 'open_subdomain', subdomainUrl),
                    ...getBoundedStoreStringContext('openUrl', subdomainUrl),
                },
            );
            message.error(DOMAIN_SETTINGS_OPEN_ERROR);
        }
    }, [storeDetails, subdomainUrl]);

    const handleCopyDomainLink = useCallback(async () => {
        if (!activeDomain) return;
        const domainUrl = normalizeBaseUrl(activeDomain);
        try {
            await copyDesktopDomainSettingsText(domainUrl);
            setDomainLinkCopied(true);
            setTimeout(() => setDomainLinkCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure(
                'desktop_domain_settings_domain_copy_failed',
                error,
                {
                    ...buildDomainSettingsLogContext(storeDetails, 'copy_domain', domainUrl),
                    ...getBoundedStoreStringContext('copyValue', domainUrl),
                    hasClipboardWrite: hasDesktopDomainSettingsClipboardWrite(),
                    hasCopyFallback: hasDesktopDomainSettingsCopyFallback(),
                },
            );
            message.error(DOMAIN_SETTINGS_COPY_ERROR);
        }
    }, [activeDomain, storeDetails]);

    const handleOpenDomainLink = useCallback(() => {
        if (!activeDomain) return;
        const domainUrl = normalizeBaseUrl(activeDomain);
        try {
            const opened = window.open(domainUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw createDomainSettingsError('desktop_domain_settings_domain_open_blocked');
            }
        } catch (error) {
            logStoreDataFailure(
                'desktop_domain_settings_domain_open_failed',
                error,
                {
                    ...buildDomainSettingsLogContext(storeDetails, 'open_domain', domainUrl),
                    ...getBoundedStoreStringContext('openUrl', domainUrl),
                },
            );
            message.error(DOMAIN_SETTINGS_OPEN_ERROR);
        }
    }, [activeDomain, storeDetails]);

    const handleCopyDnsRecord = useCallback(async (
        record: { type: string; name: string; value: string },
        index: number,
    ) => {
        try {
            await copyDesktopDomainSettingsText(record.value);
            setCopiedDnsValue(`${index}`);
            setTimeout(() => setCopiedDnsValue(null), 2000);
        } catch (error) {
            logStoreDataFailure(
                'desktop_domain_settings_dns_copy_failed',
                error,
                {
                    ...buildDomainSettingsLogContext(storeDetails, 'copy_dns_record', activeDomain),
                    ...getBoundedStoreStringContext('dnsRecordName', record.name),
                    ...getBoundedStoreStringContext('dnsRecordType', record.type),
                    ...getBoundedStoreStringContext('dnsRecordValue', record.value),
                    dnsRecordCount: dnsRecords.length,
                    dnsRecordIndex: index,
                    hasClipboardWrite: hasDesktopDomainSettingsClipboardWrite(),
                    hasCopyFallback: hasDesktopDomainSettingsCopyFallback(),
                },
            );
            message.error(DOMAIN_SETTINGS_COPY_ERROR);
        }
    }, [activeDomain, dnsRecords.length, storeDetails]);

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>{t('domain')}</Title>
            <Text type="secondary">{t('customDomainDesc')}</Text>
            <Divider />

            <Alert
                message={subdomainUrl || (activeDomain ? `https://${activeDomain}` : t('noSubdomainSet'))}
                showIcon
                style={{ marginBottom: 16 }}
                type={activeDomain ? (customDomainVerified ? 'success' : 'warning') : 'info'}
            />

            <Card size="small" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ marginTop: 0 }}>{t('subdomain')}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                    {t('subdomainSetupNote')}
                </Paragraph>

                {storeDetails?.isMaster === false ? (
                    <Alert
                        description={t('outletSubdomainDesc')}
                        message={t('outletSubdomainInfo')}
                        showIcon
                        type="info"
                    />
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {subdomainUrl ? (
                            <Space wrap>
                                <Tag color="blue" icon={<LuGlobe />}>{subdomainUrl.replace(/^https?:\/\//, '')}</Tag>
                                <Button
                                    icon={subdomainCopied ? <LuCheck /> : <LuCopy />}
                                    onClick={() => void handleCopySubdomain()}
                                >
                                    {subdomainCopied ? t('copied') : t('copy')}
                                </Button>
                                <Button icon={<LuExternalLink />} onClick={handleOpenSubdomain}>
                                    {t('open')}
                                </Button>
                            </Space>
                        ) : null}

                        {/*
                         * G-08 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): once the store
                         * has ever been published, the subdomain is a permanent
                         * URL anchor. Renaming it would break every printed QR,
                         * every shared link, and every indexed page. The editor
                         * is hidden post-publish; pre-publish stores keep the
                         * full flow. Server-side enforcement lives in updateStore.
                         */}
                        {storeDetails?.lastPublishedAt ? (
                            <Alert
                                message={t('subdomainLockedMessage')}
                                description={t('subdomainLockedDescription')}
                                showIcon
                                type="info"
                            />
                        ) : (
                            <>
                                <Input
                                    addonAfter={`.${PLATFORM_DOMAIN}`}
                                    placeholder={t('subdomainPlaceholder')}
                                    value={subdomainValue}
                                    onBlur={(event) => void checkAvailability(event.target.value)}
                                    onChange={(event) => {
                                        setSubdomainValue(event.target.value.toLowerCase().trim());
                                        setAvailability(null);
                                    }}
                                />
                                <Text type="secondary">{t('subdomainHelp')}</Text>

                                {availability ? (
                                    <Text type={availability.available ? 'success' : 'danger'}>
                                        {availability.available ? `${availability.preview} ${t('isAvailable', { name: '' }).replace(' is available', '')} ${t('open') ? '' : ''}` : availability.reason}
                                    </Text>
                                ) : null}

                                <Space wrap>
                                    <Button
                                        disabled={!canCheckSubdomain}
                                        icon={<LuSearch />}
                                        loading={checkingSubdomain}
                                        onClick={() => void checkAvailability(subdomainValue)}
                                    >
                                        {t('checkAvailability')}
                                    </Button>
                                    {canSaveSubdomain ? (
                                        <Button
                                            loading={savingSubdomain}
                                            onClick={() => void saveSubdomain()}
                                            type="primary"
                                        >
                                            {t('saveChanges')}
                                        </Button>
                                    ) : null}
                                </Space>

                                {!storeDetails?.subdomain ? (
                                    <Alert
                                        description={t('noSubdomainDesc')}
                                        message={t('noSubdomainSet')}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}
                            </>
                        )}
                    </Space>
                )}
            </Card>

            <Card size="small">
                <Title level={5} style={{ marginTop: 0 }}>{t('customDomain')}</Title>
                <Paragraph type="secondary">{t('dnsOwnershipNote')}</Paragraph>

                {activeDomain ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Space wrap>
                            <Tag color={customDomainVerified ? 'success' : 'warning'} icon={<LuGlobe />}>
                                {activeDomain}
                            </Tag>
                            <Button
                                icon={domainLinkCopied ? <LuCheck /> : <LuCopy />}
                                onClick={() => void handleCopyDomainLink()}
                            >
                                {domainLinkCopied ? t('copied') : t('copy')}
                            </Button>
                            <Button icon={<LuExternalLink />} onClick={handleOpenDomainLink}>
                                {t('open')}
                            </Button>
                            <Button danger icon={<LuTrash2 />} loading={domainLoading} onClick={() => void handleRemoveDomain()}>
                                Remove
                            </Button>
                        </Space>

                        <Steps
                            current={customDomainVerified ? 2 : 1}
                            direction="vertical"
                            items={[
                                { title: t('domainAdded'), status: 'finish' },
                                { title: t('configureDnsRecords'), description: t('dnsVerificationDesc'), status: customDomainVerified ? 'finish' : 'process' },
                                { title: t('verificationComplete'), description: t('verificationCompleteDesc'), status: customDomainVerified ? 'finish' : 'wait' },
                            ]}
                            size="small"
                        />

                        {!customDomainVerified ? (
                            <>
                                {dnsRecords.length === 0 ? (
                                    <Alert
                                        message="DNS records are not available yet. Check verification again in a moment."
                                        showIcon
                                        type="info"
                                    />
                                ) : null}
                                <List
                                    bordered
                                    dataSource={dnsRecords}
                                    renderItem={(record, index) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    icon={copiedDnsValue === `${index}` ? <LuCheck /> : <LuCopy />}
                                                    key={`copy-${index}`}
                                                    onClick={() => void handleCopyDnsRecord(record, index)}
                                                    size="small"
                                                    type="text"
                                                >
                                                    {copiedDnsValue === `${index}` ? t('copied') : t('copy')}
                                                </Button>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                description={<Text code>{`${record.name} -> ${record.value}`}</Text>}
                                                title={<Space><Tag>{record.type}</Tag><Text>{record.name}</Text></Space>}
                                            />
                                        </List.Item>
                                    )}
                                />
                                <Space wrap>
                                    <Button icon={<LuRefreshCw />} loading={statusLoading} onClick={() => void refreshDomainStatus()} type="primary">
                                        {t('checkVerification')}
                                    </Button>
                                </Space>
                            </>
                        ) : (
                            <Alert
                                description={t('autoRedirect')}
                                message={`${t('menuLiveAt')} ${normalizeBaseUrl(activeDomain)}`}
                                showIcon
                                type="success"
                            />
                        )}
                    </Space>
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Input
                            placeholder={t('domainPlaceholder')}
                            prefix={<LuGlobe />}
                            value={domainInput}
                            onChange={(event) => {
                                setDomainInput(event.target.value.toLowerCase().trim());
                                setDomainAvailability(null);
                            }}
                        />
                        {domainAvailability ? (
                            <Text type={domainAvailability.available ? 'success' : 'danger'}>
                                {domainAvailability.available ? 'Domain is available to connect' : domainAvailability.reason}
                            </Text>
                        ) : null}
                        <Space wrap>
                            <Button
                                disabled={!canCheckDomain}
                                icon={<LuSearch />}
                                loading={checkingDomain}
                                onClick={() => void handleCheckDomain()}
                            >
                                {t('checkAvailability')}
                            </Button>
                            {canConnectDomain ? (
                                <Button
                                    loading={domainLoading}
                                    onClick={() => void handleAddDomain()}
                                    type="primary"
                                >
                                    {t('connectDomain')}
                                </Button>
                            ) : null}
                        </Space>
                    </Space>
                )}

                {domainError ? (
                    <Alert
                        message={domainError}
                        showIcon
                        style={{ marginTop: 16 }}
                        type="error"
                    />
                ) : null}
            </Card>
        </Card>
    );
}

export default memo(DomainSettingsTab);
