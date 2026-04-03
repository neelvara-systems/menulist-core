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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>{t('notAvailable')}</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Billing Summary */}
                <Card style={{ borderRadius: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                        <div>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{storesList.length}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('totalStores')}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb' }}>{outletCount}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('outlets')}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>{currency} {amount * storesList.length}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('perMonthTotal')}</p>
                        </div>
                    </div>
                </Card>

                {/* Store List */}
                <Card style={{ padding: 0, borderRadius: '12px' }}>
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        {storesList.map((store: any) => (
                            <List.Item
                                key={store.storeId}
                                prefix={store.isMaster
                                    ? <LuStar size={18} color="#eab308" />
                                    : <LuMapPin size={18} color="#60a5fa" />
                                }
                                onClick={() => handleSwitchStore(store.storeId)}
                                extra={store.isMaster
                                    ? <Tag color="warning" fill="outline" style={{ fontSize: 11 }}>HQ</Tag>
                                    : <Tag fill="outline" style={{ fontSize: 11 }}>View</Tag>
                                }
                                style={{ minHeight: '48px' }}
                            >
                                <span style={{ fontSize: '15px', fontWeight: 500 }}>{store.name || `Store ${store.storeId}`}</span>
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
                        <LuPlus size={16} style={{ display: 'inline', marginRight: '4px' }} /> {t('addOutlet')}
                    </Button>
                )}

                {/* Outlet Policy */}
                {outletCount > 0 && (
                    <Card
                        style={{ borderRadius: '12px' }}
                        onClick={() => setShowPolicy(true)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>{t('outletPolicy')}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('outletPolicyDesc')}</p>
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
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} /></div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('addNewOutlet')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{t('outletName')}</label>
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
                            <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '12px', fontSize: '14px' }}>
                                <p style={{ color: '#1d4ed8' }}>
                                    Prorated charge today: <strong>{currency} {p.proratedAmount}</strong>
                                </p>
                                <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>{p.daysRemaining} days left in cycle</p>
                            </div>
                        );
                    })()}
                    <div style={{ display: 'flex', gap: '12px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                    <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} /></div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('outletPolicy')}</h2>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{t('chainWideRules')}</p>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
                        {OUTLET_POLICY_CATEGORIES.map((category, catIdx) => (
                            <div key={catIdx} style={{ marginTop: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
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
                                                <span style={{ fontSize: '14px' }}>{item.label}</span>
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
