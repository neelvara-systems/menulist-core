'use client'
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider'
import StoreDetailsModal from '@template/platform/stores/storeDetailsModal'
import type { StoreDataType } from '@type/platform/store'
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
            closeModal={(updatedStore?: StoreDataType | null) => setStoreDetails(updatedStore ?? null)}
        />
    )
}

export default Page
