'use client';

/**
 * AddOutletModal — Confirmation modal before creating an outlet
 * Shows billing impact (proration) and collects outlet name.
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §6
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
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateProration } from '@util/razorpay';
import { Alert, Button, Input, Modal, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useState } from 'react';

const { Text } = Typography;

interface AddOutletModalProps {
    open: boolean;
    onClose: () => void;
    subscription: FirestoreSubscriptionDoc | null;
}

function buildAddOutletLogContext(storeDetails: any, tenantDetails: any, outletName: string, needsBillingAction = false) {
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

    const proration = subscription ? calculateProration(subscription) : null;
    const currency = subscription?.currency || 'INR';
    const isManualBilling = subscription?.billingMode === 'manual';
    const activeStoreCount = (tenantDetails?.storesList || []).filter((store: any) => store?.active !== false).length || 1;
    const prepaidCapacity = Number(subscription?.quantity || 1);
    const hasManualCapacity = !isManualBilling || prepaidCapacity > activeStoreCount;
    const needsCheckoutBeforeOutlet = Boolean(
        !isManualBilling
        && subscription?.status === 'active'
        && subscription?.paymentMethod?.type === 'upi'
        && prepaidCapacity <= activeStoreCount,
    );
    const hasBillingAccess = !FEATURE_FLAGS.ENABLE_OUTLET_BILLING || (subscription?.status === 'active' && hasManualCapacity && !needsCheckoutBeforeOutlet);

    const openBilling = () => {
        onClose();
        router.push('/billing');
    };

    const handleCreate = async () => {
        if (!outletName.trim()) return;
        setLoading(true);
        setError(null);
        setRequiresBillingAction(false);

        try {
            const res = await fetch('/api/outlets/create', {
                ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletName: outletName.trim() }),
            });
            const data = await readDesktopAddOutletResponse(
                res,
                buildAddOutletLogContext(storeDetails, tenantDetails, outletName),
            );

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
                    buildAddOutletLogContext(storeDetails, tenantDetails, outletName, needsBillingAction),
                );
                setError(needsBillingAction ? 'Add one paid location from Billing, then come back.' : 'Failed to create outlet');
                return;
            }
            if (!isOutletCreateResponse(data)) {
                const invalidResponseError = createMultiOutletStatusError('desktop_location_create_response_invalid', res.status);
                logMultiOutletFailure('desktop_location_create_response_invalid', invalidResponseError, {
                    ...buildAddOutletLogContext(storeDetails, tenantDetails, outletName),
                    responseOk: res.ok,
                    responseStatus: res.status,
                });
                setError('Failed to create outlet');
                return;
            }

            // Update local tenant storesList
            if (tenantDetails && data.storeId) {
                const normalizedCurrentStores = tenantDetails.storesList.map((store: any) => (
                    data.masterPromoted && Number(store.storeId) === Number(storeDetails?.storeId)
                        ? { ...store, isMaster: true }
                        : store
                ));
                const updatedStoresList = [
                    ...normalizedCurrentStores,
                    {
                        active: true,
                        isMaster: false,
                        name: outletName.trim(),
                        outletSlug: data.outletSlug,
                        storeId: data.storeId,
                        tenantName: data.tenantName || tenantDetails.name,
                    },
                ];
                setTenantDetails({ ...tenantDetails, storesList: updatedStoresList });
            }
            if (data.masterPromoted && storeDetails) {
                setStoreDetails({
                    ...storeDetails,
                    isMaster: true,
                    outletPolicy: data.outletPolicy || storeDetails.outletPolicy || DEFAULT_OUTLET_POLICY,
                });
            }

            setOutletName('');
            onClose();
        } catch (e) {
            logMultiOutletFailure(
                'desktop_location_create_failed',
                e,
                buildAddOutletLogContext(storeDetails, tenantDetails, outletName),
            );
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Add New Outlet"
            open={open}
            onCancel={onClose}
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
