import DrawerElement from "@antdComponent/drawerElement";
import { UserDataType } from "@type/platform/user";
import { Button, Divider, Flex } from "antd";
import { Fragment, memo, useState } from "react";
import { LuCalendarCheck, LuLayoutDashboard, LuPen, LuReceipt, LuUser, LuX } from "react-icons/lu";
import UserAppointments from "./userDetails/appointments";
import UserDashboard from "./userDetails/dashboard";
import UserOrders from "./userDetails/orders";
import UserDetails from "./userDetails/profile";

type UserModalDataType = {
    modalData: {
        active: boolean
        data: UserDataType
    },
    onCloseModal: Function,
    onClickEdit: Function
}


const ITEMS_LIST_LABELS = {
    PROFILE: "Profile",
    DASHBOARD: "Dashboard",
    APPOINTMENTS: "Appointments",
    ORDERS: "Orders",
}

function UserDetailsModal({ modalData, onCloseModal, onClickEdit }: UserModalDataType) {

    const userDetails: UserDataType = modalData.data;
    const [activeTab, setActiveTab] = useState(0)
    const onClose = (data = null) => {
        onCloseModal({ active: false, data })
    }

    const TAB_ITEMS_LIST = [
        { key: ITEMS_LIST_LABELS.PROFILE, icon: <LuUser />, label: ITEMS_LIST_LABELS.PROFILE, children: <UserDetails userDetails={userDetails} onClickEdit={onClickEdit} />, active: true },
        { key: ITEMS_LIST_LABELS.DASHBOARD, icon: <LuLayoutDashboard />, label: ITEMS_LIST_LABELS.DASHBOARD, children: <UserDashboard userDetails={userDetails} />, active: true },
        { key: ITEMS_LIST_LABELS.APPOINTMENTS, icon: <LuCalendarCheck />, label: ITEMS_LIST_LABELS.APPOINTMENTS, children: <UserAppointments userDetails={userDetails} />, active: true },
        { key: ITEMS_LIST_LABELS.ORDERS, icon: <LuReceipt />, label: ITEMS_LIST_LABELS.ORDERS, children: <UserOrders userDetails={userDetails} />, active: true },
    ]

    return (
        <DrawerElement
            title={"User Details"}
            open={Boolean(modalData.active)}
            onClose={() => onClose(null)}
            footerActions={[
                <Button type="default" onClick={() => onClose(null)} key="Cancel" icon={<LuX />}>Close</Button>,
                <Button type="default" onClick={() => onClickEdit(userDetails)} key="Edit" icon={<LuPen />}>Edit</Button>,
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
                <Flex justify="flex-start" gap={10}>
                    <Flex vertical gap={10} style={{ width: 170 }}>
                        {TAB_ITEMS_LIST.filter(t => t.active).map((item, index) => {
                            return <Fragment key={index}>
                                <Button
                                    className="leftAlign"
                                    block
                                    size="large"
                                    style={{ justifyContent: "flex-start" }}
                                    type={activeTab == index ? 'primary' : 'text'} ghost={activeTab == index} icon={item.icon}
                                    onClick={() => setActiveTab(index)}
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
                    <Flex style={{ overflow: "auto", height: "calc(100vh - 130px)", minWidth: 500 }}>
                        {TAB_ITEMS_LIST.find((t, index) => t.active && activeTab == index).children}
                    </Flex>
                </Flex>
            </>
        </DrawerElement>
    )
}

export default memo(UserDetailsModal)