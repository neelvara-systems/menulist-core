'use client';

import { useOwnerReferral } from '@hook/useOwnerReferral';
import { getContentCreditOutcomeExamples } from '@data/shared/contentCreditPolicy';
import { Button, Divider, Empty, Flex, List, Modal, Tag, Typography, message } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCopy, LuGift, LuMessageCircle, LuShare2, LuUserPlus } from 'react-icons/lu';

const { Text, Title } = Typography;

export default function OwnerReferralModal() {
    const t = useTranslations('OwnerReferral');
    const [open, setOpen] = useState(false);
    const referral = useOwnerReferral();
    const referrerExamples = getContentCreditOutcomeExamples(referral.data?.policy.referrerCredits || 0);
    const referredExamples = getContentCreditOutcomeExamples(referral.data?.policy.referredCredits || 0);

    const openModal = () => {
        setOpen(true);
        void referral.load();
    };

    const copy = async () => {
        try {
            await referral.copyInvite();
            message.success(t('invitationCopied'));
        } catch {
            message.error(t('copyFailed'));
        }
    };

    const nativeShare = async () => {
        try {
            const shared = await referral.shareNative();
            if (!shared) await copy();
        } catch (error: any) {
            if (error?.name !== 'AbortError') message.error(t('shareFailed'));
        }
    };

    return (
        <>
            <Button icon={<LuUserPlus size={16} />} onClick={openModal} size="large">
                {t('title')}
            </Button>
            <Modal
                destroyOnHidden={false}
                footer={null}
                onCancel={() => setOpen(false)}
                open={open}
                title={t('title')}
                width={620}
            >
                {referral.isLoading ? (
                    <Flex align="center" justify="center" style={{ minHeight: 220 }}>
                        <Text type="secondary">{t('preparing')}</Text>
                    </Flex>
                ) : referral.error || !referral.data ? (
                    <Empty
                        description={t('unavailable')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button onClick={() => void referral.load()}>{t('tryAgain')}</Button>
                    </Empty>
                ) : (
                    <Flex gap={16} vertical>
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Flex align="center" gap={8}>
                                    <LuGift size={19} />
                                    <Text><strong>{t('yourBusiness')}:</strong> {referral.data.policy.referrerCredits} {t('credits')}</Text>
                                </Flex>
                                <Text type="secondary">
                                    {t('creditExample', {
                                        descriptions: referrerExamples.descriptionRewrites,
                                        images: referrerExamples.generatedMenuImages,
                                    })}
                                </Text>
                            </Flex>
                            <Flex gap={4} vertical>
                                <Flex align="center" gap={8}>
                                    <LuGift size={19} />
                                    <Text><strong>{t('invitedBusiness')}:</strong> {referral.data.policy.referredCredits} {t('credits')}</Text>
                                </Flex>
                                <Text type="secondary">
                                    {t('creditExample', {
                                        descriptions: referredExamples.descriptionRewrites,
                                        images: referredExamples.generatedMenuImages,
                                    })}
                                </Text>
                            </Flex>
                        </Flex>
                        <Text type="secondary">
                            {t('rewardRule')}
                        </Text>
                        <Flex gap={10} wrap="wrap">
                            <Button icon={<LuShare2 size={16} />} onClick={() => void nativeShare()} type="primary">
                                {t('share')}
                            </Button>
                            <Button icon={<LuMessageCircle size={16} />} onClick={referral.openWhatsApp}>
                                {t('whatsApp')}
                            </Button>
                            <Button icon={<LuCopy size={16} />} onClick={() => void copy()}>
                                {t('copy')}
                            </Button>
                        </Flex>

                        <Divider style={{ margin: '4px 0' }} />
                        <Title level={5} style={{ margin: 0 }}>{t('recentInvitations')}</Title>
                        {referral.data.recent.length === 0 ? (
                            <Text type="secondary">{t('noRecentInvitations')}</Text>
                        ) : (
                            <List
                                dataSource={referral.data.recent}
                                renderItem={(item) => {
                                    const status = item.status === 'issued'
                                        ? { color: 'success', label: t('status.issued') }
                                        : { color: 'default', label: t('status.waitingForPayment') };
                                    return (
                                        <List.Item extra={<Tag color={status.color}>{status.label}</Tag>}>
                                            <List.Item.Meta
                                                title={<span title={item.businessName}>{item.businessName}</span>}
                                                description={new Date(item.date).toLocaleDateString()}
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </Flex>
                )}
            </Modal>
        </>
    );
}
