import DrawerElement from "@antdComponent/drawerElement"
import ImageUploadInput from "@atoms/imageUploadInput"
import { useAppDispatch } from "@hook/useAppDispatch"
import { _debounce } from "@hook/useDebounce"
import { createStaffUser, updateStaffUser } from "@lib/staffManagement/client"
import type { StaffStoreOption } from "@lib/staffManagement/types"
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider"
import { showErrorToast, showSuccessToast, showWarningToast } from "@reduxSlices/toast"
import { UserUploadedFileType } from '@type/common'
import { UserDataType } from "@type/platform/user"
import { getObjectDifferance } from "@util/deepMerge"
import { removeObjRef, updateDeepPathValue } from "@util/utils"
import { Button, Card, Divider, Flex, Modal, Space, theme, Typography } from "antd"
import { createRef, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { LuBellRing, LuBookOpenCheck, LuCake, LuCalculator, LuCalendarClock, LuClipboardSignature, LuImagePlus, LuLock, LuMapPin, LuSiren, LuStore, LuUpload, LuUploadCloud } from "react-icons/lu"
import AccessPermissions from "./accessPermissions"
import AdditionalDocuments from "./additionalDocuments"
import AdditionalInfo from "./additionalInfo"
import Addresses from "./addresses"
import BasicInformation from "./basicInformation"
import Comissions from "./comissions"
import EmergencyContacts from "./emergencyContacts"
import Employment from "./employment"
import Notifications from "./notifications"
import StoresMapping from "./storesMapping"
import Timings from "./timings"
import RolesMapping from "./rolesMapping"
const { Text } = Typography

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
    BASE_INFORMATION: "Base Information",
    ASSIGNED_STORES: "Assigned Stores",
    ASSIGNED_ROLES: "Assigned Roles",
    PREMISSIONS: "Premissions",
    COMMISIONS: "Commisions",
    NOTIFICATIONS: "Notifications",
    TIMINGS: "Timings",
    EMPLOYMENT: "Employment",
    EMERGENCY_CONTACT: "Emergency Contact",
    ADDRESSES: "Addresses",
    ADDITIONAL_DOCUMENTS: "Documents",
    ADDITIONAL_INFO: "Additional Info",
}
/**
 * Form to add or update a user
 * @param {UserModalDataType} param0 containing modalData and onCloseModal
 * @returns {JSX.Element} the form
 */
function UserAddUpdateForm({ canAssignRoles = true, modalData, onCloseModal, staffStores = [] }: UserModalDataType) {

    const [userDetails, setUserDetails] = useState<UserDataType>(null)
    const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext)
    const fileInputRef = useRef(null);
    const [selectedProfileImage, setSelectedProfileImage] = useState<UserUploadedFileType>({ name: "", size: 0, type: "", url: null })
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
        if (modalData.data) {
            const userToUpdate = modalData.data;
            setUserDetails(userToUpdate);
        } else {
            setSelectedProfileImage({ name: "", size: 0, type: "", url: null })
            setUserDetails(modalData.active ? getInitialUser() : null)
        }
    }, [modalData, storeDetails?.storeId, storeDetails?.tenantId])

    const onClose = (data = null) => {
        onCloseModal(data)
    }

    const showStaffPasscode = (data: any) => {
        if (!data?.temporaryPasscode || !data?.staffLoginId) return;
        Modal.info({
            okText: "Done",
            title: "Staff login details",
            content: (
                <Space direction="vertical" size={8}>
                    <Text>Share these details with the staff member. This passcode is shown once.</Text>
                    <Text strong>Staff ID: {data.staffLoginId}</Text>
                    <Text strong>Passcode: {data.temporaryPasscode}</Text>
                    <Text type="secondary">They can log in from the normal sign-in page.</Text>
                </Space>
            ),
        });
    }

    const scrollSmoothHandler = (index) => {
        scrollRefs.current[index].current.scrollIntoView({ behavior: "smooth" });
    };

    const handleFileChange = async (selectedProfileImage: UserUploadedFileType) => {
        setSelectedProfileImage(selectedProfileImage)
    };

    const onCreate = async () => {

        const normalizedEmail = userDetails.email?.trim().toLowerCase();
        if (!normalizedEmail && !userDetails.name?.trim()) {
            dispatch(showErrorToast("Name is required when email is not available"))
            return
        }

        try {
            // Create staff via server API — handles Firebase Auth + Firestore doc creation
            // @see __docs__/auth/ADR-email-uniqueness-strategy.md
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
                dispatch(showErrorToast(err.message || "Something went wrong"))
            }
            console.error("Staff creation error:", err);
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
                    dispatch(showErrorToast(err.code === 'ROLE_ASSIGNMENT_FORBIDDEN' ? "You cannot change roles or store access" : err.message || "Something went wrong"))
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
            label: ITEMS_LIST_LABELS.BASE_INFORMATION,
            active: true,
            children: <BasicInformation allowProfileImage={false} fileInputRef={fileInputRef} userDetails={userDetails} selectedProfileImage={selectedProfileImage} onChangeValue={onChangeValue} />,
            icon: <LuClipboardSignature />,
        },
        {
            label: ITEMS_LIST_LABELS.ASSIGNED_STORES,
            active: tenantDetails?.storesList?.length > 1,
            children: <StoresMapping canAssignRoles={canAssignRoles} staffStores={staffStores} userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuStore />,
        },
        {
            label: ITEMS_LIST_LABELS.ASSIGNED_ROLES,
            active: true,
            children: <RolesMapping disabled={!canAssignRoles} staffStores={staffStores} userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuLock />,
        },
        {
            label: ITEMS_LIST_LABELS.PREMISSIONS,
            active: true,
            children: <AccessPermissions userDetails={userDetails} />,
            icon: <LuLock />,
        },
        {
            label: ITEMS_LIST_LABELS.COMMISIONS,
            active: true,
            children: <Comissions userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuCalculator />,
        },
        {
            label: ITEMS_LIST_LABELS.TIMINGS,
            active: true,
            children: <Timings userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuCalendarClock />,
        },
        {
            label: ITEMS_LIST_LABELS.NOTIFICATIONS,
            active: true,
            children: <Notifications userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuBellRing />,
        },
        {
            label: ITEMS_LIST_LABELS.EMPLOYMENT,
            active: true,
            children: <Employment userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuBookOpenCheck />,
        },
        {
            label: ITEMS_LIST_LABELS.EMERGENCY_CONTACT,
            active: true,
            children: <EmergencyContacts userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuSiren />,
        },
        {
            label: ITEMS_LIST_LABELS.ADDRESSES,
            active: true,
            children: <Addresses userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuMapPin />,
        },
        {
            label: ITEMS_LIST_LABELS.ADDITIONAL_DOCUMENTS,
            active: true,
            children: <AdditionalDocuments userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuImagePlus />,
        },
        {
            label: ITEMS_LIST_LABELS.ADDITIONAL_INFO,
            active: true,
            children: <AdditionalInfo userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuCake />,
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
    }, [userDetails, activeTab, selectedProfileImage])

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
                    <Flex vertical gap={10} style={{ width: 230 }}>
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
                    <Flex style={{ overflow: "auto", height: "calc(100vh - 130px)", maxWidth: 500 }} onScroll={onScroll}>
                        {renderForm()}
                    </Flex>
                </Flex>
                {modalData.active && <ImageUploadInput onUploadFile={handleFileChange} fileInputRef={fileInputRef}
                    cropperConfiguarations={{
                        active: true,
                        ratio: 1,
                        cropBoxResizable: false
                    }} />}
            </>
        </DrawerElement>
    )
}

export default UserAddUpdateForm
