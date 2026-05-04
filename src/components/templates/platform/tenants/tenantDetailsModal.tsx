'use client'
import DrawerElement from '@antdComponent/drawerElement';
import ImageUploadInput from '@atoms/imageUploadInput';
import Saperator from '@atoms/Saperator';
import { BUSINESS_TYPES } from '@constant/common';
import { ECOMSAI_PLATFORM_TENANT_ID } from '@constant/user';
import { getStoreById } from '@database/stores';
import { addTenant, updateTenant } from '@database/tenants';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { UserUploadedFileType } from '@type/common';
import { MinimalStoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { getFormatedDateAndTime } from '@util/dateTime';
import { getObjectDifferance } from '@util/deepMerge';
import { removeObjRef } from '@util/utils';
import { Button, Divider, Flex, Input, Select, Switch, Typography } from 'antd'; // Import Ant Design components
import { useFormatter } from 'next-intl';
import { Fragment, memo, useEffect, useRef, useState } from 'react';
import { LuPlus, LuTrash, LuUpload, LuUploadCloud, LuX } from 'react-icons/lu';
import { TbEdit, TbMail, TbPhoneCall } from 'react-icons/tb';
const { Text } = Typography

function TenantDetailsModal({ modalData, closeModal, platformSummary, setStoreModal }) {

    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState<UserUploadedFileType>({ name: "", size: 0, type: "", url: null })
    const [tenantData, setTenantData] = useState<TenantDataType | null>(null);
    const format = useFormatter();

    useEffect(() => {
        if (modalData.active) {
            setTenantData(modalData.data)
        } else {
            setTenantData(null)
        }
    }, [modalData])

    const closeDrawer = (updated = null) => {
        closeModal(updated)
        setSelectedFile({ name: "", size: 0, type: "", url: null })
    }

    const addUpdateTenantDetails = (updatedTenant: TenantDataType) => {
        let updatedChanges: any = updatedTenant;

        if (updatedTenant.tenantId || updatedTenant.tenantId == ECOMSAI_PLATFORM_TENANT_ID) {
            updatedChanges = getObjectDifferance(updatedTenant, modalData.data);
            if (selectedFile.url) {
                updatedChanges.imageToUpdate = selectedFile.url
                updatedChanges.imageType = selectedFile.type
            }
            if (Object.keys(updatedChanges).length > 0) {
                console.log("Changes detected:", updatedChanges);
                updatedChanges.tenantId = updatedTenant.tenantId;
                delete updatedChanges.storesList;
                if ('name' in updatedChanges) {
                    updatedChanges.tenantKey = updatedChanges.name.toLowerCase().replaceAll(" ", "_");
                }
                updateTenant(updatedChanges).then((savedTenantDetails) => {
                    closeDrawer({ ...updatedTenant, ...savedTenantDetails })
                })

            } else {
                console.log("No changes detected.");
            }
        } else {

            if (selectedFile.url) {
                updatedChanges.imageToUpdate = selectedFile.url
                updatedChanges.imageType = selectedFile.type
            }
            updatedChanges.tenantId = platformSummary.tenants.count + 1;
            updatedChanges.tenantKey = updatedTenant.name.toLowerCase().replaceAll(" ", "_");
            addTenant(updatedChanges).then((savedTenantDetails) => {
                closeDrawer(savedTenantDetails)
            })
        }
    }

    const handleFileChange = async (selectedFile: UserUploadedFileType) => {
        setSelectedFile(selectedFile)
    };

    const onChangeValue = (from: string, value: any) => {
        let tenantCopy = removeObjRef(tenantData)
        if (!tenantCopy) tenantCopy = {}
        tenantCopy[from] = value
        setTenantData(tenantCopy)
    }

    const onClickStore = (store: MinimalStoreDataType) => {
        getStoreById(store.storeId).then((storeDetails) => {
            setStoreModal({ active: true, data: storeDetails, tenantData: tenantData })
        })
    }

    const resolveStoreName = (store: any) => {
        return getStoreContextName(store, `Store ${store?.storeId ?? ''}`);
    }

    const isUpdateFlow = (Boolean(tenantData?.tenantId) || tenantData?.tenantId == ECOMSAI_PLATFORM_TENANT_ID);

    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            <DrawerElement
                title={isUpdateFlow ? `Update Tenant` : `Add Tenant :: ID: ${platformSummary?.tenants?.count + 1}`}
                open={Boolean(modalData.active)}
                onClose={() => closeDrawer(null)}
                footerActions={[
                    <Button type="default" onClick={() => closeDrawer(null)} icon={<LuX />} key="Cancel">Cancel</Button>,
                    <>{isUpdateFlow && <Button type="default" icon={<LuTrash />} danger onClick={() => addUpdateTenantDetails({ ...tenantData, deleted: true })} key="Delete">Delete</Button>}</>,
                    <>{isUpdateFlow && <Button type="primary" ghost icon={<LuPlus />} key="Store" onClick={() => setStoreModal({ active: true, data: null, tenantData: tenantData })}>Add Store</Button>}</>,
                    <Button type="primary" icon={<LuUploadCloud />} onClick={() => addUpdateTenantDetails(tenantData)} key="Update">{isUpdateFlow ? "Update" : "Add"}</Button>,
                ]}
                width={450}
            >
                <Flex vertical gap={20}>

                    <Flex onClick={() => fileInputRef.current.click()}>
                        <Text style={{ minWidth: 150 }}>Logo</Text>
                        {selectedFile.url ? <img src={selectedFile.url} style={{ width: "auto", height: 100 }} /> :
                            <>
                                {tenantData?.logo ? <img src={tenantData?.logo} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <>
                                    <Button icon={<LuUpload />}>Upload Logo</Button>
                                </>}
                            </>}
                    </Flex>

                    {isUpdateFlow && <Flex>
                        <Text style={{ minWidth: 150 }}>Tenant Id</Text>
                        <Text>{tenantData?.tenantId}</Text>
                    </Flex>}

                    {tenantData?.createdBy && <Flex>
                        <Text style={{ minWidth: 150 }}>Created By</Text>
                        <Text>{tenantData?.createdBy}, <br /> {getFormatedDateAndTime(format, new Date(tenantData?.createdOn))}</Text>
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

                        <Flex>
                            <Text style={{ minWidth: 150 }}>Blocked</Text>
                            <Switch
                                defaultChecked={tenantData?.blocked || false}
                                value={tenantData?.blocked || false}
                                onChange={() => onChangeValue('blocked', !Boolean(tenantData?.blocked))}
                            />
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
                        <Text style={{ minWidth: 150 }}>Phone Prefix</Text>
                        <Input placeholder="Phone Prefix" value={tenantData?.countryCode || ""} onChange={(e) => onChangeValue('countryCode', e.target.value)} />
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

                    {modalData.active && <ImageUploadInput onUploadFile={handleFileChange} fileInputRef={fileInputRef} />}
                </Flex>
            </DrawerElement>
        </Flex>
    );
}

export default memo(TenantDetailsModal)
