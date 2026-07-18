import TextElement from '@antdComponent/textElement';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { UserDataType } from '@type/platform/user';
import { Avatar, Button, Card, Divider, Empty, Flex, Tag, Typography, theme } from 'antd';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { LuBuilding2, LuKeyRound, LuMail, LuPen, LuPhoneCall, LuShieldCheck, LuStore, LuUser, LuUserCheck, LuUserX } from 'react-icons/lu';

const { Text } = Typography;

function UserDetails({ canEdit = true, userDetails, onClickEdit }: { canEdit?: boolean, userDetails: UserDataType, onClickEdit?: any }) {
    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const stores = Array.isArray(userDetails?.stores) ? userDetails.stores : [];
    const staffLoginId = (userDetails as any)?.staffLoginId || (userDetails as any)?.loginUsername || '';
    const isOwnerPasscodeLogin = (userDetails as any)?.staffAuthMode === 'owner_passcode';
    const displayEmail = isOwnerPasscodeLogin
        ? ''
        : (userDetails as any)?.displayEmail || userDetails?.email || '';
    const phoneLabel = userDetails?.phoneNumber ? `${userDetails?.dialCode || ''} ${userDetails.phoneNumber}`.trim() : '';
    const alternatePhoneLabel = userDetails?.alternatePhoneNumber?.phoneNumber
        ? `${userDetails.alternatePhoneNumber.dialCode || ''} ${userDetails.alternatePhoneNumber.phoneNumber}`.trim()
        : '';

    const getStoreRecord = (storeId: number) => {
        const tenantStore = tenantDetails?.storesList?.find((store: any) => Number(store?.storeId) === Number(storeId));
        return tenantStore?.storeDetails || tenantStore || (Number(storeDetails?.storeId) === Number(storeId) ? storeDetails : null);
    };

    const resolveStoreName = (store: any) => {
        const storeRecord = getStoreRecord(Number(store?.storeId));
        return getStoreContextName(storeRecord || store, `Store ${store?.storeId ?? ''}`);
    };

    const resolveRoleName = (store: any) => {
        const storeRecord = getStoreRecord(Number(store?.storeId));
        return (storeRecord as any)?.roles?.find((role: any) => role.id === store?.role)?.name || store?.role || 'No role set';
    };

    const renderInfoRow = (icon: ReactNode, label: string, value?: string) => (
        <Flex align="flex-start" gap={10}>
            <span style={{ color: token.colorTextSecondary, lineHeight: 1.8 }}>{icon}</span>
            <Flex vertical gap={2}>
                <Text type="secondary">{label}</Text>
                <Text>{value || '-'}</Text>
            </Flex>
        </Flex>
    );

    const statusTag = userDetails?.active !== false
        ? <Tag color="green" icon={<LuUserCheck />}>Active</Tag>
        : <Tag color="error" icon={<LuUserX />}>Deactivated</Tag>;
    const authDisabledTag = (userDetails as any)?.authDisabled === true
        ? <Tag color="warning">Login disabled</Tag>
        : null;

    return (
        <Card
            extra={<Button disabled={!canEdit} type="primary" ghost icon={<LuPen />} onClick={() => onClickEdit(userDetails)}>Edit User</Button>}
            style={{ width: '100%', height: 'max-content' }}
            title="User Profile"
        >
            <Flex justify="flex-start" align="flex-start" vertical>
                <Flex align="flex-start" gap={20} style={{ width: '100%' }}>
                    <Avatar
                        icon={<LuUser />}
                        size={50}
                        src={userDetails?.profileImage || undefined}
                        style={{ flexShrink: 0 }}
                    />
                    <Flex justify="flex-start" align="flex-start" vertical gap={8} style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 16 }}>{userDetails?.name || 'Unnamed staff member'}</Text>
                        <Flex gap={6} wrap="wrap">
                            {statusTag}
                            {authDisabledTag}
                            <Tag color={isOwnerPasscodeLogin ? 'blue' : 'default'}>
                                {isOwnerPasscodeLogin ? 'Staff ID login' : 'Email login'}
                            </Tag>
                        </Flex>
                    </Flex>
                </Flex>

                <Divider />

                <Flex vertical gap={14} style={{ width: '100%' }}>
                    <TextElement text="Account Access" type="secondary" size="medium" />
                    {renderInfoRow(<LuUser />, 'Name', userDetails?.name)}
                    {displayEmail ? renderInfoRow(<LuMail />, 'Email', displayEmail) : null}
                    {staffLoginId ? renderInfoRow(<LuKeyRound />, 'Staff ID', staffLoginId) : null}
                    {renderInfoRow(<LuPhoneCall />, 'Phone', phoneLabel)}
                    {alternatePhoneLabel ? renderInfoRow(<LuPhoneCall />, 'Alternate phone', alternatePhoneLabel) : null}
                </Flex>

                <Divider />

                <Flex vertical gap={14} style={{ width: '100%' }}>
                    <TextElement text="Store Access" type="secondary" size="medium" />
                    {stores.length ? (
                        <Flex vertical gap={10}>
                            {stores.map((store: any) => (
                                <Flex
                                    align="center"
                                    gap={12}
                                    justify="space-between"
                                    key={`${store.storeId}-${store.role}`}
                                    style={{
                                        background: token.colorFillQuaternary,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        padding: 12,
                                    }}
                                >
                                    <Flex align="center" gap={10}>
                                        <LuStore color={token.colorTextSecondary} />
                                        <Flex vertical gap={2}>
                                            <Text>{resolveStoreName(store)}</Text>
                                            <Text type="secondary">Store ID {store.storeId}</Text>
                                        </Flex>
                                    </Flex>
                                    <Flex gap={6} wrap="wrap" justify="flex-end">
                                        {Number(store.storeId) === Number(userDetails?.storeId)
                                            ? <Tag color="blue" icon={<LuBuilding2 />}>Default</Tag>
                                            : null}
                                        <Tag icon={<LuShieldCheck />}>{resolveRoleName(store)}</Tag>
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    ) : (
                        <Empty description="No store access assigned" style={{ padding: '12px 0' }} />
                    )}
                </Flex>

                <Divider />

                <Flex vertical gap={8} style={{ width: '100%' }}>
                    <TextElement text="Permissions" type="secondary" size="medium" />
                    <Text type="secondary">Permissions are controlled by the role assigned for each store.</Text>
                </Flex>
            </Flex>
        </Card>
    );
}

export default UserDetails;
