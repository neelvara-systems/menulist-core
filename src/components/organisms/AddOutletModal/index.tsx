'use client';

/**
 * AddOutletModal — Confirmation modal before creating an outlet
 * Shows billing impact (proration) and collects outlet name.
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from '@lib/multiOutlet/diagnostics';
import {
    createMultiOutletStatusError,
    isOutletCreateResponse,
    isOutletPaymentRequiredResponse,
    MULTI_OUTLET_ACTION_REQUEST_POLICY,
    MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
    OUTLET_LOCATION_PAYMENT_REQUIRED_CODE,
} from '@lib/multiOutlet/outletActionResponseGuards';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY } from '@type/multiOutlet.types';
import type { StoreDataType } from '@type/platform/store';
import type { TenantDataType } from '@type/platform/tenant';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateProration, hasValidSubscriptionAccess } from '@util/razorpay';
import { Alert, Button, Input, Modal, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useContext, useRef, useState } from 'react';

const { Text } = Typography;

interface AddOutletModalProps {
    open: boolean;
    onClose: () => void;
    subscription: FirestoreSubscriptionDoc | null;
}

function buildAddOutletLogContext(
    storeDetails: Pick<StoreDataType, 'storeId' | 'tenantId'> | null,
    tenantDetails: Pick<TenantDataType, 'tenantId'> | null,
    outletName: string,
    needsBillingAction = false,
) {
    return {
        needsBillingAction,
        ...getBoundedMultiOutletStringContext('storeId', storeDetails?.storeId),
        ...getBoundedMultiOutletStringContext('tenantId', storeDetails?.tenantId || tenantDetails?.tenantId),
        ...getBoundedMultiOutletStringContext('outletName', outletName),
    };
}

async function readDesktopAddOutletResponse(
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

export default function AddOutletModal({ open, onClose, subscription }: AddOutletModalProps) {
    const { tenantDetails, storeDetails, setStoreDetails, setTenantDetails } = useContext(PlatformGlobalDataContext);
    const router = useRouter();
    const [outletName, setOutletName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresBillingAction, setRequiresBillingAction] = useState(false);
    const actionInFlightRef = useRef(false);
    const modalEpochRef = useRef(0);
    const previousOpenRef = useRef(open);
    const currentScopeRef = useRef({
        open,
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId || tenantDetails?.tenantId,
    });
    if (previousOpenRef.current !== open) {
        previousOpenRef.current = open;
        modalEpochRef.current += 1;
    }
    currentScopeRef.current = {
        open,
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId || tenantDetails?.tenantId,
    };

    const isExpectedScope = useCallback((tenantId: unknown, storeId: unknown, modalEpoch: number) => (
        currentScopeRef.current.open
        && modalEpochRef.current === modalEpoch
        && String(currentScopeRef.current.tenantId ?? '') === String(tenantId ?? '')
        && String(currentScopeRef.current.storeId ?? '') === String(storeId ?? '')
    ), []);

    const handleClose = useCallback(() => {
        modalEpochRef.current += 1;
        onClose();
    }, [onClose]);

    const proration = subscription ? calculateProration(subscription) : null;
    const currency = subscription?.currency || 'INR';
    const isManualBilling = subscription?.billingMode === 'manual';
    const activeStoreCount = (tenantDetails?.storesList || []).filter((store: any) => store?.active !== false).length || 1;
    const prepaidCapacity = Number(subscription?.quantity || 1);
    const hasManualCapacity = !isManualBilling || prepaidCapacity > activeStoreCount;
    const hasPaidSubscriptionAccess = hasValidSubscriptionAccess(subscription);
    const needsCheckoutBeforeOutlet = Boolean(
        !isManualBilling
        && subscription?.status === 'active'
        && subscription?.paymentMethod?.type === 'upi'
        && prepaidCapacity <= activeStoreCount,
    );
    const hasBillingAccess = !FEATURE_FLAGS.ENABLE_OUTLET_BILLING || (hasPaidSubscriptionAccess && hasManualCapacity && !needsCheckoutBeforeOutlet);

    const openBilling = () => {
        handleClose();
        router.push('/billing');
    };

    const handleCreate = async () => {
        if (!outletName.trim() || !storeDetails?.storeId || !(storeDetails.tenantId || tenantDetails?.tenantId)) return;
        const expectedStoreId = storeDetails.storeId;
        const expectedTenantId = storeDetails.tenantId || tenantDetails?.tenantId;
        const expectedModalEpoch = modalEpochRef.current;
        const submittedOutletName = outletName.trim();
        if (actionInFlightRef.current || !isExpectedScope(expectedTenantId, expectedStoreId, expectedModalEpoch)) return;
        actionInFlightRef.current = true;
        setLoading(true);
        setError(null);
        setRequiresBillingAction(false);

        try {
            const res = await fetch('/api/outlets/create', {
                ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expectedStoreId: String(expectedStoreId),
                    expectedTenantId: String(expectedTenantId),
                    outletName: submittedOutletName,
                }),
            });
            const data = await readDesktopAddOutletResponse(
                res,
                buildAddOutletLogContext(storeDetails, tenantDetails, submittedOutletName),
            );
            if (!isExpectedScope(expectedTenantId, expectedStoreId, expectedModalEpoch)) return;

            if (!res.ok) {
                const needsBillingAction = isOutletPaymentRequiredResponse(data);
                setRequiresBillingAction(needsBillingAction);
                logMultiOutletFailure(
                    'desktop_location_create_failed',
                    createMultiOutletStatusError(
                        'desktop_location_create_rejected',
                        res.status,
                        needsBillingAction ? OUTLET_LOCATION_PAYMENT_REQUIRED_CODE : undefined,
                    ),
                    buildAddOutletLogContext(storeDetails, tenantDetails, submittedOutletName, needsBillingAction),
                );
                setError(needsBillingAction ? 'Add one paid location from Billing, then come back.' : 'Failed to create outlet');
                return;
            }
            if (!isOutletCreateResponse(data)) {
                const invalidResponseError = createMultiOutletStatusError('desktop_location_create_response_invalid', res.status);
                logMultiOutletFailure('desktop_location_create_response_invalid', invalidResponseError, {
                    ...buildAddOutletLogContext(storeDetails, tenantDetails, submittedOutletName),
                    responseOk: res.ok,
                    responseStatus: res.status,
                });
                setError('Failed to create outlet');
                return;
            }

            // Update local tenant storesList
            if (data.storeId) {
                setTenantDetails((previous) => previous?.storesList
                    && String(previous.tenantId ?? '') === String(expectedTenantId)
                    ? {
                        ...previous,
                        storesList: [
                            ...previous.storesList.map((store) => (
                                data.masterPromoted && Number(store.storeId) === Number(expectedStoreId)
                                    ? { ...store, isMaster: true }
                                    : store
                            )),
                            ...(previous.storesList.some((store) => Number(store.storeId) === Number(data.storeId))
                                ? []
                                : [{
                                    active: true,
                                    isMaster: false,
                                    name: submittedOutletName,
                                    outletSlug: data.outletSlug,
                                    storeId: data.storeId,
                                    storeKey: data.storeKey,
                                    tenantName: data.tenantName || previous.name,
                                }]),
                        ],
                    }
                    : previous);
            }
            if (data.masterPromoted) {
                setStoreDetails((previous) => previous
                    && String(previous.tenantId ?? '') === String(expectedTenantId)
                    && String(previous.storeId ?? '') === String(expectedStoreId)
                    ? {
                        ...previous,
                        isMaster: true,
                        outletPolicy: data.outletPolicy || previous.outletPolicy || DEFAULT_OUTLET_POLICY,
                    }
                    : previous);
            }

            setOutletName('');
            handleClose();
        } catch (e) {
            logMultiOutletFailure(
                'desktop_location_create_failed',
                e,
                buildAddOutletLogContext(storeDetails, tenantDetails, submittedOutletName),
            );
            if (isExpectedScope(expectedTenantId, expectedStoreId, expectedModalEpoch)) {
                setError('Network error. Please try again.');
            }
        } finally {
            actionInFlightRef.current = false;
            if (isExpectedScope(expectedTenantId, expectedStoreId, expectedModalEpoch)) setLoading(false);
        }
    };

    return (
        <Modal
            title="Add New Outlet"
            open={open}
            onCancel={handleClose}
            onOk={handleCreate}
            okText="Add Outlet"
            okButtonProps={{ loading, disabled: !outletName.trim() || !hasBillingAccess }}
            destroyOnHidden
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Input
                    placeholder="Outlet name (e.g. Downtown Branch)"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    maxLength={200}
                    autoFocus
                />

                {FEATURE_FLAGS.ENABLE_OUTLET_PRORATION_DISPLAY && proration && !isManualBilling && (
                    <Alert
                        type="info"
                        showIcon
                        message="Billing Impact"
                        description={
                            <Space direction="vertical" size={2}>
                                <Text>Prorated charge today: <Text strong>{currency} {proration.proratedAmount}</Text></Text>
                                <Text>From next cycle: <Text strong>{currency} {proration.fullCycleAmount}/month per store</Text></Text>
                                <Text type="secondary">{proration.daysRemaining} days remaining in current cycle</Text>
                            </Space>
                        }
                    />
                )}

                {FEATURE_FLAGS.ENABLE_OUTLET_BILLING && !subscription && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Active plan required"
                        description="Choose an active plan before adding another location."
                    />
                )}

                {isManualBilling && !hasManualCapacity && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Prepaid location needed"
                        description="Ask your reseller to add prepaid location capacity before adding another outlet."
                    />
                )}

                {needsCheckoutBeforeOutlet && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Paid location needed"
                        description="This payment method needs a fresh checkout before another location can be added."
                        action={<Button size="small" onClick={openBilling}>Open Billing</Button>}
                    />
                )}

                {error && (
                    <Alert
                        type="error"
                        message={error}
                        showIcon
                        action={requiresBillingAction ? <Button size="small" onClick={openBilling}>Open Billing</Button> : undefined}
                    />
                )}
            </Space>
        </Modal>
    );
}
