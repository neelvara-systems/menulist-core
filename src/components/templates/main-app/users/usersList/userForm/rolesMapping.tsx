import FormElementWrapper from "@atoms/formElementWrapper"
import { DEFAULT_ROLE_IDS } from "@data/shared/defaultRoles"
import { applyStaffStoreRole } from "@lib/staffManagement/formMappingBoundary"
import { OWNER_ACCESS_NOT_TRANSFER_COPY } from "@lib/staffManagement/ownershipTransferBoundary"
import type { StaffFormUser, StaffStoreOption } from "@lib/staffManagement/types"
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider"
import { Alert, Flex, Select } from "antd"
import { useContext } from "react"

type RolesMappingProps = {
    disabled?: boolean;
    onChangeValue: (from: string, value: unknown) => void;
    staffStores?: StaffStoreOption[];
    userDetails: StaffFormUser;
};

function RolesMapping({ disabled = false, staffStores = [], userDetails, onChangeValue }: RolesMappingProps) {

    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const activeStoreRoles = staffStores.find((store) => store.storeId == storeDetails?.storeId)?.roles || storeDetails?.roles || [];

    // Get user's current role for this store
    const userStoreMapping = userDetails.stores.find((store) => store.storeId === storeDetails?.storeId);
    const currentRole = userStoreMapping?.role || '';

    const onChangeRoleValue = (value: string | undefined) => {
        const index = userDetails.stores.findIndex((store) => store.storeId === storeDetails?.storeId);
        const nextUser = applyStaffStoreRole(userDetails, index, value || '');
        if (nextUser) onChangeValue('user', nextUser);
    }

    return (
        <Flex gap={8} vertical>
            <FormElementWrapper label="Role">
                <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Select role"
                    disabled={disabled}
                    defaultValue={currentRole}
                    value={currentRole}
                    onChange={(value) => onChangeRoleValue(value)}
                    options={activeStoreRoles?.filter((role) => role.active !== false)?.map((role) => ({ label: role.name, value: role.id }))}
                />
            </FormElementWrapper>
            {currentRole === DEFAULT_ROLE_IDS.OWNER ? (
                <Alert message={OWNER_ACCESS_NOT_TRANSFER_COPY} showIcon type="warning" />
            ) : null}
        </Flex>
    )
}

export default RolesMapping
