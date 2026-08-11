'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import type {
    AnswerlatticeGitHubConnectionSettings,
    AnswerlatticeGitHubConnectionStatus,
    AnswerlatticeGitHubConnectionView,
    AnswerlatticeGitHubRepository,
} from '@lib/answerlattice/githubChangeIntakeContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Flex,
    Modal,
    Select,
    Space,
    Tag,
    Typography,
    message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuFileText,
    LuGithub,
    LuRefreshCw,
    LuSave,
    LuUnplug,
} from 'react-icons/lu';

const { Paragraph, Text } = Typography;
const CONNECTION_ENDPOINT = '/api/answerlattice/knowledge-intake/github/connection';
const CONNECT_ENDPOINT = '/api/answerlattice/knowledge-intake/github/connect';
const RESPONSE_MAX_BYTES = 128 * 1024;
const STATUS_VALUES = new Set<AnswerlatticeGitHubConnectionStatus>([
    'disconnected',
    'pending_repository_selection',
    'connected',
    'needs_reconnect',
    'suspended',
]);

const STATUS_LABELS: Record<AnswerlatticeGitHubConnectionStatus, { color: string; label: string }> = {
    disconnected: { color: 'default', label: 'Not connected' },
    pending_repository_selection: { color: 'processing', label: 'Choose repositories' },
    connected: { color: 'success', label: 'Connected' },
    needs_reconnect: { color: 'warning', label: 'Access changed' },
    suspended: { color: 'error', label: 'Suspended' },
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

const isRepository = (value: unknown): value is AnswerlatticeGitHubRepository => isRecord(value)
    && typeof value.id === 'number'
    && Number.isSafeInteger(value.id)
    && value.id > 0
    && typeof value.fullName === 'string'
    && typeof value.private === 'boolean'
    && typeof value.defaultBranch === 'string'
    && typeof value.htmlUrl === 'string';

const isSettings = (value: unknown): value is AnswerlatticeGitHubConnectionSettings => isRecord(value)
    && typeof value.importPublishedReleases === 'boolean'
    && typeof value.importMergedPullRequests === 'boolean'
    && Array.isArray(value.requiredPullRequestLabels)
    && value.requiredPullRequestLabels.every(label => typeof label === 'string');

const isConnection = (value: unknown): value is AnswerlatticeGitHubConnectionView => isRecord(value)
    && typeof value.available === 'boolean'
    && typeof value.status === 'string'
    && STATUS_VALUES.has(value.status as AnswerlatticeGitHubConnectionStatus)
    && isNullableString(value.accountLogin)
    && isNullableString(value.accountType)
    && Array.isArray(value.selectedRepositories)
    && value.selectedRepositories.every(isRepository)
    && Array.isArray(value.pendingRepositories)
    && value.pendingRepositories.every(isRepository)
    && isNullableString(value.pendingExpiresAt)
    && isSettings(value.settings)
    && isNullableString(value.lastEventAt)
    && isNullableString(value.lastEventKind)
    && isNullableString(value.lastEventRepository)
    && isNullableString(value.lastEventResult)
    && isNullableString(value.lastImportedJobId);

const readConnectionResponse = async (response: Response): Promise<AnswerlatticeGitHubConnectionView> => {
    const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
    if (!response.ok) {
        const error = isRecord(payload) && typeof payload.error === 'string'
            ? payload.error
            : 'GitHub settings are unavailable.';
        throw new Error(error);
    }
    if (!isRecord(payload) || !isConnection(payload.connection)) {
        throw new Error('GitHub returned an invalid connection response.');
    }
    return payload.connection;
};

const requestConnection = async (init?: RequestInit) => readConnectionResponse(await fetch(CONNECTION_ENDPOINT, {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
    ...init,
    headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
    },
}));

const normalizeLabels = (labels: string[]) => Array.from(new Set(
    labels.map(label => label.trim()).filter(Boolean),
)).slice(0, 10);

const getInitialRepositoryIds = (connection: AnswerlatticeGitHubConnectionView): number[] => {
    if (connection.pendingRepositories.length === 1) return [connection.pendingRepositories[0].id];
    const availableIds = new Set(connection.pendingRepositories.map(repository => repository.id));
    const current = connection.selectedRepositories
        .filter(repository => connection.pendingRepositories.length === 0 || availableIds.has(repository.id))
        .map(repository => repository.id);
    return current.slice(0, 10);
};

type GitHubChangeIntakeCardProps = {
    onOpenJob?: (jobId: string) => void | Promise<void>;
};

export default function GitHubChangeIntakeCard({ onOpenJob }: GitHubChangeIntakeCardProps) {
    const { access } = useAnswerlatticeAccess();
    const canManage = Boolean(
        access?.isPlatformAdmin
        || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS],
    );
    const [connection, setConnection] = useState<AnswerlatticeGitHubConnectionView | null>(null);
    const [selectedRepositoryIds, setSelectedRepositoryIds] = useState<number[]>([]);
    const [settings, setSettings] = useState<AnswerlatticeGitHubConnectionSettings>({
        importPublishedReleases: true,
        importMergedPullRequests: false,
        requiredPullRequestLabels: [],
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyConnection = useCallback((next: AnswerlatticeGitHubConnectionView) => {
        setConnection(next);
        setSelectedRepositoryIds(getInitialRepositoryIds(next));
        setSettings(next.settings);
    }, []);

    const load = useCallback(async () => {
        if (!canManage) return;
        setLoading(true);
        setError(null);
        try {
            applyConnection(await requestConnection());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'GitHub settings are unavailable.');
        } finally {
            setLoading(false);
        }
    }, [applyConnection, canManage]);

    useEffect(() => {
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS && canManage) void load();
    }, [canManage, load]);

    const repositories = useMemo(() => (
        connection?.pendingRepositories.length
            ? connection.pendingRepositories
            : connection?.selectedRepositories || []
    ), [connection]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS || !canManage) return null;

    const save = async () => {
        if (!connection || selectedRepositoryIds.length === 0) {
            message.error('Select at least one repository.');
            return;
        }
        if (!settings.importPublishedReleases && !settings.importMergedPullRequests) {
            message.error('Enable published releases or merged pull requests.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const next = await requestConnection({
                method: 'PUT',
                body: JSON.stringify({
                    selectedRepositoryIds,
                    settings: {
                        ...settings,
                        requiredPullRequestLabels: settings.importMergedPullRequests
                            ? normalizeLabels(settings.requiredPullRequestLabels)
                            : [],
                    },
                }),
            });
            applyConnection(next);
            message.success('GitHub change intake saved.');
        } catch (saveError) {
            const nextError = saveError instanceof Error ? saveError.message : 'GitHub settings could not be saved.';
            setError(nextError);
            message.error(nextError);
        } finally {
            setSaving(false);
        }
    };

    const disconnect = () => Modal.confirm({
        title: 'Disconnect GitHub change intake?',
        content: 'Future GitHub changes will stop importing. Existing evidence and approved answers stay in Answerlattice.',
        okText: 'Disconnect',
        okType: 'danger',
        cancelText: 'Keep connected',
        onOk: async () => {
            setSaving(true);
            setError(null);
            try {
                applyConnection(await requestConnection({ method: 'DELETE' }));
                message.success('GitHub change intake disconnected.');
            } catch (disconnectError) {
                const nextError = disconnectError instanceof Error
                    ? disconnectError.message
                    : 'GitHub could not be disconnected.';
                setError(nextError);
                message.error(nextError);
                throw disconnectError;
            } finally {
                setSaving(false);
            }
        },
    });

    const status = connection ? STATUS_LABELS[connection.status] : null;
    const isConnected = connection?.status === 'connected'
        || connection?.status === 'needs_reconnect'
        || connection?.status === 'suspended';
    const requiresVerifiedReconnect = Boolean(
        connection
        && ['needs_reconnect', 'suspended'].includes(connection.status)
        && connection.pendingRepositories.length === 0,
    );
    const canDisconnect = Boolean(connection && connection.status !== 'disconnected');
    const importedJobId = connection?.lastImportedJobId || null;

    return (
        <Card
            loading={loading && !connection}
            style={{ borderRadius: 8 }}
            title={<Space size={8}><LuGithub /><span>GitHub change intake</span></Space>}
            extra={status ? <Tag color={status.color}>{status.label}</Tag> : null}
        >
            <Flex vertical gap={16}>
                <Paragraph type="secondary" style={{ margin: 0, maxWidth: 860 }}>
                    Bring published releases and selected merged pull request summaries into the existing review flow. Source code and patches are not stored.
                </Paragraph>

                {error ? <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load()}>Retry</Button>} /> : null}
                {connection && !connection.available ? (
                    <Alert type="warning" showIcon message="GitHub change intake is not configured for this environment." />
                ) : null}
                {connection?.status === 'needs_reconnect' ? (
                    <Alert type="warning" showIcon message="Repository access changed. Reconnect GitHub and confirm the repositories again." />
                ) : null}
                {connection?.status === 'suspended' ? (
                    <Alert type="error" showIcon message="This GitHub App installation is suspended. Unsuspend it in GitHub, then refresh access." />
                ) : null}

                {connection?.available && connection.status === 'disconnected' ? (
                    <Flex>
                        <Button type="primary" icon={<LuGithub />} href={CONNECT_ENDPOINT} style={{ minHeight: 44 }}>
                            Connect GitHub
                        </Button>
                    </Flex>
                ) : null}

                {connection?.available && connection.status !== 'disconnected' ? (
                    <>
                        {connection.accountLogin ? (
                            <Text>GitHub account: <Text strong>{connection.accountLogin}</Text></Text>
                        ) : null}

                        <Flex vertical gap={8}>
                            <Text strong>Repositories</Text>
                            <Select
                                mode="multiple"
                                value={selectedRepositoryIds}
                                onChange={values => setSelectedRepositoryIds(values.slice(0, 10))}
                                options={repositories.map(repository => ({
                                    value: repository.id,
                                    label: `${repository.fullName}${repository.private ? ' (private)' : ''}`,
                                }))}
                                maxCount={10}
                                placeholder="Select up to 10 repositories"
                                style={{ width: '100%', minHeight: 44 }}
                                disabled={saving || repositories.length === 0}
                            />
                        </Flex>

                        <Flex vertical gap={10}>
                            <Checkbox
                                checked={settings.importPublishedReleases}
                                disabled={saving}
                                onChange={event => setSettings(current => ({
                                    ...current,
                                    importPublishedReleases: event.target.checked,
                                }))}
                            >
                                Import published releases
                            </Checkbox>
                            <Checkbox
                                checked={settings.importMergedPullRequests}
                                disabled={saving}
                                onChange={event => setSettings(current => ({
                                    ...current,
                                    importMergedPullRequests: event.target.checked,
                                }))}
                            >
                                Import merged pull request summaries from the default branch
                            </Checkbox>
                            {settings.importMergedPullRequests ? (
                                <Select
                                    mode="tags"
                                    value={settings.requiredPullRequestLabels}
                                    onChange={labels => setSettings(current => ({
                                        ...current,
                                        requiredPullRequestLabels: normalizeLabels(labels),
                                    }))}
                                    maxCount={10}
                                    tokenSeparators={[',']}
                                    placeholder="Optional required labels, such as customer-facing"
                                    style={{ width: '100%', minHeight: 44 }}
                                    disabled={saving}
                                />
                            ) : null}
                        </Flex>

                        {connection.lastEventAt ? (
                            <Text type="secondary">
                                Last event: {connection.lastEventRepository || 'GitHub'} · {connection.lastEventResult || 'received'} · {new Date(connection.lastEventAt).toLocaleString()}
                            </Text>
                        ) : null}

                        <Space wrap size={10}>
                            <Button
                                type="primary"
                                icon={<LuSave />}
                                loading={saving}
                                disabled={requiresVerifiedReconnect || repositories.length === 0 || selectedRepositoryIds.length === 0}
                                onClick={() => void save()}
                                style={{ minHeight: 44 }}
                            >
                                {connection.status === 'pending_repository_selection' ? 'Start change intake' : 'Save changes'}
                            </Button>
                            {isConnected ? (
                                <Button icon={<LuRefreshCw />} disabled={saving} href={CONNECT_ENDPOINT} style={{ minHeight: 44 }}>
                                    Refresh access
                                </Button>
                            ) : null}
                            {importedJobId && onOpenJob ? (
                                <Button
                                    icon={<LuFileText />}
                                    disabled={saving}
                                    onClick={() => void onOpenJob(importedJobId)}
                                    style={{ minHeight: 44 }}
                                >
                                    Open imported evidence
                                </Button>
                            ) : null}
                            {canDisconnect ? (
                                <Button danger icon={<LuUnplug />} disabled={saving} onClick={disconnect} style={{ minHeight: 44 }}>
                                    Disconnect
                                </Button>
                            ) : null}
                        </Space>
                    </>
                ) : null}
            </Flex>
        </Card>
    );
}
