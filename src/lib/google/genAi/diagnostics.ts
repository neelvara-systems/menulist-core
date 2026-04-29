type DiagnosticsErrorDetails = {
    code?: number | string | null;
    details?: unknown;
    message?: string | null;
    status?: string | null;
};

type DiagnosticsErrorLike = Error & {
    code?: number | string;
    error?: DiagnosticsErrorDetails;
    httpStatusCode?: number;
    status?: number | string;
};

export function getAIGatewayDiagnostics(client: unknown) {
    if (!client || typeof client !== 'object') return undefined;

    const maybeGateway = client as { getKeyStats?: () => unknown };
    if (typeof maybeGateway.getKeyStats !== 'function') return undefined;

    try {
        return maybeGateway.getKeyStats();
    } catch {
        return undefined;
    }
}

export function getAIErrorDiagnostics(error: unknown) {
    const resolved = (error || {}) as DiagnosticsErrorLike;
    const nestedError = resolved.error || {};

    return {
        code: resolved.code ?? nestedError.code ?? null,
        message: resolved instanceof Error ? resolved.message : String(error || ''),
        name: resolved instanceof Error ? resolved.name : typeof error,
        nestedDetails: Array.isArray(nestedError.details) ? nestedError.details.slice(0, 3) : nestedError.details ?? null,
        nestedMessage: nestedError.message ?? null,
        nestedStatus: nestedError.status ?? null,
        stackPreview: resolved instanceof Error
            ? resolved.stack?.split('\n').slice(0, 6).join('\n')
            : null,
        status: resolved.status ?? resolved.httpStatusCode ?? nestedError.code ?? null,
    };
}

export function getPreviewText(value: string | undefined | null, maxLength: number = 300) {
    return String(value || '').slice(0, maxLength);
}
