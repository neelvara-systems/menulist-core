'use client'
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorPageThemeWrapper from '@atoms/ErrorPageThemeWrapper';
import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { PLATFORM_URL } from '@constant/urls';
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
    const callbackParam = searchParams?.get('callbackUrl') || '';
    const safeCallbackUrl = callbackParam.startsWith('/') && !callbackParam.startsWith('//')
        ? callbackParam
        : '';
    const signInPath = safeCallbackUrl
        ? `${NAVIGARIONS_ROUTINGS.SIGNIN}?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`
        : NAVIGARIONS_ROUTINGS.SIGNIN;

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
        : "You don't have permission to access this page.";

    const secondaryMessage = isEmailError
        ? 'Please use a permanent email address from a standard provider (Gmail, Outlook, Yahoo, etc.)'
        : "Make sure you're signed in with the correct account. If you need access, contact your administrator.";

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
                            variant={isEmailError ? 'warningContext' : 'accessDeniedContext'}
                        />
                    )}
                    status={isEmailError ? 'warning' : 'info'}
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
                        <Flex gap={8} justify="center" wrap="wrap" style={{ marginTop: 8, maxWidth: '100%' }}>
                            <Button
                                size='large'
                                icon={<LuMail />}
                                style={{ minHeight: 44 }}
                                onClick={() => router.push(signInPath)}
                            >
                                {isEmailError ? 'Try Another Email' : 'Sign In Again'}
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

export default UnAuthorized
