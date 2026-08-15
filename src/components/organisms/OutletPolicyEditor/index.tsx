'use client';

/**
 * OutletPolicyEditor — Chain-wide outlet policy management
 *
 * Allows master store owners to toggle the 15 OutletPolicy flags
 * that control what ALL outlet stores can do.
 *
 * Stored on: stores/{masterStoreId}.outletPolicy
 * Enforced via: applyOutletPolicy() in sessionProvider
 *
 * @see __docs__/multi-chain-permissions/multi-chain-permissions_impl.md §4
 */

import { OUTLET_POLICY_CATEGORIES } from '@config/outletPolicy';
import { updateOutletPolicy } from '@database/multiOutlet';
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from '@lib/multiOutlet/diagnostics';
import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';
import { Card, Divider, message, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { LuInfo } from 'react-icons/lu';

const { Text, Title } = Typography;

interface OutletPolicyEditorProps {
    storeId: number;
    currentPolicy?: OutletPolicy;
    onPolicyUpdate?: (policy: OutletPolicy) => void;
}

const normalizeOutletPolicy = (policy?: Partial<OutletPolicy> | null): OutletPolicy => ({
    ...DEFAULT_OUTLET_POLICY,
    ...(policy || {}),
});

export default function OutletPolicyEditor({
    storeId,
    currentPolicy,
    onPolicyUpdate,
}: OutletPolicyEditorProps) {
    const [policy, setPolicy] = useState<OutletPolicy>(normalizeOutletPolicy(currentPolicy));
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        if (currentPolicy) {
            setPolicy(normalizeOutletPolicy(currentPolicy));
        }
    }, [currentPolicy]);

    const handleToggle = useCallback(async (key: keyof OutletPolicy, checked: boolean) => {
        setSaving(key);
        const updatedPolicy = { ...policy, [key]: checked };

        try {
            await updateOutletPolicy(storeId, { [key]: checked });
            setPolicy(updatedPolicy);
            onPolicyUpdate?.(updatedPolicy);
            message.success('Outlet rules updated');
        } catch (err) {
            logMultiOutletFailure('desktop_outlet_policy_update_failed', err, {
                ...getBoundedMultiOutletStringContext('storeId', storeId),
                ...getBoundedMultiOutletStringContext('policyKey', key),
            });
            message.error('Failed to update policy');
        } finally {
            setSaving(null);
        }
    }, [policy, storeId, onPolicyUpdate]);

    return (
        <Card
            size="small"
            title={
                <Space>
                    <span>Outlet Policy</span>
                    <Tooltip title="Controls what all outlet stores can change. Staff roles still apply.">
                        <LuInfo style={{ color: '#8c8c8c', cursor: 'help' }} />
                    </Tooltip>
                </Space>
            }
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Set rules for every outlet. When a toggle is off, outlet staff cannot perform that action even if their role normally allows it.
            </Text>

            {OUTLET_POLICY_CATEGORIES.map((category, catIdx) => (
                <div key={category.label}>
                    {catIdx > 0 && <Divider style={{ margin: '16px 0' }} />}
                    <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 14 }}>
                        {category.label}
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                        {category.description}
                    </Text>

                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {category.items.map((item) => (
                            <div
                                key={item.key}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    background: '#fafafa',
                                }}
                            >
                                <div>
                                    <Space size={6}>
                                        <Text style={{ fontSize: 13 }}>{item.label}</Text>
                                        <Tag color={policy[item.key] ? 'success' : 'default'}>
                                            {policy[item.key] ? 'Allowed' : 'Blocked'}
                                        </Tag>
                                    </Space>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {item.description}
                                    </Text>
                                </div>
                                <Switch
                                    aria-label={item.label}
                                    checked={policy[item.key]}
                                    loading={saving === item.key}
                                    onChange={(checked) => handleToggle(item.key, checked)}
                                    size="small"
                                />
                            </div>
                        ))}
                    </Space>
                </div>
            ))}
        </Card>
    );
}
