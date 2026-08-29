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
import { Fragment, type ReactNode, useState } from 'react';
import { LuKeyboard, LuLogOut, LuSettings2, LuUser } from 'react-icons/lu';
import type { AuthSessionUserType } from '@/types/loginUser';
import styles from './profileActionsModal.module.scss';
import UserProfileModal from './userProfileModal';

type ProfileActionUser = Partial<Pick<
    AuthSessionUserType,
    | 'displayEmail'
    | 'email'
    | 'image'
    | 'loginUsername'
    | 'name'
    | 'phone'
    | 'phoneUsername'
    | 'staffAuthMode'
    | 'staffLoginId'
>>;

type ProfileActionsModalProps = {
    children: ReactNode;
    onOpenAppearance?: () => void;
    signOutCallbackUrl?: string;
    userData?: ProfileActionUser;
};

type ProfileAction = {
    danger?: boolean;
    description?: string;
    icon: ReactNode;
    key: 'appearance' | 'keyboardShortcuts' | 'profile' | 'signOut';
    onClick: () => void;
    title: string;
};

type ProfileActionSection = {
    items: ProfileAction[];
    title?: string;
};

function ProfileActionsModal({
    children,
    userData = { name: '', email: '', image: '' },
    onOpenAppearance,
    signOutCallbackUrl,
}: ProfileActionsModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showShortcutsModal, setShowShortcutsModal] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const { token } = theme.useToken();
    const dispatch = useAppDispatch()
    const t = useTranslations('ProfileActions');
    const userLoginLabel = userData.staffAuthMode === 'owner_passcode'
        ? `Staff ID: ${userData.staffLoginId || userData.loginUsername || ''}`
        : userData.displayEmail || userData.phone || userData.phoneUsername || userData.email || '';

    const MENU_SECTIONS: ProfileActionSection[] = [
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

    const handleClose = () => {
        setIsOpen(false)
    }

    const onClickAction = (action: ProfileAction) => {
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

    const logoutUser = async (): Promise<void> => {
        setIsLoading(true);
        try {
            await signOutSession(signOutCallbackUrl)
            dispatch(showSuccessToast(t('logoutSuccess')))
        } catch {
            dispatch(showErrorToast(t('logoutFailed')))
        } finally {
            setIsLoading(false);
        }
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
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onClickAction(item);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
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
                open={isOpen}
                onOpenChange={setIsOpen}
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
                <button
                    type="button"
                    className={styles.profileTrigger}
                    aria-label={t('myProfile')}
                    aria-expanded={isOpen}
                    aria-haspopup="dialog"
                >
                    {children}
                </button>
            </Popconfirm>
            {/* Logout confirmation modal */}
            <Modal
                title={t('confirmLogout')}
                open={showLogoutConfirm}
                onOk={async () => {
                    await logoutUser();
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
