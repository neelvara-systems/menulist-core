import TextElement from '@antdComponent/textElement';
import Saperator from '@atoms/Saperator';
import { FEATURE_FLAGS } from '@config/features';
import { useAppDispatch } from '@hook/useAppDispatch';
import { signOutSession } from '@lib/auth/client';
import KeyboardShortcutsModal from '@organisms/keyboardShortcutsModal';
import { toggleAppSettingsPanel } from '@reduxSlices/clientThemeConfig';
import { showErrorToast, showSuccessToast } from '@reduxSlices/toast';
import { Avatar, Badge, Modal, Popconfirm, Space, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { LuKeyboard, LuLogOut, LuSettings2, LuUser } from 'react-icons/lu';
import styles from './profileActionsModal.module.scss';
import UserProfileModal from './userProfileModal';

function ProfileActionsModal({ children, userData = { name: "", email: "", image: "" }, onOpenAppearance = undefined }) {
    const [isLoading, setIsLoading] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showShortcutsModal, setShowShortcutsModal] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const { token } = theme.useToken();
    const router = useRouter();
    const dispatch = useAppDispatch()
    const t = useTranslations('ProfileActions');
    const userLoginLabel = (userData as any)?.staffAuthMode === 'owner_passcode'
        ? `Staff ID: ${(userData as any)?.staffLoginId || (userData as any)?.loginUsername || ''}`
        : (userData as any)?.displayEmail || (userData as any)?.phone || (userData as any)?.phoneUsername || userData.email;

    const MENU_SECTIONS = [
        {
            items: [
                { key: "profile", title: t('myProfile'), icon: <LuUser />, onClick: () => FEATURE_FLAGS.ENABLE_USER_PROFILE && setShowProfileModal(true), description: t('myProfileDesc') },
            ]
        },
        {
            title: t('preferences'),
            items: [
                { key: "appearance", title: t('appearance'), icon: <LuSettings2 />, onClick: () => onOpenAppearance ? onOpenAppearance() : dispatch(toggleAppSettingsPanel(true)), description: t('appearanceDesc') },
                { key: "keyboardShortcuts", title: t('keyboardShortcuts'), icon: <LuKeyboard />, onClick: () => setShowShortcutsModal(true), description: t('keyboardShortcutsDesc') },
            ]
        },
        {
            items: [
                { key: "signOut", title: t('signOut'), icon: <LuLogOut />, onClick: () => logoutUser(), danger: true },
            ]
        }
    ]

    const closeModalForceFully = () => {
        const ele: any = document.getElementById("modal-close-btn");
        ele && ele.click();
    }

    const handleClose = () => {
        closeModalForceFully()
    }

    const onClickAction = (action) => {
        // Check if this is the logout action
        if (action.key === "signOut") {
            setShowLogoutConfirm(true);
            // Don't close modal yet - wait for confirmation
        } else {
            // For all other actions, proceed normally
            action.onClick();
            handleClose();
        }
    }

    const logoutUser = () => {
        setIsLoading(true);
        signOutSession()
            .then(() => {
                dispatch(showSuccessToast(t('logoutSuccess')))
                setIsLoading(false);
            }).catch(() => {
                dispatch(showErrorToast(t('logoutFailed')))
                setIsLoading(false);
            })
    }
    const renderProfileActions = () => {
        return <div className={styles.profileActionsWrap}>
            <Space direction='vertical' size={0} style={{ width: '100%' }}>
                {/* Profile Header */}
                <div className={styles.profileHeader}>
                    <Space size={12} align='start'>
                        <Badge dot={true} status="success" offset={[-4, 36]}>
                            {userData?.image ?
                                <Avatar size={48} src={userData?.image} /> :
                                <Avatar size={48}>{userData?.name?.charAt(0) || 'U'}</Avatar>
                            }
                        </Badge>
                        <Space direction='vertical' size={0}>
                            <TextElement text={userData.name || 'User'} type='primary' size={"medium"} styles={{ fontWeight: 600 }} />
                            <TextElement text={userLoginLabel} styles={{ fontSize: 13 }} />
                        </Space>
                    </Space>
                </div>

                {/* Menu Sections */}
                {MENU_SECTIONS.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                        {sectionIndex > 0 && <Saperator margin='8px 0' />}

                        {section.title && (
                            <div style={{
                                padding: '8px 16px 4px',
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: token.colorTextSecondary
                            }}>
                                {section.title}
                            </div>
                        )}

                        <div className={styles.menuItems}>
                            {section.items.map((item, itemIndex) => (
                                <div
                                    key={itemIndex}
                                    className={styles.menuItem}
                                    onClick={() => onClickAction(item)}
                                    style={{
                                        color: item.danger ? token.colorError : token.colorText
                                    }}
                                >
                                    <Space size={12} align='start' style={{ width: '100%' }}>
                                        <span className={styles.menuIcon} style={{
                                            color: item.danger ? token.colorError : token.colorTextSecondary
                                        }}>
                                            {item.icon}
                                        </span>
                                        <Space direction='vertical' size={0} style={{ flex: 1 }}>
                                            <span className={styles.menuTitle}>
                                                {item.title}
                                            </span>
                                            {item.description && (
                                                <span className={styles.menuDescription} style={{
                                                    color: token.colorTextTertiary
                                                }}>
                                                    {item.description}
                                                </span>
                                            )}
                                        </Space>
                                    </Space>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </Space>
        </div>
    }

    return (
        <Fragment>
            <Popconfirm
                okText={undefined}
                placement="bottomRight"
                destroyOnHidden
                title={''}
                description={renderProfileActions()}
                icon={<></>}
                showCancel={false}
                className='d-f-c'
                okButtonProps={{ className: 'd-none' }}
            >
                {children}
            </Popconfirm>
            {/* Logout confirmation modal */}
            <Modal
                title={t('confirmLogout')}
                open={showLogoutConfirm}
                onOk={() => {
                    logoutUser();
                    setShowLogoutConfirm(false);
                    handleClose();
                }}
                onCancel={() => {
                    setShowLogoutConfirm(false);
                }}
                okText={t('logout')}
                cancelText={t('cancel')}
                confirmLoading={isLoading}
            >
                <p>{t('logoutConfirm')}</p>
            </Modal>

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                open={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />

            {/* User Profile Modal */}
            <UserProfileModal
                open={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </Fragment>
    )
}

export default ProfileActionsModal
