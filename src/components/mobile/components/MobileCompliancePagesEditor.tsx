'use client'

import {
    getBoundedBusinessSettingsStringContext,
    logBusinessSettingsFailure,
} from '@template/main-app/businessSettings/utils/businessSettingsDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuEye, LuPenLine, LuRotateCcw } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Popup, Text, TextArea, Toast } from '../antd';

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

interface MobileCompliancePagesEditorProps {
    baseUrl?: string;
    compact?: boolean;
    type: ComplianceTab;
}

const TAB_LABELS: Record<ComplianceTab, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation Policy',
};

const EMPTY_COMPLIANCE_PAGES: CompliancePagesState = {
    privacy: null,
    refund: null,
    terms: null,
};
const MOBILE_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES = 32 * 1024;

const createMobileComplianceStatusError = (code: string, status: number) => {
    const error = new Error(code) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
};

function getExpectedComplianceApiMutationAction(action: ComplianceMutationAction): ComplianceApiMutationAction {
    return action === 'save' ? 'override' : 'reset';
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

function buildMobileComplianceMutationResponseLogContext(
    result: ComplianceMutationResponse | null,
    type: ComplianceTab,
    action: ComplianceMutationAction,
) {
    return {
        ...getBoundedBusinessSettingsStringContext('complianceType', type),
        ...getBoundedBusinessSettingsStringContext('mutationAction', action),
        hasExpectedAction: result?.action === getExpectedComplianceApiMutationAction(action),
        hasExpectedType: result?.type === type,
        success: result?.success === true,
    };
}

let compliancePagesCache: CompliancePagesState | null = null;
let compliancePagesRequest: Promise<CompliancePagesState | null> | null = null;
const compliancePagesListeners = new Set<(pages: CompliancePagesState) => void>();

function normalizeCompliancePages(data: any): CompliancePagesState {
    return {
        privacy: data?.privacy || null,
        refund: data?.refund || null,
        terms: data?.terms || null,
    };
}

function publishCompliancePages(pages: CompliancePagesState) {
    compliancePagesCache = pages;
    compliancePagesListeners.forEach((listener) => listener(pages));
}

async function readMobileComplianceMutationResponseJson(
    response: Response,
    type: ComplianceTab,
    action: ComplianceMutationAction,
): Promise<ComplianceMutationResponse | null> {
    try {
        return await readJsonResponseWithLimit<ComplianceMutationResponse>(
            response,
            MOBILE_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logBusinessSettingsFailure(
            'mobile_compliance_page_response_parse_failed',
            error,
            {
                ...getBoundedBusinessSettingsStringContext('complianceType', type),
                ...getBoundedBusinessSettingsStringContext('mutationAction', action),
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: MOBILE_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES,
            },
        );
        return null;
    }
}

async function readMobileComplianceLoadResponseJson(
    response: Response,
): Promise<ComplianceLoadResponse | null> {
    try {
        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
        );
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            logBusinessSettingsFailure(
                'mobile_compliance_pages_load_response_invalid',
                createMobileComplianceStatusError('mobile_compliance_pages_load_response_invalid', response.status),
                {
                    ...getBoundedBusinessSettingsStringContext('complianceSurface', 'mobile'),
                    responseOk: response.ok,
                    responseStatus: response.status,
                    maxBytes: MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
                },
            );
            return null;
        }
        return payload as ComplianceLoadResponse;
    } catch (error) {
        logBusinessSettingsFailure(
            'mobile_compliance_pages_load_response_parse_failed',
            error,
            {
                ...getBoundedBusinessSettingsStringContext('complianceSurface', 'mobile'),
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES,
            },
        );
        return null;
    }
}

async function loadCompliancePages(force = false) {
    if (!force && compliancePagesCache) {
        return compliancePagesCache;
    }

    if (!force && compliancePagesRequest) {
        return compliancePagesRequest;
    }

    compliancePagesRequest = fetch('/api/compliance', AUTH_BROWSER_REQUEST_POLICY)
        .then(async (response) => {
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'mobile_compliance_pages_load_failed',
                    createMobileComplianceStatusError('mobile_compliance_pages_load_rejected', response.status),
                    getBoundedBusinessSettingsStringContext('complianceSurface', 'mobile'),
                );
                return null;
            }
            const data = await readMobileComplianceLoadResponseJson(response);
            if (!data) return null;
            const pages = normalizeCompliancePages(data);
            publishCompliancePages(pages);
            return pages;
        })
        .catch((error) => {
            logBusinessSettingsFailure(
                'mobile_compliance_pages_load_failed',
                error,
                getBoundedBusinessSettingsStringContext('complianceSurface', 'mobile'),
            );
            return null;
        })
        .finally(() => {
            compliancePagesRequest = null;
        });

    return compliancePagesRequest;
}

export default function MobileCompliancePagesEditor({ baseUrl, compact, type }: MobileCompliancePagesEditorProps) {
    const { token } = theme.useToken();
    const [pages, setPages] = useState<CompliancePagesState>(compliancePagesCache || EMPTY_COMPLIANCE_PAGES);
    const [loading, setLoading] = useState(!compliancePagesCache);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isBaselineExpanded, setIsBaselineExpanded] = useState(false);
    const [customText, setCustomText] = useState('');

    const pageLabel = TAB_LABELS[type];
    const currentData = pages[type];
    const pageUrl = useMemo(() => {
        if (!baseUrl) return `/${type}`;
        return `${baseUrl.replace(/\/$/, '')}/${type}`;
    }, [baseUrl, type]);

    const handleOpenPage = () => {
        try {
            const opened = window.open(pageUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('mobile_compliance_page_open_blocked');
            }
        } catch (error) {
            logBusinessSettingsFailure(
                'mobile_compliance_page_open_failed',
                error,
                {
                    ...getBoundedBusinessSettingsStringContext('complianceType', type),
                    ...getBoundedBusinessSettingsStringContext('pageUrl', pageUrl),
                },
            );
            Toast.show({ content: 'Failed to open page.', duration: 1500 });
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const nextPages = await loadCompliancePages();
            if (nextPages) setPages(nextPages);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        compliancePagesListeners.add(setPages);
        void fetchData();
        return () => {
            compliancePagesListeners.delete(setPages);
        };
    }, []);

    const openSheet = () => {
        setCustomText(currentData?.customContent || '');
        setIsEditing(false);
        setIsBaselineExpanded(false);
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!customText.trim() || customText.trim().length < 100) {
            Toast.show({ content: 'Content must be at least 100 characters.', duration: 1500 });
            return;
        }

        try {
            setSaving(true);
            const response = await fetch('/api/compliance', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'override',
                    content: customText,
                    type,
                }),
            });
            const result = await readMobileComplianceMutationResponseJson(response, type, 'save');
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'mobile_compliance_page_save_failed',
                    createMobileComplianceStatusError('mobile_compliance_page_save_rejected', response.status),
                    getBoundedBusinessSettingsStringContext('complianceType', type),
                );
                Toast.show({ content: 'Failed to save.', duration: 1500 });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, type, 'save')) {
                logBusinessSettingsFailure(
                    'mobile_compliance_page_response_invalid',
                    createMobileComplianceStatusError('mobile_compliance_page_save_response_invalid', response.status),
                    buildMobileComplianceMutationResponseLogContext(result, type, 'save'),
                );
                Toast.show({ content: 'Failed to save.', duration: 1500 });
                return;
            }
            await loadCompliancePages(true);
            setIsEditing(false);
            Toast.show({ content: `${pageLabel} updated.`, duration: 1200 });
        } catch (error) {
            logBusinessSettingsFailure(
                'mobile_compliance_page_save_failed',
                error,
                getBoundedBusinessSettingsStringContext('complianceType', type),
            );
            Toast.show({ content: 'Failed to save.', duration: 1500 });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            setResetting(true);
            const response = await fetch('/api/compliance', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset',
                    type,
                }),
            });
            const result = await readMobileComplianceMutationResponseJson(response, type, 'reset');
            if (!response.ok) {
                logBusinessSettingsFailure(
                    'mobile_compliance_page_reset_failed',
                    createMobileComplianceStatusError('mobile_compliance_page_reset_rejected', response.status),
                    getBoundedBusinessSettingsStringContext('complianceType', type),
                );
                Toast.show({ content: 'Failed to reset.', duration: 1500 });
                return;
            }
            if (!isSuccessfulComplianceMutationResponse(result, type, 'reset')) {
                logBusinessSettingsFailure(
                    'mobile_compliance_page_response_invalid',
                    createMobileComplianceStatusError('mobile_compliance_page_reset_response_invalid', response.status),
                    buildMobileComplianceMutationResponseLogContext(result, type, 'reset'),
                );
                Toast.show({ content: 'Failed to reset.', duration: 1500 });
                return;
            }
            await loadCompliancePages(true);
            setCustomText('');
            setIsEditing(false);
            Toast.show({ content: `${pageLabel} reset to default.`, duration: 1200 });
        } catch (error) {
            logBusinessSettingsFailure(
                'mobile_compliance_page_reset_failed',
                error,
                getBoundedBusinessSettingsStringContext('complianceType', type),
            );
            Toast.show({ content: 'Failed to reset.', duration: 1500 });
        } finally {
            setResetting(false);
        }
    };

    return (
        <>
            <Button
                fill="none"
                onClick={openSheet}
                size="small"
                style={{
                    flex: '0 0 auto',
                    minWidth: compact ? 36 : 40,
                    paddingInline: 8,
                }}
            >
                {currentData?.source === 'custom' ? <LuPenLine size={18} /> : <LuEye size={18} />}
            </Button>

            <Popup
                bodyStyle={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsOpen(false)}
                position="bottom"
                visible={isOpen}
            >
                <Flex style={{ height: '100vh', maxHeight: '100vh', minHeight: '100vh' }} vertical>
                    <NavBar
                        onBack={() => setIsOpen(false)}
                        right={
                            <Button fill="none" onClick={handleOpenPage} size="small">
                                View page
                            </Button>
                        }
                    >
                        {pageLabel}
                    </NavBar>

                    <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }} vertical>
                        <Card size="small">
                            <Flex gap={6} vertical>
                                <Text strong>{currentData?.source === 'custom' ? 'Custom content + MenuList baseline' : 'MenuList baseline only'}</Text>
                                <Text type="secondary">
                                    Your text appears first. MenuList baseline policy content and platform disclosures stay appended automatically.
                                </Text>
                            </Flex>
                        </Card>

                        {loading ? (
                            <Text type="secondary">Loading policy content...</Text>
                        ) : (
                            <>
                                <Card size="small">
                                    <Flex gap={6} vertical>
                                        <Text strong>Your current content</Text>
                                        <Text type="secondary">
                                            {currentData?.customContent?.trim()
                                                ? 'This is the owner content that appears before the MenuList baseline section.'
                                                : 'No custom content added yet. Only the MenuList baseline section is currently shown on the public page.'}
                                        </Text>
                                        {currentData?.customContent?.trim() ? (
                                            <Text style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                                {currentData.customContent}
                                            </Text>
                                        ) : null}
                                    </Flex>
                                </Card>

                                <Card
                                    size="small"
                                    onClick={() => setIsBaselineExpanded((previous) => !previous)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Flex gap={6} vertical>
                                        <Flex align="center" justify="space-between">
                                            <Text strong>MenuList baseline content</Text>
                                            <Text type="secondary">{isBaselineExpanded ? 'Hide' : 'Show'}</Text>
                                        </Flex>
                                        <Text type="secondary">
                                            This baseline policy and platform disclosure content is appended automatically.
                                        </Text>
                                        {isBaselineExpanded ? (
                                            <Text style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                                {currentData?.systemContent || 'MenuList baseline policy content will be generated automatically from your business information.'}
                                            </Text>
                                        ) : null}
                                    </Flex>
                                </Card>

                                {isEditing ? (
                                    <Card size="small">
                                        <Flex gap={10} vertical>
                                            <Text strong>Your custom content</Text>
                                            <TextArea
                                                autoSize={{ minRows: 12, maxRows: 22 }}
                                                maxLength={15000}
                                                onChange={setCustomText}
                                                placeholder={`Add your ${pageLabel.toLowerCase()} text here...`}
                                                showCount
                                                value={customText}
                                            />
                                        </Flex>
                                    </Card>
                                ) : null}
                            </>
                        )}
                    </Flex>

                    <Flex
                        gap={8}
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        }}
                        vertical
                    >
                        {isEditing ? (
                            <Flex gap={8}>
                                <Button
                                    block
                                    color="danger"
                                    disabled={currentData?.source !== 'custom'}
                                    fill="outline"
                                    loading={resetting}
                                    onClick={() => void handleReset()}
                                    size="large"
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuRotateCcw size={16} />
                                        <Text>Reset</Text>
                                    </Flex>
                                </Button>
                                <Button block disabled={saving} fill="outline" onClick={() => setIsEditing(false)} size="large">
                                    Cancel
                                </Button>
                                <Button block loading={saving} onClick={() => void handleSave()} size="large">
                                    Save
                                </Button>
                            </Flex>
                        ) : (
                            <Button block onClick={() => setIsEditing(true)} size="large">
                                Edit content
                            </Button>
                        )}
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
