'use client';

import { helpCenterTabRouting } from '@constant/navigations';
import { Button, Card, Collapse, Flex, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuBookOpen, LuLayoutDashboard, LuLifeBuoy, LuMail } from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;

const SUPPORT_EMAIL = 'support@menulist.ai';

export type MenuListHelpSection = 'home' | 'faq' | 'contact-us';

export const normalizeMenuListHelpSection = (value?: string | null): MenuListHelpSection => {
    if (value === 'kb' || value === 'faq') return 'faq';
    if (value === 'ticket' || value === 'feedback' || value === 'contact-us') return 'contact-us';
    return 'home';
};

interface MenuListHelpCenterProps {
    initialSection?: string | null;
}

export default function MenuListHelpCenter({ initialSection }: MenuListHelpCenterProps) {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();
    const section = normalizeMenuListHelpSection(initialSection);
    const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('MenuList support request')}`;
    const faqItems = [
        { key: 'subscription', label: t('faqUpgrade'), children: <Text>{t('faqUpgradeAnswer')}</Text> },
        { key: 'formats', label: t('faqFormats'), children: <Text>{t('faqFormatsAnswer')}</Text> },
        { key: 'processing', label: t('faqProcessing'), children: <Text>{t('faqProcessingAnswer')}</Text> },
        { key: 'editing', label: t('faqEdit'), children: <Text>{t('faqEditAnswer')}</Text> },
    ];
    const containerStyle = { margin: '0 auto', maxWidth: 920, width: '100%' } as const;

    if (section === 'faq') {
        return (
            <Card style={containerStyle}>
                <Flex vertical gap={20}>
                    <div>
                        <Title level={2} style={{ marginBottom: 6 }}>{t('readFaq')}</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('readFaqDesc')}</Paragraph>
                    </div>
                    <Collapse accordion items={faqItems} />
                    <Flex gap={10} wrap>
                        <Button icon={<LuLifeBuoy aria-hidden="true" />} href={helpCenterTabRouting('contact-us')} type="primary">
                            {t('contactUs')}
                        </Button>
                        <Button href={helpCenterTabRouting('home')}>{t('backToHome')}</Button>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    if (section === 'contact-us') {
        return (
            <Card style={containerStyle}>
                <Flex vertical gap={20}>
                    <div>
                        <Title level={2} style={{ marginBottom: 6 }}>{t('contactUs')}</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('contactUsDesc')}</Paragraph>
                    </div>
                    <Card size="small" style={{ background: token.colorFillQuaternary }}>
                        <Flex align="flex-start" gap={12} wrap>
                            <LuMail aria-hidden="true" color={token.colorPrimary} size={22} />
                            <Flex vertical gap={4} style={{ minWidth: 0 }}>
                                <Text strong>{t('contactEmailTitle')}</Text>
                                <Text type="secondary">{t('contactEmailDesc')}</Text>
                                <Button href={supportHref} style={{ marginTop: 8 }} type="primary">
                                    {SUPPORT_EMAIL}
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                    <Flex gap={10} wrap>
                        <Button icon={<LuBookOpen aria-hidden="true" />} href={helpCenterTabRouting('faq')}>
                            {t('readFaq')}
                        </Button>
                        <Button href={helpCenterTabRouting('home')}>{t('backToHome')}</Button>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    return (
        <Card style={containerStyle}>
            <Flex vertical gap={24}>
                <div>
                    <Title level={2} style={{ marginBottom: 6 }}>
                        {t('heroTitle')} {t('heroTitleHighlight')}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('knowledgeBaseDesc')}</Paragraph>
                </div>
                <Flex gap={12} wrap>
                    <Button icon={<LuBookOpen aria-hidden="true" />} href={helpCenterTabRouting('faq')} size="large" type="primary">
                        {t('readFaq')}
                    </Button>
                    <Button icon={<LuLifeBuoy aria-hidden="true" />} href={helpCenterTabRouting('contact-us')} size="large">
                        {t('contactUs')}
                    </Button>
                    <Button href="/dashboard" icon={<LuLayoutDashboard aria-hidden="true" />} size="large">
                        {t('backToDashboard')}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
