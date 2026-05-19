'use client';

/**
 * AddOutletModal — Confirmation modal before creating an outlet
 * Shows billing impact (proration) and collects outlet name.
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY } from '@type/multiOutlet.types';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateProration } from '@util/razorpay';
import { Alert, Input, Modal, Space, Typography } from 'antd';
import { useContext, useState } from 'react';

const { Text } = Typography;

interface AddOutletModalProps {
    open: boolean;
    onClose: () => void;
    subscription: FirestoreSubscriptionDoc | null;
}

export default function AddOutletModal({ open, onClose, subscription }: AddOutletModalProps) {
    const { tenantDetails, storeDetails, setStoreDetails, setTenantDetails } = useContext(PlatformGlobalDataContext);
    const [outletName, setOutletName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const proration = subscription ? calculateProration(subscription) : null;
    const currency = subscription?.currency || 'INR';

    const handleCreate = async () => {
        if (!outletName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/outlets/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletName: outletName.trim() }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create outlet');
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
            okButtonProps={{ loading, disabled: !outletName.trim() }}
            destroyOnClose
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Input
                    placeholder="Outlet name (e.g. Downtown Branch)"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    maxLength={200}
                    autoFocus
                />

                {FEATURE_FLAGS.ENABLE_OUTLET_PRORATION_DISPLAY && proration && (
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

                {error && <Alert type="error" message={error} showIcon />}
            </Space>
        </Modal>
    );
}
