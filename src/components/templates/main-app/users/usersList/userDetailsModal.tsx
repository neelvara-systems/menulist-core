import DrawerElement from "@antdComponent/drawerElement";
import type { StaffUserSummary } from "@lib/staffManagement/types";
import { Button, Flex } from "antd";
import { memo } from "react";
import { LuPen, LuX } from "react-icons/lu";
import UserDetails from "./userDetails/profile";

type UserModalDataType = {
    canEdit: boolean,
    modalData: {
        active: boolean
        data: StaffUserSummary | null
    },
    onCloseModal: () => void,
    onClickEdit: (user: StaffUserSummary) => void
}


function UserDetailsModal({ canEdit, modalData, onCloseModal, onClickEdit }: UserModalDataType) {

    const onClose = () => {
        onCloseModal()
    }

    return (
        <DrawerElement
            title={"User Details"}
            open={Boolean(modalData.active)}
            onClose={onClose}
            footerActions={[
                <Button type="default" onClick={onClose} key="Cancel" icon={<LuX />}>Close</Button>,
                <Button disabled={!canEdit || !modalData.data} type="default" onClick={() => modalData.data && onClickEdit(modalData.data)} key="Edit" icon={<LuPen />}>Edit</Button>,
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
                {modalData.data ? <UserDetails canEdit={canEdit} userDetails={modalData.data} onClickEdit={onClickEdit} /> : null}
            </Flex>
        </DrawerElement>
    )
}

export default memo(UserDetailsModal)
