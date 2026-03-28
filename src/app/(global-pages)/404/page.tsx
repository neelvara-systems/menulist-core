'use client'
import ErrorPageThemeWrapper from '@atoms/ErrorPageThemeWrapper';
import { HOME_ROUTING } from '@constant/navigations';
import { Button, Flex, Result, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuHome } from 'react-icons/lu';

const { Paragraph } = Typography;

function NotFound() {
    const router = useRouter();

    return (
        <ErrorPageThemeWrapper>
            <Flex vertical justify='center' align='center' style={{ minHeight: "100vh", padding: 24 }}>
                <Result
                    status="404"
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
                                onClick={() => router.back()}
                            >
                                Go Back
                            </Button>
                            <Button
                                size='large'
                                type="primary"
                                icon={<LuHome />}
                                onClick={() => router.push(HOME_ROUTING)}
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