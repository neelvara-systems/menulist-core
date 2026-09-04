'use client'
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorPageThemeWrapper from '@atoms/ErrorPageThemeWrapper';
import { ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX, isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { getPlatformWebsiteBaseUrl } from '@constant/urls';
import { signOutSession } from '@lib/auth/client';
import { maskOwnerAccountIdentifier } from '@lib/onboarding/ownerAccessRecovery';
import { Button, Flex, Result, Typography, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LuHelpCircle, LuMail, LuRefreshCw } from 'react-icons/lu';

const { Paragraph } = Typography;

function UnAuthorized() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
    const [switchAccountError, setSwitchAccountError] = useState('');

    // Get error message from query parameter
    const errorParam = searchParams?.get('error') || '';
    const callbackParam = searchParams?.get('callbackUrl') || '';
    const isAnswerlattice = searchParams?.get('product') === 'answerlattice';
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
    const title = isEmailError ? 'Use another email' : 'This account cannot open this business';

    const primaryMessage = isEmailError
        ? 'This email address cannot be used to sign in.'
        : 'This account does not have access to this business.';

    const secondaryMessage = isEmailError
        ? 'Please use a permanent email address from a standard provider (Gmail, Outlook, Yahoo, etc.)'
        : 'You are signed in, but this account is not connected to this business. Try another account or contact support.';
    const maskedAccount = maskOwnerAccountIdentifier(session?.user?.email || session?.user?.name);

    const handleTryAnotherAccount = async () => {
        setIsSwitchingAccount(true);
        setSwitchAccountError('');
        try {
            await signOutSession(signInPath, { redirectOnIntentionalSignOut: false });
            router.replace(signInPath);
        } catch {
            setSwitchAccountError('Could not switch accounts. Please try again.');
            setIsSwitchingAccount(false);
        }
    };

    const openProductHelp = () => {
        if (isAnswerlattice) {
            const isAnswerlatticeHost = typeof window !== 'undefined'
                && isAnswerlatticeProductHostname(window.location.hostname);
            window.location.assign(isAnswerlatticeHost
                ? new URL('/contact', window.location.origin).toString()
                : new URL(`${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/contact`, window.location.origin).toString());
            return;
        }

        window.location.assign(new URL('/contact', getPlatformWebsiteBaseUrl()).toString());
    };

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
                            {!isEmailError && maskedAccount ? (
                                <Paragraph strong style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
                                    Signed in as {maskedAccount}
                                </Paragraph>
                            ) : null}
                            <Paragraph style={{ color: token.colorTextSecondary, fontSize: 13, margin: 0, textAlign: 'center' }}>
                                {secondaryMessage}
                            </Paragraph>
                            {switchAccountError ? (
                                <Paragraph aria-live="assertive" style={{ color: token.colorError, fontSize: 13, margin: 0, textAlign: 'center' }}>
                                    {switchAccountError}
                                </Paragraph>
                            ) : null}
                        </Flex>
                    }
                    extra={
                        <Flex gap={8} justify="center" wrap="wrap" style={{ marginTop: 8, maxWidth: '100%' }}>
                            <Button
                                size='large'
                                icon={isEmailError ? <LuMail /> : <LuRefreshCw />}
                                loading={isSwitchingAccount}
                                style={{ minHeight: 44 }}
                                onClick={isEmailError ? () => router.push(signInPath) : handleTryAnotherAccount}
                            >
                                {isEmailError ? 'Try another email' : 'Try another account'}
                            </Button>
                            <Button
                                size='large'
                                type="primary"
                                icon={<LuHelpCircle />}
                                style={{ minHeight: 44 }}
                                onClick={openProductHelp}
                            >
                                Get help
                            </Button>
                        </Flex>
                    }
                />
            </Flex>
        </ErrorPageThemeWrapper>
    )
}

export default UnAuthorized
