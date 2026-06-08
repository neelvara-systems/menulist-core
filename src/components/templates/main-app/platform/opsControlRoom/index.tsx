'use client'

import { getAdoptionPulse, getIntegritySignals, getRecentAlerts, getSystemState } from '@database/ops';
import { usePlatformStoreSummaryOptions } from '@hook/usePlatformStoreSummaryOptions';
import type { AdoptionPulse, IntegritySignals, OpsAlert, SystemState } from '@lib/ops/types';
import { secureError } from '@lib/security/secureLogger';
import { formatDateTime } from '@util/dateTime';
import { Button, Card, Divider, Modal, Select, Spin, Tag, Typography, message, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const { Title, Text } = Typography;

/**
 * Ops Control Room — Internal dashboard for founder/superadmin.
 * 
 * Lean v1: Numbers only, no charts, manual refresh, fetch-on-open.
 * Access: platformRole === 'PLATFORM' only (superadmin).
 * Not in sidebar — direct URL access only (/ops).
 * 
 * Firebase cost: ~8 reads per page load = ~₹0.22/month at 2-3 loads/day.
 * 
 * @see __docs__/ops-control-room/ops-control-room_impl.md
 */
function OpsControlRoom() {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [systemState, setSystemState] = useState<SystemState | null>(null);
    const [adoption, setAdoption] = useState<AdoptionPulse | null>(null);
    const [integrity, setIntegrity] = useState<IntegritySignals | null>(null);
    const [alerts, setAlerts] = useState<OpsAlert[]>([]);
    const [safeModeLoading, setSafeModeLoading] = useState(false);
    const [muteLoading, setMuteLoading] = useState(false);
    const [republishLoading, setRepublishLoading] = useState(false);
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const {
        loading: storesLoading,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
    } = usePlatformStoreSummaryOptions(isPlatform);

    // Gate: superadmin only
    if (session && !isPlatform) {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sys, adopt, integ, alertList] = await Promise.all([
                getSystemState(),
                getAdoptionPulse(),
                getIntegritySignals(),
                getRecentAlerts(10),
            ]);
            setSystemState(sys);
            setAdoption(adopt);
            setIntegrity(integ);
            setAlerts(alertList);
        } catch (error) {
            secureError('[OpsControlRoom] Failed to load data', error instanceof Error ? error : new Error(String(error)));
            message.error('Failed to load ops data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // SAFE_MODE toggle
    const toggleSafeMode = async (action: 'activate' | 'deactivate') => {
        const confirmMsg = action === 'activate'
            ? 'This will block ALL AI generation and bulk operations. Public menus will remain unaffected. Continue?'
            : 'This will restore all AI generation and bulk operations. Continue?';

        Modal.confirm({
            title: action === 'activate' ? 'Enable SAFE_MODE' : 'Disable SAFE_MODE',
            content: confirmMsg,
            okText: action === 'activate' ? 'Enable SAFE_MODE' : 'Disable SAFE_MODE',
            okButtonProps: { danger: action === 'activate' },
            onOk: async () => {
                setSafeModeLoading(true);
                try {
                    const res = await fetch('/api/ops/safe-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action, reason: 'Manual toggle from ops dashboard' }),
                    });
                    if (res.ok) {
                        message.success(`SAFE_MODE ${action === 'activate' ? 'enabled' : 'disabled'}`);
                        await loadData();
                    } else {
                        message.error('Failed to toggle SAFE_MODE');
                    }
                } catch {
                    message.error('Failed to toggle SAFE_MODE');
                } finally {
                    setSafeModeLoading(false);
                }
            },
        });
    };

    // Force Republish
    const handleForceRepublish = async () => {
        if (!selectedStore) {
            message.warning('Select a store first');
            return;
        }
        Modal.confirm({
            title: 'Force Republish',
            content: `This will force republish the active project for ${selectedStore.name || `store ${selectedStore.sId}`}. Continue?`,
            onOk: async () => {
                setRepublishLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const fns = getFunctions();
                    const forceRepublishFn = httpsCallable(fns, 'forceRepublish');
                    const result: any = await forceRepublishFn({ storeId: selectedStore.sId, tenantId: selectedStore.tId });
                    const verification = result.data?.verification || 'done';
                    if (result.data?.success === false) {
                        message.warning(`Republish triggered, verification: ${verification}`);
                    } else {
                        message.success(`Republish triggered, verification: ${verification}`);
                    }
                    await loadData();
                } catch (error: any) {
                    message.error(`Force republish failed: ${error.message}`);
                } finally {
                    setRepublishLoading(false);
                }
            },
        });
    };

    // Mute alerts
    const muteAlerts = async () => {
        setMuteLoading(true);
        try {
            const res = await fetch('/api/ops/mute-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durationMinutes: 20 }),
            });
            if (res.ok) {
                const data = await res.json();
                message.success(`Alerts muted until ${formatDateTime(data.mutedUntil, 'time', formatter)}`);
                await loadData();
            } else {
                message.error('Failed to mute alerts');
            }
        } catch {
            message.error('Failed to mute alerts');
        } finally {
            setMuteLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
                <Title level={3} style={{ margin: 0 }}>Ops Control Room</Title>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button onClick={loadData} loading={loading}>Refresh</Button>
                    <Button type="default" href="/ops/scheduler">Scheduler Monitor</Button>
                    <Button type="default" href="/ops/extraction">Extraction Monitor</Button>
                    <Button type="default" href="/platform/owner-business-assistant">Business Health Monitor</Button>
                    <Button type="default" href="/ops/messaging-onboarding">Messaging Onboarding</Button>
                    <Button type="default" href="/ops/platform-notifications">Platform Notifications</Button>
                    <Button type="default" href="/ops/owner-notifications">Owner Notifications</Button>
                </div>
            </div>

            {/* Section 1: System State */}
            <Card title="System State" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div>
                        <Text type="secondary">SAFE_MODE</Text><br />
                        {systemState?.safeModeActive
                            ? <Tag color="red">ACTIVE</Tag>
                            : <Tag color="green">OFF</Tag>
                        }
                    </div>
                    <div>
                        <Text type="secondary">Alerts</Text><br />
                        {systemState?.alertsMuted
                            ? <Tag color="orange">MUTED</Tag>
                            : <Tag color="blue">ACTIVE</Tag>
                        }
                    </div>
                    <div>
                        <Text type="secondary">Last Alert</Text><br />
                        <Text>{systemState?.lastAlertTitle || 'None'}</Text>
                    </div>
                </div>
                {systemState?.safeModeActive && systemState?.safeModeReason && (
                    <div style={{ marginTop: 8 }}>
                        <Text type="secondary">Reason: </Text>
                        <Text>{systemState.safeModeReason}</Text>
                    </div>
                )}
            </Card>

            {/* Section 2: Adoption Pulse */}
            <Card title="Adoption Pulse (24h)" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div>
                        <Text type="secondary">New Stores</Text><br />
                        <Text strong style={{ fontSize: 20 }}>{adoption?.newStores24h ?? '-'}</Text>
                    </div>
                    <div>
                        <Text type="secondary">Active (7d)</Text><br />
                        <Text strong style={{ fontSize: 20 }}>{adoption?.activeStores7d ?? '-'}</Text>
                    </div>
                </div>
            </Card>

            {/* Section 3: Integrity Signals */}
            <Card title="Store Integrity" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div>
                        <Text type="secondary">No publish 60d</Text><br />
                        <Text strong style={{ fontSize: 20, color: (integrity?.noPublish60d ?? 0) > 0 ? token.colorError : undefined }}>
                            {integrity?.noPublish60d ?? '-'}
                        </Text>
                    </div>
                </div>
            </Card>

            {/* Section 4: Recent Alerts */}
            <Card title="Recent Alerts" size="small" style={{ marginBottom: 16 }}>
                {alerts.length === 0 ? (
                    <Text type="secondary">No alerts</Text>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {alerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Tag color={
                                    alert.severity === 'critical' ? 'red' :
                                        alert.severity === 'warning' ? 'orange' : 'blue'
                                }>
                                    {alert.severity.toUpperCase()}
                                </Tag>
                                <Text>{alert.title}</Text>
                                <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>
                                    {alert.timestamp?.toDate
                                        ? formatDateTime(alert.timestamp, 'datetime', formatter)
                                        : ''}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Divider />

            {/* Section 5: Emergency Controls */}
            <Card title="Emergency Controls" size="small">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {systemState?.safeModeActive ? (
                        <Button
                            type="primary"
                            onClick={() => toggleSafeMode('deactivate')}
                            loading={safeModeLoading}
                        >
                            Disable SAFE_MODE
                        </Button>
                    ) : (
                        <Button
                            danger
                            onClick={() => toggleSafeMode('activate')}
                            loading={safeModeLoading}
                        >
                            Enable SAFE_MODE
                        </Button>
                    )}
                    <Button
                        onClick={muteAlerts}
                        loading={muteLoading}
                        disabled={systemState?.alertsMuted}
                    >
                        Mute Alerts 20min
                    </Button>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Force Republish</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Select
                        showSearch
                        loading={storesLoading}
                        placeholder="Select store"
                        value={selectedStoreId}
                        onChange={setSelectedStoreId}
                        options={selectOptions}
                        optionFilterProp="label"
                        style={{ minWidth: 280, flex: '1 1 320px' }}
                        size="small"
                    />
                    <Button
                        type="primary"
                        ghost
                        onClick={handleForceRepublish}
                        loading={republishLoading}
                        disabled={!selectedStore}
                        size="small"
                    >
                        Force Republish
                    </Button>
                </div>
                <div style={{ marginTop: 12 }}>
                    <Text type="secondary">
                        SAFE_MODE blocks AI generation and bulk operations. Public menus remain unaffected.
                    </Text>
                </div>
            </Card>
        </div>
    );
}

export default OpsControlRoom;
