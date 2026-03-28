'use client';

import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { Button, Flex, Modal, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LuClock, LuLogOut } from 'react-icons/lu';

const { Text, Title } = Typography;

/**
 * SessionExpiryMonitor Component
 * 
 * Monitors session expiry and shows a user-friendly modal when session expires
 * 
 * Features:
 * - Detects unauthenticated status
 * - Shows friendly "Session Expired" modal
 * - Auto-redirects to login
 * - Prevents multiple modals
 * 
 * Implementation Notes:
 * - Add to main layout (runs on all pages)
 * - Only shows modal if user was previously authenticated
 * - Uses localStorage to track authentication state
 * 
 * @see ASSESSMENT-05-SECURITY.md Task 16: Session Timeout Handling
 */
export default function SessionExpiryMonitor() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [showExpiryModal, setShowExpiryModal] = useState(false);
    const hasShownModal = useRef(false);
    const wasAuthenticated = useRef(false);

    // Track authentication state
    useEffect(() => {
        if (status === 'authenticated') {
            wasAuthenticated.current = true;
            // Clear localStorage flag when authenticated
            if (typeof window !== 'undefined') {
                localStorage.removeItem('session_expired_shown');
            }
        }
    }, [status]);

    // Check for session expiry
    useEffect(() => {
        // Only show modal if:
        // 1. User was previously authenticated
        // 2. Now unauthenticated
        // 3. Haven't shown modal yet
        // 4. Not on signin page already
        if (
            status === 'unauthenticated' &&
            wasAuthenticated.current &&
            !hasShownModal.current &&
            typeof window !== 'undefined'
        ) {
            const currentPath = window.location.pathname;
            const isOnSigninPage = currentPath.includes('/signin') ||
                currentPath.includes('/signup') ||
                currentPath.includes('/unauthorized');

            // Don't show if already on signin page
            if (isOnSigninPage) {
                return;
            }

            // Check if we've already shown the modal (prevent duplicates on page reload)
            const hasShownBefore = localStorage.getItem('session_expired_shown');
            if (hasShownBefore) {
                // Redirect silently
                router.push(`/${NAVIGARIONS_ROUTINGS.SIGNIN}?expired=true`);
                return;
            }

            // Show modal
            setShowExpiryModal(true);
            hasShownModal.current = true;

            // Set flag to prevent showing again
            localStorage.setItem('session_expired_shown', 'true');
        }
    }, [status, router]);

    const handleGoToLogin = () => {
        setShowExpiryModal(false);
        router.push(`/${NAVIGARIONS_ROUTINGS.SIGNIN}?expired=true`);
    };

    return (
        <Modal
            open={showExpiryModal}
            onCancel={handleGoToLogin}
            closable={false}
            maskClosable={false}
            centered
            footer={[
                <Button
                    key="login"
                    type="primary"
                    icon={<LuLogOut />}
                    onClick={handleGoToLogin}
                    size="large"
                >
                    Go to Login
                </Button>
            ]}
        >
            <Flex vertical gap={16} align="center" style={{ padding: '20px 0' }}>
                <LuClock size={48} style={{ color: '#faad14' }} />
                <Title level={3} style={{ margin: 0 }}>
                    Session Expired
                </Title>
                <Flex vertical gap={8} align="center">
                    <Text type="secondary" style={{ textAlign: 'center', fontSize: 15 }}>
                        Your session has expired for security reasons.
                    </Text>
                    <Text type="secondary" style={{ textAlign: 'center', fontSize: 14 }}>
                        Please log in again to continue.
                    </Text>
                </Flex>
            </Flex>
        </Modal>
    );
}
