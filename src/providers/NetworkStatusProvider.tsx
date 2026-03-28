'use client';

/**
 * 🌐 Network Status Provider
 * 
 * Monitors network connectivity and blocks UI when:
 * - User is offline
 * - Network is too slow (< 1 Mbps or 2g/slow-2g)
 * 
 * Features:
 * - Non-closable blocking modal
 * - Auto-dismisses when network is restored
 * - Shows network speed info when available
 * - Smooth transitions
 * 
 * Usage:
 * Mount once in root layout - monitors network everywhere!
 */

import { useNetworkStatus } from '@hook/useNetworkStatus';
import { Button, Flex, Modal, Typography, theme } from 'antd';
import { ReactNode, useEffect, useState } from 'react';
import { LuRefreshCw, LuSignal, LuWifiOff } from 'react-icons/lu';

const { Title, Text } = Typography;

interface NetworkStatusProviderProps {
    children: ReactNode;
}

export default function NetworkStatusProvider({ children }: NetworkStatusProviderProps) {
    const { token } = theme.useToken();
    const networkStatus = useNetworkStatus();
    const [showBlocker, setShowBlocker] = useState(false);
    const [isManualCheck, setIsManualCheck] = useState(false);

    useEffect(() => {
        // Show blocker if offline OR slow network
        const shouldBlock = !networkStatus.isOnline || networkStatus.isSlow;

        if (shouldBlock) {
            // Add small delay before showing to avoid flashing on quick reconnects
            const timer = setTimeout(() => {
                setShowBlocker(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // Remove blocker immediately when network is restored
            setShowBlocker(false);
        }
    }, [networkStatus.isOnline, networkStatus.isSlow]);

    // Manual connection check
    const handleManualCheck = () => {
        setIsManualCheck(true);
        // Trigger a network check by making a simple request
        fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' })
            .then(() => {
                // Connection restored, modal will auto-dismiss
                setTimeout(() => setIsManualCheck(false), 1000);
            })
            .catch(() => {
                // Still offline
                setTimeout(() => setIsManualCheck(false), 1000);
            });
    };

    // Determine modal content based on network status
    const getModalContent = () => {
        if (!networkStatus.isOnline) {
            return {
                icon: <LuWifiOff size={64} color={token.colorError} style={{ animation: 'iconPulse 2s ease-in-out infinite' }} />,
                title: 'No Internet Connection',
                description: 'Please check your internet connection and try again.',
                showRetryButton: true,
                details: null
            };
        }

        if (networkStatus.isSlow) {
            return {
                icon: <LuSignal size={64} color={token.colorWarning} style={{ animation: 'iconPulse 2s ease-in-out infinite' }} />,
                title: 'Slow Network Detected',
                description: 'Your network connection is too slow. Some features may not work properly.',
                showRetryButton: false,
                details: (
                    <Flex
                        vertical
                        gap={8}
                        style={{
                            marginTop: 16,
                            padding: '12px 16px',
                            background: token.colorBgLayout,
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorder}`
                        }}
                    >
                        {networkStatus.effectiveType && (
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    Connection type:
                                </Text>
                                <Text strong style={{ fontSize: 14, color: token.colorWarning }}>
                                    {networkStatus.effectiveType.toUpperCase()}
                                </Text>
                            </Flex>
                        )}
                        {networkStatus.downlink !== undefined && (
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    Download speed:
                                </Text>
                                <Text strong style={{ fontSize: 14, color: token.colorWarning }}>
                                    {networkStatus.downlink.toFixed(2)} Mbps
                                </Text>
                            </Flex>
                        )}
                        {networkStatus.rtt !== undefined && (
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    Latency:
                                </Text>
                                <Text strong style={{ fontSize: 14, color: token.colorWarning }}>
                                    {networkStatus.rtt} ms
                                </Text>
                            </Flex>
                        )}
                    </Flex>
                )
            };
        }

        return null;
    };

    const modalContent = getModalContent();

    return (
        <>
            {/* Network Blocker Modal */}
            <Modal
                open={showBlocker}
                closable={false}
                footer={null}
                centered
                maskClosable={false}
                keyboard={false}
                width={450}
                styles={{
                    body: { padding: '32px 24px' }
                }}
            >
                {modalContent && (
                    <Flex vertical align="center" gap={20}>
                        {/* Icon */}
                        <div style={{
                            padding: 20,
                            borderRadius: '50%',
                            background: !networkStatus.isOnline
                                ? `${token.colorErrorBg}`
                                : `${token.colorWarningBg}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {modalContent.icon}
                        </div>

                        {/* Title */}
                        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
                            {modalContent.title}
                        </Title>

                        {/* Description */}
                        <Text
                            type="secondary"
                            style={{
                                fontSize: 15,
                                textAlign: 'center',
                                maxWidth: 380
                            }}
                        >
                            {modalContent.description}
                        </Text>

                        {/* Details */}
                        {modalContent.details}

                        {/* Manual retry button (offline only) */}
                        {modalContent.showRetryButton && (
                            <Button
                                type="primary"
                                size="large"
                                icon={<LuRefreshCw size={18} style={{ animation: isManualCheck ? 'spin 1s linear infinite' : 'none' }} />}
                                onClick={handleManualCheck}
                                loading={isManualCheck}
                                style={{
                                    marginTop: 8,
                                    borderRadius: 12,
                                    height: 44,
                                    fontWeight: 500
                                }}
                            >
                                Check Connection
                            </Button>
                        )}

                        {/* Trying to reconnect indicator */}
                        <Flex align="center" gap={8} style={{ marginTop: modalContent.showRetryButton ? 12 : 8 }}>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: token.colorPrimary,
                                    animation: 'pulse 2s infinite'
                                }}
                            />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {isManualCheck ? 'Checking...' : 'Monitoring connection...'}
                            </Text>
                        </Flex>
                    </Flex>
                )}
            </Modal>

            {/* Add animations */}
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.5;
                        transform: scale(1.2);
                    }
                }
                
                @keyframes iconPulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.7;
                        transform: scale(1.05);
                    }
                }
                
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>

            {/* Render children */}
            {children}
        </>
    );
}
