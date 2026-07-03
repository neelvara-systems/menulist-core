/**
 * Integrations Tab - Google Business Profile Connection
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Phase 0 UI Stub: Shows "Not connected" state with feature flag gate.
 * Full implementation in Phase 1 after GBP API access approved.
 *
 * @see __docs__/gbp-sync/GBP_SYNC_impl.md
 * @see __docs__/gbp-sync/GBP_SYNC_spec.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { AUTH_BROWSER_REQUEST_POLICY } from "@lib/auth/browserRequestPolicy";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { Alert, Badge, Button, Card, Divider, Flex, Input, Modal, Typography, message, theme } from "antd";
import { useCallback, useState } from "react";
import { LuCopy, LuKeyRound, LuLink, LuMapPin, LuRefreshCw, LuStore, LuTrash2 } from "react-icons/lu";
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from "../utils/businessSettingsDiagnostics";

const { Title, Text, Paragraph } = Typography;
const PUBLIC_API_KEY_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

type PublicApiKeyAction = 'generate' | 'revoke';
type PublicApiKeyClientError = Error & { code?: string; status?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createPublicApiKeyClientError(response: Response, code: string): PublicApiKeyClientError {
    const error = new Error('Public API key request failed') as PublicApiKeyClientError;
    error.code = code.slice(0, 64);
    error.status = response.status;
    return error;
}

function getPublicApiKeyRejectedCode(action: PublicApiKeyAction): string {
    return action === 'generate'
        ? 'PUBLIC_API_KEY_GENERATE_REJECTED'
        : 'PUBLIC_API_KEY_REVOKE_REJECTED';
}

async function readPublicApiKeyActionResponse(
    response: Response,
    action: PublicApiKeyAction,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<{ apiKey: string } | { success: true }> {
    let payload: unknown = null;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            PUBLIC_API_KEY_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logBusinessSettingsFailure(
            'business_settings_public_api_key_response_parse_failed',
            error,
            {
                ...context,
                action,
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: PUBLIC_API_KEY_RESPONSE_JSON_MAX_BYTES,
            },
        );
    }

    if (!response.ok) {
        throw createPublicApiKeyClientError(response, getPublicApiKeyRejectedCode(action));
    }

    if (action === 'generate' && isRecord(payload) && typeof payload.apiKey === 'string' && payload.apiKey.startsWith('ml_')) {
        return { apiKey: payload.apiKey };
    }

    if (action === 'revoke' && isRecord(payload) && payload.success === true) {
        return { success: true };
    }

    const error = createPublicApiKeyClientError(response, 'PUBLIC_API_KEY_RESPONSE_INVALID');
    logBusinessSettingsFailure(
        'business_settings_public_api_key_response_invalid',
        error,
        {
            ...context,
            action,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: PUBLIC_API_KEY_RESPONSE_JSON_MAX_BYTES,
        },
    );
    throw error;
}

interface IntegrationsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: {
        storeId?: number | string;
        tenantId?: number | string;
        publicApi?: {
            keyPrefix?: string;
            createdAt?: string;
        };
        gbp?: {
            isConnected: boolean;
            locationName?: string;
            locationAddress?: string;
            menuLinkMode?: "MANAGED" | "OFF";
        };
        gbpState?: {
            linkStatus?: "OK" | "MISSING" | "WRONG" | "UNKNOWN" | "NOT_WRITABLE";
            hoursStatus?: "OK" | "MISMATCH" | "UNKNOWN" | "NOT_WRITABLE";
        };
    };
    setStoreDetails?: (updater: (prev: any) => any) => void;
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
    scrollRef,
    storeDetails,
    setStoreDetails,
}) => {
    const { token } = theme.useToken();
    const publicApiEnabled = FEATURE_FLAGS.ENABLE_PUBLIC_API;
    const gbpEnabled = FEATURE_FLAGS.ENABLE_GBP_SYNC;
    const gbp = storeDetails?.gbp;
    const gbpState = storeDetails?.gbpState;
    const isConnected = gbp?.isConnected ?? false;
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const [publicApiLoadingAction, setPublicApiLoadingAction] = useState<PublicApiKeyAction | null>(null);
    const publicApiKeyPrefix = generatedApiKey?.slice(0, 7) || storeDetails?.publicApi?.keyPrefix || '';
    const hasPublicApiKey = Boolean(publicApiKeyPrefix);

    const getPublicApiKeyLogContext = useCallback((action: PublicApiKeyAction) => ({
        action,
        ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
        ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
        hasExistingKey: Boolean(storeDetails?.publicApi?.keyPrefix),
        hasGeneratedKey: Boolean(generatedApiKey),
    }), [generatedApiKey, storeDetails?.publicApi?.keyPrefix, storeDetails?.storeId, storeDetails?.tenantId]);

    const handleGeneratePublicApiKey = useCallback(async () => {
        const action: PublicApiKeyAction = 'generate';
        setPublicApiLoadingAction(action);

        try {
            const response = await fetch('/api/store/public-api-key', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const payload = await readPublicApiKeyActionResponse(response, action, getPublicApiKeyLogContext(action));
            if (!('apiKey' in payload)) {
                throw createPublicApiKeyClientError(response, 'PUBLIC_API_KEY_RESPONSE_INVALID');
            }

            setGeneratedApiKey(payload.apiKey);
            setStoreDetails?.((previous: any) => ({
                ...previous,
                publicApi: {
                    ...(previous?.publicApi || {}),
                    keyPrefix: payload.apiKey.slice(0, 7),
                    createdAt: new Date().toISOString(),
                },
            }));
            message.success('Public API key generated');
        } catch (error) {
            logBusinessSettingsFailure(
                'business_settings_public_api_key_generate_failed',
                error,
                getPublicApiKeyLogContext(action),
            );
            message.error('Failed to generate API key');
        } finally {
            setPublicApiLoadingAction(null);
        }
    }, [getPublicApiKeyLogContext, setStoreDetails]);

    const handleRevokePublicApiKey = useCallback(async () => {
        const action: PublicApiKeyAction = 'revoke';
        setPublicApiLoadingAction(action);

        try {
            const response = await fetch('/api/store/public-api-key', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            await readPublicApiKeyActionResponse(response, action, getPublicApiKeyLogContext(action));

            setGeneratedApiKey(null);
            setStoreDetails?.((previous: any) => {
                const { publicApi, ...rest } = previous || {};
                return rest;
            });
            message.success('Public API key revoked');
        } catch (error) {
            logBusinessSettingsFailure(
                'business_settings_public_api_key_revoke_failed',
                error,
                getPublicApiKeyLogContext(action),
            );
            message.error('Failed to revoke API key');
        } finally {
            setPublicApiLoadingAction(null);
        }
    }, [getPublicApiKeyLogContext, setStoreDetails]);

    const confirmRevokePublicApiKey = useCallback(() => {
        Modal.confirm({
            title: 'Revoke public API key?',
            content: 'External systems using this key will stop reading your MenuList data.',
            okText: 'Revoke key',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => handleRevokePublicApiKey(),
        });
    }, [handleRevokePublicApiKey]);

    const handleCopyGeneratedApiKey = useCallback(async () => {
        if (!generatedApiKey) return;

        try {
            if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
                throw new Error('clipboard_unavailable');
            }

            await navigator.clipboard.writeText(generatedApiKey);
            message.success('API key copied');
        } catch (error) {
            logBusinessSettingsFailure(
                'business_settings_public_api_key_copy_failed',
                error,
                {
                    ...getPublicApiKeyLogContext('generate'),
                    hasClipboard: typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function',
                },
            );
            message.error('Copy failed');
        }
    }, [generatedApiKey, getPublicApiKeyLogContext]);

    if (!publicApiEnabled && !gbpEnabled) {
        return null;
    }

    return (
        <Flex vertical gap={16} ref={scrollRef}>
            {publicApiEnabled ? (
                <Card size="small">
                    <Flex align="center" gap={8}>
                        <LuKeyRound size={20} style={{ color: token.colorPrimary }} />
                        <Title level={5} style={{ margin: "unset" }}>
                            Platform Pull API
                        </Title>
                    </Flex>
                    <Divider />

                    <Flex vertical gap={16}>
                        <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                            <Flex vertical gap={2}>
                                <Text strong>{hasPublicApiKey ? 'API key active' : 'No API key'}</Text>
                                {hasPublicApiKey ? (
                                    <Text type="secondary">Key prefix: {publicApiKeyPrefix}</Text>
                                ) : (
                                    <Text type="secondary">Create a read-only key for trusted external systems.</Text>
                                )}
                            </Flex>
                            <Badge status={hasPublicApiKey ? 'success' : 'default'} text={hasPublicApiKey ? 'Active' : 'Not created'} />
                        </Flex>

                        {generatedApiKey ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="Save this key now"
                                description="It is shown only once. After this, MenuList keeps only the key hash and prefix."
                            />
                        ) : null}

                        {generatedApiKey ? (
                            <Input.Password
                                readOnly
                                value={generatedApiKey}
                                visibilityToggle
                                addonAfter={(
                                    <Button
                                        icon={<LuCopy size={14} />}
                                        onClick={() => void handleCopyGeneratedApiKey()}
                                        size="small"
                                        type="text"
                                    >
                                        Copy
                                    </Button>
                                )}
                            />
                        ) : null}

                        <Flex gap={8} wrap="wrap">
                            <Button
                                icon={<LuRefreshCw size={14} />}
                                loading={publicApiLoadingAction === 'generate'}
                                onClick={() => void handleGeneratePublicApiKey()}
                                type={hasPublicApiKey ? 'default' : 'primary'}
                            >
                                {hasPublicApiKey ? 'Regenerate key' : 'Generate key'}
                            </Button>
                            {hasPublicApiKey ? (
                                <Button
                                    danger
                                    icon={<LuTrash2 size={14} />}
                                    loading={publicApiLoadingAction === 'revoke'}
                                    onClick={confirmRevokePublicApiKey}
                                >
                                    Revoke key
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                </Card>
            ) : null}

            {gbpEnabled ? (
                <Card size="small">
                    <Flex align="center" gap={8}>
                        <LuStore size={20} style={{ color: token.colorPrimary }} />
                        <Title level={5} style={{ margin: "unset" }}>
                            Google Business Profile
                        </Title>
                    </Flex>
                    <Divider />

                    {isConnected ? (
                        // Connected State
                        <Flex vertical gap={16}>
                    <Flex align="center" gap={8}>
                        <Badge status="success" />
                        <Text strong>Connected</Text>
                    </Flex>

                    {gbp?.locationName && (
                        <Flex align="center" gap={8}>
                            <LuMapPin />
                            <Text>{gbp.locationName}</Text>
                            {gbp.locationAddress && (
                                <Text type="secondary">— {gbp.locationAddress}</Text>
                            )}
                        </Flex>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    {/* Menu Link Status */}
                    <Flex justify="space-between" align="center">
                        <Flex align="center" gap={8}>
                            <LuLink />
                            <Text>Menu link</Text>
                        </Flex>
                        <Badge
                            status={gbpState?.linkStatus === "OK" ? "success" : "warning"}
                            text={gbp?.menuLinkMode === "MANAGED" ? "Managed" : "Off"}
                        />
                    </Flex>

                    {/* Hours Status */}
                    <Flex justify="space-between" align="center">
                        <Text>Hours</Text>
                        <Badge
                            status={gbpState?.hoursStatus === "OK" ? "success" : "warning"}
                            text={gbpState?.hoursStatus === "OK" ? "Synced" : "Not synced"}
                        />
                    </Flex>

                    {/* Apply Hours Button (shown when mismatch) */}
                    {gbpState?.hoursStatus === "MISMATCH" && (
                        <Button type="primary" disabled style={{ marginTop: 8 }}>
                            Apply MenuList hours to Google
                        </Button>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    <Button danger type="text" disabled>
                        Disconnect
                    </Button>
                        </Flex>
                    ) : (
                        // Not Connected State (Phase 0 Stub)
                        <Flex vertical gap={16} align="center" style={{ padding: "24px 0" }}>
                    <LuStore size={48} style={{ color: token.colorTextTertiary }} />

                    <Paragraph
                        type="secondary"
                        style={{ textAlign: "center", marginBottom: 0 }}
                    >
                        Connect your Google Business Profile to keep your menu link and
                        hours accurate.
                    </Paragraph>

                    <Alert
                        type="info"
                        showIcon
                        message="Coming Soon"
                        description="Google Business Profile sync is not yet available. We're waiting for API access approval."
                        style={{ width: "100%" }}
                    />

                    <Button
                        type="primary"
                        icon={<LuStore />}
                        disabled
                        size="large"
                    >
                        Connect Google
                    </Button>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Keeps Google aligned with your MenuList menu and hours.
                    </Text>
                        </Flex>
                    )}
                </Card>
            ) : null}
        </Flex>
    );
};

export default IntegrationsTab;
