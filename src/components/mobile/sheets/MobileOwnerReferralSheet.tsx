'use client';

import { useOwnerReferral } from '@hook/useOwnerReferral';
import { getContentCreditOutcomeExamples } from '@data/shared/contentCreditPolicy';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { LuCopy, LuGift, LuMessageCircle, LuShare2, LuX } from 'react-icons/lu';
import { Button, Flex, NavBar, Popup, Tag, Text, Toast } from '../antd';

export default function MobileOwnerReferralSheet({ onClose, visible }: {
    onClose: () => void;
    visible: boolean;
}) {
    const { token } = theme.useToken();
    const t = useTranslations('OwnerReferral');
    const referral = useOwnerReferral();
    const referrerExamples = getContentCreditOutcomeExamples(referral.data?.policy.referrerCredits || 0);
    const referredExamples = getContentCreditOutcomeExamples(referral.data?.policy.referredCredits || 0);

    useEffect(() => {
        if (visible) void referral.load();
    }, [visible, referral.load]);

    const copy = async () => {
        try {
            await referral.copyInvite();
            Toast.show({ content: t('invitationCopied'), duration: 1500, icon: 'success' });
        } catch {
            Toast.show({ content: t('copyFailed'), duration: 1800 });
        }
    };

    const nativeShare = async () => {
        try {
            const shared = await referral.shareNative();
            if (!shared) await copy();
        } catch (error: any) {
            if (error?.name !== 'AbortError') {
                Toast.show({ content: t('shareFailed'), duration: 1800 });
            }
        }
    };

    return (
        <Popup
            bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
            destroyOnClose={false}
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={{ maxHeight: '92vh' }} vertical>
                <NavBar backIcon={<LuX size={20} />} onBack={onClose}>{t('title')}</NavBar>
                <Flex gap={14} style={{ overflowY: 'auto', padding: '12px 14px calc(18px + env(safe-area-inset-bottom))' }} vertical>
                    {referral.isLoading ? (
                        <Text style={{ color: token.colorTextSecondary, paddingBlock: 44, textAlign: 'center' }}>
                            {t('preparing')}
                        </Text>
                    ) : referral.error || !referral.data ? (
                        <Flex align="center" gap={12} style={{ paddingBlock: 32 }} vertical>
                            <Text style={{ color: token.colorTextSecondary, textAlign: 'center' }}>
                                {t('unavailable')}
                            </Text>
                            <Button fill="outline" onClick={() => void referral.load()}>{t('tryAgain')}</Button>
                        </Flex>
                    ) : (
                        <>
                            <Flex gap={10} vertical>
                                <Flex gap={3} vertical>
                                    <Flex align="center" gap={9}>
                                        <LuGift size={19} />
                                        <Text><strong>{t('yourBusiness')}:</strong> {referral.data.policy.referrerCredits} {t('credits')}</Text>
                                    </Flex>
                                    <Text style={{ color: token.colorTextSecondary }}>
                                        {t('creditExample', {
                                            descriptions: referrerExamples.descriptionRewrites,
                                            images: referrerExamples.generatedMenuImages,
                                        })}
                                    </Text>
                                </Flex>
                                <Flex gap={3} vertical>
                                    <Flex align="center" gap={9}>
                                        <LuGift size={19} />
                                        <Text><strong>{t('invitedBusiness')}:</strong> {referral.data.policy.referredCredits} {t('credits')}</Text>
                                    </Flex>
                                    <Text style={{ color: token.colorTextSecondary }}>
                                        {t('creditExample', {
                                            descriptions: referredExamples.descriptionRewrites,
                                            images: referredExamples.generatedMenuImages,
                                        })}
                                    </Text>
                                </Flex>
                                <Text style={{ color: token.colorTextSecondary }}>
                                    {t('rewardRule')}
                                </Text>
                            </Flex>

                            <Button block icon={<LuShare2 size={18} />} onClick={() => void nativeShare()} size="large">
                                {t('shareInvitation')}
                            </Button>
                            <Flex gap={10}>
                                <Button block fill="outline" icon={<LuMessageCircle size={18} />} onClick={referral.openWhatsApp} size="large">
                                    {t('whatsApp')}
                                </Button>
                                <Button block fill="outline" icon={<LuCopy size={18} />} onClick={() => void copy()} size="large">
                                    {t('copy')}
                                </Button>
                            </Flex>

                            <Text strong style={{ marginTop: 8 }}>{t('recentInvitations')}</Text>
                            {referral.data.recent.length === 0 ? (
                                <Text style={{ color: token.colorTextSecondary }}>
                                    {t('noRecentInvitations')}
                                </Text>
                            ) : referral.data.recent.map((item) => {
                                const status = item.status === 'issued'
                                    ? { color: 'success', label: t('status.issued') }
                                    : { color: 'default', label: t('status.waitingForPayment') };
                                return (
                                    <Flex
                                        align="center"
                                        gap={8}
                                        justify="space-between"
                                        key={`${item.businessName}-${item.date}`}
                                        style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, minHeight: 58, paddingBlock: 8 }}
                                    >
                                        <Flex gap={2} style={{ flex: '1 1 0', minWidth: 0 }} vertical>
                                            <Text
                                                strong
                                                style={{
                                                    display: '-webkit-box',
                                                    lineHeight: '22px',
                                                    maxHeight: 44,
                                                    overflow: 'hidden',
                                                    WebkitBoxOrient: 'vertical',
                                                    WebkitLineClamp: 2,
                                                    wordBreak: 'break-word',
                                                }}
                                                title={item.businessName}
                                            >
                                                {item.businessName}
                                            </Text>
                                            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                                                {new Date(item.date).toLocaleDateString()}
                                            </Text>
                                        </Flex>
                                        <Tag color={status.color} style={{ flexShrink: 0, marginInlineEnd: 0 }}>{status.label}</Tag>
                                    </Flex>
                                );
                            })}
                        </>
                    )}
                </Flex>
            </Flex>
        </Popup>
    );
}
