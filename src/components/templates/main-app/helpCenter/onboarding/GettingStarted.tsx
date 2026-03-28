'use client';

import { Card, Checkbox, Flex, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { LuArrowRight } from 'react-icons/lu';

const { Title, Text, Link } = Typography;

const GettingStarted = () => {
    const t = useTranslations('HelpCenter');
    const onboardingSteps = [
        { label: t('step1Upload'), link: '/help/kb/articles/content-upload' },
        { label: t('step2Branding'), link: '/settings/branding' },
        { label: t('step3Changelog'), link: '/changelog/new' },
        { label: t('watchOverview'), link: '/help/demo' },
    ];

    return (
        <Card style={{ width: '100%', maxWidth: 1200 }}>
            <Flex vertical gap="middle">
                <Title level={4}>{t('quickStartGuide')}</Title>
                <Flex vertical gap="small">
                    {onboardingSteps.map((step, index) => (
                        <Card key={index} hoverable style={{ width: '100%' }}>
                            <Flex align="center" justify="space-between">
                                <Checkbox>{step.label}</Checkbox>
                                <Link href={step.link} style={{ display: 'flex', alignItems: 'center' }}>
                                    {t('go')} <LuArrowRight style={{ marginLeft: 4 }} />
                                </Link>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            </Flex>
        </Card>
    );
};

export default GettingStarted;
