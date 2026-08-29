'use client'
import DrawerElement from '@antdComponent/drawerElement';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import BusinessSettings from '@template/main-app/businessSettings';
import type { StoreDataType } from '@type/platform/store';
import type { TenantDataType } from '@type/platform/tenant';
import { Flex } from 'antd';
import { memo, useContext } from 'react';

export const createPlatformStoreDraft = (tenant: TenantDataType): StoreDataType | null => {
    if (!Number.isSafeInteger(tenant.tenantId) || Number(tenant.tenantId) < 0) return null;

    return {
        active: true,
        businessCategory: '',
        businessType: tenant.businessType || '',
        city: tenant.city || '',
        contactPersonEmail: tenant.contactPersonEmail || '',
        contactPersonName: tenant.contactPersonName || '',
        contactPersonNumber: tenant.contactPersonNumber || '',
        countryCode: tenant.countryCode || '',
        currencyCode: tenant.currencyCode || 'INR',
        currencySymbol: tenant.currencySymbol || '₹',
        deleted: false,
        email: tenant.email || '',
        logo: '',
        name: '',
        phoneNumber: tenant.phoneNumber || '',
        roles: [],
        state: tenant.state || '',
        storeId: undefined,
        storeKey: '',
        tenantId: Number(tenant.tenantId),
        tenantName: tenant.name,
    } as unknown as StoreDataType;
};

export type PlatformStoreModalState = {
    active: boolean;
    data: StoreDataType | null;
    tenantData: TenantDataType | null;
};

type StoreDetailsModalProps = {
    modalData: PlatformStoreModalState;
    closeModal: (updatedStore?: StoreDataType | null) => void;
    fromPage?: string;
};

function StoreDetailsModal({ modalData, closeModal, fromPage = "" }: StoreDetailsModalProps) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const data: PlatformStoreModalState = fromPage
        ? {
            ...modalData,
            data: storeDetails,
            tenantData: tenantDetails,
        }
        : modalData;
    const resolvedStoreDetails = data.data || (data.tenantData
        ? createPlatformStoreDraft(data.tenantData)
        : null);


    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            {!fromPage ? <>
                <DrawerElement
                    title={modalData?.data?.name
                        ? `${modalData.data.name} - Update Store`
                        : `${modalData?.tenantData?.name || 'Tenant'} - Add Store`}
                    open={Boolean(modalData.active)}
                    onClose={() => closeModal()}
                    footerActions={[]}
                    width={"100%"}
                >
                    {modalData.active ? <BusinessSettings storeDetails={resolvedStoreDetails} setStoreDetails={closeModal} tenantDetails={data.tenantData} /> : null}
                </DrawerElement>
            </> : <>
                <BusinessSettings storeDetails={resolvedStoreDetails} setStoreDetails={closeModal} tenantDetails={data.tenantData} />
            </>}
        </Flex>
    );
}

export default memo(StoreDetailsModal)
