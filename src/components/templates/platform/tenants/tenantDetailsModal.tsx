'use client'
import DrawerElement from '@antdComponent/drawerElement';
import ImageUploadInput from '@atoms/imageUploadInput';
import Saperator from '@atoms/Saperator';
import { BUSINESS_TYPES } from '@data/shared/businessTypes';
import { ECOMSAI_PLATFORM_TENANT_ID } from '@constant/user';
import { getStoreById } from '@database/stores';
import { addTenant, assertTenantUpdateSucceeded, updateTenant } from '@database/tenants';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { UserUploadedFileType } from '@type/common';
import { MinimalStoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { getFormatedDateAndTime } from '@util/dateTime';
import { getObjectDifferance } from '@util/deepMerge';
import { removeObjRef } from '@util/utils';
import { Button, Divider, Flex, Input, message, Select, Switch, Tag, Typography } from 'antd'; // Import Ant Design components
import { useFormatter } from 'next-intl';
import { Fragment, memo, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LuPlus, LuTrash, LuUpload, LuUploadCloud, LuX } from 'react-icons/lu';
import { TbEdit, TbMail, TbPhoneCall } from 'react-icons/tb';
import type { PlatformCounterSnapshot } from '@lib/platform/platformCounterAllocator';
import type { PlatformStoreModalState } from '../stores/storeDetailsModal';
import type { PlatformTenantModalState } from '.';
const { Text } = Typography

const createEmptyTenantDraft = (): TenantDataType => ({
    active: true,
    deleted: false,
    email: '',
    name: '',
    storesList: [],
    tenantKey: '',
});

const createEmptySelectedFile = (): UserUploadedFileType => ({
    name: '',
    size: 0,
    type: '',
});

type TenantDetailsModalProps = {
    modalData: PlatformTenantModalState;
    closeModal: (updatedTenant?: TenantDataType) => void;
    platformSummary: PlatformCounterSnapshot | null;
    setStoreModal: Dispatch<SetStateAction<PlatformStoreModalState>>;
};

type TenantMutationDraft = Partial<TenantDataType> & {
    imageToUpdate?: string;
    imageType?: string | null;
};

function TenantDetailsModal({ modalData, closeModal, platformSummary: _platformSummary, setStoreModal }: TenantDetailsModalProps) {

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<UserUploadedFileType>(
        createEmptySelectedFile,
    );
    const [tenantData, setTenantData] = useState<TenantDataType | null>(null);
    const [mutationInFlight, setMutationInFlight] = useState(false);
    const mutationInFlightRef = useRef(false);
    const scopeKey = `${modalData.active ? 'open' : 'closed'}:${String(modalData.data?.tenantId ?? 'new')}`;
    const scopeKeyRef = useRef(scopeKey);
    const format = useFormatter();

    useEffect(() => {
        scopeKeyRef.current = scopeKey;
        setSelectedFile(createEmptySelectedFile());
        if (modalData.active) {
            setTenantData(modalData.data ? removeObjRef(modalData.data) : createEmptyTenantDraft())
        } else {
            setTenantData(null)
        }
    }, [modalData, scopeKey])

    const closeDrawer = (updated?: TenantDataType) => {
        closeModal(updated)
        setSelectedFile(createEmptySelectedFile())
    }

    const addUpdateTenantDetails = async (updatedTenant: TenantDataType) => {
        if (mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        setMutationInFlight(true);
        let updatedChanges: TenantMutationDraft = { ...updatedTenant };

        try {
            if (updatedTenant.tenantId || updatedTenant.tenantId == ECOMSAI_PLATFORM_TENANT_ID) {
                updatedChanges = getObjectDifferance(updatedTenant, modalData.data);
                if (selectedFile.url) {
                    updatedChanges.imageToUpdate = selectedFile.url
                    updatedChanges.imageType = selectedFile.type
                }
                if (Object.keys(updatedChanges).length > 0) {
                    updatedChanges.tenantId = updatedTenant.tenantId;
                    delete updatedChanges.storesList;
                    if ('name' in updatedChanges) {
                        if (typeof updatedChanges.name !== 'string') {
                            throw new Error('platform_tenant_name_invalid');
                        }
                        updatedChanges.tenantKey = updatedChanges.name.toLowerCase().replaceAll(" ", "_");
                    }
                    const savedTenantDetails = await updateTenant({
                        ...updatedChanges,
                        tenantId: updatedTenant.tenantId,
                    });
                    assertTenantUpdateSucceeded(
                        savedTenantDetails,
                        updatedTenant.tenantId,
                        'platform_tenant_update_rejected',
                    );
                    closeDrawer({
                        ...updatedTenant,
                        ...(typeof savedTenantDetails.logo === 'string' ? { logo: savedTenantDetails.logo } : {}),
                    })
                } else {
                    closeDrawer(updatedTenant);
                }
            } else {

                if (selectedFile.url) {
                    updatedChanges.imageToUpdate = selectedFile.url
                    updatedChanges.imageType = selectedFile.type
                }
                updatedChanges.tenantKey = updatedTenant.name.toLowerCase().replaceAll(" ", "_");
                const savedTenantDetails = await addTenant(updatedChanges);
                assertTenantUpdateSucceeded(
                    savedTenantDetails,
                    savedTenantDetails.tenantId,
                    'platform_tenant_create_rejected',
                );
                const savedTenantId = Number(savedTenantDetails.tenantId ?? savedTenantDetails.id);
                if (!Number.isSafeInteger(savedTenantId) || savedTenantId < 0) {
                    throw new Error('platform_tenant_create_rejected');
                }
                const savedTenantRecord: Record<string, unknown> = savedTenantDetails;
                closeDrawer({
                    ...updatedTenant,
                    ...(typeof savedTenantRecord.logo === 'string' ? { logo: savedTenantRecord.logo } : {}),
                    storesList: [],
                    tenantId: savedTenantId,
                })
            }
        } catch (error) {
            logRuntimeFailure('platform_tenant_save_failed', error);
            message.error('Failed to save tenant');
        } finally {
            mutationInFlightRef.current = false;
            setMutationInFlight(false);
        }
    }

    const handleFileChange = async (nextSelectedFile: UserUploadedFileType) => {
        if (scopeKeyRef.current !== scopeKey) return;
        setSelectedFile(nextSelectedFile)
    };

    const onChangeValue = <Key extends keyof TenantDataType>(
        from: Key,
        value: TenantDataType[Key],
    ) => {
        if (!tenantData) return
        const tenantCopy = removeObjRef(tenantData)
        tenantCopy[from] = value
        setTenantData(tenantCopy)
    }

    const onClickStore = async (store: MinimalStoreDataType) => {
        const requestScopeKey = scopeKey;
        try {
            const storeDetails = await getStoreById(store.storeId);
            if (
                scopeKeyRef.current !== requestScopeKey
                || !tenantData
                || !storeDetails
                || storeDetails.tenantId !== tenantData.tenantId
            ) return;
            setStoreModal({ active: true, data: storeDetails, tenantData })
        } catch (error) {
            logRuntimeFailure('platform_tenant_store_load_failed', error, {
                storeId: store.storeId,
            });
            message.error('Failed to load store');
        }
    }

    const resolveStoreName = (store: MinimalStoreDataType) => {
        return getStoreContextName(store, `Store ${store?.storeId ?? ''}`);
    }

    const isUpdateFlow = (Boolean(tenantData?.tenantId) || tenantData?.tenantId == ECOMSAI_PLATFORM_TENANT_ID);

    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            <DrawerElement
                title={isUpdateFlow ? `Update Tenant` : 'Add Tenant · ID assigned safely when saved'}
                open={Boolean(modalData.active)}
                onClose={() => closeDrawer()}
                footerActions={[
                    <Button type="default" disabled={mutationInFlight} onClick={() => closeDrawer()} icon={<LuX />} key="Cancel">Cancel</Button>,
                    <>{isUpdateFlow && tenantData && <Button disabled={mutationInFlight} type="default" icon={<LuTrash />} danger onClick={() => addUpdateTenantDetails({ ...tenantData, deleted: true })} key="Delete">Delete</Button>}</>,
                    <>{isUpdateFlow && tenantData && <Button disabled={mutationInFlight} type="primary" ghost icon={<LuPlus />} key="Store" onClick={() => setStoreModal({ active: true, data: null, tenantData })}>Add Store</Button>}</>,
                    <Button
                        type="primary"
                        icon={<LuUploadCloud />}
                        disabled={!tenantData || mutationInFlight}
                        onClick={() => {
                            if (tenantData) void addUpdateTenantDetails(tenantData);
                        }}
                        key="Update"
                    >
                        {isUpdateFlow ? "Update" : "Add"}
                    </Button>,
                ]}
                width={450}
            >
                <Flex vertical gap={20}>

                    <Flex onClick={() => fileInputRef.current?.click()}>
                        <Text style={{ minWidth: 150 }}>Logo</Text>
                        {selectedFile.url ? <img alt="Selected tenant logo preview" src={selectedFile.url} style={{ width: "auto", height: 100 }} /> :
                            <>
                                {tenantData?.logo ? <img alt={`${tenantData?.name || 'Tenant'} logo`} src={tenantData?.logo} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <>
                                    <Button icon={<LuUpload />}>Upload Logo</Button>
                                </>}
                            </>}
                    </Flex>

                    {isUpdateFlow && <Flex>
                        <Text style={{ minWidth: 150 }}>Tenant Id</Text>
                        <Text>{tenantData?.tenantId}</Text>
                    </Flex>}

                    {tenantData?.createdBy && tenantData.createdOn && <Flex>
                        <Text style={{ minWidth: 150 }}>Created By</Text>
                        <Text>{tenantData.createdBy}, <br /> {getFormatedDateAndTime(format, tenantData.createdOn)}</Text>
                    </Flex>}
                    <Saperator />

                    <Flex wrap='wrap' gap={10}>
                        {/* <Flex>
                            <Text style={{ minWidth: 150 }}>Verified</Text>
                            <Switch
                                defaultChecked={tenantData?.verified || false}
                                value={tenantData?.verified || false}
                                onChange={() => onChangeValue('verified', !Boolean(tenantData?.verified))}
                            />
                        </Flex> */}

                        <Flex>
                            <Text style={{ minWidth: 150 }}>Active</Text>
                            <Switch
                                defaultChecked={tenantData?.active || false}
                                value={tenantData?.active || false}
                                onChange={() => onChangeValue('active', !Boolean(tenantData?.active))}
                            />
                        </Flex>

                        <Flex align="center" gap={10}>
                            <Text style={{ minWidth: 150 }}>Blocked</Text>
                            {tenantData?.blocked ? <Tag color="error">Blocked</Tag> : <Tag color="green">Not Blocked</Tag>}
                            <Text type="secondary">Use Platform Settings → Entity Blocks to change this with an audit reason.</Text>
                        </Flex>
                    </Flex>

                    <Divider>Basic Details</Divider>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Name</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant name" value={tenantData?.name || ""} onChange={(e) => onChangeValue('name', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Number</Text>
                        <Input prefix={<TbPhoneCall />} placeholder="Tenant phoneNumber" value={tenantData?.phoneNumber || ""} onChange={(e) => onChangeValue('phoneNumber', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Alternate Number</Text>
                        <Input prefix={<TbPhoneCall />} placeholder="Tenant alternatePhoneNumber" value={tenantData?.alternatePhoneNumber || ""} onChange={(e) => onChangeValue('alternatePhoneNumber', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Email</Text>
                        <Input type='email' prefix={<TbMail />} placeholder="Tenant email" value={tenantData?.email || ""} onChange={(e) => onChangeValue('email', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Description</Text>
                        <Input.TextArea placeholder="Tenant description" value={tenantData?.description || ""} onChange={(e) => onChangeValue('description', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>GSTN</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant gstn" value={tenantData?.gstn || ""} onChange={(e) => onChangeValue('gstn', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Tenant Key</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant tenantKey" value={tenantData?.tenantKey || ""} onChange={(e) => onChangeValue('tenantKey', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Domain</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant domain" value={tenantData?.domain || ""} onChange={(e) => onChangeValue('domain', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Sub Domain</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant subDomain" value={tenantData?.subDomain || ""} onChange={(e) => onChangeValue('subDomain', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>URL</Text>
                        <Input prefix={<TbEdit />} placeholder="Tenant url" value={tenantData?.url || ""} onChange={(e) => onChangeValue('url', e.target.value)} />
                    </Flex>

                    <Divider>Licence Details</Divider>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Key</Text>
                        <Input placeholder="Licence Key" value={tenantData?.licenceKey || ""} onChange={(e) => onChangeValue('licenceKey', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Expiry Date</Text>
                        <Input placeholder="Expiry Date" value={tenantData?.licenceExpiryDate || ""} onChange={(e) => onChangeValue('licenceExpiryDate', e.target.value)} />
                    </Flex>

                    <Divider>Address</Divider>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Address Line</Text>
                        <Input placeholder="Address Line" value={tenantData?.addressLine || ""} onChange={(e) => onChangeValue('addressLine', e.target.value)} />
                    </Flex>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Area</Text>
                        <Input placeholder="Area" value={tenantData?.area || ""} onChange={(e) => onChangeValue('area', e.target.value)} />
                    </Flex>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>City</Text>
                        <Input placeholder="City" value={tenantData?.city || ""} onChange={(e) => onChangeValue('city', e.target.value)} />
                    </Flex>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>State</Text>
                        <Input placeholder="State" value={tenantData?.state || ""} onChange={(e) => onChangeValue('state', e.target.value)} />
                    </Flex>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Pincode</Text>
                        <Input placeholder="Pincode" value={tenantData?.postalCode || ""} onChange={(e) => onChangeValue('postalCode', e.target.value)} />
                    </Flex>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Country</Text>
                        <Input placeholder="Country" value={tenantData?.country || ""} onChange={(e) => onChangeValue('country', e.target.value)} />
                    </Flex>

                    <Divider>Locale Details</Divider>
                    <Flex>
                        <Text style={{ minWidth: 150 }}>Business Type</Text>
                        <Select
                            defaultValue={tenantData?.businessType || ""}
                            value={tenantData?.businessType || ""}
                            style={{ width: "100%" }}
                            placeholder="Select Business Type"
                            onChange={(value) => onChangeValue('businessType', value)}
                            options={BUSINESS_TYPES}
                        />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Language</Text>
                        <Input placeholder="Preferred Language" value={tenantData?.language || ""} onChange={(e) => onChangeValue('language', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Country Code</Text>
                        <Input placeholder="Country Code" value={tenantData?.countryCode || ""} onChange={(e) => onChangeValue('countryCode', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Currency Symbol</Text>
                        <Input placeholder="Currency Symbol" value={tenantData?.currencySymbol || ""} onChange={(e) => onChangeValue('currencySymbol', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Currency Code</Text>
                        <Input placeholder="Currency Code" value={tenantData?.currencyCode || ""} onChange={(e) => onChangeValue('currencyCode', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Time Zone</Text>
                        <Input placeholder="Time Zone" value={tenantData?.timeZone || ""} onChange={(e) => onChangeValue('timeZone', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Date Format</Text>
                        <Input placeholder="Date Format" value={tenantData?.dateFormat || ""} onChange={(e) => onChangeValue('dateFormat', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Time Format</Text>
                        <Input placeholder="Time Format" value={tenantData?.timeFormat || ""} onChange={(e) => onChangeValue('timeFormat', e.target.value)} />
                    </Flex>

                    <Divider>Contact Person Details</Divider>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Name</Text>
                        <Input placeholder="Contact Person Name" value={tenantData?.contactPersonName || ""} onChange={(e) => onChangeValue('contactPersonName', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Number</Text>
                        <Input placeholder="Contact Person Number" value={tenantData?.contactPersonNumber || ""} onChange={(e) => onChangeValue('contactPersonNumber', e.target.value)} />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Email</Text>
                        <Input placeholder="Contact Person Email" value={tenantData?.contactPersonEmail || ""} onChange={(e) => onChangeValue('contactPersonEmail', e.target.value)} />
                    </Flex>

                    {tenantData?.storesList?.length && <Flex vertical gap={10}>
                        <Text style={{ minWidth: "100%" }}>Stores List</Text>
                        {tenantData?.storesList?.map((storeDetails) => {
                            return <Fragment key={storeDetails.storeId}>
                                <Button size='large' onClick={() => onClickStore(storeDetails)} >
                                    Id: {storeDetails.storeId}, Name: {resolveStoreName(storeDetails)}
                                </Button>
                            </Fragment>
                        })}
                    </Flex>}

                    {modalData.active && <ImageUploadInput key={scopeKey} onUploadFile={handleFileChange} fileInputRef={fileInputRef} />}
                </Flex>
            </DrawerElement>
        </Flex>
    );
}

export default memo(TenantDetailsModal)
