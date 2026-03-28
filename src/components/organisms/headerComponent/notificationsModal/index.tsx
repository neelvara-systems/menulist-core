import TextElement from '@antdComponent/textElement'
import { HOME_ROUTING } from '@constant/navigations'
import { Button, Card, Divider, Popconfirm, Space, theme } from 'antd'
import { useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import { LuCheckCircle, LuX } from 'react-icons/lu'

function NotificationsModal({ children, notifications }) {
    const [isLoading, setIsLoading] = useState(false)
    const { token } = theme.useToken();
    const router = useRouter();

    const closeModalForceFully = () => {
        const ele: any = document.getElementById("modal-close-btn");
        ele && ele.click();
    }

    const viewAllClick = () => {
        router.push(HOME_ROUTING)
        // router.push(`/${NAVIGARIONS_ROUTINGS.NOTIFICATIONS}`)
    }

    const handleClose = () => {
        closeModalForceFully()
    }

    const markAllRead = () => {
        //mark all read logic
        handleClose()
    }

    const onSettingsClick = () => {
        //show notifications settings
        handleClose()
    }

    const renderTitle = () => {
        return <Space direction='vertical' size={0}>
            <Space size={155} align='baseline'>
                <Space size={0} align='center'>
                    <TextElement size={"medium"} text={'Unseen Notifications'} />
                    {/* <Button icon={<LuSettings />} type='link' size='small' shape='circle' onClick={handleClose} /> */}
                </Space>
                <Button icon={<LuX />} type='default' size='small' shape='circle' onClick={closeModalForceFully} />
            </Space>
            <Divider style={{ margin: "6px 0" }} />
        </Space>
    }

    const renderNotifications = () => {
        return <Space direction='vertical' style={{ margin: "0px 0 10px" }}>
            {/* <Divider style={{ margin: '0px 0 3px' }} /> */}
            {notifications.map((notification, i) => {
                return <Card key={i}
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
                placement="bottomRight"
                destroyOnHidden
                title={renderTitle()}
                description={renderNotifications()}
                icon={<></>}

                //ok button
                onConfirm={viewAllClick}
                okType="link"
                okText="View All Notifications"

                //cancel button
                cancelButtonProps={{ loading: isLoading, size: "middle", icon: <LuCheckCircle />, id: "modal-close-btn" }}
                onCancel={markAllRead}
                cancelText="Mark All Read"
            >
                {children}
            </Popconfirm>
        </Fragment>
    )
}

export default NotificationsModal