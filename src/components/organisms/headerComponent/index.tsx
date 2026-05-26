"use client"
import TextElement from '@antdComponent/textElement';
import EcomsIconLogo from '@atoms/ecomsLogo';
import { APP_NAME } from '@constant/common';
import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import StoreSwitcher from '@molecules/StoreSwitcher';
import NotificationsModal from '@organisms/headerComponent/notificationsModal';
import { getShowDateInHeaderState, getShowUserDetailsInHeaderState, getSidebarLayoutState } from '@reduxSlices/clientThemeConfig';
import DashboardHeaderShell from '@/components/shared/dashboardShell/DashboardHeaderShell';
import { getFormatedDate, getFormatedTime, getUTCDate } from '@util/dateTime';
import { objectNullCheck } from '@util/utils';
import { Avatar, Badge, Button, Divider, Flex } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { LuBell, LuLoader, LuUser } from 'react-icons/lu';
import AppBreadcrumb from './appBreadcrumb/appBreadcrumb';
import styles from './headerComponent.module.scss';
import ProfileActionsModal from './profileActionsModal';

const BadgeRenderer = ({ dotted, count, overflowCount, children }) => {
    return <Badge size="small" dot={dotted} count={count} overflowCount={overflowCount} style={{ top: "3px", right: "8px", background: "red" }}> {children}</Badge>
}

const HeaderComponent = () => {

    const { data: session } = useSession()
    const [userData, setUserData] = useState<any>(session?.user)
    const showDateInHeader = useAppSelector(getShowDateInHeaderState);
    const showUserDetailsInHeader = useAppSelector(getShowUserDetailsInHeaderState);
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState)
    const router = useRouter();
    const formatter = useFormatter();
    const userLoginLabel = userData?.staffAuthMode === 'owner_passcode'
        ? `Staff ID: ${userData?.staffLoginId || userData?.loginUsername || ''}`
        : userData?.displayEmail || userData?.phone || userData?.phoneUsername || userData?.email;

    const [notifications, setNotifications] = useState([
        { type: "Order", description: "New Order Placed", isReaded: false, status: "success" },
        { type: "Order", description: "New Order Placed Failed", isReaded: false, status: "fail" }
    ])

    const [unreadMessages, setUnreadMessages] = useState([
        { type: "Order", description: "New Order Placed", isReaded: false, status: "success" },
        { type: "Order", description: "New Order Placed Failed", isReaded: false, status: "fail" }
    ])

    return (
        <DashboardHeaderShell
            left={!isVerticalSidebar ? <Flex>
                <div className={styles.logo}>
                    <EcomsIconLogo />
                </div>
                <AppBreadcrumb />
            </Flex> : <AppBreadcrumb />}
            right={
                <>
                <StoreSwitcher />
                <div className={styles.actionsWrap}>

                    {/* Notofications */}
                    <BadgeRenderer dotted={true} count={notifications.length} overflowCount={9} >
                        <NotificationsModal notifications={notifications}>
                            <Button type="text" icon={<LuBell />} />
                        </NotificationsModal>
                    </BadgeRenderer>

                </div>

                {showDateInHeader && <div className={`${styles.actionsWrap} ${styles.dateWrap}`}>
                    <TextElement styles={{ margin: "7px 0 0 0", fontSize: "12px", lineHeight: "12px" }} text={getFormatedDate(formatter, getUTCDate().newDate)} type='primary' size={"medium"} />
                    <TextElement styles={{ margin: "unset", fontSize: "10px" }} text={getFormatedTime(formatter, getUTCDate().newDate)} />
                </div>}

                <Divider type='vertical' plain style={{ height: "32px", margin: "0", borderInlineStartWidth: "2px", top: "2px", }} />

                {/* Profile */}
                <div className={styles.profileWrap}>
                    {objectNullCheck(userData, 'email')
                        ?
                        <>
                            <ProfileActionsModal userData={userData}>
                                {showUserDetailsInHeader && <div className={`${styles.actionsWrap} ${styles.dateWrap}`}>
                                    <TextElement styles={{ margin: "7px 0 0 0", fontSize: "12px", lineHeight: "12px" }} text={`${userData?.name}`} type='primary' size={"medium"} />
                                    <TextElement styles={{ margin: "unset", fontSize: "10px" }} text={`${userLoginLabel}`} />
                                </div>}
                                <Suspense fallback={<div><LuLoader /></div>}>
                                    <Badge dot={true} style={{ top: "3px", right: "8px", background: "green" }}>
                                        {userData?.image ? <Image priority={false} src={userData?.image || ''} alt={APP_NAME} height={32} width={32} /> : <Avatar >DG</Avatar>}
                                    </Badge>
                                </Suspense>
                            </ProfileActionsModal>
                        </>
                        :
                        <Button type="text" icon={<LuUser />} onClick={() => router.replace(`${NAVIGARIONS_ROUTINGS.SIGNIN}`)} />
                        // <Button type="text" icon={<LuUser />} onClick={() => signIn('google', { callbackUrl: 'http://localhost:3000/websites/dashboard' })} />
                    }
                </div>
                </>
            }
        />
    )
}

export default HeaderComponent
