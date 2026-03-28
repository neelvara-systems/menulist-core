'use client'
import { DB_COLLECTIONS } from '@constant/database';
import { getPlatformSummary } from '@database/platformSummary';
import { getAllTenants } from '@database/tenants';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { removeObjRef } from '@util/utils';
import { Button, Card, Flex, Table, Tag } from 'antd'; // Import Ant Design components
import { useEffect, useState } from 'react';
import { LuImageOff, LuPlus } from 'react-icons/lu';
import StoreDetailsModal from '../stores/storeDetailsModal';
import TenantDetailsModal from './tenantDetailsModal';

function TenantsDashboard({ tenantsList, setTenantsList }) {

    const [tenantModal, setTenantModal] = useState<{ active: boolean, data: TenantDataType | null }>({ active: false, data: null })
    const [storeModal, setStoreModal] = useState<{ active: boolean, data: StoreDataType | null, tenantData: TenantDataType | null }>({ active: false, data: null, tenantData: null })
    const [platformSummary, setPlatformSummary] = useState([])
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
        getPlatformData()
    }, [dispatch]);

    const getPlatformData = () => {
        getPlatformSummary().then((summary) => {
            setPlatformSummary(summary)
            console.log("summary", summary)
        })
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'tenantId',
            key: 'tenantId'
        },
        {
            title: 'Logo',
            dataIndex: 'logo',
            key: 'logo',
            render: (_, record) => (
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
        // {
        //     title: 'Verified',
        //     dataIndex: 'verified',
        //     key: Math.random(),
        //     render: (_, record) => (
        //         <>
        //             {record.verified ? <Tag color='green'>Verified</Tag> : <Tag color='warning'>Non Verified</Tag>}
        //         </>
        //     ),
        // },
        {
            title: 'Active',
            dataIndex: 'active',
            key: 'active',
            render: (_, record) => (
                <>
                    {!record.active ? <Tag color='error'>Deactivated</Tag> : <Tag color='green'>Active</Tag>}
                </>
            ),
        },
        {
            title: 'Blocked',
            dataIndex: 'bloked',
            key: 'blocked',
            render: (_, record) => (
                <>
                    {record.bloked ? <Tag color='error'>Blocked</Tag> : <Tag color='green'>Not Blocked</Tag>}
                </>
            ),
        },
        {
            title: 'Deleted',
            dataIndex: 'deleted',
            key: 'deleted',
            render: (_, record) => (
                <>
                    {record.deleted ? <Tag color='red'>Deleted</Tag> : <Tag color='warning'>Not deleted</Tag>}
                </>
            ),
        }
    ];

    const updateLocalPlatformSummary = (type) => {
        let platformCopy = removeObjRef(platformSummary);
        platformCopy[type].count = platformCopy[type].count + 1;
        setPlatformSummary(platformCopy)
    }

    const onCloseModal = (updatedTenant: TenantDataType) => {
        if (Boolean(updatedTenant?.name)) {
            const tenantsCopy = removeObjRef(tenantsList)
            let index = tenantsCopy.findIndex((u) => u.tenantId == updatedTenant.tenantId)
            if (index == -1) {
                tenantsCopy.push(updatedTenant)
                updateLocalPlatformSummary(DB_COLLECTIONS.TENANTS)
            } else {
                tenantsCopy[index] = updatedTenant
            }
            setTenantsList(tenantsCopy)
        }
        setTenantModal({ active: false, data: null })
    }

    const onCloseStoreModal = (updatedStore: StoreDataType) => {
        if (Boolean(updatedStore?.name)) {
            const tenantsCopy = removeObjRef(tenantsList)
            let tenantIndex = tenantsCopy.findIndex((u) => u.tenantId == updatedStore.tenantId)
            const tenantDetails: TenantDataType = tenantsCopy[tenantIndex];
            let index = tenantDetails.storesList.findIndex((u) => u.storeId == updatedStore.storeId)
            if (index == -1) {
                tenantDetails.storesList.push(updatedStore)
                updateLocalPlatformSummary(DB_COLLECTIONS.STORES)
            } else {
                tenantDetails.storesList[index] = updatedStore
            }
            tenantsCopy[tenantIndex] = tenantDetails
            setTenantModal({ active: true, data: tenantDetails })
            setTenantsList(tenantsCopy)
        }
        setStoreModal({ active: false, data: null, tenantData: null })
    }

    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            <Card title="Tenants " extra={<Button icon={<LuPlus />} type="primary" onClick={() => setTenantModal({ active: true, data: null })}>Add Tenant</Button>}>
                <Table dataSource={tenantsList} columns={columns}
                    onRow={(record) => ({
                        onClick: () => setTenantModal({ active: true, data: record }), // Handle row click
                    })} />
            </Card>
            <TenantDetailsModal modalData={tenantModal} closeModal={onCloseModal} platformSummary={platformSummary} setStoreModal={setStoreModal} />
            <StoreDetailsModal modalData={storeModal} closeModal={onCloseStoreModal} />
        </Flex>
    );
}

export default TenantsDashboard