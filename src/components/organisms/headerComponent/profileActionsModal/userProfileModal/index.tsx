'use client'
import { useAppDispatch } from '@hook/useAppDispatch';
import { showErrorToast, showSuccessToast } from '@reduxSlices/toast';
import { Button, Divider, Form, Input, Modal, Space, Tag, theme, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LuLock, LuMail, LuPhone, LuSave, LuShield, LuUser } from 'react-icons/lu';

const { Text } = Typography;

type UserProfileModalProps = {
    open: boolean;
    onClose: () => void;
};

function UserProfileModal({ open, onClose }: UserProfileModalProps) {
    const { data: session, update: updateSession } = useSession();
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'password'>('profile');

    const userData = session?.user as any;

    useEffect(() => {
        if (open && userData) {
            profileForm.setFieldsValue({
                name: userData.name || '',
                phone: userData.phone || userData.phoneNumber || '',
            });
            passwordForm.resetFields();
            setActiveSection('profile');
        }
    }, [open, userData, profileForm, passwordForm]);

    const handleProfileUpdate = async (values: any) => {
        setProfileLoading(true);
        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
                    phone: values.phone,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                dispatch(showSuccessToast('Profile updated'));
                // Trigger NextAuth session refresh
                await updateSession();
            } else {
                dispatch(showErrorToast(data.error || 'Failed to update profile'));
            }
        } catch (err) {
            dispatch(showErrorToast('An error occurred'));
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (values: any) => {
        setPasswordLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                dispatch(showSuccessToast('Password changed successfully'));
                passwordForm.resetFields();
                setActiveSection('profile');
            } else {
                dispatch(showErrorToast(data.error || 'Failed to change password'));
            }
        } catch (err) {
            dispatch(showErrorToast('An error occurred'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const isOAuthUser = !!(userData?.image); // OAuth users typically have a profile image from Google
    const userRole = userData?.platformRole || 'USER';

    return (
        <Modal
            title="My Profile"
            open={open}
            onCancel={onClose}
            footer={null}
            width={480}
            destroyOnClose
        >
            {/* Account Info Header */}
            <div style={{
                padding: '16px',
                background: token.colorBgLayout,
                borderRadius: token.borderRadiusLG,
                marginBottom: 16,
            }}>
                <Space size={12} align="start">
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: token.colorPrimary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 20, fontWeight: 600,
                    }}>
                        {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 16 }}>{userData?.name || 'User'}</Text>
                        <Space size={4}>
                            <LuMail size={12} style={{ color: token.colorTextSecondary }} />
                            <Text type="secondary" style={{ fontSize: 13 }}>{userData?.email}</Text>
                        </Space>
                        <Space size={4} style={{ marginTop: 4 }}>
                            <Tag color={userRole === 'OWNER' ? 'blue' : userRole === 'PLATFORM' ? 'purple' : 'default'}>
                                {userRole}
                            </Tag>
                        </Space>
                    </Space>
                </Space>
            </div>

            {/* Section Tabs */}
            <Space style={{ marginBottom: 16 }}>
                <Button
                    type={activeSection === 'profile' ? 'primary' : 'default'}
                    ghost={activeSection === 'profile'}
                    icon={<LuUser size={14} />}
                    onClick={() => setActiveSection('profile')}
                    size="small"
                >
                    Edit Profile
                </Button>
                <Button
                    type={activeSection === 'password' ? 'primary' : 'default'}
                    ghost={activeSection === 'password'}
                    icon={<LuLock size={14} />}
                    onClick={() => setActiveSection('password')}
                    size="small"
                >
                    Change Password
                </Button>
            </Space>

            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* Profile Edit Section */}
            {activeSection === 'profile' && (
                <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleProfileUpdate}
                    requiredMark={false}
                >
                    <Form.Item
                        name="name"
                        label="Display Name"
                        rules={[{ required: true, message: 'Name is required' }, { max: 100 }]}
                    >
                        <Input prefix={<LuUser />} placeholder="Your name" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[{ max: 20 }]}
                    >
                        <Input prefix={<LuPhone />} placeholder="Phone number" size="large" />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={profileLoading}
                            icon={<LuSave size={14} />}
                        >
                            Save Changes
                        </Button>
                    </Form.Item>
                </Form>
            )}

            {/* Change Password Section */}
            {activeSection === 'password' && (
                <>
                    {isOAuthUser && (
                        <div style={{
                            padding: '12px 16px',
                            background: token.colorInfoBg,
                            border: `1px solid ${token.colorInfoBorder}`,
                            borderRadius: token.borderRadiusLG,
                            marginBottom: 16,
                        }}>
                            <Space size={8}>
                                <LuShield size={16} style={{ color: token.colorInfo }} />
                                <Text style={{ fontSize: 13 }}>
                                    If you signed in with Google, you may not have a password set. Use this form only if you have an email/password login.
                                </Text>
                            </Space>
                        </div>
                    )}
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordChange}
                        requiredMark={false}
                    >
                        <Form.Item
                            name="currentPassword"
                            label="Current Password"
                            rules={[{ required: true, message: 'Current password is required' }]}
                        >
                            <Input.Password prefix={<LuLock />} placeholder="Current password" size="large" />
                        </Form.Item>
                        <Form.Item
                            name="newPassword"
                            label="New Password"
                            rules={[
                                { required: true, message: 'New password is required' },
                                { min: 6, message: 'Password must be at least 6 characters' },
                            ]}
                        >
                            <Input.Password prefix={<LuLock />} placeholder="New password" size="large" />
                        </Form.Item>
                        <Form.Item
                            name="confirmNewPassword"
                            label="Confirm New Password"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Please confirm your new password' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Passwords do not match'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LuLock />} placeholder="Confirm new password" size="large" />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={passwordLoading}
                                icon={<LuLock size={14} />}
                            >
                                Change Password
                            </Button>
                        </Form.Item>
                    </Form>
                </>
            )}
        </Modal>
    );
}

export default UserProfileModal;
