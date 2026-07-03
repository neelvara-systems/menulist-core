import DrawerElement from "@antdComponent/drawerElement"
import { useAppDispatch } from "@hook/useAppDispatch"
import { _debounce } from "@hook/useDebounce"
import { createStaffUser, updateStaffUser } from "@lib/staffManagement/client"
import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics"
import type { StaffStoreOption } from "@lib/staffManagement/types"
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider"
import { showErrorToast, showSuccessToast, showWarningToast } from "@reduxSlices/toast"
import { UserDataType } from "@type/platform/user"
import { getObjectDifferance } from "@util/deepMerge"
import { removeObjRef, updateDeepPathValue } from "@util/utils"
import { Button, Card, Divider, Flex, Modal, theme } from "antd"
import { createRef, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { LuClipboardSignature, LuShieldCheck, LuStore, LuUpload, LuUploadCloud } from "react-icons/lu"
import StaffLoginDetailsContent from "../../StaffLoginDetailsContent"
import AccessPermissions from "./accessPermissions"
import BasicInformation from "./basicInformation"
import StoresMapping from "./storesMapping"
import RolesMapping from "./rolesMapping"

type UserModalDataType = {
    canAssignRoles?: boolean
    modalData: {
        active: boolean
        data: UserDataType
    },
    onCloseModal: Function
    staffStores?: StaffStoreOption[]
}

const ITEMS_LIST_LABELS = {
    STAFF_DETAILS: "Staff Details",
    STORE_ACCESS: "Store Access",
    PERMISSIONS: "Permissions",
}
/**
 * Form to add or update a user
 * @param {UserModalDataType} param0 containing modalData and onCloseModal
 * @returns {JSX.Element} the form
 */
function UserAddUpdateForm({ canAssignRoles = true, modalData, onCloseModal, staffStores = [] }: UserModalDataType) {

    const [userDetails, setUserDetails] = useState<UserDataType>(null)
    const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext)
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState(0)
    const { token } = theme.useToken();

    const getDefaultRoleId = () => {
        const roles = staffStores.find((store) => store.storeId === storeDetails?.storeId)?.roles || storeDetails?.roles || [];
        return roles.find((role) => role.id === 'staff' && role.active !== false)?.id
            || roles.find((role) => role.active !== false)?.id
            || 'staff';
    }

    const getInitialUser = (): UserDataType => ({
        active: true,
        deleted: false,
        deletedAt: '',
        email: '',
        isVerified: false,
        name: '',
        phoneNumber: '',
        dialCode: '',
        platformRole: 'USER',
        storeId: storeDetails?.storeId,
        storeIds: storeDetails?.storeId ? [storeDetails.storeId] : [],
        stores: storeDetails?.storeId ? [{
            name: storeDetails?.name || '',
            role: getDefaultRoleId(),
            storeId: storeDetails.storeId,
        }] : [],
        tenantId: storeDetails?.tenantId || tenantDetails?.tenantId,
    } as UserDataType)

    useEffect(() => {
        if (modalData.active) setActiveTab(0);
        if (modalData.data) {
            const userToUpdate = modalData.data;
            setUserDetails(userToUpdate);
        } else {
            setUserDetails(modalData.active ? getInitialUser() : null)
        }
    }, [modalData, storeDetails?.storeId, storeDetails?.tenantId])

    const onClose = (data = null) => {
        onCloseModal(data)
    }

    const getStaffMutationLogContext = (user: UserDataType, operation: string) => ({
        operation,
        ...getBoundedStaffStringContext('tenantId', user?.tenantId || tenantDetails?.tenantId),
        ...getBoundedStaffStringContext('storeId', user?.storeId || storeDetails?.storeId),
        ...getBoundedStaffStringContext('userId', user?.id),
        hasEmail: Boolean(user?.email?.trim()),
        emailLength: user?.email?.trim()?.length || 0,
        hasName: Boolean(user?.name?.trim()),
        hasPhoneNumber: Boolean(user?.phoneNumber),
        storeCount: Array.isArray(user?.stores) ? user.stores.length : 0,
    })

    const showStaffPasscode = (data: any) => {
        if (!data?.temporaryPasscode || !data?.staffLoginId) return;
        Modal.info({
            okText: "Done",
            title: "Staff login details",
            content: (
                <StaffLoginDetailsContent
                    countryCode={data.user?.countryCode || userDetails.countryCode}
                    diagnosticContext={getStaffMutationLogContext(data.user || userDetails, 'login_details_share')}
                    dialCode={data.user?.dialCode || userDetails.dialCode}
                    phoneNumber={data.user?.phoneNumber || userDetails.phoneNumber}
                    staffLoginId={data.staffLoginId}
                    temporaryPasscode={data.temporaryPasscode}
                />
            ),
        });
    }

    const scrollSmoothHandler = (index) => {
        scrollRefs.current[index].current.scrollIntoView({ behavior: "smooth" });
    };

    const onCreate = async () => {

        const normalizedEmail = userDetails.email?.trim().toLowerCase();
        if (!normalizedEmail && !userDetails.name?.trim()) {
            dispatch(showErrorToast("Name is required when email is not available"))
            return
        }

        try {
            // Create staff via server API — handles Firebase Auth + Firestore doc creation
            // @see __docs__/auth/adr-email-uniqueness-strategy.md
            const currentStore = tenantDetails?.storesList?.find((s: any) => s.storeId === userDetails.storeId);
            const primaryStore = userDetails.stores?.find((store) => store.storeId === userDetails.storeId) || userDetails.stores?.[0];
            const data = await createStaffUser({
                countryCode: userDetails.countryCode,
                dialCode: userDetails.dialCode,
                email: normalizedEmail || undefined,
                name: userDetails.name || userDetails.phoneNumber || normalizedEmail?.split('@')[0],
                phoneNumber: userDetails.phoneNumber,
                role: primaryStore?.role || getDefaultRoleId(),
                storeId: primaryStore?.storeId || userDetails.storeId,
                storeName: primaryStore?.name || currentStore?.name || currentStore?.storeDetails?.name,
                tenantId: userDetails.tenantId || tenantDetails?.tenantId,
            });

            // API created the Firestore doc — use userId from response
            const createdUser: any = data.user || { ...userDetails, email: data.email, id: data.userId };

            if (data.temporaryPasscode) {
                showStaffPasscode(data);
                dispatch(showSuccessToast("Staff user created with staff ID and temporary passcode"));
            } else if (data.mode === 'existing_user_added_to_store') {
                dispatch(showSuccessToast("Existing staff member added to this store"));
            } else if (data.passwordResetEmailSent === false) {
                dispatch(showWarningToast("Staff user created, but the setup email was not sent. Use Reset password from the staff list."))
            } else {
                dispatch(showSuccessToast("Staff user created and setup email sent"));
            }
            onClose(createdUser)
        } catch (err: any) {
            if (err.code === 'EMAIL_EXISTS') {
                dispatch(showWarningToast("Email already used"))
            } else if (err.code === 'INVALID_EMAIL') {
                dispatch(showWarningToast("Invalid email"))
            } else if (err.code === 'EMAIL_OTHER_TENANT') {
                dispatch(showErrorToast("This email belongs to another business"))
            } else if (err.code === 'ALREADY_ASSIGNED') {
                dispatch(showWarningToast("User is already assigned to this store"))
            } else if (err.code === 'ROLE_ASSIGNMENT_FORBIDDEN') {
                dispatch(showErrorToast("You cannot assign this role"))
            } else {
                dispatch(showErrorToast("Could not create staff member"))
            }
            logStaffClientFailure('staff_create_user_failed', err, getStaffMutationLogContext(userDetails, 'create'))
        }
    }

    const addUpdateUser = async (changesToUpload) => {
        //update user flow
        if (modalData.data) {
            const originalUser = modalData.data
            const updatedChanges: any = getObjectDifferance(changesToUpload, originalUser);
            if (Object.keys(updatedChanges).length > 0) {
                updateStaffUser({
                    active: changesToUpload.active,
                    alternatePhoneNumber: changesToUpload.alternatePhoneNumber,
                    countryCode: changesToUpload.countryCode,
                    dialCode: changesToUpload.dialCode,
                    name: changesToUpload.name,
                    phoneNumber: changesToUpload.phoneNumber,
                    storeId: changesToUpload.storeId,
                    stores: changesToUpload.stores,
                    tenantId: changesToUpload.tenantId || storeDetails?.tenantId,
                    userId: originalUser.id,
                }).then((response) => {
                    dispatch(showSuccessToast("User updated successfully"))
                    onClose(response.user || { ...originalUser, ...updatedChanges })
                }).catch((err: any) => {
                    dispatch(showErrorToast(err.code === 'ROLE_ASSIGNMENT_FORBIDDEN' ? "You cannot change roles or store access" : "Could not update staff member"))
                    logStaffClientFailure('staff_update_user_failed', err, getStaffMutationLogContext(changesToUpload, 'update'))
                })
            } else {
                dispatch(showWarningToast("No changes found"))
            }
        } else {
            await onCreate()
        }
    }

    const onChangeValue = (from, value) => {
        if (from == "user") {
            setUserDetails(value)
        } else if (from == "phoneNumber") {
            let userCopy: UserDataType = updateDeepPathValue(removeObjRef(userDetails), "countryCode", value.countryCode);
            userCopy = updateDeepPathValue(userCopy, "phoneNumber", value.phoneNumber);
            userCopy = updateDeepPathValue(userCopy, "dialCode", value.dialCode);
            setUserDetails(userCopy)
        } else {
            let userCopy: UserDataType = updateDeepPathValue(removeObjRef(userDetails), from, value);
            setUserDetails(userCopy)
        }
    }

    const TAB_ITEMS_LIST = [
        {
            label: ITEMS_LIST_LABELS.STAFF_DETAILS,
            active: true,
            children: <BasicInformation userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuClipboardSignature />,
        },
        {
            label: ITEMS_LIST_LABELS.STORE_ACCESS,
            active: true,
            children: (
                <Flex vertical gap={16}>
                    {tenantDetails?.storesList?.length > 1 ? (
                        <StoresMapping canAssignRoles={canAssignRoles} staffStores={staffStores} userDetails={userDetails} onChangeValue={onChangeValue} />
                    ) : (
                        <RolesMapping disabled={!canAssignRoles} staffStores={staffStores} userDetails={userDetails} onChangeValue={onChangeValue} />
                    )}
                </Flex>
            ),
            icon: <LuStore />,
        },
        {
            label: ITEMS_LIST_LABELS.PERMISSIONS,
            active: true,
            children: <AccessPermissions staffStores={staffStores} userDetails={userDetails} />,
            icon: <LuShieldCheck />,
        },
    ]

    const scrollRefs = useRef([]);
    scrollRefs.current = TAB_ITEMS_LIST.filter(t => t.active).map(
        (_, i) => scrollRefs.current[i] ?? createRef()
    );

    const onScrollSetActive = () => {
        scrollRefs.current?.forEach((function (element) {
            if (element?.current?.getBoundingClientRect().top < 100) {
                setActiveTab(scrollRefs.current.indexOf(element))
            }
        }))
    }
    const onScroll = useMemo(() => _debounce(onScrollSetActive, 500), []);

    const renderForm = useCallback(() => {
        return <Flex vertical gap={30}>

            {TAB_ITEMS_LIST.filter(t => t.active).map((item, index) => {
                return <Fragment key={index}>
                    <Card title={item.label} style={{ borderColor: activeTab == index ? token.colorPrimaryBorderHover : token.colorBorder }} ref={scrollRefs.current[index]}>
                        {item.children}
                    </Card>
                </Fragment>
            })}
        </Flex>
    }, [userDetails, activeTab, canAssignRoles, staffStores, tenantDetails?.storesList?.length])

    return (
        <DrawerElement
            title={Boolean(modalData.data) ? 'Edit User' : 'Add User'}
            open={Boolean(modalData.active)}
            onClose={() => onClose(null)}
            footerActions={[
                <Button onClick={() => onClose(null)} key="Cancel">Cancel</Button>,
                <>
                    {Boolean(modalData.data) ? <Button icon={<LuUploadCloud />} onClick={() => addUpdateUser(userDetails)}>Update</Button> :
                        <Button icon={<LuUpload />} onClick={() => onCreate()}>Add</Button>}
                </>
            ]}
            styles={{
                content: {
                    overflow: "unset"
                },
                body: {
                    overflow: "unset"
                }
            }}
        >
            <>
                <Flex justify="flex-start" gap={20}>
                    <Flex vertical gap={10} style={{ width: 190 }}>
                        {TAB_ITEMS_LIST.filter(t => t.active).map((item, index) => {
                            return <Fragment key={index}>
                                <Button
                                    className="leftAlign"
                                    block
                                    size="large"
                                    style={{ justifyContent: "flex-start" }}
                                    type={activeTab == index ? 'primary' : 'text'} ghost={activeTab == index} icon={item.icon}
                                    onClick={() => {
                                        setActiveTab(index);
                                        scrollSmoothHandler(index)
                                    }}
                                    styles={{
                                        icon: {
                                            fontSize: 20
                                        }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            </Fragment>
                        })}
                    </Flex>
                    <Divider type="vertical" style={{ height: "calc(100vh - 130px)" }} />
                    <Flex style={{ overflow: "auto", height: "calc(100vh - 130px)", width: "min(620px, calc(100vw - 300px))" }} onScroll={onScroll}>
                        {renderForm()}
                    </Flex>
                </Flex>
            </>
        </DrawerElement>
    )
}

export default UserAddUpdateForm
