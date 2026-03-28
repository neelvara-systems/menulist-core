'use client'
import { ECOMSAI_PLATFORM_TENANT_ID } from '@constant/user';
import { getAllStoresByTenantId } from '@database/stores';
import { getAllTenants } from '@database/tenants';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { removeObjRef } from '@util/utils';
import { Button, Card, Flex, Select, Table, Tag, Typography } from 'antd'; // Import Ant Design components
import { memo, useEffect, useState } from 'react';
import { LuImageOff, LuPlus } from 'react-icons/lu';
import StoreDetailsModal from './storeDetailsModal';

function StoresDashboard({ tenantsList, setTenantsList }) {
    const [storesList, setStoresList] = useState<StoreDataType[]>([]);
    const [storeModal, setStoreModal] = useState<{ active: boolean, data: StoreDataType | null, tenantData: any | null }>({ active: false, data: null, tenantData: null })
    const [filterTenant, setFilterTenant] = useState<number | null>(null);
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
                    console.error('Error fetching tenants:', error);
                }
            };
            fetchTenants();
        }
    }, [dispatch]);

    useEffect(() => {
        const fetchStores = async () => {
            const requestId = "stores-fetching";
            try {
                dispatch(startLoader(requestId));
                const stores = await getAllStoresByTenantId(filterTenant);
                setStoresList(stores);
                dispatch(stopLoader(requestId));
            } catch (error) {
                setStoresList([]);
                dispatch(stopLoader(requestId));
                console.error('Error fetching stores:', error);
            }
        };
        if (filterTenant || (filterTenant == ECOMSAI_PLATFORM_TENANT_ID)) {
            fetchStores();
        }
    }, [filterTenant]);

    const columns = [
        {
            title: 'ID',
            dataIndex: 'storeId',
            key: Math.random(),
        },
        {
            title: 'Tenant ID',
            dataIndex: 'tenantId',
            key: Math.random(),
        },
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: Math.random(),
            render: (_, record) => (
                <Flex align='center' justify='flex-start' gap={10}>
                    {record?.logo ? <img src={record?.logo} style={{ width: "auto", height: 50, borderRadius: 25 }} /> : <LuImageOff />}
                </Flex>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: Math.random(),
        },
        {
            title: 'Phone Number',
            dataIndex: 'phoneNumber',
            key: Math.random(),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: Math.random(),
        },
        {
            title: 'Verified',
            dataIndex: 'verified',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {record.verified ? <Tag color='green'>Verified</Tag> : <Tag color='warning'>Non Verified</Tag>}
                </>
            ),
        },
        {
            title: 'Active',
            dataIndex: 'active',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {!record.active ? <Tag color='error'>Deactivated</Tag> : <Tag color='green'>Active</Tag>}
                </>
            ),
        },
        {
            title: 'Blocked',
            dataIndex: 'bloked',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {record.bloked ? <Tag color='error'>Blocked</Tag> : <Tag color='green'>Not Blocked</Tag>}
                </>
            ),
        },
        {
            title: 'Deleted',
            dataIndex: 'deleted',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {record.deleted ? <Tag color='red'>Deleted</Tag> : <Tag color='warning'>Not deleted</Tag>}
                </>
            ),
        },
        {
            title: 'Health',
            dataIndex: 'health',
            key: Math.random(),
            render: (_, record) => {
                const health = record?.health;
                if (!health?.status) return <Tag>—</Tag>;
                const colorMap = { OK: 'green', WARNING: 'orange', FAILED: 'red' };
                return <Tag color={colorMap[health.status] || 'default'}>{health.status}</Tag>;
            },
        }
    ];

    const onCloseStoreModal = (updatedStore: StoreDataType) => {
        if (Boolean(updatedStore?.name)) {
            const tenantsCopy = removeObjRef(tenantsList)
            let tenantIndex = tenantsCopy.findIndex((u) => u.tenantId == updatedStore.tenantId)
            const tenantDetails: TenantDataType = tenantsCopy[tenantIndex];
            let tenantStoreIndex = tenantDetails.storesList.findIndex((u) => u.storeId == updatedStore.storeId)
            if (tenantStoreIndex == -1) {
                tenantDetails.storesList.push(updatedStore)
            } else {
                tenantDetails.storesList[tenantStoreIndex] = updatedStore
            }
            tenantsCopy[tenantIndex] = tenantDetails
            setTenantsList(tenantsCopy)


            const storesCopy = removeObjRef(storesList)
            let storeIndex = storesCopy.findIndex((u) => u.storeId == updatedStore.storeId)
            if (storeIndex == -1) {
                storesCopy.push(updatedStore)
            } else {
                storesCopy[storeIndex] = updatedStore
            }
            setStoresList(storesCopy)
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
                            style={{ width: 200 }}
                            placeholder="Select Tenant"
                            value={filterTenant}
                            onChange={(value) => setFilterTenant(value)}
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
                        onClick={() => setStoreModal({ active: true, data: null, tenantData: tenantsList.find(t => t.tenantId === filterTenant) })}
                    >
                        Add Store
                    </Button>
                </Flex>
            </Card>
            <Card title="Stores List">
                <Table
                    key={Math.random()}
                    dataSource={storesList}
                    columns={columns}
                    onRow={(record: StoreDataType) => ({
                        onClick: () => setStoreModal({
                            active: true,
                            data: record,
                            tenantData: tenantsList.find(t => t.tenantId === record.tenantId)
                        })
                    })}
                />
            </Card>
            <StoreDetailsModal modalData={storeModal} closeModal={onCloseStoreModal} />
        </Flex>
    );
}

export default memo(StoresDashboard)