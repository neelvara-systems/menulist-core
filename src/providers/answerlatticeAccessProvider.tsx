'use client';

import type { AnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type AnswerlatticeAccessState = {
    access: AnswerlatticeAccessContext | null;
    error: string | null;
    errorCode: string | null;
    loading: boolean;
    refresh: () => Promise<void>;
};

const AnswerlatticeAccessContextRef = createContext<AnswerlatticeAccessState>({
    access: null,
    error: null,
    errorCode: null,
    loading: true,
    refresh: async () => undefined,
});

const ANSWERLATTICE_ACCESS_LOAD_FAILED = 'Could not load Answerlattice access';
const ANSWERLATTICE_ACCESS_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_ACCESS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type AnswerlatticeAccessResponse = {
    access: AnswerlatticeAccessContext;
};

type AnswerlatticeAccessClientError = Error & { code?: string };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFinitePositiveNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value > 0
);

const isPermissionRecord = (value: unknown): value is Record<string, boolean> => (
    isRecord(value) && Object.values(value).every(entry => typeof entry === 'boolean')
);

const isAnswerlatticeAccessContext = (value: unknown): value is AnswerlatticeAccessContext => (
    isRecord(value)
    && value.canUseManagement !== undefined
    && typeof value.canUseManagement === 'boolean'
    && typeof value.currentRoleId === 'string'
    && typeof value.isPlatformAdmin === 'boolean'
    && isPermissionRecord(value.permissions)
    && Array.isArray(value.roles)
    && isRecord(value.scope)
    && isFinitePositiveNumber(value.scope.tenantId)
    && isFinitePositiveNumber(value.scope.storeId)
    && typeof value.storeName === 'string'
    && isRecord(value.user)
    && typeof value.user.id === 'string'
    && typeof value.user.email === 'string'
);

const isAnswerlatticeAccessResponse = (value: unknown): value is AnswerlatticeAccessResponse => (
    isRecord(value) && isAnswerlatticeAccessContext(value.access)
);

const getAnswerlatticeAccessResponseLogContext = (response: Response) => ({
    responseOk: response.ok,
    responseStatus: response.status,
});

const getAnswerlatticeAccessRejectedCode = (payload: unknown) => {
    if (!isRecord(payload) || typeof payload.code !== 'string') return undefined;
    return payload.code.slice(0, 64);
};

const createAnswerlatticeAccessClientError = (code?: string): AnswerlatticeAccessClientError => {
    const error = new Error(ANSWERLATTICE_ACCESS_LOAD_FAILED) as AnswerlatticeAccessClientError;
    if (code) {
        error.code = code;
    }
    return error;
};

const readAnswerlatticeAccessResponse = async (response: Response): Promise<AnswerlatticeAccessResponse> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_ACCESS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'answerlattice_access_provider_response_parse_failed',
            error,
            getAnswerlatticeAccessResponseLogContext(response),
        );
        throw createAnswerlatticeAccessClientError();
    }

    if (!response.ok) {
        logRuntimeFailure(
            'answerlattice_access_provider_response_rejected',
            undefined,
            getAnswerlatticeAccessResponseLogContext(response),
        );
        throw createAnswerlatticeAccessClientError(getAnswerlatticeAccessRejectedCode(payload));
    }

    if (!isAnswerlatticeAccessResponse(payload)) {
        logRuntimeFailure(
            'answerlattice_access_provider_response_invalid',
            undefined,
            getAnswerlatticeAccessResponseLogContext(response),
        );
        throw createAnswerlatticeAccessClientError();
    }

    return payload;
};

export function AnswerlatticeAccessProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    const sessionAccessIdentity = [
        session?.user?.id || '',
        sessionScope?.tenantId || '',
        sessionScope?.storeId || '',
        sessionScope?.role || '',
        session?.expires || '',
    ].join(':');
    const requestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!requestGuardRef.current) {
        requestGuardRef.current = createLatestRequestGuard();
    }
    const [access, setAccess] = useState<AnswerlatticeAccessContext | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAccess = useCallback(async () => {
        const requestGuard = requestGuardRef.current;
        if (!requestGuard) return;
        const requestId = requestGuard.begin();
        if (status === 'loading') {
            setLoading(true);
            return;
        }

        if (status !== 'authenticated') {
            setAccess(null);
            setError(null);
            setErrorCode(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/access', {
                ...ANSWERLATTICE_ACCESS_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeAccessResponse(response);
            if (!requestGuard.isCurrent(requestId)) return;
            setAccess(data.access);
            setError(null);
            setErrorCode(null);
        } catch (loadError) {
            if (!requestGuard.isCurrent(requestId)) return;
            const errorCode = isRecord(loadError) && typeof loadError.code === 'string'
                ? loadError.code
                : null;
            setAccess(null);
            setError(ANSWERLATTICE_ACCESS_LOAD_FAILED);
            setErrorCode(errorCode);
        } finally {
            if (requestGuard.isCurrent(requestId)) {
                setLoading(false);
            }
        }
    }, [sessionAccessIdentity, status]);

    useEffect(() => {
        void loadAccess();
        const requestGuard = requestGuardRef.current;
        return () => {
            requestGuard?.invalidate();
        };
    }, [loadAccess, pathname]);

    const value = useMemo<AnswerlatticeAccessState>(() => ({
        access,
        error,
        errorCode,
        loading,
        refresh: loadAccess,
    }), [access, error, errorCode, loadAccess, loading]);

    return (
        <AnswerlatticeAccessContextRef.Provider value={value}>
            {children}
        </AnswerlatticeAccessContextRef.Provider>
    );
}

export function useAnswerlatticeAccess() {
    return useContext(AnswerlatticeAccessContextRef);
}
