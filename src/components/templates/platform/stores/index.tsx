'use client'
import { getAllStoresByTenantId } from '@database/stores';
import { getAllTenants } from '@database/tenants';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { Button, Card, Flex, Select, Table, Tag, Typography } from 'antd'; // Import Ant Design components
import type { TableColumnsType } from 'antd';
import { memo, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LuImageOff, LuPlus } from 'react-icons/lu';
import StoreDetailsModal, { type PlatformStoreModalState } from './storeDetailsModal';

type StoresDashboardProps = {
    tenantsList: TenantDataType[];
    setTenantsList: Dispatch<SetStateAction<TenantDataType[]>>;
};

type PlatformStoreRecord = StoreDataType & {
    bloked?: boolean;
    health?: { status?: string };
};

function StoresDashboard({ tenantsList, setTenantsList }: StoresDashboardProps) {
    const [storesList, setStoresList] = useState<PlatformStoreRecord[]>([]);
    const [storeModal, setStoreModal] = useState<PlatformStoreModalState>({ active: false, data: null, tenantData: null })
    const [filterTenant, setFilterTenant] = useState<number | null>(null);
    const storeRequestEpochRef = useRef(0);
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (!tenantsList.length) {
            const fetchTenants = async () => {
                const requestId = "tenants-fetching";
                try {
                    dispatch(startLoader(requestId));
                    const tenants = await getAllTenants();
                    setTenantsList(tenants);
                } catch (error) {
                    logRuntimeFailure('platform_stores_tenants_load_failed', error);
                } finally {
                    dispatch(stopLoader(requestId));
                }
            };
            void fetchTenants();
        }
    }, [dispatch, setTenantsList, tenantsList.length]);

    useEffect(() => {
        const requestEpoch = storeRequestEpochRef.current + 1;
        storeRequestEpochRef.current = requestEpoch;
        if (filterTenant === null) {
            setStoresList([]);
            return;
        }
        const fetchStores = async () => {
            const requestId = `stores-fetching-${filterTenant}`;
            try {
                dispatch(startLoader(requestId));
                const stores = await getAllStoresByTenantId(filterTenant);
                if (storeRequestEpochRef.current === requestEpoch) setStoresList(stores);
            } catch (error) {
                if (storeRequestEpochRef.current === requestEpoch) setStoresList([]);
                logRuntimeFailure('platform_stores_load_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', filterTenant),
                });
            } finally {
                dispatch(stopLoader(requestId));
            }
        };
        void fetchStores();
        return () => {
            if (storeRequestEpochRef.current === requestEpoch) storeRequestEpochRef.current += 1;
        };
    }, [dispatch, filterTenant]);

    const columns: TableColumnsType<PlatformStoreRecord> = [
        {
            title: 'ID',
            dataIndex: 'storeId',
            key: 'storeId',
        },
        {
            title: 'Tenant ID',
            dataIndex: 'tenantId',
            key: 'tenantId',
        },
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: 'logo',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <Flex align='center' justify='flex-start' gap={10}>
                    {record?.logo ? <img alt={`${record?.name || 'Store'} logo`} src={record?.logo} style={{ width: "auto", height: 50, borderRadius: 25 }} /> : <LuImageOff />}
                </Flex>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Phone Number',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Verified',
            dataIndex: 'verified',
            key: 'verified',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <>
                    {record.verified ? <Tag color='green'>Verified</Tag> : <Tag color='warning'>Non Verified</Tag>}
                </>
            ),
        },
        {
            title: 'Active',
            dataIndex: 'active',
            key: 'active',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <>
                    {!record.active ? <Tag color='error'>Deactivated</Tag> : <Tag color='green'>Active</Tag>}
                </>
            ),
        },
        {
            title: 'Blocked',
            dataIndex: 'blocked',
            key: 'blocked',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <>
                    {(record.blocked || record.bloked) ? <Tag color='error'>Blocked</Tag> : <Tag color='green'>Not Blocked</Tag>}
                </>
            ),
        },
        {
            title: 'Deleted',
            dataIndex: 'deleted',
            key: 'deleted',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <>
                    {record.deleted ? <Tag color='red'>Deleted</Tag> : <Tag color='warning'>Not deleted</Tag>}
                </>
            ),
        },
        {
            title: 'Health',
            dataIndex: 'health',
            key: 'health',
            render: (_: unknown, record: PlatformStoreRecord) => {
                const health = record?.health;
                if (!health?.status) return <Tag>—</Tag>;
                const colorMap: Record<string, string> = { OK: 'green', WARNING: 'orange', FAILED: 'red' };
                return <Tag color={colorMap[health.status] || 'default'}>{health.status}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: PlatformStoreRecord) => (
                <Button
                    aria-label={`Edit store ${record.name || record.storeId}`}
                    onClick={() => setStoreModal({
                        active: true,
                        data: record,
                        tenantData: tenantsList.find((tenant) => tenant.tenantId === record.tenantId) || null,
                    })}
                    type="link"
                >
                    Edit
                </Button>
            ),
        },
    ];

    const onCloseStoreModal = (updatedStore?: StoreDataType | null) => {
        if (updatedStore?.name) {
            const expectedTenantId = storeModal.tenantData?.tenantId;
            if (expectedTenantId !== updatedStore.tenantId) {
                logRuntimeFailure(
                    'platform_store_acknowledgement_scope_mismatch',
                    new Error('platform_store_acknowledgement_scope_mismatch'),
                    {
                        ...getBoundedRuntimeStringContext('expectedTenantId', expectedTenantId),
                        ...getBoundedRuntimeStringContext('receivedTenantId', updatedStore.tenantId),
                    },
                );
                setStoreModal({ active: false, data: null, tenantData: null });
                return;
            }
            setTenantsList((currentTenants) => currentTenants.map((tenant) => {
                if (tenant.tenantId !== updatedStore.tenantId) return tenant;
                const storeExists = tenant.storesList.some((store) => store.storeId === updatedStore.storeId);
                return {
                    ...tenant,
                    storesList: storeExists
                        ? tenant.storesList.map((store) => store.storeId === updatedStore.storeId ? updatedStore : store)
                        : [...tenant.storesList, updatedStore],
                };
            }));
            if (filterTenant === updatedStore.tenantId) {
                setStoresList((currentStores) => {
                    const storeExists = currentStores.some((store) => store.storeId === updatedStore.storeId);
                    return storeExists
                        ? currentStores.map((store) => store.storeId === updatedStore.storeId ? updatedStore : store)
                        : [...currentStores, updatedStore];
                });
            }
        }
        setStoreModal({ active: false, data: null, tenantData: null })
    }

    return (
        <Flex vertical gap={20} style={{ padding: '20px' }}>
            <Card>
                <Flex justify='space-between' align='center'>
                    <Flex gap={20} align="center">
                        <Typography.Text>Filter by Tenant</Typography.Text>
                        <Select
                            aria-label="Filter stores by tenant"
                            style={{ width: 200 }}
                            placeholder="Select Tenant"
                            value={filterTenant}
                            onChange={(value?: number) => setFilterTenant(value ?? null)}
                            options={tenantsList.map((t) => ({ label: t.name, value: t.tenantId }))}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                ((option?.label?.toString() ?? '')).toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Flex>
                    <Button
                        type="primary"
                        icon={<LuPlus />}
                        disabled={filterTenant === null}
                        onClick={() => setStoreModal({ active: true, data: null, tenantData: tenantsList.find(t => t.tenantId === filterTenant) || null })}
                    >
                        Add Store
                    </Button>
                </Flex>
            </Card>
            <Card title="Stores List">
                <Table
                    rowKey={(record: StoreDataType) => String(record.storeId)}
                    dataSource={storesList}
                    columns={columns}
                />
            </Card>
            <StoreDetailsModal modalData={storeModal} closeModal={onCloseStoreModal} />
        </Flex>
    );
}

export default memo(StoresDashboard)
