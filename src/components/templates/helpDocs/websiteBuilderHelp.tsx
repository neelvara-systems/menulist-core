import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import { MODAL_PAGES_LIST, getActiveModalPage, updateActiveModalPage } from "@reduxSlices/common";
import { Modal, Space } from "antd";
import { LuX } from "react-icons/lu";

function WebsiteBuilderHelp() {
    const activePage = useAppSelector(getActiveModalPage);
    const dispatch = useAppDispatch()
    return (
        <Modal
            destroyOnHidden
            open={activePage == MODAL_PAGES_LIST.WEBSITE_BUILDER_HELP_PAGE}
            title="Design Help"
            onCancel={() => dispatch(updateActiveModalPage(null))}
            styles={{
                mask: { backdropFilter: 'blur(6px)' },
                body: { maxWidth: '80vh' }
            }}
            footer={<Space direction='vertical' style={{ width: "100%" }}>
            </Space>}
            closeIcon={<LuX />}
            width={600}
        >
            Design
        </Modal>
    )
}

export default WebsiteBuilderHelp
