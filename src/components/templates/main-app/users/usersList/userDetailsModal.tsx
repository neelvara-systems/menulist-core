import DrawerElement from "@antdComponent/drawerElement";
import { UserDataType } from "@type/platform/user";
import { Button, Flex } from "antd";
import { memo } from "react";
import { LuPen, LuX } from "react-icons/lu";
import UserDetails from "./userDetails/profile";

type UserModalDataType = {
    canEdit: boolean,
    modalData: {
        active: boolean
        data: UserDataType
    },
    onCloseModal: Function,
    onClickEdit: Function
}


function UserDetailsModal({ canEdit, modalData, onCloseModal, onClickEdit }: UserModalDataType) {

    const userDetails: UserDataType = modalData.data;
    const onClose = (data = null) => {
        onCloseModal({ active: false, data })
    }

    return (
        <DrawerElement
            title={"User Details"}
            open={Boolean(modalData.active)}
            onClose={() => onClose(null)}
            footerActions={[
                <Button type="default" onClick={() => onClose(null)} key="Cancel" icon={<LuX />}>Close</Button>,
                <Button disabled={!canEdit} type="default" onClick={() => onClickEdit(userDetails)} key="Edit" icon={<LuPen />}>Edit</Button>,
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
            <Flex style={{ overflow: "auto", maxHeight: "calc(100vh - 130px)", width: "min(720px, calc(100vw - 48px))" }}>
                <UserDetails canEdit={canEdit} userDetails={userDetails} onClickEdit={onClickEdit} />
            </Flex>
        </DrawerElement>
    )
}

export default memo(UserDetailsModal)
