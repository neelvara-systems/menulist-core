'use client'

import { Flex, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LuCheckCircle2 } from 'react-icons/lu';

const { Text } = Typography;

function LandingFooter() {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    return (
        <Flex
            vertical
            gap={12}
            style={{
                width: '100%',
                paddingTop: 24,
                paddingBottom: 24,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                textAlign: 'center',
                marginTop: 24,
            }}
        >
            <Flex wrap justify="center" gap={16} align="center" style={{ fontWeight: 500 }}>
                <Link href="/app/dashboard" style={{ color: token.colorText, textDecoration: 'none' }}>
                    {t('backToDashboard')}
                </Link>
                <Link href="/app/help-center?tab=contact-us" style={{ color: token.colorText, textDecoration: 'none' }}>
                    {t('contactUs')}
                </Link>
                <Flex align="center" gap={8}>
                    <LuCheckCircle2 color={token.colorSuccess} size={16} />
                    <Text style={{ margin: 0, fontWeight: 500 }}>{t('allSystemsOperational')}</Text>
                </Flex>
            </Flex>

            <Flex wrap justify="center" gap={12} align="center">
                <Text type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    © 2025 MenulistAI
                </Text>
                <Link href="/terms" style={{ color: token.colorTextSecondary, fontSize: 12 }}>{t('terms')}</Link>
                <Link href="/privacy" style={{ color: token.colorTextSecondary, fontSize: 12 }}>{t('privacy')}</Link>
                <Link href="/blog" style={{ color: token.colorTextSecondary, fontSize: 12 }}>{t('blog')}</Link>
                <Link href="/use-cases" style={{ color: token.colorTextSecondary, fontSize: 12 }}>{t('useCases')}</Link>
                {/* <Link href="/api" style={{ color: token.colorTextSecondary, fontSize: 12 }}>API</Link> */}
            </Flex>
        </Flex>
    );
}

export default LandingFooter;
