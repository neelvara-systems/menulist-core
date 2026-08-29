'use client'

import { getMenuUrl, MENULIST_TENANT_BASE_DOMAIN, normalizeBaseUrl } from '@constant/urls';
import { assertStoreUpdateSucceeded, checkCustomDomainAvailability, updateStore } from '@database/stores';
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import { renderTenantDomainCopy } from '@lib/domains/tenantDomainCopy';
import { normalizeVercelDomainDnsRecords } from '@lib/domains/vercelDnsRecords';
import { isLocalCustomDomainFixture, normalizeCustomDomainAvailabilityCandidate, normalizeSubdomainAvailabilityCandidate } from '@lib/domains/publicAddressInput';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Input as AntInput, List as AntList, Steps, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuCheck,
    LuCheckCircle2,
    LuCopy,
    LuExternalLink,
    LuGlobe,
    LuSearch,
    LuTrash2,
    LuX,
} from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, NavBar, Tag, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileDomainSettingsScreenProps {
    onBack: () => void;
}

type SubdomainAvailabilityResponse = {
    available?: boolean;
    reason?: string;
    normalized?: string;
    preview?: string;
};
type DomainStatusResponse = {
    hasDomain?: unknown;
    domain?: unknown;
    verified?: unknown;
    config?: unknown;
    projectDomain?: unknown;
    providerStatusPending?: unknown;
    refreshPending?: unknown;
};
type DomainAddResponse = {
    domain?: unknown;
    success?: unknown;
    verified?: unknown;
    verification?: unknown;
    projectDomain?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};
type DomainRemoveResponse = {
    removed?: unknown;
    success?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};
type MobileDomainSettingsResponsePhase = 'status' | 'add' | 'remove';

const MOBILE_DOMAIN_SETTINGS_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const MOBILE_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const MOBILE_DOMAIN_SETTINGS_COPY_UNAVAILABLE = 'mobile_domain_settings_copy_unavailable';
const MOBILE_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED = 'mobile_domain_settings_copy_fallback_failed';

const hasMobileDomainSettingsClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileDomainSettingsCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileDomainSettingsText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileDomainSettingsClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileDomainSettingsCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_DOMAIN_SETTINGS_COPY_UNAVAILABLE);
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
            throw new Error(MOBILE_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const createMobileDomainSettingsStatusError = (code: string, status: number) => {
    const error = new Error(code) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
};

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

async function readMobileDomainSettingsDomainResponseJson<T>(
    response: Response,
    phase: MobileDomainSettingsResponsePhase,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<T | null> {
    const logContext = {
        ...context,
        maxBytes: MOBILE_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        phase,
        responseOk: response.ok,
        responseStatus: response.status,
    };
    const parseFailureCode = phase === 'add'
        ? 'mobile_domain_settings_add_response_parse_failed'
        : phase === 'remove'
            ? 'mobile_domain_settings_remove_response_parse_failed'
            : 'mobile_domain_settings_status_response_parse_failed';
    const invalidFailureCode = phase === 'add'
        ? 'mobile_domain_settings_add_response_invalid'
        : phase === 'remove'
            ? 'mobile_domain_settings_remove_response_invalid'
            : 'mobile_domain_settings_status_response_invalid';

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            MOBILE_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logStoreDataFailure(parseFailureCode, error, logContext);
        return null;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logStoreDataFailure(
            invalidFailureCode,
            createMobileDomainSettingsStatusError(invalidFailureCode, response.status),
            logContext,
        );
        return null;
    }

    return payload as T;
}

function MobileDomainSettingsScreenContent({ onBack }: MobileDomainSettingsScreenProps) {
    const t = useTranslations('BusinessSettings');
    const common = useTranslations('Common');
    const tMobile = useTranslations('MobileSettings');
    const tenantDomainCopy = useCallback(
        (copy: string) => renderTenantDomainCopy(copy, MENULIST_TENANT_BASE_DOMAIN),
        [],
    );
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const domainScopeKey = `${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`;
    const domainScopeKeyRef = useRef(domainScopeKey);
    domainScopeKeyRef.current = domainScopeKey;
    const componentActiveRef = useRef(true);
    const statusRequestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!statusRequestGuardRef.current) statusRequestGuardRef.current = createLatestRequestGuard();
    const subdomainCheckGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!subdomainCheckGuardRef.current) subdomainCheckGuardRef.current = createLatestRequestGuard();
    const domainCheckGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!domainCheckGuardRef.current) domainCheckGuardRef.current = createLatestRequestGuard();

    const [subdomainValue, setSubdomainValue] = useState(storeDetails?.subdomain || '');
    const [domainInput, setDomainInput] = useState(storeDetails?.customDomain || '');
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [savingSubdomain, setSavingSubdomain] = useState(false);
    const [checkingDomain, setCheckingDomain] = useState(false);
    const [domainLoading, setDomainLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [availability, setAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string; preview?: string } | null>(null);
    const [domainAvailability, setDomainAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string } | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);
    const [domainLinkCopied, setDomainLinkCopied] = useState(false);
    const [copiedDnsValue, setCopiedDnsValue] = useState<string | null>(null);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
            statusRequestGuardRef.current!.invalidate();
            subdomainCheckGuardRef.current!.invalidate();
            domainCheckGuardRef.current!.invalidate();
        };
    }, []);

    const subdomainUrl = useMemo(
        () => (storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null),
        [storeDetails?.subdomain]
    );
    const subdomainLocked = Boolean(storeDetails?.lastPublishedAt);
    const currentSubdomain = (storeDetails?.subdomain || '').trim().toLowerCase();
    const normalizedInputSubdomain = subdomainValue.trim().toLowerCase();
    const validInputSubdomain = normalizeSubdomainAvailabilityCandidate(subdomainValue);
    const hasSubdomainChanged = normalizedInputSubdomain !== currentSubdomain;
    const canCheckSubdomain = !subdomainLocked && Boolean(validInputSubdomain) && (!storeDetails?.subdomain || hasSubdomainChanged);
    const canSaveSubdomain = Boolean(
        !subdomainLocked
        && availability?.available
        && availability?.normalized === normalizedInputSubdomain
        && (!storeDetails?.subdomain || hasSubdomainChanged)
    );
    const activeDomain = domainStatus
        ? (domainStatus.hasDomain === true && isNonEmptyString(domainStatus.domain) ? domainStatus.domain : undefined)
        : storeDetails?.customDomain;
    const normalizedDomainInput = domainInput.trim().toLowerCase();
    const validDomainInput = normalizeCustomDomainAvailabilityCandidate(domainInput);
    const canCheckDomain = !activeDomain && Boolean(validDomainInput);
    const canConnectDomain = Boolean(
        !activeDomain
        && domainAvailability?.available
        && domainAvailability?.normalized === normalizedDomainInput
    );
    const customDomainVerified = typeof domainStatus?.verified === 'boolean'
        ? domainStatus.verified
        : Boolean(storeDetails?.domainVerified);
    const domainDnsConfig = domainStatus?.config || domainStatus?.verification;
    const dnsRecords = useMemo(
        () => normalizeVercelDomainDnsRecords(
            domainDnsConfig,
            domainStatus?.projectDomain,
            activeDomain || domainInput,
        ),
        [activeDomain, domainDnsConfig, domainInput, domainStatus?.projectDomain],
    );
    const subdomainState = storeDetails?.subdomain ? 'active' : 'not_set';
    const customDomainState = !activeDomain ? 'not_set' : customDomainVerified ? 'live' : 'pending';
    const buildMobileDomainSettingsLogContext = (flow: string, metadata: Record<string, boolean | number | string | undefined> = {}) => ({
        surface: 'mobile_domain_settings',
        flow,
        hasActiveDomain: Boolean(activeDomain),
        hasDomainStatus: Boolean(domainStatus),
        hasSubdomainAvailability: Boolean(availability),
        hasDomainAvailability: Boolean(domainAvailability),
        subdomainLocked,
        ...getBoundedStoreStringContext('tenantId', storeDetails?.tenantId),
        ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStoreStringContext('subdomainInput', subdomainValue),
        ...getBoundedStoreStringContext('domainInput', domainInput),
        ...metadata,
    });

    const refreshStatus = useCallback(async () => {
        if (!storeDetails?.customDomain) return;
        if (isLocalCustomDomainFixture(storeDetails.customDomain)) {
            setDomainStatus({ domain: storeDetails.customDomain, hasDomain: true, providerStatusPending: false, refreshPending: false, verified: storeDetails.domainVerified === true });
            return;
        }
        const requestScopeKey = domainScopeKey;
        const requestId = statusRequestGuardRef.current!.begin();
        setStatusLoading(true);
        try {
            const response = await fetch('/api/domain', AUTH_BROWSER_REQUEST_POLICY);
            if (!response.ok) {
                const statusError = new Error('mobile_domain_settings_status_rejected') as Error & { status?: number };
                statusError.status = response.status;
                throw statusError;
            }
            const data = await readMobileDomainSettingsDomainResponseJson<DomainStatusResponse>(
                response,
                'status',
                buildMobileDomainSettingsLogContext('refresh_domain_status_response'),
            );
            if (
                !statusRequestGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            if (
                !data
                || typeof data.hasDomain !== 'boolean'
                || (data.hasDomain && (!isNonEmptyString(data.domain) || typeof data.verified !== 'boolean'))
            ) {
                const statusError = new Error('mobile_domain_settings_status_response_invalid') as Error & { status?: number };
                statusError.status = response.status;
                throw statusError;
            }
            setDomainStatus(data);
            if (data.hasDomain) {
                setStoreDetails((previous: any) => {
                    if (
                        String(previous?.tenantId ?? '') !== String(storeDetails.tenantId ?? '')
                        || String(previous?.storeId ?? '') !== String(storeDetails.storeId ?? '')
                    ) {
                        return previous;
                    }
                    return {
                        ...previous,
                        customDomain: data.domain,
                        domainVerified: data.verified === true,
                    };
                });
            } else {
                setDomainInput('');
                setStoreDetails((previous: any) => {
                    if (
                        String(previous?.tenantId ?? '') !== String(storeDetails.tenantId ?? '')
                        || String(previous?.storeId ?? '') !== String(storeDetails.storeId ?? '')
                    ) {
                        return previous;
                    }
                    return { ...previous, customDomain: undefined, domainVerified: undefined };
                });
            }
        } catch (error) {
            if (
                !statusRequestGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('mobile_domain_settings_status_load_failed', error, buildMobileDomainSettingsLogContext('refresh_domain_status'));
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            if (
                statusRequestGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setStatusLoading(false);
            }
        }
    }, [common, domainScopeKey, setStoreDetails, storeDetails]);

    useEffect(() => {
        void refreshStatus();
        return () => {
            statusRequestGuardRef.current!.invalidate();
        };
    }, [refreshStatus]);

    const checkAvailability = useCallback(async (input: string) => {
        if (subdomainLocked) {
            setAvailability(null);
            return;
        }
        if (!input || input.trim().length < 3) {
            setAvailability(null);
            return;
        }
        const requestScopeKey = domainScopeKey;
        const requestId = subdomainCheckGuardRef.current!.begin();
        setCheckingSubdomain(true);
        try {
            const response = await fetch(
                `/api/subdomain/check?subdomain=${encodeURIComponent(input.trim())}`,
                AUTH_BROWSER_REQUEST_POLICY,
            );
            let data: SubdomainAvailabilityResponse | null = null;
            try {
                data = await readJsonResponseWithLimit<SubdomainAvailabilityResponse>(
                    response,
                    MOBILE_DOMAIN_SETTINGS_RESPONSE_JSON_MAX_BYTES,
                );
            } catch (error) {
                logStoreDataFailure('mobile_domain_settings_subdomain_check_response_parse_failed', error, {
                    ...buildMobileDomainSettingsLogContext('check_subdomain_response_parse'),
                    responseOk: response.ok,
                    responseStatus: response.status,
                    maxBytes: MOBILE_DOMAIN_SETTINGS_RESPONSE_JSON_MAX_BYTES,
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
                            : t('checkAvailabilityFailed'),
                    });
                    return;
                }
                const checkError = new Error('mobile_domain_settings_subdomain_check_rejected') as Error & { status?: number };
                checkError.status = response.status;
                throw checkError;
            }
            if (typeof data?.available !== 'boolean') {
                logStoreDataFailure(
                    'mobile_domain_settings_subdomain_check_response_invalid',
                    createMobileDomainSettingsStatusError('mobile_domain_settings_subdomain_check_response_invalid', response.status),
                    buildMobileDomainSettingsLogContext('check_subdomain_response_shape'),
                );
                setAvailability({ available: false, reason: t('checkAvailabilityFailed') });
                return;
            }
            setAvailability(data);
            if (data?.normalized) setSubdomainValue(data.normalized);
        } catch (error) {
            if (
                !subdomainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('mobile_domain_settings_subdomain_check_failed', error, buildMobileDomainSettingsLogContext('check_subdomain'));
            setAvailability({ available: false, reason: t('checkAvailabilityFailed') });
        } finally {
            if (
                subdomainCheckGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setCheckingSubdomain(false);
            }
        }
    }, [domainScopeKey, subdomainLocked, t]);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || subdomainValue.trim();
        if (!storeDetails?.storeId || !nextSubdomain) return;
        if (subdomainLocked) {
            Toast.show({ content: t('subdomainLockedMessage'), duration: 1500 });
            return;
        }
        const requestScopeKey = domainScopeKey;
        const expectedTenantId = storeDetails.tenantId;
        const expectedStoreId = storeDetails.storeId;
        setSavingSubdomain(true);
        try {
            const writeResult = await updateStore({ storeId: expectedStoreId, subdomain: nextSubdomain } as any);
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_domain_settings_subdomain_store_update_rejected',
            );
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setStoreDetails((previous: any) => {
                    if (
                        String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                        || String(previous?.storeId ?? '') !== String(expectedStoreId)
                    ) {
                        return previous;
                    }
                    return { ...previous, subdomain: nextSubdomain };
                });
                Toast.show({ content: tMobile('saved'), duration: 1200 });
            }
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_subdomain_save_failed', error, buildMobileDomainSettingsLogContext('save_subdomain'));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                Toast.show({ content: common('error'), duration: 1500 });
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setSavingSubdomain(false);
            }
        }
    }, [availability?.normalized, common, domainScopeKey, setStoreDetails, storeDetails, subdomainLocked, subdomainValue, t, tMobile]);

    const addDomain = async () => {
        if (!domainInput.trim()) return;
        const requestScopeKey = domainScopeKey;
        const expectedTenantId = storeDetails?.tenantId;
        const expectedStoreId = storeDetails?.storeId;
        setDomainLoading(true);
        try {
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify({ domain: domainAvailability?.normalized || domainInput.trim() }),
            });
            if (!response.ok) {
                const addDomainError = new Error('mobile_domain_settings_add_rejected') as Error & { status?: number };
                addDomainError.status = response.status;
                throw addDomainError;
            }
            const data = await readMobileDomainSettingsDomainResponseJson<DomainAddResponse>(
                response,
                'add',
                buildMobileDomainSettingsLogContext('add_domain_response'),
            );
            if (!componentActiveRef.current || domainScopeKeyRef.current !== requestScopeKey) return;
            if (data?.success !== true || !isNonEmptyString(data.domain)) {
                logStoreDataFailure(
                    'mobile_domain_settings_add_response_invalid',
                    createMobileDomainSettingsStatusError('mobile_domain_settings_add_response_invalid', response.status),
                    {
                        ...buildMobileDomainSettingsLogContext('add_domain_response_shape'),
                        hasDomain: isNonEmptyString(data?.domain),
                        success: data?.success === true,
                    },
                );
                throw createMobileDomainSettingsStatusError('mobile_domain_settings_add_response_invalid', response.status);
            }
            const verified = data.verified === true;
            setStoreDetails((previous: any) => {
                if (
                    String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                    || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                ) {
                    return previous;
                }
                return { ...previous, customDomain: data.domain, domainVerified: verified };
            });
            setDomainInput(data.domain);
            setDomainAvailability({ available: true, normalized: data.domain });
            setDomainStatus({
                hasDomain: true,
                domain: data.domain,
                verified,
                config: data.verification,
                projectDomain: data.projectDomain,
            });
            Toast.show({ content: t('domainAdded'), duration: 1200 });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                Toast.show({ content: 'Domain saved. Background refresh is still finishing.', duration: 2200 });
            }
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_add_failed', error, buildMobileDomainSettingsLogContext('add_domain'));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                Toast.show({ content: common('error'), duration: 1800 });
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainLoading(false);
            }
        }
    };

    const checkDomainAvailability = async () => {
        if (!validDomainInput) return;
        const requestScopeKey = domainScopeKey;
        const requestId = domainCheckGuardRef.current!.begin();
        setCheckingDomain(true);
        try {
            const data = await checkCustomDomainAvailability(validDomainInput, storeDetails?.storeId);
            if (
                !domainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            setDomainAvailability(data);
            if (data?.normalized) {
                setDomainInput(data.normalized);
            }
        } catch (error) {
            if (
                !domainCheckGuardRef.current!.isCurrent(requestId)
                || !componentActiveRef.current
                || domainScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logStoreDataFailure('mobile_domain_settings_custom_domain_check_failed', error, buildMobileDomainSettingsLogContext('check_custom_domain'));
            setDomainAvailability({ available: false, reason: common('error') });
        } finally {
            if (
                domainCheckGuardRef.current!.isCurrent(requestId)
                && componentActiveRef.current
                && domainScopeKeyRef.current === requestScopeKey
            ) {
                setCheckingDomain(false);
            }
        }
    };

    const removeDomain = async () => {
        const requestScopeKey = domainScopeKey;
        const expectedTenantId = storeDetails?.tenantId;
        const expectedStoreId = storeDetails?.storeId;
        setDomainLoading(true);
        try {
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'DELETE',
            });
            if (!response.ok) {
                const removeDomainError = new Error('mobile_domain_settings_remove_rejected') as Error & { status?: number };
                removeDomainError.status = response.status;
                throw removeDomainError;
            }
            const data = await readMobileDomainSettingsDomainResponseJson<DomainRemoveResponse>(
                response,
                'remove',
                buildMobileDomainSettingsLogContext('remove_domain_response'),
            );
            if (!componentActiveRef.current || domainScopeKeyRef.current !== requestScopeKey) return;
            if (data?.success !== true || data.removed !== true) {
                logStoreDataFailure(
                    'mobile_domain_settings_remove_response_invalid',
                    createMobileDomainSettingsStatusError('mobile_domain_settings_remove_response_invalid', response.status),
                    {
                        ...buildMobileDomainSettingsLogContext('remove_domain_response_shape'),
                        removed: data?.removed === true,
                        success: data?.success === true,
                    },
                );
                throw createMobileDomainSettingsStatusError('mobile_domain_settings_remove_response_invalid', response.status);
            }
            setStoreDetails((previous: any) => {
                if (
                    String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')
                    || String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')
                ) {
                    return previous;
                }
                return { ...previous, customDomain: undefined, domainVerified: undefined };
            });
            setDomainInput('');
            setDomainStatus(null);
            Toast.show({ content: tMobile('saved'), duration: 1200 });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                Toast.show({ content: 'Domain removed. Background cleanup is still finishing.', duration: 2200 });
            }
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_remove_failed', error, buildMobileDomainSettingsLogContext('remove_domain'));
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                Toast.show({ content: common('error'), duration: 1500 });
            }
        } finally {
            if (componentActiveRef.current && domainScopeKeyRef.current === requestScopeKey) {
                setDomainLoading(false);
            }
        }
    };

    const handleCopyActiveDomain = async () => {
        if (!activeDomain) return;
        const domainUrl = normalizeBaseUrl(activeDomain);
        try {
            await copyMobileDomainSettingsText(domainUrl);
            setDomainLinkCopied(true);
            setTimeout(() => setDomainLinkCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_domain_copy_failed', error, {
                ...buildMobileDomainSettingsLogContext('copy_active_domain'),
                ...getBoundedStoreStringContext('copyValue', domainUrl),
                hasClipboardWrite: hasMobileDomainSettingsClipboardWrite(),
                hasCopyFallback: hasMobileDomainSettingsCopyFallback(),
            });
            Toast.show({ content: common('error'), duration: 1500 });
        }
    };

    const handleOpenActiveDomain = () => {
        if (!activeDomain) return;
        const domainUrl = normalizeBaseUrl(activeDomain);
        try {
            openIsolatedBrowserUrl(domainUrl);
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_domain_open_failed', error, {
                ...buildMobileDomainSettingsLogContext('open_active_domain'),
                ...getBoundedStoreStringContext('openUrl', domainUrl),
            });
            Toast.show({ content: common('error'), duration: 1500 });
        }
    };

    const handleCopyDnsRecord = async (
        record: { type: string; name: string; value: string },
        index: number,
    ) => {
        try {
            await copyMobileDomainSettingsText(record.value);
            setCopiedDnsValue(`${index}`);
            setTimeout(() => setCopiedDnsValue(null), 2000);
        } catch (error) {
            logStoreDataFailure('mobile_domain_settings_dns_copy_failed', error, {
                ...buildMobileDomainSettingsLogContext('copy_dns_record'),
                ...getBoundedStoreStringContext('dnsRecordName', record.name),
                ...getBoundedStoreStringContext('dnsRecordType', record.type),
                ...getBoundedStoreStringContext('dnsRecordValue', record.value),
                dnsRecordCount: dnsRecords.length,
                dnsRecordIndex: index,
                hasClipboardWrite: hasMobileDomainSettingsClipboardWrite(),
                hasCopyFallback: hasMobileDomainSettingsCopyFallback(),
            });
            Toast.show({ content: common('error'), duration: 1500 });
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('domainSettingsSubtitle')}
                onBack={onBack}
                title={t('domain')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('subdomain')}</Text>
                            <Tag color={subdomainState === 'active' ? 'success' : 'default'}>
                                {subdomainState === 'active' ? common('enabled') : tMobile('notSet')}
                            </Tag>
                        </Flex>
                        <Text type="secondary">
                            {storeDetails?.subdomain
                                ? getMenuUrl(storeDetails.subdomain).replace(/^https?:\/\//, '')
                                : tenantDomainCopy(t('noSubdomainDesc'))}
                        </Text>
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('customDomain')}</Text>
                            <Tag color={customDomainState === 'live' ? 'success' : customDomainState === 'pending' ? 'warning' : 'default'}>
                                {customDomainState === 'live'
                                    ? t('verificationComplete')
                                    : customDomainState === 'pending'
                                        ? t('checkVerification')
                                        : tMobile('notSet')}
                            </Tag>
                        </Flex>
                        <Text type="secondary">
                            {activeDomain
                                ? (customDomainVerified ? `${t('menuLiveAt')} ${activeDomain}` : t('waitingDnsVerification', { domain: activeDomain }))
                                : tenantDomainCopy(t('customDomainDesc'))}
                        </Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text strong>{t('subdomain')}</Text>
                        <Text type="secondary">{t('subdomainSetupNote')}</Text>
                        {storeDetails?.isMaster === false ? (
                            <>
                                <Text>{subdomainUrl ? subdomainUrl.replace(/^https?:\/\//, '') : t('outletSubdomainInfo')}</Text>
                                <Text type="secondary">{tenantDomainCopy(t('outletSubdomainDesc'))}</Text>
                            </>
                        ) : subdomainLocked ? (
                            <>
                                <Text>{subdomainUrl ? subdomainUrl.replace(/^https?:\/\//, '') : tenantDomainCopy(t('noSubdomainDesc'))}</Text>
                                <Alert
                                    description={t('subdomainChangeWarning')}
                                    message={t('subdomainLockedMessage')}
                                    showIcon
                                    type="info"
                                />
                            </>
                        ) : (
                            <>
                                {storeDetails?.subdomain ? (
                                    <Alert
                                        description={t('subdomainChangeWarning')}
                                        message={t('subdomainLockedMessage')}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}
                                <AntInput
                                    addonAfter={`.${MENULIST_TENANT_BASE_DOMAIN}`}
                                    aria-label={t('subdomain')}
                                    onChange={(event) => {
                                        setSubdomainValue(event.target.value.toLowerCase().trim());
                                        setAvailability(null);
                                    }}
                                    placeholder={t('subdomainPlaceholder')}
                                    value={subdomainValue}
                                />
                                <Text type="secondary">Use a clean public name for your MenuList address. Customers will see and share this link.</Text>
                                <Text type="secondary">{tenantDomainCopy(t('subdomainHelp'))}</Text>
                                {availability ? (
                                    <Flex align="center" gap={8}>
                                        {availability.available ? <LuCheck color={token.colorSuccess} size={16} /> : <LuX color={token.colorError} size={16} />}
                                        <Text type="secondary">{availability.available ? t('isAvailable', { name: availability.preview ?? subdomainValue }) : availability.reason}</Text>
                                    </Flex>
                                ) : null}
                                {!storeDetails?.subdomain ? (
                                    <Alert
                                        description={tenantDomainCopy(t('noSubdomainDesc'))}
                                        message={t('noSubdomainSet')}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}
                                <Flex gap={8}>
                                    <Button aria-label={`${t('checkAvailability')}: ${t('subdomain')}`} block disabled={!canCheckSubdomain} fill="outline" loading={checkingSubdomain} onClick={() => void checkAvailability(subdomainValue)} size="large">
                                        <Flex align="center" gap={6}>
                                            <LuSearch size={16} />
                                            <Text>{t('checkAvailability')}</Text>
                                        </Flex>
                                    </Button>
                                    {canSaveSubdomain ? (
                                        <Button block color="primary" loading={savingSubdomain} onClick={() => void saveSubdomain()} size="large">
                                            {common('save')}
                                        </Button>
                                    ) : null}
                                </Flex>
                            </>
                        )}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text strong>{t('customDomain')}</Text>
                        <Text type="secondary">{tenantDomainCopy(t('customDomainDesc'))}</Text>
                        <Text type="secondary">{t('dnsOwnershipNote')}</Text>
                        {activeDomain ? (
                            <>
                                <Flex align="center" gap={8} justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuGlobe size={18} />
                                        <Text strong>{activeDomain}</Text>
                                    </Flex>
                                    <Tag color={customDomainVerified ? 'success' : 'warning'}>
                                        {customDomainVerified ? t('verificationComplete') : t('checkVerification')}
                                    </Tag>
                                </Flex>
                                <Text type="secondary">
                                    {customDomainVerified ? t('menuLiveAt') : t('waitingDnsVerification', { domain: activeDomain })}
                                </Text>
                                <Flex gap={8} wrap>
                                    <Button fill="outline" loading={statusLoading} onClick={() => void refreshStatus()} size="small">
                                        <Flex align="center" gap={6}><LuSearch size={16} /><Text>{t('checkVerification')}</Text></Flex>
                                    </Button>
                                    <Button fill="outline" onClick={() => void handleCopyActiveDomain()} size="small">
                                        <Flex align="center" gap={6}>{domainLinkCopied ? <LuCheck size={16} /> : <LuCopy size={16} />}<Text>{domainLinkCopied ? t('copied') : t('copy')}</Text></Flex>
                                    </Button>
                                    <Button fill="outline" onClick={handleOpenActiveDomain} size="small">
                                        <Flex align="center" gap={6}><LuExternalLink size={16} /><Text>{t('open')}</Text></Flex>
                                    </Button>
                                    <Button
                                        color="danger"
                                        fill="outline"
                                        loading={domainLoading}
                                        onClick={() => {
                                            void Dialog.confirm({
                                                cancelText: common('cancel'),
                                                confirmText: t('removeDomain'),
                                                content: t('removeDomainConfirmDesc', { domain: activeDomain }),
                                                onConfirm: removeDomain,
                                                title: t('removeDomainConfirmTitle'),
                                            });
                                        }}
                                        size="small"
                                    >
                                        <Flex align="center" gap={6}><LuTrash2 size={16} /><Text>{t('removeDomain')}</Text></Flex>
                                    </Button>
                                </Flex>
                                {!customDomainVerified ? (
                                    <Steps
                                        current={1}
                                        direction="vertical"
                                        items={[
                                            { title: t('domainAdded'), status: 'finish' },
                                            { title: t('configureDnsRecords'), description: t('dnsVerificationDesc'), status: 'process' },
                                            { title: t('verificationComplete'), description: t('verificationCompleteDesc'), status: 'wait' },
                                        ]}
                                        size="small"
                                    />
                                ) : null}
                            </>
                        ) : (
                            <>
                                <Input
                                    aria-label={t('customDomain')}
                                    onChange={(value) => {
                                        setDomainInput(value);
                                        setDomainAvailability(null);
                                    }}
                                    placeholder={t('domainPlaceholder')}
                                    value={domainInput}
                                />
                                <Text type="secondary">Enter a domain you already control. After connecting it, you will still need to update DNS where the domain is managed.</Text>
                                {domainAvailability ? (
                                    <Flex align="center" gap={8}>
                                        {domainAvailability.available ? <LuCheck color={token.colorSuccess} size={16} /> : <LuX color={token.colorError} size={16} />}
                                        <Text type="secondary">{domainAvailability.available ? 'Domain is available to connect' : domainAvailability.reason}</Text>
                                    </Flex>
                                ) : null}
                                <Flex gap={8}>
                                    <Button aria-label={`${t('checkAvailability')}: ${t('customDomain')}`} block disabled={!canCheckDomain} fill="outline" loading={checkingDomain} onClick={() => void checkDomainAvailability()} size="large">
                                        <Flex align="center" gap={6}>
                                            <LuSearch size={16} />
                                            <Text>{t('checkAvailability')}</Text>
                                        </Flex>
                                    </Button>
                                    {canConnectDomain ? (
                                        <Button block color="primary" loading={domainLoading} onClick={() => void addDomain()} size="large">
                                            {t('connectDomain')}
                                        </Button>
                                    ) : null}
                                </Flex>
                            </>
                        )}
                    </Flex>
                </Card>

                {domainDnsConfig ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text strong>{t('configureDnsRecords')}</Text>
                            <Text type="secondary">{t('configureDnsRecordsDesc')}</Text>
                            {dnsRecords.length === 0 ? (
                                <Alert
                                    message="DNS records are not available yet. Check verification again in a moment."
                                    showIcon
                                    type="info"
                                />
                            ) : null}
                            <AntList
                                bordered
                                dataSource={dnsRecords}
                                renderItem={(record, index) => (
                                    <AntList.Item>
                                        <Flex align="center" gap={10} justify="space-between" style={{ width: '100%' }}>
                                            <Flex gap={6} style={{ minWidth: 0 }} vertical>
                                                <Tag style={{ alignSelf: 'flex-start' }}>{record.type}</Tag>
                                                <Typography.Text code style={{ wordBreak: 'break-word' }}>{record.name}</Typography.Text>
                                                <Typography.Text code style={{ wordBreak: 'break-word' }}>{record.value}</Typography.Text>
                                            </Flex>
                                            <Button
                                                aria-label={t('copy')}
                                                fill="outline"
                                                onClick={() => void handleCopyDnsRecord(record, index)}
                                                size="small"
                                                style={{ minHeight: 44, minWidth: 44 }}
                                            >
                                                {copiedDnsValue === `${index}` ? <LuCheck size={16} /> : <LuCopy size={16} />}
                                            </Button>
                                        </Flex>
                                    </AntList.Item>
                                )}
                            />
                        </Flex>
                    </Card>
                ) : null}

                {customDomainVerified ? (
                    <Card>
                        <Flex gap={6} vertical>
                            <Flex align="center" gap={8}>
                                <LuCheckCircle2 color={token.colorSuccess} size={18} />
                                <Text strong>{t('customDomainActive')}</Text>
                            </Flex>
                            <Text type="secondary">{tenantDomainCopy(t('autoRedirect'))}</Text>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Flex>
    );
}

export default function MobileDomainSettingsScreen(props: MobileDomainSettingsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`;

    return <MobileDomainSettingsScreenContent key={scopeKey} {...props} />;
}
