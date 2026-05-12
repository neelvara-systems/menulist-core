'use client'

import { updatePlatformEntityBlockState } from '@database/platformEntityBlocks';
import { getAllStoresByTenantId } from '@database/stores';
import { getAllTenants } from '@database/tenants';
import { getUserByTenantId } from '@database/users';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import type { PlatformBlockEntityType } from '@type/platform/blocking';
import type { StoreDataType } from '@type/platform/store';
import type { TenantDataType } from '@type/platform/tenant';
import type { UserDataType } from '@type/platform/user';
import { Alert, Button, Card, Flex, Input, Modal, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuShieldCheck, LuShieldOff } from 'react-icons/lu';

const { Text, Title } = Typography;

const ENTITY_OPTIONS: Array<{ label: string; value: PlatformBlockEntityType }> = [
    { label: 'Tenant', value: 'tenant' },
    { label: 'Store', value: 'store' },
    { label: 'User', value: 'user' },
];

function getEntityId(entityType: PlatformBlockEntityType, entity: any): string | number | undefined {
    if (!entity) return undefined;
    if (entityType === 'tenant') return entity.tenantId;
    if (entityType === 'store') return entity.storeId;
    return entity.id;
}

function getBlockStatusTag(entity: any) {
    return isPlatformEntityBlocked(entity)
        ? <Tag color="error">Blocked</Tag>
        : <Tag color="green">Not blocked</Tag>;
}

export default function EntityBlockSettings() {
    const session = useClientAuthSession();
    const [entityType, setEntityType] = useState<PlatformBlockEntityType>('tenant');
    const [tenants, setTenants] = useState<TenantDataType[]>([]);
    const [stores, setStores] = useState<StoreDataType[]>([]);
    const [users, setUsers] = useState<UserDataType[]>([]);
    const [tenantId, setTenantId] = useState<number | null>(null);
    const [entityId, setEntityId] = useState<string | number | null>(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getAllTenants().then((nextTenants) => {
            setTenants(nextTenants);
        });
    }, []);

    useEffect(() => {
        setEntityId(null);
        setStores([]);
        setUsers([]);
        if (entityType === 'tenant') return;
        if (tenantId === null) return;

        if (entityType === 'store') {
            getAllStoresByTenantId(tenantId).then(setStores);
        } else {
            getUserByTenantId(String(tenantId)).then(setUsers);
        }
    }, [entityType, tenantId]);

    const entityOptions = useMemo(() => {
        if (entityType === 'tenant') {
            return tenants.map((tenant) => ({
                label: `${tenant.tenantId} - ${tenant.name || tenant.email}`,
                value: tenant.tenantId,
            }));
        }

        if (entityType === 'store') {
            return stores.map((store) => ({
                label: `${store.storeId} - ${store.name}`,
                value: store.storeId,
            }));
        }

        return users.map((user) => ({
            label: `${user.name || user.email} (${user.email})`,
            value: user.id,
        }));
    }, [entityType, stores, tenants, users]);

    const selectedEntity = useMemo(() => {
        if (entityId == null) return null;
        if (entityType === 'tenant') return tenants.find((tenant) => tenant.tenantId === entityId) || null;
        if (entityType === 'store') return stores.find((store) => store.storeId === entityId) || null;
        return users.find((user) => user.id === entityId) || null;
    }, [entityId, entityType, stores, tenants, users]);

    const blockDetails = selectedEntity?.blockDetails;
    const isBlocked = isPlatformEntityBlocked(selectedEntity);
    const nextBlockedState = !isBlocked;

    const updateLocalEntity = (updated: any) => {
        if (entityType === 'tenant') {
            setTenants((current) => current.map((tenant) => (
                tenant.tenantId === updated.tenantId ? { ...tenant, ...updated } : tenant
            )));
        } else if (entityType === 'store') {
            setStores((current) => current.map((store) => (
                store.storeId === updated.storeId ? { ...store, ...updated } : store
            )));
        } else {
            setUsers((current) => current.map((user) => (
                user.id === updated.id ? { ...user, ...updated } : user
            )));
        }
    };

    const onSubmit = () => {
        const selectedEntityId = getEntityId(entityType, selectedEntity);
        if (!selectedEntity || selectedEntityId == null) {
            message.warning('Select an entity first');
            return;
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            message.warning('Add a reason before saving');
            return;
        }

        Modal.confirm({
            title: nextBlockedState ? `Block this ${entityType}?` : `Unblock this ${entityType}?`,
            content: nextBlockedState
                ? 'This keeps the entity record, but blocks access using the dedicated blocked field.'
                : 'This removes the block and keeps the original block audit details on the entity.',
            okText: nextBlockedState ? 'Block' : 'Unblock',
            okButtonProps: { danger: nextBlockedState },
            onOk: async () => {
                setLoading(true);
                try {
                    const updated = await updatePlatformEntityBlockState({
                        actorEmail: session?.user?.email,
                        actorUserId: session?.uId || session?.user?.id,
                        blocked: nextBlockedState,
                        entity: selectedEntity,
                        entityId: selectedEntityId,
                        entityType,
                        reason: trimmedReason,
                    });
                    updateLocalEntity({
                        ...selectedEntity,
                        ...updated,
                        blocked: nextBlockedState,
                    });
                    setReason('');
                    message.success(nextBlockedState ? 'Entity blocked' : 'Entity unblocked');
                } catch (error) {
                    message.error(error instanceof Error ? error.message : 'Could not update block status');
                    throw error;
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    return (
        <Flex vertical gap={20}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Entity Blocks</Title>
                <Text type="secondary">
                    Block tenant, store, or user access without changing lifecycle fields like active or deleted.
                </Text>
            </Flex>

            <Alert
                message="Use this for platform-level access blocks only. Active, inactive, and deleted statuses keep their existing meaning."
                showIcon
                type="info"
            />

            <Card>
                <Flex vertical gap={16}>
                    <Flex gap={16} wrap="wrap">
                        <Select<PlatformBlockEntityType>
                            onChange={(value) => {
                                setEntityType(value);
                                setEntityId(null);
                            }}
                            options={ENTITY_OPTIONS}
                            style={{ minWidth: 180 }}
                            value={entityType}
                        />
                        {entityType !== 'tenant' ? (
                            <Select<number>
                                allowClear
                                onChange={(value) => setTenantId(value ?? null)}
                                options={tenants.map((tenant) => ({
                                    label: `${tenant.tenantId} - ${tenant.name || tenant.email}`,
                                    value: tenant.tenantId,
                                }))}
                                placeholder="Select tenant"
                                showSearch
                                style={{ minWidth: 260 }}
                                value={tenantId}
                                filterOption={(input, option) =>
                                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        ) : null}
                        <Select<string | number>
                            allowClear
                            disabled={entityType !== 'tenant' && tenantId == null}
                            onChange={(value) => setEntityId(value ?? null)}
                            options={entityOptions as Array<{ label: string; value: string | number }>}
                            placeholder={`Select ${entityType}`}
                            showSearch
                            style={{ minWidth: 320 }}
                            value={entityId}
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Flex>

                    {selectedEntity ? (
                        <Card size="small">
                            <Flex align="flex-start" gap={12} justify="space-between" wrap="wrap">
                                <Flex vertical gap={6}>
                                    <Space>
                                        <Text strong>{selectedEntity.name || selectedEntity.email}</Text>
                                        {getBlockStatusTag(selectedEntity)}
                                    </Space>
                                    <Text type="secondary">
                                        ID: {String(getEntityId(entityType, selectedEntity))}
                                    </Text>
                                    {blockDetails?.blockedReason || blockDetails?.reason ? (
                                        <Text type="secondary">Block reason: {blockDetails.blockedReason || blockDetails.reason}</Text>
                                    ) : null}
                                    {blockDetails?.unblockedReason ? (
                                        <Text type="secondary">Unblock reason: {blockDetails.unblockedReason}</Text>
                                    ) : null}
                                    {blockDetails?.updatedAt ? (
                                        <Text type="secondary">
                                            Last updated: {blockDetails.updatedAt}
                                            {blockDetails.updatedByEmail ? ` by ${blockDetails.updatedByEmail}` : ''}
                                        </Text>
                                    ) : null}
                                </Flex>
                                {isBlocked ? <LuShieldOff size={26} /> : <LuShieldCheck size={26} />}
                            </Flex>
                        </Card>
                    ) : null}

                    <Input.TextArea
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={isBlocked ? 'Reason for unblocking' : 'Reason for blocking'}
                        rows={4}
                        value={reason}
                    />

                    <Flex justify="flex-end">
                        <Button
                            danger={nextBlockedState}
                            disabled={!selectedEntity}
                            loading={loading}
                            onClick={onSubmit}
                            type="primary"
                        >
                            {nextBlockedState ? 'Block entity' : 'Unblock entity'}
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    );
}
