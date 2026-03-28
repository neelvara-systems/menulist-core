import TextElement from '@antdComponent/textElement';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { UserDataType } from '@type/platform/user';
import { Button, Card, Divider, Empty, Flex, Tag } from 'antd';
import { Fragment, useContext } from 'react';
import { LuBrain, LuBriefcase, LuCalendar, LuClipboard, LuFile, LuMail, LuPalette, LuPen, LuPhoneCall, LuUser, LuUser2 } from 'react-icons/lu';
import AddressCard from './addressCard';

function UserDetails({ userDetails, onClickEdit }: { userDetails: UserDataType, onClickEdit?: any }) {

    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    console.log("storeDetails", storeDetails)
    return (
        <Card title='User Profile' style={{ width: '100%', height: "max-content" }} extra={<Button type='primary' ghost icon={<LuPen />} onClick={() => onClickEdit(userDetails)}>Edit User</Button>}>
            <Flex justify='flex-start' align='flex-start' vertical>

                <Flex gap={20}>
                    <img src={userDetails?.profileImage} style={{ width: 50, height: 50, borderRadius: 25 }} />
                    <Flex justify='flex-start' align='flex-start' vertical gap={10}>
                        <TextElement text={userDetails?.name} icon={<LuUser />} />
                        <TextElement text={userDetails?.email} icon={<LuMail />} />
                        <TextElement text={userDetails?.phoneNumber ? `${userDetails?.dialCode} ${userDetails?.phoneNumber}` : '-'} icon={<LuPhoneCall />} />
                        {userDetails?.alternatePhoneNumber && (
                            <TextElement
                                text={`${userDetails.alternatePhoneNumber.dialCode} ${userDetails.alternatePhoneNumber.phoneNumber}`}
                                icon={<LuPhoneCall />}
                            />
                        )}
                    </Flex>
                </Flex>
                <Divider />

                {/* Commissions */}
                <Flex vertical>
                    <TextElement text='Commissions' type='secondary' size='medium' />
                    {userDetails?.commissions ? <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                        <TextElement
                            text={`Product Commission: ${userDetails.commissions.product || 'Not set'}`}
                            icon={<LuBriefcase />}
                        />
                        <TextElement
                            text={`Service Commission: ${userDetails.commissions.service || 'Not set'}`}
                            icon={<LuBriefcase />}
                        />
                        <TextElement
                            text={`Voucher Commission: ${userDetails.commissions.voucher || 'Not set'}`}
                            icon={<LuBriefcase />}
                        />
                        <TextElement
                            text={`Gift Card Commission: ${userDetails.commissions.giftCard || 'Not set'}`}
                            icon={<LuBriefcase />}
                        />
                    </Flex> :
                        <TextElement text='Commissions not set' type='secondary' />}
                </Flex>
                <Divider />

                {/* Address */}
                <Flex vertical>
                    <TextElement text='Address' type='secondary' size='medium' />
                    {Boolean(userDetails?.addresses?.length) ? (
                        <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                            {userDetails?.addresses?.map((address: any, index) => (
                                <AddressCard key={index} address={address} />
                            ))}
                        </Flex>
                    ) : (
                        <TextElement text='Addresses not found' type='secondary' />
                    )}
                </Flex>
                <Divider />

                {/* Employment */}
                <Flex vertical>
                    <TextElement text='Employment' type='secondary' size='medium' />
                    {userDetails?.employment ? <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                        <TextElement
                            text={userDetails.employment.jobTitle}
                            icon={<LuBriefcase />}
                            type="secondary"
                        />
                        <TextElement
                            text={`${userDetails.employment.designation} • ${userDetails.employment.type}`}
                            icon={<LuBriefcase />}
                        />
                        <TextElement
                            text={`${userDetails.employment.startDate} - ${userDetails.employment.endDate || 'Present'}`}
                            icon={<LuCalendar />}
                        />
                    </Flex> : <TextElement text='Employment details not found' type='secondary' />}
                </Flex>
                <Divider />

                {/* Emergency Contact */}
                <Flex vertical>
                    <TextElement text='Emergency Contact' type='secondary' size='medium' />
                    {userDetails?.emergencyContact ? <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                        <TextElement
                            text={userDetails.emergencyContact.name}
                            icon={<LuUser />}
                        />
                        <TextElement
                            text={`${userDetails.emergencyContact.relation}`}
                            icon={<LuUser />}
                            type="secondary"
                        />
                        <TextElement
                            text={`${userDetails.emergencyContact.countryCode || ''} ${userDetails.emergencyContact.phoneNumber}`}
                            icon={<LuPhoneCall />}
                        />
                        <TextElement
                            text={userDetails.emergencyContact.email}
                            icon={<LuMail />}
                        />
                    </Flex>
                        : <TextElement text='Emergency contact not found' type='secondary' />}
                </Flex>
                <Divider />

                {/* Additional Documents */}
                <Flex vertical>
                    <TextElement text='Additional Documents' type='secondary' size='medium' />
                    {userDetails?.additionalDocuments?.length ? (
                        <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                            {userDetails.additionalDocuments.map((doc, index) => (
                                <Fragment key={index}>
                                    <TextElement
                                        text={`${doc.label} (${doc.type}${doc.size ? ` - ${(doc.size / 1024 / 1024).toFixed(2)}MB` : ''})`}
                                        icon={<LuFile />}
                                    />
                                    <img
                                        src={doc.url}
                                        alt={doc.label}
                                        style={{
                                            maxWidth: 200,
                                            maxHeight: 200,
                                            objectFit: 'contain',
                                            borderRadius: 8,
                                            border: '1px solid #d9d9d9'
                                        }}
                                    />
                                </Fragment>
                            ))}
                        </Flex>
                    ) : (
                        <TextElement text='No additional documents found' type='secondary' />
                    )}
                </Flex>
                <Divider />

                {/* Store Access */}
                <Flex vertical>
                    <TextElement text='Store Access' type='secondary' size='medium' />
                    {userDetails?.stores && userDetails.stores.length > 0 ? (
                        <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                            {userDetails.stores.map((store, index) => (
                                <Flex key={index} vertical gap={5}>
                                    <TextElement
                                        text={store.name}
                                        icon={<LuBriefcase />}
                                    />
                                    {/* <Flex gap={8} wrap="wrap">
                                        {store.roles.map((roleId, roleIndex) => {
                                            const roleName = storeDetails?.roles?.find(r => r.id == roleId)?.name || roleId;
                                            return (
                                                <Tag key={roleIndex} color="blue">
                                                    {roleName}
                                                </Tag>
                                            );
                                        })}
                                    </Flex> */}
                                </Flex>
                            ))}
                        </Flex>
                    ) : (
                        <Empty description="No stores assigned" style={{ padding: '12px 0' }} />
                    )}
                </Flex>
                <Divider />

                {/* Extra Information */}
                <Flex vertical>
                    <TextElement text='Additional Information' type='secondary' size='medium' />
                    <Flex vertical gap={10} style={{ padding: '12px 0' }}>
                        {userDetails?.birthday && (
                            <TextElement
                                text={`Birthday: ${userDetails.birthday}`}
                                icon={<LuCalendar />}
                            />
                        )}
                        {userDetails?.color && (
                            <Flex align="center" gap={8}>
                                <TextElement
                                    text={`Color: ${userDetails.color}`}
                                    icon={<LuPalette />}
                                />
                                <div style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: userDetails.color,
                                    borderRadius: 4,
                                    border: '1px solid #d9d9d9'
                                }} />
                            </Flex>
                        )}
                        {userDetails?.notes && (
                            <TextElement
                                text={`Notes: ${userDetails.notes}`}
                                icon={<LuClipboard />}
                            />
                        )}
                        {userDetails?.gender && (
                            <TextElement
                                text={`Gender: ${userDetails.gender.charAt(0).toUpperCase() + userDetails.gender.slice(1)}`}
                                icon={<LuUser2 />}
                            />
                        )}
                        {userDetails?.skills && (
                            <Flex gap={5} wrap="wrap">
                                <TextElement
                                    text="Skills:"
                                    icon={<LuBrain />}
                                />
                                {userDetails.skills.split(",").map((skill, index) => (
                                    <Tag key={index} style={{ fontSize: 12, lineHeight: 2 }}>{skill}</Tag>
                                ))}
                            </Flex>
                        )}
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    )
}

export default UserDetails