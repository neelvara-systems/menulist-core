import { Button, Drawer, DrawerProps, Flex, Space, Typography } from "antd";
import { Fragment } from "react";
import { LuX } from "react-icons/lu";

type DrawerElementProps = DrawerProps & {
    footerActions?: any[]
}
const DrawerElement = ({ children, footerActions, ...props }: DrawerElementProps) => {
    return <Drawer
        destroyOnHidden
        closeIcon={null}
        width={'max-content'}
        // rootClassName={"ant-modal-wrap"}
        {...props}
        styles={{
            ...props.styles,
            mask: { backdropFilter: 'blur(6px)' },
            footer: {
                justifyContent: "flex-end",
                display: "flex"
            }
        }}
        title={(props.title || props.onClose) ? <Flex justify={props.title ? "space-between" : "flex-end"} align="center">
            {props.title && <Typography.Text>{props.title}</Typography.Text>}
            {props.onClose && <Button type="text" shape="circle" icon={<LuX />} onClick={props.onClose} />}
        </Flex> : null}
        footer={Boolean(footerActions?.length) ? <Space>
            {footerActions?.map((action, i) => {
                return <Fragment key={i}>{action}</Fragment>
            })}
        </Space> : null}
    >
        {children}
    </Drawer>
}

export default DrawerElement    