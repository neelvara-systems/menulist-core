'use client'

import { FEATURE_FLAGS } from '@config/features';
import { OUTLET_POLICY_CATEGORIES } from '@config/outletPolicy';
import { updateOutletPolicy } from '@database/multiOutlet';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';
import { calculateProration } from '@util/razorpay';
import { Button, Card, Input, List, NavBar, Popup, Switch, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMapPin, LuPlus, LuStar } from 'react-icons/lu';

interface MobileLocationsScreenProps {
    onBack: () => void;
}

/**
 * Mobile Locations / Chain Control Panel — zero desktop dependency
 * 
 * Master users can: view outlets, switch stores, add outlets, manage outlet policy.
 * Uses same DAL: updateOutletPolicy, /api/outlets/create, /api/auth/switch-store
 */
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
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-gray-500">{t('notAvailable')}</p>
                </div>
            </div>
        );
    }

    const storesList = tenantDetails?.storesList || [];
    const outletCount = storesList.filter((s: any) => !s.isMaster).length;
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
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {/* Billing Summary */}
                <Card className="rounded-xl">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{storesList.length}</p>
                            <p className="text-xs text-gray-500">{t('totalStores')}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{outletCount}</p>
                            <p className="text-xs text-gray-500">{t('outlets')}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{currency} {amount * storesList.length}</p>
                            <p className="text-xs text-gray-500">{t('perMonthTotal')}</p>
                        </div>
                    </div>
                </Card>

                {/* Store List */}
                <Card style={{ padding: 0 }} className="rounded-xl">
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        {storesList.map((store: any) => (
                            <List.Item
                                key={store.storeId}
                                prefix={store.isMaster
                                    ? <LuStar size={18} className="text-yellow-500" />
                                    : <LuMapPin size={18} className="text-blue-400" />
                                }
                                onClick={() => handleSwitchStore(store.storeId)}
                                extra={store.isMaster
                                    ? <Tag color="warning" fill="outline" style={{ fontSize: 11 }}>HQ</Tag>
                                    : <Tag fill="outline" style={{ fontSize: 11 }}>View</Tag>
                                }
                                style={{ minHeight: '48px' }}
                            >
                                <span className="text-[15px] font-medium">{store.name || `Store ${store.storeId}`}</span>
                            </List.Item>
                        ))}
                    </List>
                </Card>

                {/* Add Outlet */}
                {FEATURE_FLAGS.ENABLE_OUTLET_CREATION && userPermissions?.canManageOutlets && (
                    <Button
                        block
                        color="primary"
                        fill="outline"
                        size="large"
                        onClick={() => setShowAddOutlet(true)}
                        style={{ minHeight: '44px' }}
                    >
                        <LuPlus size={16} className="inline mr-1" /> {t('addOutlet')}
                    </Button>
                )}

                {/* Outlet Policy */}
                {outletCount > 0 && (
                    <Card
                        className="rounded-xl"
                        onClick={() => setShowPolicy(true)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('outletPolicy')}</p>
                                <p className="text-xs text-gray-500">{t('outletPolicyDesc')}</p>
                            </div>
                            <Tag fill="outline" style={{ fontSize: 11 }}>{t('manage')}</Tag>
                        </div>
                    </Card>
                )}
            </div>

            {/* Add Outlet Sheet */}
            <Popup
                visible={showAddOutlet}
                onMaskClick={isCreating ? undefined : () => setShowAddOutlet(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '60vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6 space-y-4">
                    <div className="flex justify-center"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
                    <h2 className="text-lg font-semibold">{t('addNewOutlet')}</h2>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">{t('outletName')}</label>
                        <Input
                            value={outletName}
                            onChange={setOutletName}
                            placeholder={t('outletNamePlaceholder')}
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                    </div>
                    {FEATURE_FLAGS.ENABLE_OUTLET_PRORATION_DISPLAY && activeSubscription && (() => {
                        const p = calculateProration(activeSubscription);
                        return (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                                <p className="text-blue-700 dark:text-blue-300">
                                    Prorated charge today: <strong>{currency} {p.proratedAmount}</strong>
                                </p>
                                <p className="text-xs text-blue-500 mt-1">{p.daysRemaining} days left in cycle</p>
                            </div>
                        );
                    })()}
                    <div className="flex gap-3">
                        <Button block fill="outline" size="large" onClick={() => setShowAddOutlet(false)} style={{ minHeight: '44px' }}>{t('cancel')}</Button>
                        <Button block color="primary" fill="solid" size="large" loading={isCreating} disabled={!outletName.trim()} onClick={handleCreateOutlet} style={{ minHeight: '44px' }}>{t('addOutlet')}</Button>
                    </div>
                </div>
            </Popup>

            {/* Outlet Policy Sheet */}
            <Popup
                visible={showPolicy}
                onMaskClick={() => setShowPolicy(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '90vh' }}
                destroyOnClose
            >
                <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
                    <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
                        <h2 className="text-lg font-semibold">{t('outletPolicy')}</h2>
                        <p className="text-xs text-gray-500 mt-1">{t('chainWideRules')}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 pb-6">
                        {OUTLET_POLICY_CATEGORIES.map((category, catIdx) => (
                            <div key={catIdx} className="mt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    {category.label}
                                </h4>
                                <Card style={{ padding: 0 }}>
                                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                        {category.items.map((item) => (
                                            <List.Item
                                                key={item.key}
                                                extra={
                                                    <Switch
                                                        checked={policy[item.key]}
                                                        loading={savingKey === item.key}
                                                        onChange={(checked) => handleTogglePolicy(item.key, checked)}
                                                        style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                                    />
                                                }
                                                style={{ minHeight: '44px' }}
                                            >
                                                <span className="text-sm">{item.label}</span>
                                            </List.Item>
                                        ))}
                                    </List>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </Popup>
        </div>
    );
}
