import DrawerElement from "@antdComponent/drawerElement"
import ImageUploadInput from "@atoms/imageUploadInput"
import { getAllStoresByTenantId } from "@database/stores"
import { addPlatformUser, updatePlatformUser } from "@database/users"
import { useAppDispatch } from "@hook/useAppDispatch"
import { _debounce } from "@hook/useDebounce"
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider"
import { showErrorToast, showSuccessToast, showWarningToast } from "@reduxSlices/toast"
import { UserUploadedFileType } from '@type/common'
import { UserDataType } from "@type/platform/user"
import { getObjectDifferance } from "@util/deepMerge"
import { removeObjRef, updateDeepPathValue } from "@util/utils"
import { Button, Card, Divider, Flex, theme } from "antd"
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

type UserModalDataType = {
    modalData: {
        active: boolean
        data: UserDataType
    },
    onCloseModal: Function
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
function UserAddUpdateForm({ modalData, onCloseModal }: UserModalDataType) {

    const [userDetails, setUserDetails] = useState<UserDataType>(null)
    const { tenantDetails, setTenantDetails } = useContext(PlatformGlobalDataContext)
    const fileInputRef = useRef(null);
    const [selectedProfileImage, setSelectedProfileImage] = useState<UserUploadedFileType>({ name: "", size: 0, type: "", url: null })
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState(0)
    const { token } = theme.useToken();

    useEffect(() => {
        if (modalData.data) {
            const userToUpdate = modalData.data;
            setUserDetails(userToUpdate);
            const ifUserHasMultipleStorePermission = true;
            if (ifUserHasMultipleStorePermission) {
                //if user has permissions to assign multiple stores then fetch all stores for tenantId
                getAllStoresByTenantId(userToUpdate?.tenantId).then((stores) => {
                    const storesListCopy = removeObjRef(tenantDetails?.storesList)
                    stores.map((store) => {
                        const storeIndex = storesListCopy.findIndex((s) => s.storeId == store?.storeId);
                        storesListCopy[storeIndex].storeDetails = removeObjRef(store);
                    })
                    setTenantDetails(removeObjRef({ ...tenantDetails, storesList: storesListCopy }))
                    console.log("stores for tenantId: ", userToUpdate?.tenantId, stores)
                })
            }
        } else {
            setSelectedProfileImage({ name: "", size: 0, type: "", url: null })
            setUserDetails(null)
        }
    }, [modalData])

    const onClose = (data = null) => {
        onCloseModal(data)
    }

    const scrollSmoothHandler = (index) => {
        scrollRefs.current[index].current.scrollIntoView({ behavior: "smooth" });
    };

    const handleFileChange = async (selectedProfileImage: UserUploadedFileType) => {
        setSelectedProfileImage(selectedProfileImage)
    };

    const onCreate = async () => {

        if (!Boolean(userDetails.email)) {
            dispatch(showErrorToast("Email is required"))
            return
        }

        try {
            // Create staff via server API — handles Firebase Auth + Firestore doc creation
            // @see __docs__/auth/ADR-email-uniqueness-strategy.md
            const currentStore = tenantDetails?.storesList?.find((s: any) => s.storeId === userDetails.storeId);
            const res = await fetch('/api/auth/create-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userDetails.email,
                    name: userDetails.name || userDetails.email.split('@')[0],
                    tenantId: userDetails.tenantId || tenantDetails?.tenantId,
                    storeId: userDetails.storeId,
                    storeName: currentStore?.name || currentStore?.storeDetails?.name,
                    role: userDetails.stores?.[0]?.role,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'EMAIL_EXISTS') {
                    dispatch(showWarningToast("Email already used"))
                } else if (data.code === 'INVALID_EMAIL') {
                    dispatch(showWarningToast("Invalid email"))
                } else if (data.code === 'EMAIL_OTHER_TENANT') {
                    dispatch(showErrorToast("This email belongs to another business"))
                } else if (data.code === 'ALREADY_ASSIGNED') {
                    dispatch(showWarningToast("User is already assigned to this store"))
                } else {
                    dispatch(showErrorToast(data.error || "Something went wrong"))
                }
                return;
            }

            // API created the Firestore doc — use userId from response
            const createdUser: any = {
                id: data.userId,
                email: data.email,
                name: userDetails.name || data.email?.split('@')[0],
                ...userDetails,
                isVerified: false,
                active: userDetails.active == undefined ? true : userDetails.active,
            };

            // Handle profile image upload if selected (update existing doc)
            if (selectedProfileImage.url && data.userId) {
                try {
                    await updatePlatformUser({
                        id: data.userId,
                        imageToUpdate: selectedProfileImage.url,
                        imageType: selectedProfileImage.type,
                    });
                } catch {
                    console.warn("[userForm] Profile image upload failed for new user");
                }
            }

            if (data.mode === 'existing_user_added_to_store') {
                dispatch(showSuccessToast("Existing staff member added to this store"));
            } else {
                dispatch(showSuccessToast("Staff user created"));
            }
            onClose(createdUser)
        } catch (err) {
            dispatch(showErrorToast("Something went wrong"))
            console.error("Staff creation error:", err);
        }
    }

    const addUpdateUser = (changesToUpload) => {

        if (selectedProfileImage.url) {
            changesToUpload.imageToUpdate = selectedProfileImage.url
            changesToUpload.imageType = selectedProfileImage.type
        }
        //update user flow
        if (modalData.data) {
            const originalUser = modalData.data
            const updatedChanges: any = getObjectDifferance(changesToUpload, originalUser);
            if (Object.keys(updatedChanges).length > 0) {
                updatedChanges.id = originalUser.id;
                updatePlatformUser(updatedChanges).then((uploadedData) => {
                    dispatch(showSuccessToast("User updated successfully"))
                    onClose({ ...originalUser, ...uploadedData })
                })
            } else {
                dispatch(showWarningToast("No changes found"))
            }
        } else {
            //add user flow
            addPlatformUser(changesToUpload).then((uploaded) => {
                dispatch(showSuccessToast("User added successfully"));
                onClose(uploaded)
            })
                .catch((err) => {
                    dispatch(showErrorToast("Something went wrong"))
                    console.log(err);
                });
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
            children: <BasicInformation fileInputRef={fileInputRef} userDetails={userDetails} selectedProfileImage={selectedProfileImage} onChangeValue={onChangeValue} />,
            icon: <LuClipboardSignature />,
        },
        {
            label: ITEMS_LIST_LABELS.ASSIGNED_STORES,
            active: tenantDetails?.storesList?.length > 1,
            children: <StoresMapping userDetails={userDetails} onChangeValue={onChangeValue} />,
            icon: <LuStore />,
        },
        {
            label: ITEMS_LIST_LABELS.ASSIGNED_ROLES,
            active: true,
            children: <StoresMapping userDetails={userDetails} onChangeValue={onChangeValue} />,
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