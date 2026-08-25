'use client'
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorPageThemeWrapper from '@atoms/ErrorPageThemeWrapper';
import { PLATFORM_URL } from '@constant/urls';
import { Button, Flex, Result, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuHome } from 'react-icons/lu';

const { Paragraph } = Typography;

function NotFound() {
    const router = useRouter();
    const { token } = theme.useToken();

    return (
        <ErrorPageThemeWrapper>
            <Flex
                vertical
                justify='center'
                align='center'
                style={{ boxSizing: 'border-box', minHeight: '100dvh', padding: 24 }}
            >
                <Result
                    style={{ width: '100%', maxWidth: 560, padding: 0 }}
                    icon={(
                        <ContextualStateIllustration
                            color={token.colorTextQuaternary}
                            size={192}
                            style={{ width: 'clamp(112px, 36vw, 192px)' }}
                            variant="notFoundContext"
                        />
                    )}
                    status="info"
                    title="Page Not Found"
                    subTitle={
                        <Flex vertical align="center" gap={8} style={{ maxWidth: 480 }}>
                            <Paragraph style={{ fontSize: 15, margin: 0, textAlign: 'center' }}>
                                The page you&apos;re looking for doesn&apos;t exist or has been moved.
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
                                Try going back to the previous page or head to the home page.
                            </Paragraph>
                        </Flex>
                    }
                    extra={
                        <Flex gap={12} justify="center" style={{ marginTop: 8 }}>
                            <Button
                                size='large'
                                icon={<LuArrowLeft />}
                                style={{ minHeight: 44 }}
                                onClick={() => router.back()}
                            >
                                Go Back
                            </Button>
                            <Button
                                size='large'
                                type="primary"
                                icon={<LuHome />}
                                style={{ minHeight: 44 }}
                                onClick={() => window.location.assign(PLATFORM_URL)}
                            >
                                Go Home
                            </Button>
                        </Flex>
                    }
                />
            </Flex>
        </ErrorPageThemeWrapper>
    )
}

export default NotFound
