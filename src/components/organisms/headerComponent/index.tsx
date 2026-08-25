"use client"
import TextElement from '@antdComponent/textElement';
import { MenuListIconLogo } from '@atoms/menuListLogo';
import { APP_NAME } from '@constant/common';
import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import StoreSwitcher from '@molecules/StoreSwitcher';
import { getShowDateInHeaderState, getShowUserDetailsInHeaderState, getSidebarLayoutState } from '@reduxSlices/clientThemeConfig';
import DashboardHeaderShell from '@/components/shared/dashboardShell/DashboardHeaderShell';
import { getFormatedDate, getFormatedTime, getUTCDate } from '@util/dateTime';
import { Avatar, Badge, Button, Divider, Flex } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { LuLoader, LuUser } from 'react-icons/lu';
import AppBreadcrumb from './appBreadcrumb/appBreadcrumb';
import styles from './headerComponent.module.scss';
import ProfileActionsModal from './profileActionsModal';

const HeaderComponent = () => {

    const { data: session, status: sessionStatus } = useSession()
    const userData = session?.user;
    const showDateInHeader = useAppSelector(getShowDateInHeaderState);
    const showUserDetailsInHeader = useAppSelector(getShowUserDetailsInHeaderState);
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState)
    const router = useRouter();
    const formatter = useFormatter();
    const userLoginLabel = userData?.staffAuthMode === 'owner_passcode'
        ? `Staff ID: ${userData?.staffLoginId || userData?.loginUsername || ''}`
        : userData?.displayEmail || userData?.phone || userData?.phoneUsername || userData?.email;

    return (
        <DashboardHeaderShell
            left={!isVerticalSidebar ? <Flex>
                <div className={styles.logo}>
                    <MenuListIconLogo />
                </div>
                <AppBreadcrumb />
            </Flex> : <AppBreadcrumb />}
            right={
                <>
                <StoreSwitcher />
                {showDateInHeader && <div className={`${styles.actionsWrap} ${styles.dateWrap}`}>
                    <TextElement styles={{ margin: "7px 0 0 0", fontSize: "12px", lineHeight: "12px" }} text={getFormatedDate(formatter, getUTCDate().newDate)} type='primary' size={"medium"} />
                    <TextElement styles={{ margin: "unset", fontSize: "10px" }} text={getFormatedTime(formatter, getUTCDate().newDate)} />
                </div>}

                <Divider type='vertical' plain style={{ height: "32px", margin: "0", borderInlineStartWidth: "2px", top: "2px", }} />

                {/* Profile */}
                <div className={styles.profileWrap}>
                    {sessionStatus === 'loading'
                        ? <Button aria-label="Loading account" disabled icon={<LuLoader />} type="text" />
                        : userData
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
                        <Button aria-label="Sign in" type="text" icon={<LuUser />} onClick={() => router.replace(`${NAVIGARIONS_ROUTINGS.SIGNIN}`)} />
                        // <Button type="text" icon={<LuUser />} onClick={() => signIn('google', { callbackUrl: 'http://localhost:3000/websites/dashboard' })} />
                    }
                </div>
                </>
            }
        />
    )
}

export default HeaderComponent
