'use client'
import { getPlatformSummary } from '@database/platformSummary';
import { getAllTenants } from '@database/tenants';
import { useAppDispatch } from '@hook/useAppDispatch';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type { PlatformCounterSnapshot } from '@lib/platform/platformCounterAllocator';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { Button, Card, Flex, Table, Tag } from 'antd'; // Import Ant Design components
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LuImageOff, LuPlus } from 'react-icons/lu';
import StoreDetailsModal, { type PlatformStoreModalState } from '../stores/storeDetailsModal';
import TenantDetailsModal from './tenantDetailsModal';

export type PlatformTenantModalState = {
    active: boolean;
    data: TenantDataType | null;
};

type TenantsDashboardProps = {
    tenantsList: TenantDataType[];
    setTenantsList: Dispatch<SetStateAction<TenantDataType[]>>;
};

type PlatformTenantRecord = TenantDataType & { bloked?: boolean };

function TenantsDashboard({ tenantsList, setTenantsList }: TenantsDashboardProps) {

    const [tenantModal, setTenantModal] = useState<PlatformTenantModalState>({ active: false, data: null })
    const [storeModal, setStoreModal] = useState<PlatformStoreModalState>({ active: false, data: null, tenantData: null })
    const [platformSummary, setPlatformSummary] = useState<PlatformCounterSnapshot | null>(null)
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (!tenantsList.length) {
            const fetchTenants = async () => {
                const requestId = "tenants-fetching";
                try {
                    dispatch(startLoader(requestId));
                    const tenants = await getAllTenants();
                    setTenantsList(tenants);
                    dispatch(stopLoader(requestId));
                } catch (error) {
                    dispatch(stopLoader(requestId));
                    logRuntimeFailure('platform_tenants_load_failed', error);
                }
            };
            void fetchTenants();
        }
        void getPlatformData()
    }, [dispatch, setTenantsList, tenantsList.length]);

    const getPlatformData = async () => {
        try {
            const summary = await getPlatformSummary();
            setPlatformSummary(summary);
        } catch (error) {
            logRuntimeFailure('platform_tenants_summary_load_failed', error);
        }
    }

    const columns: TableColumnsType<PlatformTenantRecord> = [
        {
            title: 'ID',
            dataIndex: 'tenantId',
            key: 'tenantId'
        },
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: 'logo',
            render: (_: unknown, record: PlatformTenantRecord) => (
                <Flex align='center' justify='flex-start' gap={10}>
                    {record?.logo ? <img src={record?.logo} style={{ width: "auto", height: 50, borderRadius: 25 }} alt={record.name} /> : <LuImageOff />}
                </Flex>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: 'Phone Number',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber'
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email'
        },
        {
            title: 'Active',
            dataIndex: 'active',
            key: 'active',
            render: (_: unknown, record: PlatformTenantRecord) => (
                <>
                    {!record.active ? <Tag color='error'>Deactivated</Tag> : <Tag color='green'>Active</Tag>}
                </>
            ),
        },
        {
            title: 'Blocked',
            dataIndex: 'blocked',
            key: 'blocked',
            render: (_: unknown, record: PlatformTenantRecord) => (
                <>
                    {(record.blocked || record.bloked) ? <Tag color='error'>Blocked</Tag> : <Tag color='green'>Not Blocked</Tag>}
                </>
            ),
        },
        {
            title: 'Deleted',
            dataIndex: 'deleted',
            key: 'deleted',
            render: (_: unknown, record: PlatformTenantRecord) => (
                <>
                    {record.deleted ? <Tag color='red'>Deleted</Tag> : <Tag color='warning'>Not deleted</Tag>}
                </>
            ),
        }
    ];

    const updateLocalPlatformSummary = (type: keyof PlatformCounterSnapshot, allocatedId: number) => {
        setPlatformSummary((current) => {
            const source = current || {
                stores: { count: 0 },
                tenants: { count: 0 },
            };
            return {
                ...source,
                [type]: {
                    ...source[type],
                    count: Math.max(Number(source[type].count) || 0, Number(allocatedId) || 0),
                },
            };
        });
    }

    const onCloseModal = (updatedTenant?: TenantDataType | null) => {
        if (updatedTenant?.name) {
            const exists = tenantsList.some((tenant) => tenant.tenantId === updatedTenant.tenantId);
            if (!exists && updatedTenant.tenantId !== undefined) {
                updateLocalPlatformSummary('tenants', updatedTenant.tenantId);
            }
            setTenantsList((currentTenants) => {
                const stillExists = currentTenants.some((tenant) => tenant.tenantId === updatedTenant.tenantId);
                return stillExists
                    ? currentTenants.map((tenant) => tenant.tenantId === updatedTenant.tenantId ? updatedTenant : tenant)
                    : [...currentTenants, updatedTenant];
            });
        }
        setTenantModal({ active: false, data: null })
    }

    const onCloseStoreModal = (updatedStore?: StoreDataType | null) => {
        if (updatedStore?.name) {
            const expectedTenantId = storeModal.tenantData?.tenantId;
            if (expectedTenantId !== updatedStore.tenantId) {
                logRuntimeFailure(
                    'platform_tenant_store_acknowledgement_scope_mismatch',
                    new Error('platform_tenant_store_acknowledgement_scope_mismatch'),
                );
                setStoreModal({ active: false, data: null, tenantData: null });
                return;
            }
            const currentTenant = tenantsList.find((tenant) => tenant.tenantId === updatedStore.tenantId);
            if (!currentTenant) {
                logRuntimeFailure(
                    'platform_tenant_store_acknowledgement_tenant_missing',
                    new Error('platform_tenant_store_acknowledgement_tenant_missing'),
                );
                setStoreModal({ active: false, data: null, tenantData: null });
                return;
            }
            const exists = currentTenant.storesList.some((store) => store.storeId === updatedStore.storeId);
            if (!exists) updateLocalPlatformSummary('stores', updatedStore.storeId);
            const updatedTenant: TenantDataType = {
                ...currentTenant,
                storesList: exists
                    ? currentTenant.storesList.map((store) => store.storeId === updatedStore.storeId ? updatedStore : store)
                    : [...currentTenant.storesList, updatedStore],
            };
            setTenantsList((currentTenants) => currentTenants.map((tenant) => (
                tenant.tenantId === updatedStore.tenantId ? updatedTenant : tenant
            )));
            if (updatedTenant && tenantModal.data?.tenantId === updatedStore.tenantId) {
                setTenantModal({ active: true, data: updatedTenant });
            }
        }
        setStoreModal({ active: false, data: null, tenantData: null })
    }

    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            <Card title="Tenants " extra={<Button icon={<LuPlus />} type="primary" onClick={() => setTenantModal({ active: true, data: null })}>Add Tenant</Button>}>
                <Table rowKey={(record) => String(record.tenantId ?? record.tenantKey)} dataSource={tenantsList} columns={columns}
                    onRow={(record: PlatformTenantRecord) => ({
                        onClick: () => setTenantModal({ active: true, data: record }), // Handle row click
                    })} />
            </Card>
            <TenantDetailsModal modalData={tenantModal} closeModal={onCloseModal} platformSummary={platformSummary} setStoreModal={setStoreModal} />
            <StoreDetailsModal modalData={storeModal} closeModal={onCloseStoreModal} />
        </Flex>
    );
}

export default TenantsDashboard
