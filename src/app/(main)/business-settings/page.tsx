'use client'
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider'
import StoreDetailsModal from '@template/platform/stores/storeDetailsModal'
import { useContext } from 'react'

function Page() {
    const { storeDetails, setStoreDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    return (
        <StoreDetailsModal
            fromPage="business-settings"
            modalData={{
                active: true,
                data: storeDetails,
                tenantData: tenantDetails
            }}
            closeModal={(updatedStore) => setStoreDetails(updatedStore)}
        />
    )
}

export default Page