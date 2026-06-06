'use client';

import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { signOutSession } from '@lib/auth/client';
import { Button, Flex, Modal, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuClock, LuLogOut, LuShield } from 'react-icons/lu';

const { Text, Title } = Typography;
const ACCESS_STATUS_INTERVAL_MS = 30 * 1000;
const ACCOUNT_ACCESS_ENDED_MESSAGE = 'Account access has ended';

const getAccessEndedCopy = (reason?: string) => {
    if (reason === 'HTTP_401') {
        return {
            description: 'Your session has expired for security reasons.',
            title: 'Session Expired',
        };
    }
    if (reason === 'SESSION_REVOKED') {
        return {
            description: 'An owner signed this account out.',
            title: 'Signed Out',
        };
    }
    if (reason === 'USER_INACTIVE' || reason === 'USER_DELETED' || reason === 'USER_NOT_FOUND' || reason === 'USER_UNVERIFIED') {
        return {
            description: 'An owner changed this account access.',
            title: 'Access Ended',
        };
    }
    if (reason === 'USER_BLOCKED' || reason === 'TENANT_BLOCKED' || reason === 'STORE_BLOCKED') {
        return {
            description: 'This account is blocked.',
            title: 'Access Blocked',
        };
    }
    return {
        description: 'Please log in again to continue.',
        title: 'Access Changed',
    };
};

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
    const [modalMode, setModalMode] = useState<'expired' | 'access-ended'>('expired');
    const [accessEndedReason, setAccessEndedReason] = useState<string | undefined>();
    const hasShownModal = useRef(false);
    const wasAuthenticated = useRef(false);
    const accessCheckInFlight = useRef(false);
    const accessEndedInFlight = useRef(false);

    // Track authentication state
    useEffect(() => {
        if (status === 'authenticated') {
            wasAuthenticated.current = true;
            hasShownModal.current = false;
            accessEndedInFlight.current = false;
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
                router.push(`${NAVIGARIONS_ROUTINGS.SIGNIN}?expired=true`);
                return;
            }

            // Show modal
            setModalMode('expired');
            setShowExpiryModal(true);
            hasShownModal.current = true;

            // Set flag to prevent showing again
            localStorage.setItem('session_expired_shown', 'true');
        }
    }, [status, router]);

    const endAccess = useCallback(async (reason?: string) => {
        if (accessEndedInFlight.current || hasShownModal.current) return;

        accessEndedInFlight.current = true;
        hasShownModal.current = true;
        setAccessEndedReason(reason);
        setModalMode('access-ended');
        setShowExpiryModal(true);

        if (typeof window !== 'undefined') {
            localStorage.setItem('session_expired_shown', 'access-ended');
        }

        try {
            await signOutSession(NAVIGARIONS_ROUTINGS.SIGNIN);
        } catch {
            // The access decision already came from the server; keep the local logout flow moving.
        }
    }, []);

    const checkAccessStatus = useCallback(async () => {
        if (status !== 'authenticated' || !session?.user || accessCheckInFlight.current || accessEndedInFlight.current) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

        accessCheckInFlight.current = true;
        try {
            const response = await fetch('/api/auth/access-status', {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json().catch(() => ({}));

            if (data?.valid === false) {
                await endAccess(data?.reason || `HTTP_${response.status}`);
                return;
            }

            if (response.status === 401) {
                await endAccess('HTTP_401');
                return;
            }

            if (response.status === 403 && data?.message === ACCOUNT_ACCESS_ENDED_MESSAGE) {
                await endAccess(data?.reason || 'ACCOUNT_ACCESS_ENDED');
            }
        } catch {
            // Ignore transient network failures. The next focus/interval check will retry.
        } finally {
            accessCheckInFlight.current = false;
        }
    }, [endAccess, session?.user, status]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        if (typeof window === 'undefined') return;

        const onFocus = () => {
            void checkAccessStatus();
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') void checkAccessStatus();
        };

        const startupCheck = window.setTimeout(() => {
            void checkAccessStatus();
        }, 5000);
        const interval = window.setInterval(() => {
            void checkAccessStatus();
        }, ACCESS_STATUS_INTERVAL_MS);

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearTimeout(startupCheck);
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [checkAccessStatus, status]);

    const handleGoToLogin = () => {
        setShowExpiryModal(false);
        router.push(`${NAVIGARIONS_ROUTINGS.SIGNIN}?${modalMode === 'access-ended' ? 'access=ended' : 'expired=true'}`);
    };

    const accessEndedCopy = getAccessEndedCopy(accessEndedReason);

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
                {modalMode === 'access-ended'
                    ? <LuShield size={48} style={{ color: '#dc2626' }} />
                    : <LuClock size={48} style={{ color: '#faad14' }} />}
                <Title level={3} style={{ margin: 0 }}>
                    {modalMode === 'access-ended' ? accessEndedCopy.title : 'Session Expired'}
                </Title>
                <Flex vertical gap={8} align="center">
                    <Text type="secondary" style={{ textAlign: 'center', fontSize: 15 }}>
                        {modalMode === 'access-ended' ? accessEndedCopy.description : 'Your session has expired for security reasons.'}
                    </Text>
                    <Text type="secondary" style={{ textAlign: 'center', fontSize: 14 }}>
                        Please log in again to continue.
                    </Text>
                </Flex>
            </Flex>
        </Modal>
    );
}
