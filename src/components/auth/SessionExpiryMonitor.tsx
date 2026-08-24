'use client';

import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '@constant/common';
import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import { logAuthFailure } from '@lib/auth/authDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { signOutSession } from '@lib/auth/client';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getDarkColorState, getDarkModeState, getLightColorState } from '@reduxSlices/clientThemeConfig';
import { Button, ConfigProvider, Flex, Modal, theme, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuClock, LuLogOut, LuShield } from 'react-icons/lu';

const { Text, Title } = Typography;
const ACCESS_STATUS_INTERVAL_MS = 30 * 1000;
const ACCESS_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const ACCOUNT_ACCESS_ENDED_MESSAGE = 'Account access has ended';
const ACCESS_STATUS_REQUEST_POLICY: RequestInit = {
    ...AUTH_BROWSER_REQUEST_POLICY,
    headers: {
        Accept: 'application/json',
    },
};

type AccessStatusResponse = {
    valid?: boolean;
    reason?: unknown;
    message?: unknown;
};
type SessionExpiryModalMode = 'expired' | 'access-ended';

type SessionExpiryMonitorProps = {
    loginCallbackPath?: string;
};

type AccessEndedCopy = {
    description: string;
    title: string;
};

type SessionExpiryDialogProps = {
    accessEndedCopy: AccessEndedCopy;
    modalMode: SessionExpiryModalMode;
    onGoToLogin: () => void;
    open: boolean;
};

const getAccessStatusReason = (value: unknown, fallback: string): string => (
    typeof value === 'string' && value.trim().length > 0 ? value : fallback
);

const getAccessStatusResponseLogContext = (response: Response) => ({
    responseOk: response.ok,
    responseStatus: response.status,
    responseType: response.type,
    maxBytes: ACCESS_STATUS_RESPONSE_JSON_MAX_BYTES,
});

const isManualRedirectResponse = (response: Response): boolean => (
    response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)
);

const buildSessionLoginPath = (
    modalMode: SessionExpiryModalMode,
    loginCallbackPath?: string,
): string => {
    const params = new URLSearchParams();
    params.set(modalMode === 'access-ended' ? 'access' : 'expired', modalMode === 'access-ended' ? 'ended' : 'true');
    if (loginCallbackPath?.startsWith('/') && !loginCallbackPath.startsWith('//')) {
        params.set('callbackUrl', loginCallbackPath);
    }
    return `${NAVIGARIONS_ROUTINGS.SIGNIN}?${params.toString()}`;
};

const readAccessStatusResponseJson = async (
    response: Response,
): Promise<{ payload: AccessStatusResponse | null; parseFailed: boolean }> => {
    try {
        return {
            payload: await readJsonResponseWithLimit<AccessStatusResponse>(
                response,
                ACCESS_STATUS_RESPONSE_JSON_MAX_BYTES,
            ),
            parseFailed: false,
        };
    } catch (error) {
        logAuthFailure('auth_access_status_response_parse_failed', error, {
            ...getAccessStatusResponseLogContext(response),
        });
        return { payload: null, parseFailed: true };
    }
};

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
    if (
        reason === 'USER_INACTIVE'
        || reason === 'USER_DELETED'
        || reason === 'USER_NOT_FOUND'
        || reason === 'USER_UNVERIFIED'
        || reason === 'TENANT_NOT_FOUND'
        || reason === 'STORE_NOT_FOUND'
        || reason === 'STORE_TENANT_MISMATCH'
    ) {
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

function SessionExpiryDialog({
    accessEndedCopy,
    modalMode,
    onGoToLogin,
    open,
}: SessionExpiryDialogProps) {
    const { token } = theme.useToken();
    const isAccessEnded = modalMode === 'access-ended';
    const Icon = isAccessEnded ? LuShield : LuClock;
    const iconColor = isAccessEnded ? token.colorError : token.colorWarning;

    return (
        <Modal
            open={open}
            onCancel={onGoToLogin}
            closable={false}
            maskClosable={false}
            centered
            width={520}
            style={{ maxWidth: 'calc(100vw - 32px)' }}
            styles={{
                content: {
                    background: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: token.boxShadowSecondary,
                },
                body: {
                    background: token.colorBgElevated,
                    padding: '28px 24px 18px',
                },
                footer: {
                    background: token.colorBgElevated,
                    borderTop: 0,
                    marginTop: 0,
                    padding: '0 24px 24px',
                },
                mask: {
                    backdropFilter: 'blur(2px)',
                },
            }}
            footer={[
                <Button
                    key="login"
                    type="primary"
                    icon={<LuLogOut />}
                    onClick={onGoToLogin}
                    size="large"
                >
                    Go to Login
                </Button>
            ]}
        >
            <Flex vertical gap={16} align="center" style={{ padding: '4px 0 10px', textAlign: 'center' }}>
                <Icon size={48} style={{ color: iconColor }} aria-hidden="true" />
                <Title level={3} style={{ color: token.colorText, lineHeight: 1.2, margin: 0 }}>
                    {isAccessEnded ? accessEndedCopy.title : 'Session Expired'}
                </Title>
                <Flex vertical gap={8} align="center">
                    <Text type="secondary" style={{ fontSize: 15, textAlign: 'center' }}>
                        {isAccessEnded ? accessEndedCopy.description : 'Your session has expired for security reasons.'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 14, textAlign: 'center' }}>
                        Please log in again to continue.
                    </Text>
                </Flex>
            </Flex>
        </Modal>
    );
}

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
 * @see assessment-05-security.md Task 16: Session Timeout Handling
 */
export default function SessionExpiryMonitor({ loginCallbackPath }: SessionExpiryMonitorProps = {}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [showExpiryModal, setShowExpiryModal] = useState(false);
    const [modalMode, setModalMode] = useState<SessionExpiryModalMode>('expired');
    const [accessEndedReason, setAccessEndedReason] = useState<string | undefined>();
    const isDarkMode = useAppSelector(getDarkModeState);
    const darkThemeColor = useAppSelector(getDarkColorState);
    const lightThemeColor = useAppSelector(getLightColorState);
    const hasShownModal = useRef(false);
    const wasAuthenticated = useRef(false);
    const accessCheckInFlight = useRef<{ requestId: number; sessionIdentity: string } | null>(null);
    const accessEndedInFlight = useRef(false);
    const accessStatusRequestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!accessStatusRequestGuardRef.current) {
        accessStatusRequestGuardRef.current = createLatestRequestGuard();
    }
    const sessionAccessIdentity = [
        session?.user?.id || '',
        session?.tId ?? session?.user?.tenantId ?? '',
        session?.sId ?? session?.user?.storeId ?? '',
        session?.pId || session?.user?.pId || '',
        session?.role || session?.user?.role || '',
        session?.expires || '',
    ].join(':');

    // Track authentication state
    useEffect(() => {
        if (status === 'authenticated') {
            wasAuthenticated.current = true;
            hasShownModal.current = false;
            accessEndedInFlight.current = false;
            setShowExpiryModal(false);
            setAccessEndedReason(undefined);
            // Clear localStorage flag when authenticated
            if (typeof window !== 'undefined') {
                localStorage.removeItem('session_expired_shown');
            }
        }
    }, [sessionAccessIdentity, status]);

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
                router.push(buildSessionLoginPath('expired', loginCallbackPath));
                return;
            }

            // Show modal
            setModalMode('expired');
            setShowExpiryModal(true);
            hasShownModal.current = true;

            // Set flag to prevent showing again
            localStorage.setItem('session_expired_shown', 'true');
        }
    }, [loginCallbackPath, status, router]);

    const endAccess = useCallback(async (requestId: number, reason?: string) => {
        if (!accessStatusRequestGuardRef.current?.isCurrent(requestId)) return;
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
            await signOutSession(buildSessionLoginPath('access-ended', loginCallbackPath));
        } catch {
            // The access decision already came from the server; keep the local logout flow moving.
        }
    }, [loginCallbackPath]);

    const checkAccessStatus = useCallback(async () => {
        if (status !== 'authenticated' || !session?.user || accessEndedInFlight.current) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (accessCheckInFlight.current?.sessionIdentity === sessionAccessIdentity) return;

        const requestGuard = accessStatusRequestGuardRef.current;
        if (!requestGuard) return;
        const requestId = requestGuard.begin();
        accessCheckInFlight.current = { requestId, sessionIdentity: sessionAccessIdentity };
        try {
            const response = await fetch('/api/auth/access-status', ACCESS_STATUS_REQUEST_POLICY);
            if (!requestGuard.isCurrent(requestId)) return;

            if (isManualRedirectResponse(response)) {
                logAuthFailure('auth_access_status_response_redirected', new Error('auth_access_status_response_redirected'), {
                    ...getAccessStatusResponseLogContext(response),
                });
                await endAccess(requestId, 'HTTP_401');
                return;
            }

            const { payload, parseFailed } = await readAccessStatusResponseJson(response);
            if (!requestGuard.isCurrent(requestId)) return;

            if (response.status === 401) {
                await endAccess(requestId, 'HTTP_401');
                return;
            }

            if (parseFailed) {
                return;
            }

            if (payload && (typeof payload !== 'object' || Array.isArray(payload))) {
                logAuthFailure('auth_access_status_response_invalid', new Error('auth_access_status_response_invalid'), {
                    ...getAccessStatusResponseLogContext(response),
                });
                return;
            }

            const data = payload || {};

            if (data.valid === false) {
                await endAccess(requestId, getAccessStatusReason(data.reason, `HTTP_${response.status}`));
                return;
            }

            if (response.status === 403 && data.message === ACCOUNT_ACCESS_ENDED_MESSAGE) {
                await endAccess(requestId, getAccessStatusReason(data.reason, 'ACCOUNT_ACCESS_ENDED'));
            }
        } catch {
            // Ignore transient network failures. The next focus/interval check will retry.
        } finally {
            if (accessCheckInFlight.current?.requestId === requestId) {
                accessCheckInFlight.current = null;
            }
        }
    }, [endAccess, session?.user, sessionAccessIdentity, status]);

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
            accessStatusRequestGuardRef.current?.invalidate();
            accessCheckInFlight.current = null;
            window.clearTimeout(startupCheck);
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [checkAccessStatus, status]);

    const handleGoToLogin = () => {
        setShowExpiryModal(false);
        router.push(buildSessionLoginPath(modalMode, loginCallbackPath));
    };

    const accessEndedCopy = getAccessEndedCopy(accessEndedReason);
    const primaryColor = isDarkMode
        ? darkThemeColor || DEFAULT_DARK_COLOR
        : lightThemeColor || DEFAULT_LIGHT_COLOR;

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    borderRadius: 8,
                    colorPrimary: primaryColor,
                    fontSize: 13,
                },
            }}
        >
            <SessionExpiryDialog
                accessEndedCopy={accessEndedCopy}
                modalMode={modalMode}
                onGoToLogin={handleGoToLogin}
                open={showExpiryModal}
            />
        </ConfigProvider>
    );
}
