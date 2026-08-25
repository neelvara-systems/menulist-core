'use client';

/**
 * Chain Control Panel — HQ Command Center
 * Visible only when isMaster && storesList.length > 1
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §17
 */

import AddOutletModal from '@organisms/AddOutletModal';
import OutletPolicyEditor from '@organisms/OutletPolicyEditor';
import OutletRenameModal from '@organisms/OutletRenameModal';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { canCreateOutletLocation, canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import {
    claimStoreSwitchAttempt,
    getStoreSummaryId,
    normalizeStoreSwitchStoreId,
    releaseStoreSwitchAttempt,
} from '@lib/multiOutlet/storeSwitchAccess';
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from '@lib/multiOutlet/diagnostics';
import {
    createMultiOutletStatusError,
    isOutletDeactivateResponse,
    MULTI_OUTLET_ACTION_REQUEST_POLICY,
    MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
} from '@lib/multiOutlet/outletActionResponseGuards';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY } from '@type/multiOutlet.types';
import { Badge, Button, Card, Empty, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import { useContext, useRef, useState } from 'react';
import { LuMapPin, LuPlusCircle, LuStar } from 'react-icons/lu';
import { formatCurrency } from '@util/formatters';

const { Title, Text } = Typography;

async function readDesktopLocationActionResponse(
    response: Response,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMultiOutletFailure('desktop_location_outlet_action_response_parse_failed', error, {
            ...context,
            maxBytes: MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw error;
    }
}

export default function LocationsPage() {
    const formatter = useFormatter();
    const {
        tenantDetails,
        setTenantDetails,
        storeDetails,
        userPermissions,
        isMasterUser,
        activeSubscription,
        activeStoreContext,
        setActiveStoreContext,
        setStoreDetails,
    } = useContext(PlatformGlobalDataContext);

    const [addOutletOpen, setAddOutletOpen] = useState(false);
    // T2-N-01: outlet rename modal state.
    const [renameTarget, setRenameTarget] = useState<any | null>(null);
    const [deactivatingStoreId, setDeactivatingStoreId] = useState<number | null>(null);
    const locationScopeKey = `${storeDetails?.tenantId ?? ''}:${storeDetails?.storeId ?? ''}:${activeStoreContext ?? ''}`;
    const locationScopeKeyRef = useRef(locationScopeKey);
    const activeStoreContextRef = useRef(activeStoreContext);
    locationScopeKeyRef.current = locationScopeKey;
    activeStoreContextRef.current = activeStoreContext;
    const canManageLocations = canManageLocationSettings({
        isMasterUser,
        storeDetails,
        tenantDetails,
        userPermissions,
    });
    const canCreateOutlet = canCreateOutletLocation({
        isMasterUser,
        storeDetails,
        tenantDetails,
        userPermissions,
    });
    const masterStoreSummary = tenantDetails?.storesList?.find((store: any) => store?.isMaster === true);
    const policySourceStore = masterStoreSummary?.storeDetails || (storeDetails?.isMaster === true ? storeDetails : null) || storeDetails;
    const policyStoreId = Number(policySourceStore?.storeId || storeDetails?.storeId || 0);

    if (!canManageLocations) {
        return <Empty description="Chain Control Panel is not available" />;
    }

    const storesList = tenantDetails?.storesList || [];
    const activeCount = storesList.filter((s: any) => s.active !== false).length;
    const activeOutletCount = storesList.filter((s: any) => !s.isMaster && s.active !== false).length;
    const masterStoreId = Number(masterStoreSummary?.storeId || storeDetails?.storeId || 0);
    // Billing summary
    const amount = activeSubscription?.amount || 0;
    const currency = activeSubscription?.currency || 'INR';
    const totalCost = amount * activeCount;

    const handleSwitchStore = async (targetStoreId: number) => {
        const normalizedTargetStoreId = normalizeStoreSwitchStoreId(targetStoreId);
        const currentStoreId = normalizeStoreSwitchStoreId(activeStoreContext || storeDetails?.storeId);
        if (
            !normalizedTargetStoreId
            || normalizedTargetStoreId === currentStoreId
            || !storesList.some((store: any) => (
                getStoreSummaryId(store) === normalizedTargetStoreId && store.active !== false
            ))
        ) return;
        const attemptToken = claimStoreSwitchAttempt();
        if (attemptToken === null) return;
        const initiatingScopeKey = locationScopeKey;

        try {
            if (normalizedTargetStoreId === masterStoreId) {
                if (masterStoreId) await refreshFirebaseAuthClaims(masterStoreId);
                if (locationScopeKeyRef.current !== initiatingScopeKey) return;
                setActiveStoreContext(null);
                return;
            }

            const res = await fetch('/api/auth/switch-store', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId: normalizedTargetStoreId }),
            });
            await readAuthAccountResponse(res, 'switch_store');
            if (locationScopeKeyRef.current !== initiatingScopeKey) return;
            await refreshFirebaseAuthClaims(normalizedTargetStoreId);
            if (locationScopeKeyRef.current !== initiatingScopeKey) return;
            setActiveStoreContext(normalizedTargetStoreId);
        } catch (error) {
            if (locationScopeKeyRef.current !== initiatingScopeKey) return;
            logMultiOutletFailure('desktop_location_store_switch_failed', error, {
                ...getBoundedMultiOutletStringContext('targetStoreId', normalizedTargetStoreId),
                ...getBoundedMultiOutletStringContext('currentStoreId', storeDetails?.storeId),
            });
            message.error('Store switch failed');
        } finally {
            releaseStoreSwitchAttempt(attemptToken);
        }
    };

    const handleDeactivateOutlet = (record: any) => {
        const confirmationScopeKey = locationScopeKey;
        Modal.confirm({
            title: 'Deactivate outlet?',
            content: `This turns off ${record.name || `Store ${record.storeId}`} and removes it from normal store switching. Billing quantity is reduced when billing removal is enabled.`,
            okText: 'Deactivate',
            okButtonProps: { danger: true },
            onOk: async () => {
                const outletStoreId = Number(record.storeId);
                if (locationScopeKeyRef.current !== confirmationScopeKey) return;
                const requiresClaimTransition = Number(activeStoreContextRef.current) === outletStoreId;
                const attemptToken = requiresClaimTransition ? claimStoreSwitchAttempt() : undefined;
                if (requiresClaimTransition && attemptToken === null) return;
                setDeactivatingStoreId(outletStoreId);
                try {
                    const res = await fetch('/api/outlets/deactivate', {
                        ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ outletStoreId }),
                    });
                    if (!res.ok) {
                        logMultiOutletFailure('desktop_location_deactivate_failed', createMultiOutletStatusError('desktop_location_deactivate_rejected', res.status), {
                            ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                            ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreId),
                        });
                        message.error('Outlet deactivation failed');
                        return;
                    }
                    const data = await readDesktopLocationActionResponse(res, {
                        ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                        ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreId),
                    });
                    if (!isOutletDeactivateResponse(data, outletStoreId)) {
                        const invalidResponseError = createMultiOutletStatusError('desktop_location_deactivate_response_invalid', res.status);
                        logMultiOutletFailure('desktop_location_deactivate_response_invalid', invalidResponseError, {
                            responseOk: res.ok,
                            responseStatus: res.status,
                            ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                            ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreId),
                        });
                        message.error('Outlet deactivation failed');
                        return;
                    }
                    if (locationScopeKeyRef.current !== confirmationScopeKey) return;
                    setTenantDetails((previous: any) => previous?.storesList
                        ? {
                            ...previous,
                            storesList: previous.storesList.map((store: any) => (
                                Number(store.storeId) === Number(outletStoreId)
                                    ? { ...store, active: false }
                                    : store
                            )),
                        }
                        : previous);
                    if (requiresClaimTransition) {
                        if (masterStoreId) await refreshFirebaseAuthClaims(masterStoreId);
                        if (locationScopeKeyRef.current !== confirmationScopeKey) return;
                        setActiveStoreContext(null);
                    }
                    if (data.billingReductionPending) {
                        message.warning(
                            data.billingActionRequired === 'CONTACT_SUPPORT'
                                ? 'Outlet deactivated. Contact support to finish the billing reduction.'
                                : 'Outlet deactivated. Billing is still being updated.',
                        );
                    } else {
                        message.success('Outlet deactivated');
                    }
                } catch (error) {
                    if (locationScopeKeyRef.current !== confirmationScopeKey) return;
                    logMultiOutletFailure('desktop_location_deactivate_failed', error, {
                        ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                        ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreId),
                    });
                    message.error('Outlet deactivation failed');
                } finally {
                    if (typeof attemptToken === 'number') releaseStoreSwitchAttempt(attemptToken);
                    setDeactivatingStoreId(null);
                }
            },
        });
    };
    const columns = [
        {
            title: 'Store',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: any) => (
                <Space>
                    {record.isMaster ? <LuStar /> : <LuMapPin />}
                    <Text strong={record.isMaster}>{name || `Store ${record.storeId}`}</Text>
                    {record.isMaster && <Tag color="gold">HQ</Tag>}
                    {record.storeId === (activeStoreContext || storeDetails?.storeId) && <Tag color="blue">Current</Tag>}
                </Space>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: any) => (
                <Badge status={record.active !== false ? 'success' : 'default'} text={record.active !== false ? 'Active' : 'Inactive'} />
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => {
                if (record.isMaster) return <Text type="secondary">—</Text>;
                if (record.active === false) return <Text type="secondary">Inactive</Text>;
                return (
                    <Space size="small">
                        <Button
                            disabled={Number(record.storeId) === Number(activeStoreContext || storeDetails?.storeId)}
                            size="small"
                            onClick={() => void handleSwitchStore(record.storeId)}
                        >
                            View
                        </Button>
                        {/*
                         * T2-N-01 / G-07: owner-facing outlet rename. The
                         * server endpoint handles the previousOutletSlugs[]
                         * chain; the modal just collects the new values and
                         * surfaces the 12-month redirect guarantee inline.
                         */}
                        <Button
                            size="small"
                            onClick={() => setRenameTarget(record)}
                        >
                            Rename URL
                        </Button>
                        <Button
                            danger
                            loading={deactivatingStoreId === Number(record.storeId)}
                            size="small"
                            onClick={() => handleDeactivateOutlet(record)}
                        >
                            Deactivate
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={3} style={{ margin: 0 }}>
                        <LuMapPin style={{ marginRight: 8 }} />
                        Locations
                    </Title>
                    {canCreateOutlet && (
                        <Button
                            type="primary"
                            icon={<LuPlusCircle />}
                            onClick={() => setAddOutletOpen(true)}
                        >
                            Add Outlet
                        </Button>
                    )}
                </div>

                {/* Billing Summary */}
                <Card size="small" title="Billing Summary">
                    <Space direction="vertical">
                        <Text>Active Outlets: <Text strong>{activeOutletCount}</Text></Text>
                        <Text>Cost per Store: <Text strong>{formatCurrency(amount, currency)}/month</Text></Text>
                        <Text>Total Chain Cost: <Text strong>{formatCurrency(totalCost, currency)}/month</Text> (Master + {activeOutletCount} active outlets)</Text>
                        {activeSubscription?.cycleEndDate && (
                            <Text type="secondary">
                                Next Invoice: {formatter.dateTime(activeSubscription.cycleEndDate.toDate(), 'date')}
                            </Text>
                        )}
                    </Space>
                </Card>

                {/* Outlet Policy Editor */}
                <OutletPolicyEditor
                    storeId={policyStoreId}
                    currentPolicy={policySourceStore?.outletPolicy || DEFAULT_OUTLET_POLICY}
                    onPolicyUpdate={(nextPolicy) => {
                        setStoreDetails((previous: any) => previous
                            ? {
                                ...previous,
                                ...(Number(previous.storeId) === Number(policyStoreId)
                                    ? { isMaster: true, outletPolicy: nextPolicy }
                                    : {}),
                            }
                            : previous);
                        setTenantDetails((previous: any) => previous?.storesList
                            ? {
                                ...previous,
                                storesList: previous.storesList.map((store: any) => (
                                    Number(store.storeId) === Number(policyStoreId)
                                        ? {
                                            ...store,
                                            isMaster: true,
                                            storeDetails: store.storeDetails
                                                ? { ...store.storeDetails, isMaster: true, outletPolicy: nextPolicy }
                                                : store.storeDetails,
                                        }
                                        : store
                                )),
                            }
                            : previous);
                    }}
                />

                {/* Outlets Table */}
                <Card size="small" title="Outlets">
                    <Table
                        dataSource={storesList.map((s) => ({ ...s, key: s.storeId }))}
                        columns={columns}
                        pagination={storesList.length > 20 ? { pageSize: 20 } : false}
                        size="small"
                    />
                </Card>
            </Space>

            <AddOutletModal
                open={addOutletOpen}
                onClose={() => setAddOutletOpen(false)}
                subscription={activeSubscription}
            />

            {/*
             * T2-N-01 / G-07 PUBLIC-ROUTING-DOCTRINE: outlet slug rename modal.
             * Surfaces the `/api/outlets/rename` endpoint with the doctrinal
             * 12-month redirect warning inline. Closes when the rename
             * succeeds; onRenamed hook is available if future pages need to
             * react (e.g., refresh cached outlet lists).
             */}
            <OutletRenameModal
                open={Boolean(renameTarget)}
                outletStoreId={renameTarget?.storeId}
                currentOutletSlug={renameTarget?.outletSlug}
                currentOutletName={renameTarget?.name}
                onClose={() => setRenameTarget(null)}
            />
        </div>
    );
}
