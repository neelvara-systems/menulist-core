'use client';
import { FEATURE_FLAGS } from '@config/features';
import { normalizeBaseUrl } from '@constant/urls';
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { normalizeVercelDomainDnsRecords, type VercelDomainDnsRecord } from '@lib/domains/vercelDnsRecords';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from '../utils/businessSettingsDiagnostics';
import { Alert, Button, Card, Col, Divider, Input, Row, Space, Steps, Tag, Typography, notification, theme } from 'antd';
import { memo, useCallback, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuFileText, LuGlobe, LuLoader, LuRefreshCw, LuRotateCcw, LuTrash2 } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface CustomDomainTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
    onStoreUpdate?: (updates: any) => void;
}

type DomainStatus = 'none' | 'adding' | 'pending' | 'verified' | 'error';

type DnsRecord = VercelDomainDnsRecord;

type ComplianceTab = 'privacy' | 'terms' | 'refund';
type CompliancePageData = { content: string; customContent?: string; source: string; systemContent?: string } | null;
type CompliancePagesState = Record<ComplianceTab, CompliancePageData>;
type ComplianceMutationAction = 'save' | 'reset';
type ComplianceApiMutationAction = 'override' | 'reset';
type ComplianceMutationResponse = {
    action?: unknown;
    success?: boolean;
    type?: unknown;
};
type ComplianceLoadResponse = Partial<CompliancePagesState>;
type DesktopCustomDomainResponsePhase = 'add' | 'status' | 'remove';
type DesktopCustomDomainAddResponse = {
    success?: unknown;
    domain?: unknown;
    verified?: unknown;
    verification?: unknown;
    projectDomain?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};
type DesktopCustomDomainStatusResponse = {
    hasDomain?: unknown;
    domain?: unknown;
    verified?: unknown;
    config?: unknown;
    projectDomain?: unknown;
};
type DesktopCustomDomainRemoveResponse = {
    removed?: unknown;
    success?: unknown;
    claimReleasePending?: unknown;
    providerCleanupPending?: unknown;
    refreshPending?: unknown;
};

const DESKTOP_CUSTOM_DOMAIN_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const DESKTOP_CUSTOM_DOMAIN_COPY_CLIPBOARD_UNAVAILABLE = 'desktop_custom_domain_copy_clipboard_unavailable';
const DESKTOP_CUSTOM_DOMAIN_COPY_FALLBACK_FAILED = 'desktop_custom_domain_copy_fallback_failed';

function buildDesktopCustomDomainCopyError(code: string) {
    return Object.assign(new Error(code), { code });
}

function hasDesktopCustomDomainClipboardWrite() {
    return typeof navigator !== 'undefined'
        && Boolean(navigator.clipboard?.writeText);
}

function hasDesktopCustomDomainCopyFallback() {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyDesktopCustomDomainTextToClipboard(text: string) {
    if (hasDesktopCustomDomainClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Continue to the acknowledged textarea fallback before surfacing failure.
        }
    }

    if (!hasDesktopCustomDomainCopyFallback()) {
        throw buildDesktopCustomDomainCopyError(DESKTOP_CUSTOM_DOMAIN_COPY_CLIPBOARD_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
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
            throw buildDesktopCustomDomainCopyError(DESKTOP_CUSTOM_DOMAIN_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

function getAxiosStatus(error: any): number | undefined {
    const status = Number(error?.response?.status);
    return Number.isFinite(status) ? status : undefined;
}

function createStatusError(failureCode: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(failureCode), {
        code: failureCode,
        status,
    });
}

function buildCustomDomainLogContext(storeDetails: any, action: string, value?: unknown) {
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

const getDesktopCustomDomainResponseFailureCodes = (phase: DesktopCustomDomainResponsePhase) => {
    switch (phase) {
        case 'add':
            return {
                invalid: 'desktop_custom_domain_add_response_invalid',
                parse: 'desktop_custom_domain_add_response_parse_failed',
            };
        case 'remove':
            return {
                invalid: 'desktop_custom_domain_remove_response_invalid',
                parse: 'desktop_custom_domain_remove_response_parse_failed',
            };
        case 'status':
        default:
            return {
                invalid: 'desktop_custom_domain_status_response_invalid',
                parse: 'desktop_custom_domain_status_response_parse_failed',
            };
    }
};

async function readDesktopCustomDomainResponseJson<T>(
    response: Response,
    phase: DesktopCustomDomainResponsePhase,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<T | null> {
    const failureCodes = getDesktopCustomDomainResponseFailureCodes(phase);
    const logContext = {
        ...context,
        maxBytes: DESKTOP_CUSTOM_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        phase,
        responseOk: response.ok,
        responseStatus: response.status,
    };

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            DESKTOP_CUSTOM_DOMAIN_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logStoreDataFailure(failureCodes.parse, error, logContext);
        return null;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logStoreDataFailure(
            failureCodes.invalid,
            createStatusError(failureCodes.invalid, response.status),
            logContext,
        );
        return null;
    }

    return payload as T;
}

function buildComplianceLogContext(action: string, type: ComplianceTab, domain?: string, pageUrl?: string) {
    return {
        action,
        pageType: type,
        ...getBoundedBusinessSettingsStringContext('domain', domain),
        ...getBoundedBusinessSettingsStringContext('pageUrl', pageUrl),
    };
}

function getExpectedComplianceApiMutationAction(action: ComplianceMutationAction): ComplianceApiMutationAction {
    return action === 'save' ? 'override' : 'reset';
}

function getComplianceMutationLogAction(action: ComplianceMutationAction): string {
    return action === 'save' ? 'save_override' : 'reset_override';
}

function isSuccessfulComplianceMutationResponse(
    value: ComplianceMutationResponse | null,
    type: ComplianceTab,
    action: ComplianceMutationAction,
): value is ComplianceMutationResponse & {
    action: ComplianceApiMutationAction;
    success: true;
    type: ComplianceTab;
} {
    return Boolean(
        value
        && value.success === true
        && value.type === type
        && value.action === getExpectedComplianceApiMutationAction(action),
    );
}

function buildComplianceMutationResponseLogContext(
    result: ComplianceMutationResponse | null,
    type: ComplianceTab,
    action: ComplianceMutationAction,
    domain?: string,
) {
    return {
        ...buildComplianceLogContext(getComplianceMutationLogAction(action), type, domain),
        hasExpectedAction: result?.action === getExpectedComplianceApiMutationAction(action),
        hasExpectedType: result?.type === type,
        success: result?.success === true,
    };
}

function normalizeCompliancePages(data: ComplianceLoadResponse): CompliancePagesState {
    return {
        privacy: data.privacy || null,
        refund: data.refund || null,
        terms: data.terms || null,
    };
}

async function readDesktopComplianceMutationResponseJson(
    response: Response,
    type: ComplianceTab,
    action: ComplianceMutationAction,
    domain?: string,
): Promise<ComplianceMutationResponse | null> {
    try {
        return await readJsonResponseWithLimit<ComplianceMutationResponse>(
            response,
            DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logBusinessSettingsFailure(
            'desktop_compliance_page_response_parse_failed',
            error,
            {
                ...buildComplianceLogContext(action, type, domain),
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES,
            },
        );
        return null;
    }
}

async function readDesktopComplianceLoadResponseJson(
    response: Response,
    type: ComplianceTab,
    domain?: string,
    pageUrl?: string,
): Promise<ComplianceLoadResponse | null> {
    try {
        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
        );
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            logBusinessSettingsFailure(
                'desktop_compliance_pages_load_response_invalid',
                createStatusError('desktop_compliance_pages_load_response_invalid', response.status),
                {
                    ...buildComplianceLogContext('load_pages', type, domain, pageUrl),
                    responseOk: response.ok,
                    responseStatus: response.status,
                    maxBytes: DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
                },
            );
            return null;
        }
        return payload as ComplianceLoadResponse;
    } catch (error) {
        logBusinessSettingsFailure(
            'desktop_compliance_pages_load_response_parse_failed',
            error,
            {
                ...buildComplianceLogContext('load_pages', type, domain, pageUrl),
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
            },
        );
        return null;
    }
}

function CustomDomainTab({ scrollRef, storeDetails, onStoreUpdate }: CustomDomainTabProps) {
    const [status, setStatus] = useState<DomainStatus>('none');
    const [domainInput, setDomainInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const activeDomainUrl = storeDetails?.customDomain ? normalizeBaseUrl(storeDetails.customDomain) : '';
    const { token } = theme.useToken();

    // Initialize from store data
    useEffect(() => {
        if (storeDetails?.customDomain) {
            if (storeDetails.domainVerified) {
                setStatus('verified');
            } else {
                setStatus('pending');
            }
            setDomainInput(storeDetails.customDomain);
        }
    }, [storeDetails]);

    const handleCopy = useCallback(async (
        text: string,
        label: string,
        copyType: 'active_domain' | 'dns_record',
        record?: DnsRecord,
        index?: number,
    ) => {
        try {
            await copyDesktopCustomDomainTextToClipboard(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            logStoreDataFailure(
                copyType === 'dns_record'
                    ? 'desktop_custom_domain_dns_copy_failed'
                    : 'desktop_custom_domain_link_copy_failed',
                error,
                copyType === 'dns_record'
                    ? {
                        ...buildCustomDomainLogContext(storeDetails, 'copy_dns_record', storeDetails?.customDomain || domainInput),
                        ...getBoundedStoreStringContext('dnsRecordName', record?.name),
                        ...getBoundedStoreStringContext('dnsRecordType', record?.type),
                        ...getBoundedStoreStringContext('dnsRecordValue', record?.value),
                        dnsRecordCount: dnsRecords.length,
                        dnsRecordIndex: index,
                        hasClipboardWrite: hasDesktopCustomDomainClipboardWrite(),
                        hasCopyFallback: hasDesktopCustomDomainCopyFallback(),
                    }
                    : {
                        ...buildCustomDomainLogContext(storeDetails, 'copy_active_domain', text),
                        ...getBoundedStoreStringContext('copyValue', text),
                        hasClipboardWrite: hasDesktopCustomDomainClipboardWrite(),
                        hasCopyFallback: hasDesktopCustomDomainCopyFallback(),
                    },
            );
            notification.error({ message: 'Failed to copy.' });
        }
    }, [dnsRecords.length, domainInput, storeDetails]);

    const handleOpenActiveDomain = () => {
        if (!activeDomainUrl) return;
        try {
            const opened = window.open(activeDomainUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('desktop_custom_domain_open_blocked');
            }
        } catch (error) {
            logStoreDataFailure(
                'desktop_custom_domain_open_failed',
                error,
                {
                    ...buildCustomDomainLogContext(storeDetails, 'open_active_domain', storeDetails?.customDomain),
                    ...getBoundedStoreStringContext('openUrl', activeDomainUrl),
                },
            );
            setError('Failed to open domain.');
        }
    };

    // Add domain
    const handleAddDomain = useCallback(async () => {
        if (!domainInput || domainInput.length < 4) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify({ domain: domainInput }),
            });
            const data = await readDesktopCustomDomainResponseJson<DesktopCustomDomainAddResponse>(
                response,
                'add',
                buildCustomDomainLogContext(storeDetails, 'add_domain_response', domainInput),
            );
            if (!response.ok) {
                throw createStatusError('desktop_custom_domain_add_rejected', response.status);
            }
            if (data?.success !== true || !isNonEmptyString(data.domain)) {
                logStoreDataFailure(
                    'desktop_custom_domain_add_response_invalid',
                    createStatusError('desktop_custom_domain_add_response_invalid', response.status),
                    {
                        ...buildCustomDomainLogContext(storeDetails, 'add_domain_response_shape', domainInput),
                        hasDomain: isNonEmptyString(data?.domain),
                        success: data?.success === true,
                    },
                );
                throw createStatusError('desktop_custom_domain_add_response_invalid', response.status);
            }
            setStatus('pending');
            setDomainInput(data.domain);

            setDnsRecords(normalizeVercelDomainDnsRecords(
                data.verification,
                data.projectDomain,
                data.domain,
            ));

            onStoreUpdate?.({ customDomain: data.domain, domainVerified: data.verified === true });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                notification.warning({ message: 'Domain saved. Background refresh is still finishing.' });
            }
        } catch (err: any) {
            logStoreDataFailure(
                'desktop_custom_domain_add_failed',
                createStatusError('desktop_custom_domain_add_rejected', getAxiosStatus(err)),
                buildCustomDomainLogContext(storeDetails, 'add_domain', domainInput),
            );
            setError('Failed to add domain. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [domainInput, onStoreUpdate, storeDetails]);

    // Check verification
    const handleCheckVerification = useCallback(async () => {
        setChecking(true);
        setError(null);

        try {
            const response = await fetch('/api/domain', AUTH_BROWSER_REQUEST_POLICY);
            const data = await readDesktopCustomDomainResponseJson<DesktopCustomDomainStatusResponse>(
                response,
                'status',
                buildCustomDomainLogContext(storeDetails, 'check_verification_response', storeDetails?.customDomain || domainInput),
            );
            if (!response.ok) {
                throw createStatusError('desktop_custom_domain_status_load_rejected', response.status);
            }
            if (
                typeof data?.hasDomain !== 'boolean'
                || (data.hasDomain && (!isNonEmptyString(data.domain) || typeof data.verified !== 'boolean'))
            ) {
                logStoreDataFailure(
                    'desktop_custom_domain_status_response_invalid',
                    createStatusError('desktop_custom_domain_status_response_invalid', response.status),
                    {
                        ...buildCustomDomainLogContext(storeDetails, 'check_verification_response_shape', storeDetails?.customDomain || domainInput),
                        hasDomainFlag: typeof data?.hasDomain === 'boolean',
                        hasDomain: isNonEmptyString(data?.domain),
                    },
                );
                throw createStatusError('desktop_custom_domain_status_response_invalid', response.status);
            }
            if (data.hasDomain && data.verified === true) {
                setStatus('verified');
                onStoreUpdate?.({ domainVerified: true });
            } else if (!data.hasDomain) {
                setStatus('none');
                setError('No custom domain is connected.');
            } else {
                setStatus('pending');
                setDnsRecords(normalizeVercelDomainDnsRecords(
                    data.config,
                    data.projectDomain,
                    isNonEmptyString(data.domain) ? data.domain : domainInput,
                ));
                onStoreUpdate?.({ domainVerified: false });
                setError('Domain not verified yet. Please check your DNS settings and try again in a few minutes.');
            }
        } catch (error) {
            logStoreDataFailure('desktop_custom_domain_status_load_failed', error, buildCustomDomainLogContext(
                storeDetails,
                'check_verification',
                storeDetails?.customDomain || domainInput,
            ));
            setError('Could not check verification status.');
        } finally {
            setChecking(false);
        }
    }, [domainInput, onStoreUpdate, storeDetails]);

    // Remove domain
    const handleRemoveDomain = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/domain', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'DELETE',
            });
            const data = await readDesktopCustomDomainResponseJson<DesktopCustomDomainRemoveResponse>(
                response,
                'remove',
                buildCustomDomainLogContext(storeDetails, 'remove_domain_response', storeDetails?.customDomain || domainInput),
            );
            if (!response.ok) {
                throw createStatusError('desktop_custom_domain_remove_rejected', response.status);
            }
            if (data?.success !== true || data.removed !== true) {
                logStoreDataFailure(
                    'desktop_custom_domain_remove_response_invalid',
                    createStatusError('desktop_custom_domain_remove_response_invalid', response.status),
                    {
                        ...buildCustomDomainLogContext(storeDetails, 'remove_domain_response_shape', storeDetails?.customDomain || domainInput),
                        removed: data?.removed === true,
                        success: data?.success === true,
                    },
                );
                throw createStatusError('desktop_custom_domain_remove_response_invalid', response.status);
            }
            setStatus('none');
            setDomainInput('');
            setDnsRecords([]);
            onStoreUpdate?.({ customDomain: null, domainVerified: false });
            if (data.providerCleanupPending === true || data.claimReleasePending === true || data.refreshPending === true) {
                notification.warning({ message: 'Domain removed. Background cleanup is still finishing.' });
            }
        } catch (error) {
            logStoreDataFailure('desktop_custom_domain_remove_failed', error, buildCustomDomainLogContext(
                storeDetails,
                'remove_domain',
                storeDetails?.customDomain || domainInput,
            ));
            setError('Failed to remove domain.');
        } finally {
            setLoading(false);
        }
    }, [domainInput, onStoreUpdate, storeDetails]);

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>Custom Domain</Title>
            <Divider />

            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Connect your own domain (like <strong>yourbusiness.com</strong>) to your MenuList page.
                Customers will see your domain instead of menulist.ai.
            </Paragraph>

            {/* ── State: No domain ── */}
            {status === 'none' && (
                <>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={16}>
                            <Input
                                size="large"
                                placeholder="yourbusiness.com"
                                value={domainInput}
                                onChange={(e) => setDomainInput(e.target.value.toLowerCase().trim())}
                                prefix={<LuGlobe />}
                                onPressEnter={handleAddDomain}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Button
                                type="primary"
                                size="large"
                                loading={loading}
                                onClick={handleAddDomain}
                                disabled={!domainInput || domainInput.length < 4}
                                style={{ width: '100%' }}
                            >
                                Connect Domain
                            </Button>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        You must own the domain and have access to its DNS settings (usually from your domain registrar like GoDaddy, Namecheap, Google Domains, etc.)
                    </Text>
                </>
            )}

            {/* ── State: Pending verification ── */}
            {status === 'pending' && (
                <>
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={`Waiting for DNS verification: ${storeDetails?.customDomain || domainInput}`}
                        description="Follow the steps below to verify your domain. DNS changes can take up to 48 hours to propagate."
                    />

                    <Steps
                        direction="vertical"
                        current={1}
                        size="small"
                        style={{ marginBottom: 16 }}
                        items={[
                            { title: 'Domain added', description: storeDetails?.customDomain || domainInput, status: 'finish' },
                            {
                                title: 'Configure DNS records',
                                description: 'Add the following records in your domain registrar',
                                status: 'process',
                            },
                            { title: 'Verification complete', description: 'Your domain will be live', status: 'wait' },
                        ]}
                    />

                    {/* DNS Records Table */}
                    <Card size="small" style={{ marginBottom: 16, background: token.colorFillSecondary }}>
                        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: 14 }}>
                            DNS Records to Add
                        </Title>
                        {dnsRecords.length === 0 ? (
                            <Alert
                                message="DNS records are not available yet. Check verification again in a moment."
                                showIcon
                                style={{ marginBottom: 12 }}
                                type="info"
                            />
                        ) : null}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${token.colorBorder}` }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Value</th>
                                        <th style={{ padding: '8px', width: 60 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dnsRecords.map((record, i) => (
                                        <tr key={i} style={{ borderBottom: `1px solid ${token.colorBorder}` }}>
                                            <td style={{ padding: '8px' }}>
                                                <Tag color="blue">{record.type}</Tag>
                                            </td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                                                {record.name}
                                            </td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                {record.value}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={copied === `${i}` ? <LuCheck /> : <LuCopy />}
                                                    onClick={() => void handleCopy(record.value, `${i}`, 'dns_record', record, i)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Space>
                        <Button
                            type="primary"
                            icon={checking ? <LuLoader /> : <LuRefreshCw />}
                            loading={checking}
                            onClick={handleCheckVerification}
                        >
                            Check Verification
                        </Button>
                        <Button
                            danger
                            icon={<LuTrash2 />}
                            loading={loading}
                            onClick={handleRemoveDomain}
                        >
                            Remove Domain
                        </Button>
                    </Space>
                </>
            )}

            {/* ── State: Verified ── */}
            {status === 'verified' && (
                <>
                    <Alert
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="Custom domain is active"
                        description={
                            <Space direction="vertical" size={4}>
                                <Text>
                                    Your menu is live at{' '}
                                    <a
                                        href={activeDomainUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontWeight: 600 }}
                                    >
                                        {storeDetails?.customDomain}
                                    </a>
                                </Text>
                                <Text type="secondary">
                                    Visitors to your menulist.ai link will automatically redirect here.
                                </Text>
                            </Space>
                        }
                    />

                    <Space>
                        <Button
                            icon={<LuExternalLink />}
                            onClick={handleOpenActiveDomain}
                        >
                            Open
                        </Button>
                        <Button
                            icon={copied === 'url' ? <LuCheck /> : <LuCopy />}
                            onClick={() => void handleCopy(activeDomainUrl, 'url', 'active_domain')}
                        >
                            {copied === 'url' ? 'Copied' : 'Copy Link'}
                        </Button>
                        <Button
                            danger
                            icon={<LuTrash2 />}
                            loading={loading}
                            onClick={handleRemoveDomain}
                        >
                            Remove Domain
                        </Button>
                    </Space>
                </>
            )}

            {/* Error display */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    closable
                    style={{ marginTop: 12 }}
                    message={error}
                    onClose={() => setError(null)}
                />
            )}

            {/* ── Compliance Pages Section ── */}
            {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (status === 'verified' || status === 'pending' || storeDetails?.customDomain) && (
                <>
                    <Divider style={{ margin: '24px 0 16px' }} />
                    <CompliancePagesSection domain={storeDetails?.customDomain} />
                </>
            )}
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// Compliance Pages Section
// @see __docs__/compliance-pages/compliance-pages_impl.md
// ═══════════════════════════════════════════════════════════════

function CompliancePagesSection({ domain }: { domain?: string }) {
    const { token } = theme.useToken();
    const [activeTab, setActiveTab] = useState<ComplianceTab>('privacy');
    const [privacyData, setPrivacyData] = useState<CompliancePageData>(null);
    const [termsData, setTermsData] = useState<CompliancePageData>(null);
    const [refundData, setRefundData] = useState<CompliancePageData>(null);
    const [customText, setCustomText] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const dataMap: Record<ComplianceTab, typeof privacyData> = { privacy: privacyData, terms: termsData, refund: refundData };
    const labelMap: Record<ComplianceTab, string> = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', refund: 'Refund & Cancellation Policy' };
    const currentData = dataMap[activeTab];
    const pageLabel = labelMap[activeTab];
    const pageUrl = domain ? `https://${domain}/${activeTab}` : null;

    const applyCompliancePages = (pages: CompliancePagesState) => {
        setPrivacyData(pages.privacy);
        setTermsData(pages.terms);
        setRefundData(pages.refund);
    };

    const loadCompliancePages = async (): Promise<CompliancePagesState | null> => {
        try {
            const response = await fetch('/api/compliance', AUTH_BROWSER_REQUEST_POLICY);
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'desktop_compliance_pages_load_failed',
                    createStatusError('desktop_compliance_pages_load_rejected', response.status),
                    buildComplianceLogContext('load_pages', activeTab, domain, pageUrl || undefined),
                );
                return null;
            }
            const data = await readDesktopComplianceLoadResponseJson(response, activeTab, domain, pageUrl || undefined);
            if (!data) return null;
            const pages = normalizeCompliancePages(data);
            applyCompliancePages(pages);
            return pages;
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_compliance_pages_load_failed',
                error,
                buildComplianceLogContext('load_pages', activeTab, domain, pageUrl || undefined),
            );
            return null;
        }
    };

    // Fetch compliance data
    useEffect(() => {
        const fetchData = async () => {
            await loadCompliancePages();
            setLoadingData(false);
        };
        void fetchData();
    }, []);

    const handleOpenPage = () => {
        if (!pageUrl) return;
        try {
            const opened = window.open(pageUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('desktop_compliance_page_open_blocked');
            }
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_compliance_page_open_failed',
                error,
                buildComplianceLogContext('open_page', activeTab, domain, pageUrl),
            );
            notification.error({ message: 'Failed to open page.' });
        }
    };

    // Enter edit mode
    const handleStartEdit = () => {
        setCustomText(currentData?.customContent || '');
        setEditMode(true);
    };

    // Save custom override
    const handleSave = async () => {
        if (!customText || customText.trim().length < 100) {
            notification.error({ message: 'Content must be at least 100 characters.' });
            return;
        }
        setSaving(true);
        try {
            const response = await fetch('/api/compliance', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    action: 'override',
                    content: customText,
                }),
            });
            const result = await readDesktopComplianceMutationResponseJson(response, activeTab, 'save', domain);
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_save_failed',
                    createStatusError('desktop_compliance_page_save_rejected', response.status),
                    buildComplianceLogContext('save_override', activeTab, domain),
                );
                notification.error({ message: 'Failed to save.' });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, activeTab, 'save')) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_response_invalid',
                    createStatusError('desktop_compliance_page_save_response_invalid', response.status),
                    buildComplianceMutationResponseLogContext(result, activeTab, 'save', domain),
                );
                notification.error({ message: 'Failed to save.' });
                return;
            }
            const refreshed = await loadCompliancePages();
            if (!refreshed) {
                notification.error({ message: 'Failed to save.' });
                return;
            }
            setEditMode(false);
            notification.success({ message: `${pageLabel} updated.` });
        } catch (err: any) {
            logBusinessSettingsFailure(
                'desktop_compliance_page_save_failed',
                createStatusError('desktop_compliance_page_save_rejected', getAxiosStatus(err)),
                buildComplianceLogContext('save_override', activeTab, domain),
            );
            notification.error({ message: 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

    // Reset to system default
    const handleReset = async () => {
        setResetting(true);
        try {
            const response = await fetch('/api/compliance', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    action: 'reset',
                }),
            });
            const result = await readDesktopComplianceMutationResponseJson(response, activeTab, 'reset', domain);
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_reset_failed',
                    createStatusError('desktop_compliance_page_reset_rejected', response.status),
                    buildComplianceLogContext('reset_override', activeTab, domain),
                );
                notification.error({ message: 'Failed to reset.' });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, activeTab, 'reset')) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_response_invalid',
                    createStatusError('desktop_compliance_page_reset_response_invalid', response.status),
                    buildComplianceMutationResponseLogContext(result, activeTab, 'reset', domain),
                );
                notification.error({ message: 'Failed to reset.' });
                return;
            }
            const refreshed = await loadCompliancePages();
            if (!refreshed) {
                notification.error({ message: 'Failed to reset.' });
                return;
            }
            setEditMode(false);
            notification.success({ message: `${pageLabel} reset to default.` });
        } catch (err: any) {
            logBusinessSettingsFailure(
                'desktop_compliance_page_reset_failed',
                createStatusError('desktop_compliance_page_reset_rejected', getAxiosStatus(err)),
                buildComplianceLogContext('reset_override', activeTab, domain),
            );
            notification.error({ message: 'Failed to reset.' });
        } finally {
            setResetting(false);
        }
    };

    return (
        <div>
            <Title level={5} style={{ margin: '0 0 8px' }}>
                <LuFileText style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Compliance Pages
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                Privacy policy and terms pages on your domain for platform verification (Meta, Google, payment providers).
            </Paragraph>

            {/* Tab switcher */}
            <Space style={{ marginBottom: 12 }}>
                <Button
                    size="small"
                    type={activeTab === 'privacy' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('privacy'); setEditMode(false); }}
                >
                    Privacy Policy
                </Button>
                <Button
                    size="small"
                    type={activeTab === 'terms' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('terms'); setEditMode(false); }}
                >
                    Terms & Conditions
                </Button>
                <Button
                    size="small"
                    type={activeTab === 'refund' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('refund'); setEditMode(false); }}
                >
                    Refund Policy
                </Button>
            </Space>

            {loadingData ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <LuLoader style={{ animation: 'spin 1s linear infinite' }} />
                    <Text type="secondary" style={{ marginLeft: 8 }}>Loading...</Text>
                </div>
            ) : editMode ? (
                /* ── Edit Mode ── */
                <div>
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Your content appears first"
                        description="Custom text must be plain text only. MenuList baseline policy content and platform disclosures stay appended automatically."
                    />
                    <Input.TextArea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        rows={12}
                        maxLength={15000}
                        showCount
                        placeholder={`Paste your ${pageLabel.toLowerCase()} text here...`}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Space style={{ marginTop: 12 }}>
                        <Button type="primary" loading={saving} onClick={handleSave}>
                            Save
                        </Button>
                        <Button onClick={() => setEditMode(false)}>
                            Cancel
                        </Button>
                    </Space>
                </div>
            ) : (
                /* ── View Mode ── */
                <div>
                    <Card
                        size="small"
                        style={{ background: token.colorFillSecondary, maxHeight: 200, overflow: 'auto', marginBottom: 12 }}
                    >
                        <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {currentData?.content
                                ? currentData.content.slice(0, 500) + (currentData.content.length > 500 ? '...' : '')
                                : 'Auto-generated from your business information.'}
                        </Text>
                    </Card>

                    <Space size={4} style={{ marginBottom: 8 }}>
                        <Tag color={currentData?.source === 'custom' ? 'orange' : 'green'}>
                            {currentData?.source === 'custom' ? 'Custom + MenuList baseline' : 'MenuList baseline only'}
                        </Tag>
                    </Space>

                    <div>
                        <Space>
                            <Button size="small" onClick={handleStartEdit}>
                                Use my own content
                            </Button>
                            {currentData?.source === 'custom' && (
                                <Button
                                    size="small"
                                    icon={<LuRotateCcw />}
                                    loading={resetting}
                                    onClick={handleReset}
                                >
                                    Reset to default
                                </Button>
                            )}
                            {pageUrl && (
                                <Button
                                    size="small"
                                    icon={<LuExternalLink />}
                                    onClick={handleOpenPage}
                                >
                                    View page
                                </Button>
                            )}
                        </Space>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(CustomDomainTab);
