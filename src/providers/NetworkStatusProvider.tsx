'use client';

/**
 * Shared connectivity notice.
 *
 * Browser connectivity signals are advisory. The provider therefore informs
 * the owner without blocking review/navigation or replaying writes. Individual
 * mutations retain their existing acknowledgement and failure behavior.
 */

import { useNetworkStatus } from '@hook/useNetworkStatus';
import { Flex, Typography, theme } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { LuSignal, LuWifiOff } from 'react-icons/lu';

const { Text, Title } = Typography;

interface NetworkStatusProviderProps {
    children: ReactNode;
}

export default function NetworkStatusProvider({ children }: NetworkStatusProviderProps) {
    const { token } = theme.useToken();
    const networkStatus = useNetworkStatus();
    const [showNotice, setShowNotice] = useState(false);

    useEffect(() => {
        const shouldShow = !networkStatus.isOnline || networkStatus.isSlow;

        if (!shouldShow) {
            setShowNotice(false);
            return;
        }

        const timer = window.setTimeout(() => {
            setShowNotice(true);
        }, 500);
        return () => window.clearTimeout(timer);
    }, [networkStatus.isOnline, networkStatus.isSlow]);

    const isOffline = !networkStatus.isOnline;
    const title = isOffline ? 'You are offline' : 'Connection is slow';
    const description = isOffline
        ? 'You can keep reviewing this screen. Saving and online actions may not finish until you reconnect.'
        : 'You can keep working. Uploads and online actions may take longer than usual.';

    return (
        <>
            {children}
            {showNotice ? (
                <Flex
                    align="flex-start"
                    aria-live="polite"
                    gap={10}
                    role="status"
                    style={{
                        background: token.colorBgElevated,
                        border: `1px solid ${isOffline ? token.colorErrorBorder : token.colorWarningBorder}`,
                        borderRadius: 12,
                        boxShadow: token.boxShadowSecondary,
                        boxSizing: 'border-box',
                        color: token.colorText,
                        insetInline: 12,
                        marginInline: 'auto',
                        maxWidth: 520,
                        padding: 12,
                        position: 'fixed',
                        top: 'calc(env(safe-area-inset-top) + 12px)',
                        width: 'calc(100vw - 24px)',
                        zIndex: 2147482000,
                    }}
                >
                    {isOffline
                        ? <LuWifiOff aria-hidden="true" color={token.colorError} size={20} />
                        : <LuSignal aria-hidden="true" color={token.colorWarning} size={20} />}
                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                        <Title level={5} style={{ fontSize: 14, margin: 0 }}>{title}</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
                    </Flex>
                </Flex>
            ) : null}
        </>
    );
}
