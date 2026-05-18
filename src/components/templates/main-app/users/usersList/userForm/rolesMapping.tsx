import FormElementWrapper from "@atoms/formElementWrapper"
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider"
import { UserDataType } from "@type/platform/user"
import { removeObjRef } from "@util/utils"
import { Select } from "antd"
import { useContext } from "react"

function RolesMapping({ disabled = false, staffStores = [], userDetails, onChangeValue }) {

    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const activeStoreRoles = staffStores.find((store) => store.storeId == storeDetails?.storeId)?.roles || storeDetails?.roles || [];

    // Get user's current role for this store
    const userStoreMapping = userDetails?.stores?.find(s => s.storeId == storeDetails?.storeId);
    const currentRole = userStoreMapping?.role || '';

    const onChangeRoleValue = (value) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        const index = userDetails.stores.findIndex(s => s.storeId == storeDetails?.storeId);
        if (index !== -1) {
            userCopy.stores[index].role = value;  // Single role per store
        }
        onChangeValue('user', userCopy)
    }

    return (
        <FormElementWrapper label="Role">
            <Select
                allowClear
                style={{ width: '100%' }}
                placeholder="Please select role"
                disabled={disabled}
                defaultValue={currentRole}
                value={currentRole}
                onChange={(value) => onChangeRoleValue(value)}
                options={activeStoreRoles?.filter((role) => role.active !== false)?.map((role) => ({ label: role.name, value: role.id }))}
            />
        </FormElementWrapper>
    )
}

export default RolesMapping
