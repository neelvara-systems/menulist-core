'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { Button, Flex, Result, theme } from 'antd';
import { LuLogOut, LuRefreshCw } from 'react-icons/lu';

type StoreAccessRecoveryProps = {
    brand?: 'menulist' | 'answerlattice';
    onRetry: () => void;
    onSignOut: () => void;
};

export default function StoreAccessRecovery({
    brand = 'menulist',
    onRetry,
    onSignOut,
}: StoreAccessRecoveryProps) {
    const { token } = theme.useToken();
    const productName = brand === 'answerlattice' ? 'Answerlattice' : 'MenuList';

    return (
        <main
            aria-labelledby="store-access-recovery-title"
            data-recovery-source="firebase-store-access"
            style={{
                alignItems: 'center',
                background: token.colorBgLayout,
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
                minHeight: '100dvh',
                padding: 24,
                width: '100%',
            }}
        >
            <Result
                extra={(
                    <Flex gap={8} justify="center" wrap="wrap">
                        <Button
                            icon={<LuRefreshCw aria-hidden="true" />}
                            onClick={onRetry}
                            style={{ minHeight: 44 }}
                            type="primary"
                        >
                            Try again
                        </Button>
                        <Button
                            icon={<LuLogOut aria-hidden="true" />}
                            onClick={onSignOut}
                            style={{ minHeight: 44 }}
                        >
                            Sign out
                        </Button>
                    </Flex>
                )}
                icon={(
                    <ContextualStateIllustration
                        color={token.colorTextQuaternary}
                        size={152}
                        style={{ width: 'clamp(112px, 36vw, 152px)' }}
                        variant="accessDeniedContext"
                    />
                )}
                status="info"
                subTitle={`We couldn't connect ${productName} to this store. Try again in a moment. If it continues, sign out and sign back in.`}
                title={<span id="store-access-recovery-title">Store access could not be loaded</span>}
                style={{ maxWidth: 560, padding: 0, width: '100%' }}
            />
        </main>
    );
}
