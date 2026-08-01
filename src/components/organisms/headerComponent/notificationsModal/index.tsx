import TextElement from '@antdComponent/textElement'
import { Button, Card, Divider, Popconfirm, Space } from 'antd'
import { Fragment, type ReactNode, useState } from 'react'
import { LuX } from 'react-icons/lu'

type NotificationPreview = {
    description: ReactNode;
    id?: string | number;
    type: ReactNode;
};

type NotificationsModalProps = {
    children: ReactNode;
    notifications: readonly NotificationPreview[];
};

function NotificationsModal({ children, notifications }: NotificationsModalProps) {
    const [isOpen, setIsOpen] = useState(false)

    const renderTitle = () => {
        return <Space direction='vertical' size={0}>
            <Space size={155} align='baseline'>
                <Space size={0} align='center'>
                    <TextElement size={"medium"} text={'Unseen Notifications'} />
                    {/* <Button icon={<LuSettings />} type='link' size='small' shape='circle' onClick={handleClose} /> */}
                </Space>
                <Button aria-label="Close notifications" icon={<LuX />} type='default' size='small' shape='circle' onClick={() => setIsOpen(false)} />
            </Space>
            <Divider style={{ margin: "6px 0" }} />
        </Space>
    }

    const renderNotifications = () => {
        return <Space direction='vertical' style={{ margin: "0px 0 10px" }}>
            {/* <Divider style={{ margin: '0px 0 3px' }} /> */}
            {notifications.map((notification, index) => {
                return <Card key={notification.id ?? index}
                    styles={{ body: { padding: "8px" } }}
                    size='small' type='inner' style={{ width: 300, padding: "unset" }} hoverable  >
                    <Space direction='vertical' size={0}>
                        <TextElement text={notification.type} type='secondary' />
                        <TextElement text={notification.description} />
                    </Space>
                </Card>
            })}
        </Space>
    }

    return (
        <Fragment>
            <Popconfirm
                open={isOpen}
                onOpenChange={setIsOpen}
                placement="bottomRight"
                destroyOnHidden
                title={renderTitle()}
                description={renderNotifications()}
                icon={<></>}

                showCancel={false}
                okButtonProps={{ className: 'd-none' }}
            >
                {children}
            </Popconfirm>
        </Fragment>
    )
}

export default NotificationsModal
