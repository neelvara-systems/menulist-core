'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PUBLIC_API_SCOPES,
    AnswerlatticePublicApiKeyGeneratedResponseSchema,
    AnswerlatticePublicApiKeyRevokedResponseSchema,
    AnswerlatticePublicApiKeyStatusResponseSchema,
    type AnswerlatticePublicApiKeySummary,
    type AnswerlatticePublicApiScope,
} from '@lib/answerlattice/publicApiContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { Alert, Button, Card, Checkbox, Flex, Input, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCopy, LuKeyRound, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { z } from 'zod';

const { Text } = Typography;
const ANSWERLATTICE_PUBLIC_API_KEY_RESPONSE_MAX_BYTES = 32 * 1024;
const ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

const SCOPE_OPTIONS = [
    {
        label: 'Read governed answers and public entities',
        value: 'public:read' as const,
    },
    {
        label: 'Send governed support signals',
        value: 'signals:write' as const,
    },
    ...(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MCP ? [{
        label: 'Read private approved context through MCP',
        value: 'mcp:read' as const,
    }] : []),
];

const getScopeLabel = (scope: AnswerlatticePublicApiScope) => {
    if (scope === 'public:read') return 'Read answers and entities';
    if (scope === 'signals:write') return 'Send support signals';
    return 'Read private context through MCP';
};

async function readStrictResponse<T>(response: Response, schema: z.ZodType<T>, fallbackMessage: string): Promise<T> {
    const payload = await readJsonResponseWithLimit<unknown>(response, ANSWERLATTICE_PUBLIC_API_KEY_RESPONSE_MAX_BYTES);
    if (!response.ok) throw new Error(fallbackMessage);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new Error(fallbackMessage);
    return parsed.data;
}

export default function AnswerlatticePublicApiManagement() {
    const { access } = useAnswerlatticeAccess();
    const canManage = Boolean(
        access?.isPlatformAdmin
        || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS] === true,
    );
    const [credential, setCredential] = useState<AnswerlatticePublicApiKeySummary | null>(null);
    const [selectedScopes, setSelectedScopes] = useState<AnswerlatticePublicApiScope[]>(['public:read']);
    const [rawApiKey, setRawApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mutating, setMutating] = useState(false);

    const scopeSelection = useMemo(
        () => ANSWERLATTICE_PUBLIC_API_SCOPES.filter((scope) => selectedScopes.includes(scope)),
        [selectedScopes],
    );

    const loadCredential = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API || !canManage) return;
        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/public-api-key', {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyStatusResponseSchema,
                'Could not load Public API access',
            );
            setCredential(data.credential);
            if (data.credential) setSelectedScopes(data.credential.scopes);
        } catch {
            message.error('Could not load Public API access');
        } finally {
            setLoading(false);
        }
    }, [canManage]);

    useEffect(() => {
        loadCredential();
    }, [loadCredential]);

    const generateKey = useCallback(async () => {
        if (scopeSelection.length === 0) return;
        setMutating(true);
        try {
            const response = await fetch('/api/answerlattice/public-api-key', {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', scopes: scopeSelection }),
            });
            const data = await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyGeneratedResponseSchema,
                'Could not create Public API key',
            );
            setCredential(data.credential);
            setSelectedScopes(data.credential.scopes);
            setRawApiKey(data.apiKey);
            message.success(credential ? 'Public API key rotated' : 'Public API key created');
        } catch {
            message.error('Could not create Public API key');
        } finally {
            setMutating(false);
        }
    }, [credential, scopeSelection]);

    const revokeKey = useCallback(async () => {
        setMutating(true);
        try {
            const response = await fetch('/api/answerlattice/public-api-key', {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            });
            await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyRevokedResponseSchema,
                'Could not revoke Public API key',
            );
            setCredential(null);
            setRawApiKey(null);
            setSelectedScopes(['public:read']);
            message.success('Public API key revoked');
        } catch {
            message.error('Could not revoke Public API key');
        } finally {
            setMutating(false);
        }
    }, []);

    const copyRawKey = useCallback(async () => {
        if (!rawApiKey) return;
        try {
            await navigator.clipboard.writeText(rawApiKey);
            message.success('Public API key copied');
        } catch {
            message.error('Could not copy Public API key');
        }
    }, [rawApiKey]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API || !canManage) return null;

    return (
        <Card title={<Flex align="center" gap={8}><LuKeyRound size={16} /> Public API Access</Flex>}>
            <Spin spinning={loading}>
                <Flex vertical gap={16}>
                    <Alert
                        type="warning"
                        showIcon
                        message="Server-side use only"
                        description="Store this key in a trusted backend secret. Do not expose it in browser code, mobile apps, public repositories, or support messages."
                    />

                    {credential ? (
                        <Flex vertical gap={8}>
                            <Text strong>Active key: {credential.keyPrefix}...</Text>
                            <Space wrap>
                                {credential.scopes.map((scope) => <Tag key={scope}>{getScopeLabel(scope)}</Tag>)}
                            </Space>
                            <Text type="secondary">Created {new Date(credential.createdAt).toLocaleString()}</Text>
                        </Flex>
                    ) : (
                        <Text type="secondary">No Public API key is active for this workspace.</Text>
                    )}

                    {rawApiKey && (
                        <Alert
                            type="success"
                            showIcon
                            message="Store this key now. It will not be shown again."
                            description={(
                                <Flex gap={8} align="center" style={{ marginTop: 8 }}>
                                    <Input.Password value={rawApiKey} readOnly visibilityToggle />
                                    <Button
                                        aria-label="Copy Public API key"
                                        icon={<LuCopy size={16} />}
                                        onClick={copyRawKey}
                                    />
                                </Flex>
                            )}
                        />
                    )}

                    <Checkbox.Group
                        options={SCOPE_OPTIONS}
                        value={selectedScopes}
                        onChange={(values) => setSelectedScopes(
                            ANSWERLATTICE_PUBLIC_API_SCOPES.filter((scope) => values.includes(scope)),
                        )}
                    />
                    <Text type="secondary">
                        Signal access can create governed review work. MCP access can read private compiled approved context.
                        Grant either only to trusted integrations that need it.
                    </Text>

                    <Space wrap>
                        <Popconfirm
                            title={credential ? 'Rotate the active Public API key?' : 'Create a Public API key?'}
                            description={credential ? 'The current key will stop working immediately.' : undefined}
                            okText={credential ? 'Rotate key' : 'Create key'}
                            onConfirm={generateKey}
                            disabled={scopeSelection.length === 0 || mutating}
                        >
                            <Button
                                type="primary"
                                icon={<LuRefreshCw size={15} />}
                                loading={mutating}
                                disabled={scopeSelection.length === 0}
                            >
                                {credential ? 'Rotate Key' : 'Create Key'}
                            </Button>
                        </Popconfirm>
                        {credential && (
                            <Popconfirm
                                title="Revoke the active Public API key?"
                                description="External consumers using this key will lose access."
                                okText="Revoke key"
                                okButtonProps={{ danger: true }}
                                onConfirm={revokeKey}
                                disabled={mutating}
                            >
                                <Button danger icon={<LuTrash2 size={15} />} disabled={mutating}>
                                    Revoke Key
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                </Flex>
            </Spin>
        </Card>
    );
}
