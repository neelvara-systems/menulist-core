'use client'
import DrawerElement from '@antdComponent/drawerElement';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import BusinessSettings from '@template/main-app/businessSettings';
import type { StoreDataType } from '@type/platform/store';
import type { TenantDataType } from '@type/platform/tenant';
import { Flex } from 'antd';
import { memo, useContext } from 'react';

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


    return (
        <Flex style={{ overflowX: 'auto', width: '100%' }}>
            {!fromPage ? <>
                <DrawerElement
                    title={modalData?.tenantData?.name + (modalData?.data?.name ? ` - Update Store` : ` - Add Store`)}
                    open={Boolean(modalData.active)}
                    onClose={() => closeModal()}
                    footerActions={[]}
                    width={"100%"}
                >
                    {modalData.active ? <BusinessSettings storeDetails={data.data} setStoreDetails={closeModal} tenantDetails={data.tenantData} /> : null}
                </DrawerElement>
            </> : <>
                <BusinessSettings storeDetails={data.data} setStoreDetails={closeModal} tenantDetails={data.tenantData} />
            </>}
        </Flex>
    );
}

export default memo(StoreDetailsModal)
