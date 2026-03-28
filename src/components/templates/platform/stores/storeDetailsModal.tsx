'use client'
import DrawerElement from '@antdComponent/drawerElement';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import BusinessSettings from '@template/main-app/businessSettings';
import { Flex } from 'antd';
import { memo, useContext, useEffect, useState } from 'react';

function StoreDetailsModal({ modalData, closeModal, fromPage = "" }) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const [data, setData] = useState(modalData);

    useEffect(() => {
        setData(modalData);
    }, [modalData])

    useEffect(() => {
        setData({
            ...modalData,
            data: storeDetails,
            tenantData: tenantDetails
        });
    }, [storeDetails])


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