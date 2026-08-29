'use client'

import { getOpsControlRoomSnapshot } from '@database/ops';
import { usePlatformStoreSummaryOptions } from '@hook/usePlatformStoreSummaryOptions';
import {
    OPS_CONTROL_ROOM_REQUEST_POLICY,
    isOpsControlRoomForceRepublishResponse,
    logInvalidOpsControlRoomForceRepublishResponse,
    readOpsControlRoomMuteAlertsResponse,
    readOpsControlRoomSafeModeResponse,
} from '@lib/ops/opsControlRoomClientResponse';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type { AdoptionPulse, IntegritySignals, OpsAlert, SystemState } from '@lib/ops/types';
import { formatDateTime, type DateLike, type IntlFormatter } from '@util/dateTime';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuActivity, LuAlertTriangle, LuRefreshCw, LuShieldAlert, LuZap } from 'react-icons/lu';
import { Alert } from 'antd';
import { Button, Card, Dialog, DotLoading, Flex, List, Select, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileOpsControlRoomScreenProps {
    onBack: () => void;
}

function formatTimestamp(value: DateLike, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function severityColor(severity?: string): 'success' | 'warning' | 'danger' | 'primary' | 'default' {
    if (severity === 'critical') return 'danger';
    if (severity === 'warning') return 'warning';
    if (severity === 'info') return 'primary';
    return 'default';
}

export default function MobileOpsControlRoomScreen({ onBack }: MobileOpsControlRoomScreenProps) {
    const formatter = useFormatter();
    const { data: session, status } = useSession();
    const platformRole = session?.platformRole || session?.user.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const isMountedRef = useRef(true);
    const isPlatformRef = useRef(isPlatform);
    const latestLoadRequestRef = useRef(0);
    const safeModeInFlightRef = useRef(false);
    const muteInFlightRef = useRef(false);
    const republishInFlightRef = useRef(false);
    isPlatformRef.current = isPlatform;
    const [loading, setLoading] = useState(true);
    const [systemState, setSystemState] = useState<SystemState | null>(null);
    const [adoption, setAdoption] = useState<AdoptionPulse | null>(null);
    const [integrity, setIntegrity] = useState<IntegritySignals | null>(null);
    const [alerts, setAlerts] = useState<OpsAlert[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [safeModeLoading, setSafeModeLoading] = useState(false);
    const [muteLoading, setMuteLoading] = useState(false);
    const [republishLoading, setRepublishLoading] = useState(false);
    const {
        error: storesError,
        loading: storesLoading,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
    } = usePlatformStoreSummaryOptions(isPlatform);

    const loadData = useCallback(async () => {
        if (!isPlatform) return;
        const requestId = latestLoadRequestRef.current + 1;
        latestLoadRequestRef.current = requestId;
        setLoading(true);
        setLoadError(false);
        try {
            const snapshot = await getOpsControlRoomSnapshot();
            if (!isMountedRef.current || !isPlatformRef.current || latestLoadRequestRef.current !== requestId) return;
            setSystemState(snapshot.systemState);
            setAdoption(snapshot.adoption);
            setIntegrity(snapshot.integrity);
            setAlerts(snapshot.alerts);
        } catch {
            if (!isMountedRef.current || !isPlatformRef.current || latestLoadRequestRef.current !== requestId) return;
            setLoadError(true);
            Toast.show({ content: 'Could not load ops data', duration: 1800 });
        } finally {
            if (
                isMountedRef.current
                && isPlatformRef.current
                && latestLoadRequestRef.current === requestId
            ) {
                setLoading(false);
            }
        }
    }, [isPlatform]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            safeModeInFlightRef.current = false;
            muteInFlightRef.current = false;
            republishInFlightRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (status === 'loading') return;
        if (!isPlatform) {
            latestLoadRequestRef.current += 1;
            setLoading(false);
            return;
        }
        void loadData();
    }, [isPlatform, loadData, status]);

    const toggleSafeMode = async (action: 'activate' | 'deactivate') => {
        if (safeModeInFlightRef.current) return;
        safeModeInFlightRef.current = true;
        const confirmed = await Dialog.confirm({
            confirmText: action === 'activate' ? 'Enable SAFE_MODE' : 'Disable SAFE_MODE',
            content: action === 'activate'
                ? 'This stops guarded AI generation and provider-upload paths. Public menus and publishing remain available.'
                : 'This restores guarded AI generation and provider-upload paths.',
            title: action === 'activate' ? 'Enable SAFE_MODE?' : 'Disable SAFE_MODE?',
        });
        if (!confirmed || !isMountedRef.current || !isPlatformRef.current) {
            safeModeInFlightRef.current = false;
            return;
        }
        setSafeModeLoading(true);
        try {
            const response = await fetch('/api/ops/safe-mode', {
                ...OPS_CONTROL_ROOM_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason: 'Manual toggle from mobile ops dashboard' }),
            });
            const data = await readOpsControlRoomSafeModeResponse(response, {
                ...getBoundedOpsStringContext('action', action),
                ...getBoundedOpsStringContext('endpoint', '/api/ops/safe-mode'),
                surface: 'mobile_ops_control_room',
            });
            if (!data) throw new Error('mobile_ops_safe_mode_response_unavailable');
            if (!isMountedRef.current || !isPlatformRef.current) return;
            Toast.show({ content: data.SAFE_MODE ? 'SAFE_MODE enabled' : 'SAFE_MODE disabled', duration: 1600 });
            await loadData();
        } catch (error) {
            logOpsFailure('mobile_ops_safe_mode_toggle_failed', error, {
                ...getBoundedOpsStringContext('action', action),
            });
            if (isMountedRef.current && isPlatformRef.current) {
                Toast.show({ content: 'Could not update SAFE_MODE', duration: 1800 });
            }
        } finally {
            safeModeInFlightRef.current = false;
            if (isMountedRef.current) setSafeModeLoading(false);
        }
    };

    const muteAlerts = async () => {
        if (muteInFlightRef.current) return;
        muteInFlightRef.current = true;
        setMuteLoading(true);
        try {
            const response = await fetch('/api/ops/mute-alerts', {
                ...OPS_CONTROL_ROOM_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durationMinutes: 20 }),
            });
            const data = await readOpsControlRoomMuteAlertsResponse(response, {
                ...getBoundedOpsStringContext('endpoint', '/api/ops/mute-alerts'),
                durationMinutes: 20,
                surface: 'mobile_ops_control_room',
            });
            if (!data) throw new Error('mobile_ops_mute_alerts_response_unavailable');
            if (!isMountedRef.current || !isPlatformRef.current) return;
            Toast.show({ content: `Alerts muted until ${formatDateTime(data.mutedUntil, 'time', formatter)}`, duration: 1600 });
            await loadData();
        } catch (error) {
            logOpsFailure('mobile_ops_mute_alerts_failed', error, {
                durationMinutes: 20,
            });
            if (isMountedRef.current && isPlatformRef.current) {
                Toast.show({ content: 'Could not mute alerts', duration: 1800 });
            }
        } finally {
            muteInFlightRef.current = false;
            if (isMountedRef.current) setMuteLoading(false);
        }
    };

    const forceRepublish = async () => {
        if (!selectedStore || republishInFlightRef.current) {
            if (!selectedStore) Toast.show({ content: 'Select a store first', duration: 1600 });
            return;
        }
        republishInFlightRef.current = true;
        const republishStore = selectedStore;
        const buildRepublishLogContext = (metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
            surface: 'mobile_ops_control_room',
            flow: 'force_republish',
            ...getBoundedOpsStringContext('selectedStoreId', republishStore.sId),
            ...getBoundedOpsStringContext('selectedTenantId', republishStore.tId),
            ...metadata,
        });

        const confirmed = await Dialog.confirm({
            confirmText: 'Republish',
            content: `Force republish all active menu projects for ${republishStore.name || `store ${republishStore.sId}`}.`,
            title: 'Force republish?',
        });
        if (!confirmed || !isMountedRef.current || !isPlatformRef.current) {
            republishInFlightRef.current = false;
            return;
        }
        setRepublishLoading(true);
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const forceRepublishFn = httpsCallable(getFunctions(), 'forceRepublish');
            const result = await forceRepublishFn({ storeId: republishStore.sId, tenantId: republishStore.tId });
            if (!isOpsControlRoomForceRepublishResponse(result.data)) {
                logInvalidOpsControlRoomForceRepublishResponse(result.data, buildRepublishLogContext());
                throw new Error('mobile_ops_force_republish_response_invalid');
            }
            if (!isMountedRef.current || !isPlatformRef.current) return;
            const verification = result.data.verification;
            const projectCount = result.data.projectCount;
            Toast.show({
                content: `Republish triggered for ${projectCount} menu project${projectCount === 1 ? '' : 's'}, verification: ${verification}`,
                duration: 1800
            });
            await loadData();
        } catch (error) {
            logOpsFailure('mobile_ops_force_republish_failed', error, buildRepublishLogContext());
            if (isMountedRef.current && isPlatformRef.current) {
                Toast.show({ content: 'Republish failed', duration: 2200 });
            }
        } finally {
            republishInFlightRef.current = false;
            if (isMountedRef.current) setRepublishLoading(false);
        }
    };

    if (status !== 'loading' && !isPlatform) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description="Platform-only operations controls."
                    onBack={onBack}
                    title="Ops Control Room"
                />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuShieldAlert size={28} />
                            <Text type="secondary" style={{ textAlign: 'center' }}>This screen is available only to platform admins.</Text>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="SAFE_MODE, alerts, adoption, integrity, and recovery controls."
                onBack={onBack}
                title="Ops Control Room"
            />
            <Flex gap={12} style={{ padding: 16, paddingBottom: 24 }} vertical>
                <Button block loading={loading} onClick={() => { void loadData(); }}>
                    <Flex align="center" gap={6} justify="center">
                        <LuRefreshCw size={16} />
                        <Text>Refresh</Text>
                    </Flex>
                </Button>

                {loading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">Loading ops state</Text>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        {loadError ? (
                            <Alert
                                message="Ops state unavailable"
                                description="Values may be missing or from the previous successful refresh."
                                showIcon
                                type="error"
                            />
                        ) : null}
                        <Card size="small" title={<Text strong>System State</Text>}>
                            <Flex gap={12} vertical>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuZap size={16} />
                                        <Text>SAFE_MODE</Text>
                                    </Flex>
                                    {!systemState
                                        ? <Tag>UNKNOWN</Tag>
                                        : <Tag color={systemState.safeModeActive ? 'error' : 'success'}>{systemState.safeModeActive ? 'ACTIVE' : 'OFF'}</Tag>}
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text type="secondary">Alerts</Text>
                                    {!systemState
                                        ? <Tag>UNKNOWN</Tag>
                                        : <Tag color={systemState.alertsMuted ? 'warning' : 'primary'}>{systemState.alertsMuted ? 'Muted' : 'Active'}</Tag>}
                                </Flex>
                                <Flex gap={4} vertical>
                                    <Text type="secondary">Last alert</Text>
                                    <Text>{systemState?.lastAlertTitle || 'None'}</Text>
                                </Flex>
                                {systemState?.safeModeReason ? (
                                    <Flex gap={4} vertical>
                                        <Text type="secondary">Reason</Text>
                                        <Text>{systemState.safeModeReason}</Text>
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Adoption Pulse</Text>}>
                            <Flex gap={12} wrap>
                                <Metric label="New Stores 24h" value={adoption?.newStores24h ?? '-'} />
                                <Metric label="Active 7d" value={adoption?.activeStores7d ?? '-'} />
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Store Integrity</Text>}>
                            <Flex gap={12} wrap>
                                <Metric label="No Publish 60d" value={integrity?.noPublish60d ?? '-'} />
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Recent Alerts</Text>}>
                            {alerts.length ? (
                                <List>
                                    {alerts.slice(0, 6).map((alert) => (
                                        <List.Item
                                            key={alert.id}
                                            description={<Text type="secondary">{formatTimestamp(alert.timestamp, formatter)}</Text>}
                                            extra={<Tag color={severityColor(alert.severity)}>{alert.severity}</Tag>}
                                            prefix={<LuAlertTriangle size={16} />}
                                            title={<Text>{alert.title}</Text>}
                                        />
                                    ))}
                                </List>
                            ) : (
                                <Text type="secondary">{loadError ? 'Alert state unavailable' : 'No alerts in the bounded recent window'}</Text>
                            )}
                        </Card>

                        <Card size="small" title={<Text strong>Emergency Controls</Text>}>
                            <Flex gap={10} vertical>
                                <Flex gap={8}>
                                    {systemState?.safeModeActive ? (
                                        <Button block disabled={safeModeLoading} loading={safeModeLoading} onClick={() => { void toggleSafeMode('deactivate'); }}>Disable SAFE_MODE</Button>
                                    ) : (
                                        <Button block color="danger" disabled={safeModeLoading} fill="outline" loading={safeModeLoading} onClick={() => { void toggleSafeMode('activate'); }}>Enable SAFE_MODE</Button>
                                    )}
                                    <Button block disabled={systemState?.alertsMuted || muteLoading} loading={muteLoading} onClick={() => { void muteAlerts(); }}>Mute Alerts</Button>
                                </Flex>
                                <Flex gap={8} vertical>
                                    <Text strong>Force Republish</Text>
                                    <Select
                                        aria-label="Store"
                                        options={selectOptions}
                                        placeholder={storesLoading ? 'Loading stores' : 'Select store'}
                                        value={selectedStoreId}
                                        onChange={setSelectedStoreId}
                                    />
                                    {storesError ? <Text type="danger">Store options are unavailable. Refresh before recovery.</Text> : null}
                                    {selectedStore ? (
                                        <Text type="secondary">Tenant {selectedStore.tId} · Store {selectedStore.sId}</Text>
                                    ) : null}
                                    <Button
                                        block
                                        color="primary"
                                        disabled={!selectedStore || republishLoading}
                                        loading={republishLoading}
                                        onClick={() => { void forceRepublish(); }}
                                    >
                                        Force Republish
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </>
                )}
            </Flex>
        </Flex>
    );
}

function Metric({ label, value }: { label: string; value: number | string }) {
    return (
        <Flex
            gap={2}
            style={{
                background: 'var(--ant-color-fill-tertiary)',
                border: '1px solid var(--ant-color-border-secondary)',
                borderRadius: 8,
                flex: '1 1 45%',
                minHeight: 72,
                minWidth: 120,
                padding: 10,
            }}
            vertical
        >
            <Text type="secondary">{label}</Text>
            <Title level={4} style={{ margin: 0 }}>{value}</Title>
        </Flex>
    );
}
