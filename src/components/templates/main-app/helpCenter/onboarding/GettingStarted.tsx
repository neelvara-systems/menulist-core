'use client';

import { helpCenterTabRouting } from '@constant/navigations';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuArrowRight } from 'react-icons/lu';

const { Title, Text, Link } = Typography;

const GettingStarted = () => {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();
    const onboardingSteps = [
        { label: t('step1Menu'), link: '/projects' },
        { label: t('step2CustomerPage'), link: '/projects?view=b2c' },
        { label: t('step3Share'), link: '/use-menulist' },
        { label: t('findHelp'), link: helpCenterTabRouting('kb') },
    ];

    return (
        <Card style={{ width: '100%', maxWidth: 1200 }}>
            <Flex vertical gap="middle">
                <Title level={4}>{t('quickStartGuide')}</Title>
                <Flex vertical>
                    {onboardingSteps.map((step, index) => (
                        <Link
                            href={step.link}
                            key={step.link}
                            style={{
                                borderTop: index === 0 ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                                display: 'block',
                                padding: '14px 0',
                            }}
                        >
                            <Flex align="center" justify="space-between" gap={16}>
                                <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                                    <Text
                                        aria-hidden
                                        style={{ color: token.colorTextSecondary, flex: '0 0 24px', fontSize: 13 }}
                                    >
                                        {index + 1}
                                    </Text>
                                    <Text strong>{step.label}</Text>
                                </Flex>
                                <Flex align="center" gap={6} style={{ flex: '0 0 auto' }}>
                                    <Text type="secondary">{t('go')}</Text>
                                    <LuArrowRight aria-hidden />
                                </Flex>
                            </Flex>
                        </Link>
                    ))}
                </Flex>
            </Flex>
        </Card>
    );
};

export default GettingStarted;
