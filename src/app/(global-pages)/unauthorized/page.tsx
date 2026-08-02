'use client'
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorPageThemeWrapper from '@atoms/ErrorPageThemeWrapper';
import { HOME_ROUTING, NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { Button, Flex, Result, Typography, theme } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuHome, LuMail } from 'react-icons/lu';

const { Paragraph } = Typography;

function UnAuthorized() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();

    // Get error message from query parameter
    const errorParam = searchParams?.get('error') || '';

    // Check if this is an email validation error
    const isEmailError = (
        errorParam.includes('disposable') ||
        errorParam.includes('temporary') ||
        errorParam.includes('email') ||
        errorParam.includes('domain')
    );

    // Custom messages for different scenarios
    const title = isEmailError ? 'Email Not Allowed' : 'Access Denied';

    const primaryMessage = isEmailError
        ? 'This email address cannot be used to sign in.'
        : 'You don&apos;t have permission to access this page.';

    const secondaryMessage = isEmailError
        ? 'Please use a permanent email address from a standard provider (Gmail, Outlook, Yahoo, etc.)'
        : 'Make sure you&apos;re signed in with the correct account. If you need access, contact your administrator.';

    return (
        <ErrorPageThemeWrapper>
            <Flex vertical justify='center' align='center' style={{ minHeight: "100vh", padding: 24 }}>
                <Result
                    icon={(
                        <ContextualStateIllustration
                            color={token.colorTextQuaternary}
                            size={192}
                            variant={isEmailError ? 'warningContext' : 'accessDeniedContext'}
                        />
                    )}
                    status={isEmailError ? 'warning' : '403'}
                    title={title}
                    subTitle={
                        <Flex vertical align="center" gap={8} style={{ maxWidth: 480 }}>
                            <Paragraph style={{ fontSize: 15, margin: 0, textAlign: 'center' }}>
                                {primaryMessage}
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
                                {secondaryMessage}
                            </Paragraph>
                        </Flex>
                    }
                    extra={
                        <Flex gap={12} justify="center" style={{ marginTop: 8 }}>
                            <Button
                                size='large'
                                icon={<LuMail />}
                                onClick={() => router.push(NAVIGARIONS_ROUTINGS.SIGNIN)}
                            >
                                {isEmailError ? 'Try Another Email' : 'Sign In Again'}
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

export default UnAuthorized
