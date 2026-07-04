'use client'

import { FEATURE_FLAGS } from '@config/features';
import { OUTLET_POLICY_CATEGORIES } from '@config/outletPolicy';
import { updateOutletPolicy } from '@database/multiOutlet';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from '@lib/multiOutlet/diagnostics';
import { canCreateOutletLocation, canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import {
    createMultiOutletStatusError,
    isOutletCreateResponse,
    isOutletDeactivateResponse,
    isOutletPaymentRequiredResponse,
    isOutletRenameResponse,
    MULTI_OUTLET_ACTION_REQUEST_POLICY,
    MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
    OUTLET_LOCATION_PAYMENT_REQUIRED_CODE,
} from '@lib/multiOutlet/outletActionResponseGuards';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { slugify } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';
import { formatCurrency } from '@util/formatters';
import { calculateProration } from '@util/razorpay';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCreditCard, LuMapPin, LuPencil, LuPlus, LuShieldCheck, LuStar, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileLocationsScreenProps {
    onBack: () => void;
    onOpenBilling?: () => void;
}

const OUTLET_POLICY_KEYS = Object.keys(DEFAULT_OUTLET_POLICY) as (keyof OutletPolicy)[];

const readMobileOutletActionResponse = async (
    response: Response,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMultiOutletFailure('mobile_location_outlet_action_response_parse_failed', error, {
            ...context,
            maxBytes: MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw error;
    }
};

const normalizeOutletPolicy = (policy?: Partial<OutletPolicy> | null): OutletPolicy => ({
    ...DEFAULT_OUTLET_POLICY,
    ...(policy || {}),
});

const getChangedPolicy = (basePolicy: OutletPolicy, nextPolicy: OutletPolicy): Partial<OutletPolicy> => {
    return OUTLET_POLICY_KEYS.reduce<Partial<OutletPolicy>>((changes, key) => {
        if (basePolicy[key] !== nextPolicy[key]) {
            changes[key] = nextPolicy[key];
        }
        return changes;
    }, {});
};

export default function MobileLocationsScreen({ onBack, onOpenBilling }: MobileLocationsScreenProps) {
    const t = useTranslations('MobileLocations');
    const { token } = theme.useToken();
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
    const [policy, setPolicy] = useState<OutletPolicy>(normalizeOutletPolicy(policySourceStore?.outletPolicy));
    const [draftPolicy, setDraftPolicy] = useState<OutletPolicy>(normalizeOutletPolicy(policySourceStore?.outletPolicy));
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const [renameTarget, setRenameTarget] = useState<any | null>(null);
    const [renameName, setRenameName] = useState('');
    const [renameSlug, setRenameSlug] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
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
    const buildMobileLocationLogContext = (flow: string, metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
        surface: 'mobile_locations',
        flow,
        isMasterUser: Boolean(isMasterUser),
        canManageLocations,
        canCreateOutlet,
        storeCount: tenantDetails?.storesList?.length || 0,
        ...getBoundedMultiOutletStringContext('tenantId', storeDetails?.tenantId),
        ...getBoundedMultiOutletStringContext('storeId', storeDetails?.storeId),
        ...metadata,
    });

    useEffect(() => {
        const nextPolicy = normalizeOutletPolicy(policySourceStore?.outletPolicy);
        setPolicy(nextPolicy);
        setDraftPolicy(nextPolicy);
    }, [policySourceStore?.outletPolicy]);

    const changedPolicy = useMemo(() => getChangedPolicy(policy, draftPolicy), [draftPolicy, policy]);
    const policyChangeCount = Object.keys(changedPolicy).length;
    const hasPolicyChanges = policyChangeCount > 0;
    const proposedRenameSlug = useMemo(() => {
        const raw = renameSlug.trim() || renameName.trim();
        return raw ? slugify(raw) : '';
    }, [renameName, renameSlug]);
    const renameSlugChanged = Boolean(
        renameTarget
        && proposedRenameSlug
        && proposedRenameSlug !== String(renameTarget?.outletSlug || '').toLowerCase(),
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
    const outletCount = activeStoresList.filter((store: any) => !store.isMaster).length;
    const currency = activeSubscription?.currency || 'INR';
    const amount = activeSubscription?.amount || 0;
    const isManualBilling = activeSubscription?.billingMode === 'manual';
    const prepaidCapacity = Number(activeSubscription?.quantity || 1);
    const hasManualCapacity = !isManualBilling || prepaidCapacity > activeStoresList.length;
    const needsCheckoutBeforeOutlet = Boolean(
        !isManualBilling
        && activeSubscription?.status === 'active'
        && activeSubscription?.paymentMethod?.type === 'upi'
        && prepaidCapacity <= activeStoresList.length,
    );
    const hasBillingAccess = !FEATURE_FLAGS.ENABLE_OUTLET_BILLING || (activeSubscription?.status === 'active' && hasManualCapacity && !needsCheckoutBeforeOutlet);

    const handleSwitchStore = async (storeId: number) => {
        const target = storesList.find((store: any) => Number(store.storeId) === Number(storeId));
        if ((target as any)?.active === false) {
            Toast.show({ content: t('inactiveStore'), duration: 1500 });
            return;
        }
        try {
            if (Number(storeId) === Number(storeDetails?.storeId)) {
                const masterStoreId = Number(masterStoreSummary?.storeId || storeDetails?.storeId || 0);
                if (masterStoreId) await refreshFirebaseAuthClaims(masterStoreId);
                setActiveStoreContext(null);
                return;
            }
            const res = await fetch('/api/auth/switch-store', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId: storeId }),
            });
            await readAuthAccountResponse(res, 'switch_store');
            await refreshFirebaseAuthClaims(storeId);
            setActiveStoreContext(storeId);
            Toast.show({ content: t('switchedStore'), duration: 1500 });
        } catch (error) {
            logMultiOutletFailure('mobile_location_store_switch_failed', error, buildMobileLocationLogContext('switch_store', {
                returningToMaster: Number(storeId) === Number(storeDetails?.storeId),
                ...getBoundedMultiOutletStringContext('targetStoreId', storeId),
            }));
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
                ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletStoreId }),
            });
            if (!res.ok) {
                const deactivateError = createMultiOutletStatusError('mobile_location_deactivate_rejected', res.status);
                logMultiOutletFailure('mobile_location_deactivate_failed', deactivateError, buildMobileLocationLogContext('deactivate_outlet', {
                    ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                }));
                Toast.show({ content: t('failedToDeactivate'), duration: 2000 });
                return;
            }
            const data = await readMobileOutletActionResponse(res, buildMobileLocationLogContext('deactivate_outlet', {
                ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
            }));
            if (!isOutletDeactivateResponse(data)) {
                const invalidResponseError = createMultiOutletStatusError('mobile_location_deactivate_response_invalid', res.status);
                logMultiOutletFailure('mobile_location_deactivate_response_invalid', invalidResponseError, buildMobileLocationLogContext('deactivate_outlet', {
                    responseOk: res.ok,
                    responseStatus: res.status,
                    ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
                }));
                throw invalidResponseError;
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
        } catch (error) {
            logMultiOutletFailure('mobile_location_deactivate_failed', error, buildMobileLocationLogContext('deactivate_outlet', {
                ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
            }));
            Toast.show({ content: t('failedToDeactivate'), duration: 2000 });
        } finally {
            setDeactivatingStoreId(null);
        }
    };

    const handleOpenRenameOutlet = (store: any) => {
        setRenameTarget(store);
        setRenameName(store?.name || '');
        setRenameSlug('');
        setIsRenaming(false);
    };

    const handleCloseRenameOutlet = () => {
        if (isRenaming) return;
        setRenameTarget(null);
        setRenameName('');
        setRenameSlug('');
    };

    const handleRenameOutlet = async () => {
        if (!renameTarget?.storeId || !renameSlugChanged) return;
        setIsRenaming(true);
        try {
            const res = await fetch('/api/outlets/rename', {
                ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                body: JSON.stringify({
                    newOutletName: renameName.trim() || undefined,
                    newOutletSlug: proposedRenameSlug,
                    outletStoreId: renameTarget.storeId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            if (!res.ok) {
                const renameError = createMultiOutletStatusError('mobile_location_rename_rejected', res.status);
                logMultiOutletFailure('mobile_location_rename_failed', renameError, buildMobileLocationLogContext('rename_outlet', {
                    ...getBoundedMultiOutletStringContext('outletStoreId', renameTarget.storeId),
                    ...getBoundedMultiOutletStringContext('proposedSlug', proposedRenameSlug),
                }));
                Toast.show({ content: 'Rename failed', duration: 2200 });
                return;
            }
            const data = await readMobileOutletActionResponse(res, buildMobileLocationLogContext('rename_outlet', {
                ...getBoundedMultiOutletStringContext('outletStoreId', renameTarget.storeId),
                ...getBoundedMultiOutletStringContext('proposedSlug', proposedRenameSlug),
            }));
            if (!isOutletRenameResponse(data)) {
                const invalidResponseError = createMultiOutletStatusError('mobile_location_rename_response_invalid', res.status);
                logMultiOutletFailure('mobile_location_rename_response_invalid', invalidResponseError, buildMobileLocationLogContext('rename_outlet', {
                    responseOk: res.ok,
                    responseStatus: res.status,
                    ...getBoundedMultiOutletStringContext('outletStoreId', renameTarget.storeId),
                    ...getBoundedMultiOutletStringContext('proposedSlug', proposedRenameSlug),
                }));
                throw invalidResponseError;
            }

            const outletStoreId = data.outletStoreId;
            const outletSlug = data.outletSlug;
            const nextName = renameName.trim() || renameTarget.name;
            setTenantDetails((previous: any) => previous?.storesList
                ? {
                    ...previous,
                    storesList: previous.storesList.map((store: any) => (
                        Number(store.storeId) === Number(outletStoreId)
                            ? {
                                ...store,
                                ...(nextName ? { name: nextName } : {}),
                                outletSlug,
                                previousOutletSlugs: data.previousOutletSlugs,
                                storeDetails: store.storeDetails
                                    ? {
                                        ...store.storeDetails,
                                        ...(nextName ? { name: nextName } : {}),
                                        outletSlug,
                                        previousOutletSlugs: data.previousOutletSlugs,
                                    }
                                    : store.storeDetails,
                            }
                            : store
                    )),
                }
                : previous);
            Toast.show({ content: `Outlet renamed to /${outletSlug}`, duration: 1800 });
            setRenameTarget(null);
            setRenameName('');
            setRenameSlug('');
        } catch (error) {
            logMultiOutletFailure('mobile_location_rename_failed', error, buildMobileLocationLogContext('rename_outlet', {
                ...getBoundedMultiOutletStringContext('outletStoreId', renameTarget.storeId),
                ...getBoundedMultiOutletStringContext('proposedSlug', proposedRenameSlug),
            }));
            Toast.show({ content: 'Rename failed. Try again.', duration: 2200 });
        } finally {
            setIsRenaming(false);
        }
    };

    const handleCreateOutlet = async () => {
        if (!outletName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/outlets/create', {
                ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outletName: outletName.trim() }),
            });
            const data = await readMobileOutletActionResponse(res, buildMobileLocationLogContext('create_outlet', {
                ...getBoundedMultiOutletStringContext('outletName', outletName),
            }));
            if (!res.ok) {
                const needsBillingAction = isOutletPaymentRequiredResponse(data);
                const createError = createMultiOutletStatusError(
                    'mobile_location_create_rejected',
                    res.status,
                    needsBillingAction ? OUTLET_LOCATION_PAYMENT_REQUIRED_CODE : undefined,
                );
                logMultiOutletFailure('mobile_location_create_failed', createError, buildMobileLocationLogContext('create_outlet', {
                    needsBillingAction,
                    ...getBoundedMultiOutletStringContext('outletName', outletName),
                }));
                Toast.show({
                    content: needsBillingAction ? 'Add one paid location from Billing, then come back.' : t('failedToCreate'),
                    duration: needsBillingAction ? 3500 : 2000,
                });
                return;
            }
            if (!isOutletCreateResponse(data)) {
                const invalidResponseError = createMultiOutletStatusError('mobile_location_create_response_invalid', res.status);
                logMultiOutletFailure('mobile_location_create_response_invalid', invalidResponseError, buildMobileLocationLogContext('create_outlet', {
                    responseOk: res.ok,
                    responseStatus: res.status,
                    ...getBoundedMultiOutletStringContext('outletName', outletName),
                }));
                throw invalidResponseError;
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
        } catch (error) {
            logMultiOutletFailure('mobile_location_create_failed', error, buildMobileLocationLogContext('create_outlet', {
                ...getBoundedMultiOutletStringContext('outletName', outletName),
            }));
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

    const handleClosePolicy = async () => {
        if (isSavingPolicy) return;
        if (hasPolicyChanges) {
            const confirmed = await Dialog.confirm({
                cancelText: t('cancel'),
                confirmText: 'Discard',
                content: 'Your outlet policy changes have not been saved.',
                title: 'Discard changes?',
            });
            if (!confirmed) return;
            setDraftPolicy(policy);
        }
        setShowPolicy(false);
    };

    const handleSavePolicy = async () => {
        if (!policyStoreId) return;
        if (!hasPolicyChanges) {
            Toast.show({ content: t('noChangesToSave'), duration: 1200 });
            return;
        }

        setIsSavingPolicy(true);
        try {
            const result = await updateOutletPolicy(policyStoreId, changedPolicy);
            const nextPolicy = result?.outletPolicy || { ...policy, ...changedPolicy };
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
        } catch (error) {
            logMultiOutletFailure('mobile_location_policy_update_failed', error, buildMobileLocationLogContext('update_policy', {
                changedPolicyCount: Object.keys(changedPolicy).length,
                ...getBoundedMultiOutletStringContext('policyStoreId', policyStoreId),
            }));
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
                            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
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
                                prefix={store.isMaster ? <LuStar color={token.colorWarning} size={18} /> : <LuMapPin color={token.colorInfo} size={18} />}
                                extra={
                                    store.isMaster ? (
                                        <Flex align="center" gap={6}>
                                            <Tag color="warning">HQ</Tag>
                                            {Number(store.storeId) === Number(storeDetails?.storeId) ? <Tag color="processing">Current</Tag> : null}
                                        </Flex>
                                    ) : store.active === false ? (
                                        <Tag>{t('inactive')}</Tag>
                                    ) : (
                                        <Flex align="center" gap={6} justify="end" wrap="wrap">
                                            <Tag>View</Tag>
                                            {Number(store.storeId) === Number(storeDetails?.storeId) ? <Tag color="processing">Current</Tag> : null}
                                            <Button
                                                fill="outline"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenRenameOutlet(store);
                                                }}
                                                size="mini"
                                                style={{ minHeight: 44 }}
                                            >
                                                <Flex align="center" gap={4}>
                                                    <LuPencil size={13} />
                                                    <Text>Rename</Text>
                                                </Flex>
                                            </Button>
                                            <Button
                                                color="danger"
                                                fill="outline"
                                                loading={deactivatingStoreId === Number(store.storeId)}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleDeactivateOutlet(store);
                                                }}
                                                size="mini"
                                                style={{ minHeight: 44 }}
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
                                    <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
                                        <Flex gap={4} vertical>
                                            <Text>{`${t('proratedCharge')} ${formatCurrency(proration.proratedAmount, currency)}`}</Text>
                                            <Text type="secondary">{t('daysLeftInCycle', { days: proration.daysRemaining })}</Text>
                                        </Flex>
                                    </Card>
                                );
                            })()
                        ) : null}

                        {FEATURE_FLAGS.ENABLE_OUTLET_BILLING && !activeSubscription ? (
                            <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                                <Text>Choose an active plan before adding another location.</Text>
                            </Card>
                        ) : null}

                        {isManualBilling ? (
                            <Card size="small" style={{ backgroundColor: hasManualCapacity ? token.colorSuccessBg : token.colorWarningBg }}>
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

                        {needsCheckoutBeforeOutlet ? (
                            <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                                <Flex gap={8} vertical>
                                    <Flex align="center" gap={8}>
                                        <LuCreditCard color={token.colorWarning} size={16} />
                                        <Text strong>Paid location needed</Text>
                                    </Flex>
                                    <Text type="secondary">
                                        This payment method needs a fresh checkout before another location can be added.
                                    </Text>
                                    {onOpenBilling ? (
                                        <Button block color="primary" fill="outline" onClick={onOpenBilling} size="large">
                                            Open Billing
                                        </Button>
                                    ) : null}
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
                bodyStyle={{ maxHeight: '74vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={isRenaming ? undefined : handleCloseRenameOutlet}
                position="bottom"
                visible={Boolean(renameTarget)}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={handleCloseRenameOutlet}>
                        Rename outlet URL
                    </NavBar>

                    <Flex gap={14} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
                            <Flex gap={4} vertical>
                                <Text strong>Old URLs keep working</Text>
                                <Text type="secondary">
                                    Printed QRs and shared links for /{renameTarget?.outletSlug || '...'} redirect for 12 months. The redirect chain keeps the latest 5 old URLs.
                                </Text>
                            </Flex>
                        </Card>

                        <Flex gap={6} vertical>
                            <Text strong>New outlet name</Text>
                            <Text type="secondary">Used in breadcrumbs, the official page, and owner screens.</Text>
                            <Input
                                disabled={isRenaming}
                                maxLength={200}
                                onChange={setRenameName}
                                placeholder="e.g. Pune Central"
                                value={renameName}
                            />
                        </Flex>

                        <Flex gap={6} vertical>
                            <Text strong>New outlet URL segment</Text>
                            <Text type="secondary">Leave blank to derive it from the name.</Text>
                            <Input
                                disabled={isRenaming}
                                maxLength={60}
                                onChange={setRenameSlug}
                                placeholder={renameTarget?.outletSlug || 'pune-central'}
                                value={renameSlug}
                            />
                            {proposedRenameSlug ? (
                                <Text type="secondary">New outlet URL will be /{proposedRenameSlug}</Text>
                            ) : null}
                        </Flex>

                        <Flex gap={12}>
                            <Button block disabled={isRenaming} fill="outline" onClick={handleCloseRenameOutlet} size="large">
                                {t('cancel')}
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!renameSlugChanged || !renameTarget?.storeId}
                                loading={isRenaming}
                                onClick={() => void handleRenameOutlet()}
                                size="large"
                            >
                                Rename outlet
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ height: '90vh', maxHeight: '90vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={isSavingPolicy ? undefined : () => void handleClosePolicy()}
                position="bottom"
                visible={showPolicy}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        backIcon={<LuX size={20} />}
                        onBack={() => void handleClosePolicy()}
                    >
                        {t('outletPolicy')}
                    </NavBar>

                    <Flex gap={12} style={{ flex: 1, overflowY: 'auto', padding: 12 }} vertical>
                        <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                            <Flex gap={10}>
                                <LuShieldCheck color={token.colorPrimary} size={20} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                <Flex gap={4} vertical>
                                    <Text strong>Rules for every outlet</Text>
                                    <Text type="secondary">
                                        {t('policyHelp')} Staff roles still apply, and blocked rules are also checked when data is saved.
                                    </Text>
                                </Flex>
                            </Flex>
                        </Card>

                        {hasPolicyChanges ? (
                            <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                                <Text>
                                    {policyChangeCount} unsaved change{policyChangeCount === 1 ? '' : 's'}
                                </Text>
                            </Card>
                        ) : null}

                        <Flex gap={16} vertical>
                            {OUTLET_POLICY_CATEGORIES.map((category, index) => (
                                <Card
                                    key={`${category.label}-${index}`}
                                    size="small"
                                    title={<Text strong>{category.label}</Text>}
                                >
                                    <Flex gap={10} vertical>
                                        <Text type="secondary">{category.description}</Text>
                                        <List>
                                            {category.items.map((item) => (
                                                <List.Item
                                                    key={item.key}
                                                    extra={
                                                        <Flex align="center" gap={8}>
                                                            <Tag color={draftPolicy[item.key] ? 'success' : 'default'}>
                                                                {draftPolicy[item.key] ? 'Allowed' : 'Blocked'}
                                                            </Tag>
                                                            <Switch
                                                                checked={draftPolicy[item.key]}
                                                                disabled={isSavingPolicy}
                                                                onChange={(checked) => handleTogglePolicy(item.key, checked)}
                                                            />
                                                        </Flex>
                                                    }
                                                    title={
                                                        <Flex gap={3} vertical>
                                                            <Text strong>{item.label}</Text>
                                                            <Text style={{ fontSize: 12, lineHeight: 1.35 }} type="secondary">
                                                                {item.description}
                                                            </Text>
                                                        </Flex>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>

                        <Flex
                            gap={12}
                            style={{
                                backdropFilter: 'blur(10px)',
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
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
                                Undo changes
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!hasPolicyChanges || isSavingPolicy}
                                loading={isSavingPolicy}
                                onClick={() => void handleSavePolicy()}
                                size="large"
                            >
                                Save rules
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
