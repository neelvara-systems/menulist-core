'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PUBLIC_API_SCOPES,
    AnswerlatticePublicApiKeyGeneratedResponseSchema,
    AnswerlatticePublicApiKeyRevokedResponseSchema,
    AnswerlatticePublicApiKeyStatusResponseSchema,
    answerlatticePublicApiManagementScopesMatch,
    type AnswerlatticePublicApiKeySummary,
    type AnswerlatticePublicApiManagementScope,
    type AnswerlatticePublicApiScope,
} from '@lib/answerlattice/publicApiContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { Alert, Button, Card, Checkbox, Flex, Input, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCopy, LuKeyRound, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { useSession } from 'next-auth/react';
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

type PendingPublicApiKeyRotation = {
    apiKey: string;
    requestId: string;
    scopeKey: string;
};

type ScopedRawPublicApiKey = {
    apiKey: string;
    scopeKey: string;
};

const getPublicApiManagementScopeKey = (scope: AnswerlatticePublicApiManagementScope) => (
    `${scope.tenantId}:${scope.storeId}`
);

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
    const { data: session } = useSession();
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    const accessScope = access?.scope;
    const currentScope = useMemo<AnswerlatticePublicApiManagementScope | null>(() => (
        sessionScope && accessScope
        && answerlatticePublicApiManagementScopesMatch(sessionScope, accessScope)
            ? {
                tenantId: sessionScope.tenantId,
                storeId: sessionScope.storeId,
            }
            : null
    ), [
        accessScope?.storeId,
        accessScope?.tenantId,
        sessionScope?.storeId,
        sessionScope?.tenantId,
    ]);
    const workspaceKey = currentScope ? getPublicApiManagementScopeKey(currentScope) : null;
    const canManage = Boolean(
        currentScope
        && (
            access?.isPlatformAdmin
            || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS] === true
        ),
    );
    const [credential, setCredential] = useState<AnswerlatticePublicApiKeySummary | null>(null);
    const [credentialScopeKey, setCredentialScopeKey] = useState<string | null>(null);
    const [selectedScopes, setSelectedScopes] = useState<AnswerlatticePublicApiScope[]>(['public:read']);
    const [rawApiKey, setRawApiKey] = useState<ScopedRawPublicApiKey | null>(null);
    const [loading, setLoading] = useState(false);
    const [mutating, setMutating] = useState(false);
    const pendingRotationRef = useRef<PendingPublicApiKeyRotation | null>(null);
    const workspaceKeyRef = useRef<string | null>(workspaceKey);
    workspaceKeyRef.current = workspaceKey;
    const visibleCredential = credentialScopeKey === workspaceKey ? credential : null;
    const visibleRawApiKey = rawApiKey?.scopeKey === workspaceKey ? rawApiKey.apiKey : null;

    const scopeSelection = useMemo(
        () => ANSWERLATTICE_PUBLIC_API_SCOPES.filter((scope) => selectedScopes.includes(scope)),
        [selectedScopes],
    );

    const loadCredential = useCallback(async () => {
        if (
            !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API
            || !canManage
            || !currentScope
            || !workspaceKey
        ) return;
        const requestScope = currentScope;
        const requestWorkspaceKey = workspaceKey;
        setLoading(true);
        try {
            const query = new URLSearchParams({
                tenantId: String(requestScope.tenantId),
                storeId: String(requestScope.storeId),
            });
            const response = await fetch(`/api/answerlattice/public-api-key?${query.toString()}`, {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyStatusResponseSchema,
                'Could not load Public API access',
            );
            if (
                workspaceKeyRef.current !== requestWorkspaceKey
                || !answerlatticePublicApiManagementScopesMatch(data.scope, requestScope)
            ) return;
            setCredential(data.credential);
            setCredentialScopeKey(requestWorkspaceKey);
            if (data.credential) setSelectedScopes(data.credential.scopes);
        } catch {
            if (workspaceKeyRef.current === requestWorkspaceKey) {
                message.error('Could not load Public API access');
            }
        } finally {
            if (workspaceKeyRef.current === requestWorkspaceKey) setLoading(false);
        }
    }, [canManage, currentScope, workspaceKey]);

    useEffect(() => {
        setCredential(null);
        setCredentialScopeKey(null);
        setRawApiKey(null);
        setSelectedScopes(['public:read']);
        pendingRotationRef.current = null;
        setMutating(false);
        if (workspaceKey) void loadCredential();
    }, [loadCredential]);

    const generateKey = useCallback(async () => {
        if (scopeSelection.length === 0 || !currentScope || !workspaceKey) return;
        const scopeKey = scopeSelection.join('|');
        const existingAttempt = pendingRotationRef.current;
        const attemptKey = `${workspaceKey}|${scopeKey}`;
        const attempt = existingAttempt?.scopeKey === attemptKey
            ? existingAttempt
            : {
                apiKey: `al_${crypto.randomUUID().replace(/-/g, '')}`,
                requestId: crypto.randomUUID(),
                scopeKey: attemptKey,
            };
        const requestScope = currentScope;
        const requestWorkspaceKey = workspaceKey;
        pendingRotationRef.current = attempt;
        setRawApiKey(null);
        setMutating(true);
        try {
            const response = await fetch('/api/answerlattice/public-api-key', {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    apiKey: attempt.apiKey,
                    requestId: attempt.requestId,
                    expectedScope: requestScope,
                    scopes: scopeSelection,
                }),
            });
            const data = await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyGeneratedResponseSchema,
                'Could not create Public API key',
            );
            if (
                workspaceKeyRef.current !== requestWorkspaceKey
                || !answerlatticePublicApiManagementScopesMatch(data.scope, requestScope)
            ) return;
            setCredential(data.credential);
            setCredentialScopeKey(requestWorkspaceKey);
            setSelectedScopes(data.credential.scopes);
            setRawApiKey({ apiKey: data.apiKey, scopeKey: requestWorkspaceKey });
            if (pendingRotationRef.current === attempt) pendingRotationRef.current = null;
            message.success(visibleCredential ? 'Public API key rotated' : 'Public API key created');
        } catch {
            if (workspaceKeyRef.current === requestWorkspaceKey) {
                message.error('Could not create Public API key');
            }
        } finally {
            if (workspaceKeyRef.current === requestWorkspaceKey) setMutating(false);
        }
    }, [currentScope, scopeSelection, visibleCredential, workspaceKey]);

    const revokeKey = useCallback(async () => {
        if (!currentScope || !workspaceKey) return;
        const requestScope = currentScope;
        const requestWorkspaceKey = workspaceKey;
        setMutating(true);
        try {
            const response = await fetch('/api/answerlattice/public-api-key', {
                ...ANSWERLATTICE_PUBLIC_API_KEY_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke', expectedScope: requestScope }),
            });
            const data = await readStrictResponse(
                response,
                AnswerlatticePublicApiKeyRevokedResponseSchema,
                'Could not revoke Public API key',
            );
            if (
                workspaceKeyRef.current !== requestWorkspaceKey
                || !answerlatticePublicApiManagementScopesMatch(data.scope, requestScope)
            ) return;
            setCredential(null);
            setCredentialScopeKey(requestWorkspaceKey);
            setRawApiKey(null);
            pendingRotationRef.current = null;
            setSelectedScopes(['public:read']);
            message.success('Public API key revoked');
        } catch {
            if (workspaceKeyRef.current === requestWorkspaceKey) {
                message.error('Could not revoke Public API key');
            }
        } finally {
            if (workspaceKeyRef.current === requestWorkspaceKey) setMutating(false);
        }
    }, [currentScope, workspaceKey]);

    const copyRawKey = useCallback(async () => {
        if (!visibleRawApiKey) return;
        try {
            await navigator.clipboard.writeText(visibleRawApiKey);
            message.success('Public API key copied');
        } catch {
            message.error('Could not copy Public API key');
        }
    }, [visibleRawApiKey]);

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

                    {visibleCredential ? (
                        <Flex vertical gap={8}>
                            <Text strong>Active key: {visibleCredential.keyPrefix}...</Text>
                            <Space wrap>
                                {visibleCredential.scopes.map((scope) => <Tag key={scope}>{getScopeLabel(scope)}</Tag>)}
                            </Space>
                            <Text type="secondary">Created {new Date(visibleCredential.createdAt).toLocaleString()}</Text>
                        </Flex>
                    ) : (
                        <Text type="secondary">No Public API key is active for this workspace.</Text>
                    )}

                    {visibleRawApiKey && (
                        <Alert
                            type="success"
                            showIcon
                            message="Store this key now. It will not be shown again."
                            description={(
                                <Flex gap={8} align="center" style={{ marginTop: 8 }}>
                                    <Input.Password value={visibleRawApiKey} readOnly visibilityToggle />
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
                            title={visibleCredential ? 'Rotate the active Public API key?' : 'Create a Public API key?'}
                            description={visibleCredential ? 'The current key will stop working immediately.' : undefined}
                            okText={visibleCredential ? 'Rotate key' : 'Create key'}
                            onConfirm={generateKey}
                            disabled={scopeSelection.length === 0 || mutating}
                        >
                            <Button
                                type="primary"
                                icon={<LuRefreshCw size={15} />}
                                loading={mutating}
                                disabled={scopeSelection.length === 0}
                            >
                                {visibleCredential ? 'Rotate Key' : 'Create Key'}
                            </Button>
                        </Popconfirm>
                        {visibleCredential && (
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
