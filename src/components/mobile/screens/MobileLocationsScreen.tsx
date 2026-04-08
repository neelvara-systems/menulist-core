'use client'

import { FEATURE_FLAGS } from '@config/features';
import { OUTLET_POLICY_CATEGORIES } from '@config/outletPolicy';
import { updateOutletPolicy } from '@database/multiOutlet';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';
import { calculateProration } from '@util/razorpay';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMapPin, LuPlus, LuStar, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

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
        setActiveStoreContext,
        setTenantDetails,
    } = useContext(PlatformGlobalDataContext);

    const [showAddOutlet, setShowAddOutlet] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const [outletName, setOutletName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [policy, setPolicy] = useState<OutletPolicy>(storeDetails?.outletPolicy || DEFAULT_OUTLET_POLICY);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    if (!isMasterUser || !FEATURE_FLAGS.ENABLE_CHAIN_CONTROL_PANEL) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <Text type="secondary">{t('notAvailable')}</Text>
                </Flex>
            </Flex>
        );
    }

    const storesList = tenantDetails?.storesList || [];
    const outletCount = storesList.filter((store: any) => !store.isMaster).length;
    const currency = activeSubscription?.currency || 'INR';
    const amount = activeSubscription?.amount || 0;

    const handleSwitchStore = async (storeId: number) => {
        if (storeId === storeDetails?.storeId) {
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
                setActiveStoreContext(storeId);
                Toast.show({ content: t('switchedStore'), duration: 1500 });
            }
        } catch {
            Toast.show({ content: t('failedToSwitch'), duration: 2000 });
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
                const updatedStoresList = [
                    ...tenantDetails.storesList,
                    { storeId: data.storeId, name: outletName.trim(), isMaster: false },
                ];
                setTenantDetails({ ...tenantDetails, storesList: updatedStoresList });
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

    const handleTogglePolicy = async (key: keyof OutletPolicy, checked: boolean) => {
        setSavingKey(key);
        try {
            await updateOutletPolicy(storeDetails?.storeId, { [key]: checked });
            setPolicy((prev) => ({ ...prev, [key]: checked }));
            Toast.show({ content: t('policyUpdated'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack} />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />
                <Card>
                    <Flex justify="space-between">
                        <Flex gap={2} vertical>
                            <Title level={4} style={{ margin: 0 }}>
                                {storesList.length}
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
                                {`${currency} ${amount * storesList.length}`}
                            </Title>
                            <Text type="secondary">{t('perMonthTotal')}</Text>
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
                                            {store.storeId === storeDetails?.storeId ? <Tag color="processing">Current</Tag> : null}
                                        </Flex>
                                    ) : (
                                        <Flex align="center" gap={6}>
                                            <Tag>View</Tag>
                                            {store.storeId === storeDetails?.storeId ? <Tag color="processing">Current</Tag> : null}
                                        </Flex>
                                    )
                                }
                                title={<Text strong>{store.name || `Store ${store.storeId}`}</Text>}
                            />
                        ))}
                    </List>
                </Card>

                {FEATURE_FLAGS.ENABLE_OUTLET_CREATION && userPermissions?.canManageOutlets ? (
                    <Card size="small">
                        <Flex align="center" justify="space-between">
                            <Flex gap={4} vertical>
                                <Text strong>{t('addOutlet')}</Text>
                                <Text type="secondary">Add a new location under this account.</Text>
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

                {outletCount > 0 ? (
                    <Card onClick={() => setShowPolicy(true)}>
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
                            <Input
                                onChange={setOutletName}
                                placeholder={t('outletNamePlaceholder')}
                                value={outletName}
                            />
                        </Flex>

                        {FEATURE_FLAGS.ENABLE_OUTLET_PRORATION_DISPLAY && activeSubscription ? (
                            (() => {
                                const proration = calculateProration(activeSubscription);
                                return (
                                    <Card size="small" style={{ backgroundColor: '#eff6ff' }}>
                                        <Flex gap={4} vertical>
                                            <Text>{`Prorated charge today: ${currency} ${proration.proratedAmount}`}</Text>
                                            <Text type="secondary">{`${proration.daysRemaining} days left in cycle`}</Text>
                                        </Flex>
                                    </Card>
                                );
                            })()
                        ) : null}

                        <Flex gap={12}>
                            <Button block fill="outline" onClick={() => setShowAddOutlet(false)} size="large">
                                {t('cancel')}
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!outletName.trim()}
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
                onMaskClick={() => setShowPolicy(false)}
                position="bottom"
                visible={showPolicy}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowPolicy(false)}>
                        {t('outletPolicy')}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Text type="secondary">{t('chainWideRules')}</Text>

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
                                                        checked={policy[item.key]}
                                                        loading={savingKey === item.key}
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
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
