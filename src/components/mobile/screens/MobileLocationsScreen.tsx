'use client'

import { FEATURE_FLAGS } from '@config/features';
import { OUTLET_POLICY_CATEGORIES } from '@config/outletPolicy';
import { updateOutletPolicy } from '@database/multiOutlet';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { canCreateOutletLocation, canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';
import { formatCurrency } from '@util/formatters';
import { calculateProration } from '@util/razorpay';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuMapPin, LuPlus, LuStar, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileLocationsScreenProps {
    onBack: () => void;
}

export default function MobileLocationsScreen({ onBack }: MobileLocationsScreenProps) {
    const t = useTranslations('MobileLocations');
    const {
        tenantDetails,
        storeDetails,
        userPermissions,
        isMasterUser,
        activeSubscription,
        activeStoreContext,
        setActiveStoreContext,
        setStoreDetails,
        setTenantDetails,
    } = useContext(PlatformGlobalDataContext);
    const masterStoreSummary = tenantDetails?.storesList?.find((store: any) => store?.isMaster === true);
    const policySourceStore = masterStoreSummary?.storeDetails || (storeDetails?.isMaster === true ? storeDetails : null) || storeDetails;
    const policyStoreId = Number(policySourceStore?.storeId || storeDetails?.storeId || 0);

    const [showAddOutlet, setShowAddOutlet] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const [outletName, setOutletName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [deactivatingStoreId, setDeactivatingStoreId] = useState<number | null>(null);
    const [policy, setPolicy] = useState<OutletPolicy>(policySourceStore?.outletPolicy || DEFAULT_OUTLET_POLICY);
    const [draftPolicy, setDraftPolicy] = useState<OutletPolicy>(policySourceStore?.outletPolicy || DEFAULT_OUTLET_POLICY);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const resolveStoreName = (store: any) => {
        return getStoreContextName(store, `Store ${store?.storeId ?? ''}`);
    };
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

    useEffect(() => {
        const nextPolicy = policySourceStore?.outletPolicy || DEFAULT_OUTLET_POLICY;
        setPolicy(nextPolicy);
        setDraftPolicy(nextPolicy);
    }, [policySourceStore?.outletPolicy]);

    const hasPolicyChanges = useMemo(
        () => Object.keys(DEFAULT_OUTLET_POLICY).some((key) => policy[key as keyof OutletPolicy] !== draftPolicy[key as keyof OutletPolicy]),
        [draftPolicy, policy],
    );

    if (!canManageLocations) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" gap={8} justify="center" style={{ flex: 1, padding: 24, textAlign: 'center' }} vertical>
                    <Text strong>{t('notAvailable')}</Text>
                    <Text type="secondary">{t('notAvailableHint')}</Text>
                </Flex>
            </Flex>
        );
    }

    const storesList = tenantDetails?.storesList || [];
    const activeStoresList = storesList.filter((store: any) => store.active !== false);
    const outletCount = storesList.filter((store: any) => !store.isMaster).length;
    const currency = activeSubscription?.currency || 'INR';
    const amount = activeSubscription?.amount || 0;
    const isManualBilling = activeSubscription?.billingMode === 'manual';
    const prepaidCapacity = Number(activeSubscription?.quantity || 1);
    const hasManualCapacity = !isManualBilling || prepaidCapacity > activeStoresList.length;
    const hasBillingAccess = !FEATURE_FLAGS.ENABLE_OUTLET_BILLING || (activeSubscription?.status === 'active' && hasManualCapacity);

    const handleSwitchStore = async (storeId: number) => {
        const target = storesList.find((store: any) => Number(store.storeId) === Number(storeId));
        if ((target as any)?.active === false) {
            Toast.show({ content: t('inactiveStore'), duration: 1500 });
            return;
        }
        if (Number(storeId) === Number(storeDetails?.storeId)) {
            const masterStoreId = Number(masterStoreSummary?.storeId || storeDetails?.storeId || 0);
            if (masterStoreId) await refreshFirebaseAuthClaims(masterStoreId);
            setActiveStoreContext(null);
            return;
        }
        try {
            const res = await fetch('/api/auth/switch-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId: storeId }),
            });
            if (res.ok) {
                await refreshFirebaseAuthClaims(storeId);
                setActiveStoreContext(storeId);
                Toast.show({ content: t('switchedStore'), duration: 1500 });
            }
        } catch {
            Toast.show({ content: t('failedToSwitch'), duration: 2000 });
        }
    };

    const handleDeactivateOutlet = async (store: any) => {
        const outletStoreId = Number(store?.storeId);
        if (!outletStoreId || store?.isMaster || store?.active === false) return;

        const confirmed = await Dialog.confirm({
            confirmText: t('deactivate'),
            content: t('deactivateOutletConfirm', { name: resolveStoreName(store) }),
            title: t('deactivateOutlet'),
        });
        if (!confirmed) return;

        setDeactivatingStoreId(outletStoreId);
        try {
            const res = await fetch('/api/outlets/deactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletStoreId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Toast.show({ content: data.error || t('failedToDeactivate'), duration: 2000 });
                return;
            }
            setTenantDetails((previous: any) => previous?.storesList
                ? {
                    ...previous,
                    storesList: previous.storesList.map((entry: any) => (
                        Number(entry.storeId) === Number(outletStoreId)
                            ? { ...entry, active: false }
                            : entry
                    )),
                }
                : previous);
            if (Number(activeStoreContext) === Number(outletStoreId)) {
                const masterStoreId = Number(masterStoreSummary?.storeId || storeDetails?.storeId || 0);
                if (masterStoreId) await refreshFirebaseAuthClaims(masterStoreId);
                setActiveStoreContext(null);
            }
            Toast.show({ content: t('outletDeactivated'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToDeactivate'), duration: 2000 });
        } finally {
            setDeactivatingStoreId(null);
        }
    };

    const handleCreateOutlet = async () => {
        if (!outletName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/outlets/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletName: outletName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                Toast.show({ content: data.error || t('failedToCreate'), duration: 2000 });
                return;
            }
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
            setShowAddOutlet(false);
            Toast.show({ content: t('outletCreated'), duration: 1500 });
        } catch {
            Toast.show({ content: t('networkError'), duration: 2000 });
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenPolicy = () => {
        setDraftPolicy(policy);
        setShowPolicy(true);
    };

    const handleTogglePolicy = (key: keyof OutletPolicy, checked: boolean) => {
        setDraftPolicy((prev) => ({ ...prev, [key]: checked }));
    };

    const handleResetPolicy = () => {
        setDraftPolicy(policy);
    };

    const handleSavePolicy = async () => {
        if (!policyStoreId) return;
        if (!hasPolicyChanges) {
            Toast.show({ content: t('noChangesToSave'), duration: 1200 });
            return;
        }

        setIsSavingPolicy(true);
        try {
            const result = await updateOutletPolicy(policyStoreId, draftPolicy);
            const nextPolicy = result?.outletPolicy || draftPolicy;
            setPolicy(nextPolicy);
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
            Toast.show({ content: t('policyUpdated'), duration: 1000 });
            setShowPolicy(false);
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsSavingPolicy(false);
        }
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <Card>
                    <Flex justify="space-between">
                        <Flex gap={2} vertical>
                            <Title level={4} style={{ margin: 0 }}>
                                {activeStoresList.length}
                            </Title>
                            <Text type="secondary">{t('totalStores')}</Text>
                        </Flex>
                        <Flex gap={2} vertical>
                            <Title level={4} style={{ margin: 0, color: '#2563eb' }}>
                                {outletCount}
                            </Title>
                            <Text type="secondary">{t('outlets')}</Text>
                        </Flex>
                        <Flex gap={2} vertical>
                            <Title level={5} style={{ margin: 0 }}>
                                {formatCurrency(isManualBilling ? amount : amount * (activeSubscription?.quantity || activeStoresList.length), currency)}
                            </Title>
                            <Text type="secondary">{isManualBilling ? 'prepaid total' : t('perMonthTotal')}</Text>
                        </Flex>
                    </Flex>
                </Card>

                <Card size="small" title={<Text strong>{t('stores')}</Text>}>
                    <List>
                        {storesList.map((store: any) => (
                            <List.Item
                                key={store.storeId}
                                onClick={() => handleSwitchStore(store.storeId)}
                                prefix={store.isMaster ? <LuStar color="#eab308" size={18} /> : <LuMapPin color="#60a5fa" size={18} />}
                                extra={
                                    store.isMaster ? (
                                        <Flex align="center" gap={6}>
                                            <Tag color="warning">HQ</Tag>
                                            {Number(store.storeId) === Number(storeDetails?.storeId) ? <Tag color="processing">Current</Tag> : null}
                                        </Flex>
                                    ) : store.active === false ? (
                                        <Tag>{t('inactive')}</Tag>
                                    ) : (
                                        <Flex align="center" gap={6}>
                                            <Tag>View</Tag>
                                            {Number(store.storeId) === Number(storeDetails?.storeId) ? <Tag color="processing">Current</Tag> : null}
                                            <Button
                                                color="danger"
                                                fill="outline"
                                                loading={deactivatingStoreId === Number(store.storeId)}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleDeactivateOutlet(store);
                                                }}
                                                size="mini"
                                            >
                                                {t('deactivate')}
                                            </Button>
                                        </Flex>
                                    )
                                }
                                title={<Text strong>{resolveStoreName(store)}</Text>}
                            />
                        ))}
                    </List>
                </Card>

                {canCreateOutlet ? (
                    <Card size="small">
                        <Flex align="center" justify="space-between">
                            <Flex gap={4} vertical>
                                <Text strong>{t('addOutlet')}</Text>
                                <Text type="secondary">{t('addOutletDesc')}</Text>
                            </Flex>
                            <Button color="primary" fill="outline" onClick={() => setShowAddOutlet(true)} size="small">
                                <Flex align="center" gap={6}>
                                    <LuPlus size={16} />
                                    <Text>{t('addOutlet')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

                {canManageLocations ? (
                    <Card onClick={handleOpenPolicy}>
                        <Flex align="center" justify="space-between">
                            <Flex gap={4} vertical>
                                <Text strong>{t('outletPolicy')}</Text>
                                <Text type="secondary">{t('outletPolicyDesc')}</Text>
                            </Flex>
                            <Tag>{t('manage')}</Tag>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '60vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={isCreating ? undefined : () => setShowAddOutlet(false)}
                position="bottom"
                visible={showAddOutlet}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowAddOutlet(false)}>
                        {t('addNewOutlet')}
                    </NavBar>

                    <Flex gap={16} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Flex gap={6} vertical>
                            <Text strong>{t('outletName')}</Text>
                            <Text type="secondary">{t('outletNameHelp')}</Text>
                            <Input
                                onChange={setOutletName}
                                placeholder={t('outletNamePlaceholder')}
                                value={outletName}
                            />
                        </Flex>

                        {FEATURE_FLAGS.ENABLE_OUTLET_PRORATION_DISPLAY && activeSubscription && !isManualBilling ? (
                            (() => {
                                const proration = calculateProration(activeSubscription);
                                return (
                                    <Card size="small" style={{ backgroundColor: '#eff6ff' }}>
                                        <Flex gap={4} vertical>
                                            <Text>{`${t('proratedCharge')} ${formatCurrency(proration.proratedAmount, currency)}`}</Text>
                                            <Text type="secondary">{t('daysLeftInCycle', { days: proration.daysRemaining })}</Text>
                                        </Flex>
                                    </Card>
                                );
                            })()
                        ) : null}

                        {FEATURE_FLAGS.ENABLE_OUTLET_BILLING && !activeSubscription ? (
                            <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
                                <Text>Choose an active plan before adding another location.</Text>
                            </Card>
                        ) : null}

                        {isManualBilling ? (
                            <Card size="small" style={{ backgroundColor: hasManualCapacity ? '#ecfdf5' : '#fff7e6' }}>
                                <Flex gap={4} vertical>
                                    <Text>{prepaidCapacity} prepaid location{prepaidCapacity > 1 ? 's' : ''} included</Text>
                                    <Text type="secondary">
                                        {hasManualCapacity
                                            ? 'This outlet will use one prepaid location.'
                                            : 'Ask your reseller to add prepaid location capacity before adding another outlet.'}
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}

                        <Flex gap={12}>
                            <Button block fill="outline" onClick={() => setShowAddOutlet(false)} size="large">
                                {t('cancel')}
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!outletName.trim() || !hasBillingAccess}
                                loading={isCreating}
                                onClick={handleCreateOutlet}
                                size="large"
                            >
                                {t('addOutlet')}
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ maxHeight: '90vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={isSavingPolicy ? undefined : () => setShowPolicy(false)}
                position="bottom"
                visible={showPolicy}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            borderBottom: '1px solid #f3f4f6',
                            minHeight: 56,
                            padding: '0 16px',
                            position: 'relative',
                        }}
                    >
                        <Text strong>{t('outletPolicy')}</Text>
                        <Button
                            disabled={isSavingPolicy}
                            fill="none"
                            icon={<LuX size={20} />}
                            onClick={() => setShowPolicy(false)}
                            size="mini"
                            style={{ position: 'absolute', right: 8, top: 8 }}
                        />
                    </Flex>

                    <Flex gap={12} style={{ flex: 1, overflowY: 'auto', padding: 12 }} vertical>
                        <Text type="secondary">{t('chainWideRules')}</Text>
                        <Text type="secondary">{t('policyHelp')}</Text>

                        <Flex gap={16} vertical>
                            {OUTLET_POLICY_CATEGORIES.map((category, index) => (
                                <Card
                                    key={`${category.label}-${index}`}
                                    size="small"
                                    title={<Text strong>{category.label}</Text>}
                                >
                                    <List>
                                        {category.items.map((item) => (
                                            <List.Item
                                                key={item.key}
                                                extra={
                                                    <Switch
                                                        checked={draftPolicy[item.key]}
                                                        onChange={(checked) => handleTogglePolicy(item.key, checked)}
                                                    />
                                                }
                                                title={<Text>{item.label}</Text>}
                                            />
                                        ))}
                                    </List>
                                </Card>
                            ))}
                        </Flex>

                        <Flex
                            gap={12}
                            style={{
                                backdropFilter: 'blur(10px)',
                                backgroundColor: '#ffffff',
                                borderTop: '1px solid #f3f4f6',
                                bottom: 0,
                                marginInline: -12,
                                marginTop: 'auto',
                                padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                                position: 'sticky',
                                zIndex: 20,
                            }}
                        >
                            <Button
                                block
                                disabled={!hasPolicyChanges || isSavingPolicy}
                                fill="outline"
                                onClick={handleResetPolicy}
                                size="large"
                            >
                                {t('reset')}
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!hasPolicyChanges || isSavingPolicy}
                                loading={isSavingPolicy}
                                onClick={() => void handleSavePolicy()}
                                size="large"
                            >
                                {t('saveChanges')}
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
