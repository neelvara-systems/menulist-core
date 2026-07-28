'use client';

import { Alert, Button, Card, Input, Space, Tag, Typography, notification, theme } from 'antd';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getBoundedErrorNumberAtPath } from '@lib/monitoring/boundedLogContext';
import { useEffect, useState } from 'react';
import { LuExternalLink, LuFileText, LuLoader, LuRotateCcw } from 'react-icons/lu';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from '../utils/businessSettingsDiagnostics';

const { Text, Title, Paragraph } = Typography;

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

const DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES = 32 * 1024;

const getAxiosStatus = (error: unknown): number | undefined => (
    getBoundedErrorNumberAtPath(error, ['response', 'status'])
);

function createComplianceStatusError(failureCode: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(failureCode), {
        code: failureCode,
        status,
    });
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
                createComplianceStatusError('desktop_compliance_pages_load_response_invalid', response.status),
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

export default function CompliancePagesSection({ domain }: { domain?: string }) {
    const [activeTab, setActiveTab] = useState<ComplianceTab>('privacy');
    const [privacyData, setPrivacyData] = useState<CompliancePageData>(null);
    const [termsData, setTermsData] = useState<CompliancePageData>(null);
    const [refundData, setRefundData] = useState<CompliancePageData>(null);
    const [customText, setCustomText] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { token } = theme.useToken();

    const dataMap: Record<ComplianceTab, typeof privacyData> = { privacy: privacyData, terms: termsData, refund: refundData };
    const labelMap: Record<ComplianceTab, string> = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', refund: 'Refund & Cancellation Policy' };
    const currentData = dataMap[activeTab];
    const pageLabel = labelMap[activeTab];
    const pageUrl = domain ? `https://${domain}/${activeTab}` : `/${activeTab}`;

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
                    createComplianceStatusError('desktop_compliance_pages_load_rejected', response.status),
                    buildComplianceLogContext('load_pages', activeTab, domain, pageUrl),
                );
                return null;
            }
            const data = await readDesktopComplianceLoadResponseJson(response, activeTab, domain, pageUrl);
            if (!data) return null;
            const pages = normalizeCompliancePages(data);
            applyCompliancePages(pages);
            return pages;
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_compliance_pages_load_failed',
                error,
                buildComplianceLogContext('load_pages', activeTab, domain, pageUrl),
            );
            return null;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            await loadCompliancePages();
            setLoadingData(false);
        };
        void fetchData();
    }, []);

    const handleOpenPage = () => {
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

    const handleStartEdit = () => {
        setCustomText(currentData?.customContent || '');
        setEditMode(true);
    };

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
                    createComplianceStatusError('desktop_compliance_page_save_rejected', response.status),
                    buildComplianceLogContext('save_override', activeTab, domain),
                );
                notification.error({ message: 'Failed to save.' });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, activeTab, 'save')) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_response_invalid',
                    createComplianceStatusError('desktop_compliance_page_save_response_invalid', response.status),
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
                createComplianceStatusError('desktop_compliance_page_save_rejected', getAxiosStatus(err)),
                buildComplianceLogContext('save_override', activeTab, domain),
            );
            notification.error({ message: 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

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
                    createComplianceStatusError('desktop_compliance_page_reset_rejected', response.status),
                    buildComplianceLogContext('reset_override', activeTab, domain),
                );
                notification.error({ message: 'Failed to reset.' });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, activeTab, 'reset')) {
                logBusinessSettingsFailure(
                    'desktop_compliance_page_response_invalid',
                    createComplianceStatusError('desktop_compliance_page_reset_response_invalid', response.status),
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
                createComplianceStatusError('desktop_compliance_page_reset_rejected', getAxiosStatus(err)),
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
                Manage the privacy, terms, and refund pages linked from your official business page.
            </Paragraph>

            <Space style={{ marginBottom: 12 }} wrap>
                {(['privacy', 'terms', 'refund'] as ComplianceTab[]).map((tab) => (
                    <Button
                        key={tab}
                        size="small"
                        type={activeTab === tab ? 'primary' : 'default'}
                        onClick={() => { setActiveTab(tab); setEditMode(false); }}
                    >
                        {labelMap[tab]}
                    </Button>
                ))}
            </Space>

            {loadingData ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <LuLoader style={{ animation: 'spin 1s linear infinite' }} />
                    <Text type="secondary" style={{ marginLeft: 8 }}>Loading...</Text>
                </div>
            ) : editMode ? (
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
                        rows={10}
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
                <div>
                    <Card
                        size="small"
                        style={{ background: token.colorFillSecondary, maxHeight: 160, overflow: 'auto', marginBottom: 12 }}
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
                        <Space wrap>
                            <Button size="small" onClick={handleStartEdit}>
                                Use my own content
                            </Button>
                            {currentData?.source === 'custom' ? (
                                <Button
                                    size="small"
                                    icon={<LuRotateCcw />}
                                    loading={resetting}
                                    onClick={handleReset}
                                >
                                    Reset to default
                                </Button>
                            ) : null}
                            <Button
                                size="small"
                                icon={<LuExternalLink />}
                                onClick={handleOpenPage}
                            >
                                View page
                            </Button>
                        </Space>
                    </div>
                </div>
            )}
        </div>
    );
}
