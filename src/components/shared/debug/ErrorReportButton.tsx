'use client';

import { getClientConsoleSnapshot } from '@lib/debug/clientConsoleBuffer';
import {
    DEPLOYMENT_VERSION_REQUEST_POLICY,
    readDeploymentVersionResponse,
} from '@lib/deployment/versionResponse';
import { logger } from '@lib/monitoring/logger';
import {
    copyRuntimeTextToClipboard,
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { sanitizeErrorForLog } from '@lib/security/secureLogger';
import type { CSSProperties } from 'react';
import { useState } from 'react';

type ErrorReportButtonProps = {
    error?: Error & { digest?: string };
    label?: string;
    source: string;
    style?: CSSProperties;
};

type BuildDiagnostics = {
    buildCreatedAt?: string;
    buildId?: string;
    deploymentUrl?: string;
    environment?: string;
    shortBuildId?: string;
};

type RuntimeDiagnostics = ReturnType<typeof getRuntimeDiagnostics>;

function getClientBuildDiagnostics(): BuildDiagnostics {
    return {
        buildId: process.env.NEXT_PUBLIC_BUILD_ID || undefined,
        deploymentUrl: process.env.NEXT_PUBLIC_DEPLOYMENT_URL || undefined,
        environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || undefined,
        shortBuildId: process.env.NEXT_PUBLIC_BUILD_ID ? process.env.NEXT_PUBLIC_BUILD_ID.slice(0, 7) : undefined,
    };
}

async function getBuildDiagnostics(): Promise<BuildDiagnostics> {
    if (typeof window === 'undefined') return getClientBuildDiagnostics();

    try {
        const response = await fetch('/api/version', DEPLOYMENT_VERSION_REQUEST_POLICY);
        if (!response.ok) return getClientBuildDiagnostics();
        const data = await readDeploymentVersionResponse(response, 'error_report');
        if (!data) return getClientBuildDiagnostics();

        return {
            buildCreatedAt: data.buildCreatedAt,
            buildId: data.buildId,
            deploymentUrl: data.deploymentUrl,
            environment: data.env,
            shortBuildId: data.shortBuildId,
        };
    } catch {
        return getClientBuildDiagnostics();
    }
}

function getRuntimeDiagnostics(error?: Error & { digest?: string }) {
    if (typeof window === 'undefined') {
        return {
            digest: error?.digest,
            error: error ? sanitizeErrorForLog(error) : undefined,
            errorName: error?.name,
        };
    }

    return {
        console: getClientConsoleSnapshot(),
        digest: error?.digest,
        error: error ? sanitizeErrorForLog(error) : undefined,
        errorName: error?.name,
        location: window.location.href,
        routePath: window.location.pathname,
        referrer: document.referrer || undefined,
        screen: {
            height: window.screen?.height,
            width: window.screen?.width,
        },
        timestamp: new Date().toISOString(),
        userAgent: window.navigator.userAgent,
        viewport: {
            height: window.innerHeight,
            width: window.innerWidth,
        },
    };
}

function buildCopyableDiagnostics(payload: RuntimeDiagnostics & { build: BuildDiagnostics; reportId?: string; source: string }) {
    return JSON.stringify(payload, null, 2);
}

export default function ErrorReportButton({
    error,
    label = 'Send diagnostic report',
    source,
    style,
}: ErrorReportButtonProps) {
    const [status, setStatus] = useState<'idle' | 'sent' | 'sending'>('idle');
    const [copyStatus, setCopyStatus] = useState<'copied' | 'idle'>('idle');
    const [lastDiagnostics, setLastDiagnostics] = useState<string>('');
    const [reportId, setReportId] = useState<string>('');

    const handleReport = async () => {
        setStatus('sending');
        try {
            const runtimeDiagnostics = getRuntimeDiagnostics(error);
            const build = await getBuildDiagnostics();
            const payload = {
                action: 'failure_screen_diagnostics',
                build,
                buildId: build.buildId,
                environment: build.environment,
                ...runtimeDiagnostics,
                routePath: runtimeDiagnostics.routePath,
                shortBuildId: build.shortBuildId,
                source,
            };
            const nextReportId = logger.error('Failure screen diagnostics sent', error || new Error('Failure screen diagnostics'), payload);
            setReportId(nextReportId || '');
            setLastDiagnostics(buildCopyableDiagnostics({
                ...runtimeDiagnostics,
                build,
                reportId: nextReportId,
                source,
            }));
            setStatus('sent');
        } catch (reportError) {
            logRuntimeFailure('error_report_send_failed', reportError, {
                ...getBoundedRuntimeStringContext('source', source),
            });
            setStatus('idle');
        }
    };

    const handleCopyDiagnostics = async () => {
        const diagnostics = lastDiagnostics || buildCopyableDiagnostics({
            ...getRuntimeDiagnostics(error),
            build: getClientBuildDiagnostics(),
            reportId,
            source,
        });

        try {
            await copyRuntimeTextToClipboard(diagnostics);
            setCopyStatus('copied');
            window.setTimeout(() => setCopyStatus('idle'), 1800);
        } catch (copyError) {
            logRuntimeFailure('error_report_copy_failed', copyError, {
                diagnosticsLength: diagnostics.length,
                hasReportId: Boolean(reportId),
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
                ...getBoundedRuntimeStringContext('source', source),
            });
        }
    };

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
                disabled={status === 'sending' || status === 'sent'}
                onClick={() => { void handleReport(); }}
                style={{
                    background: 'transparent',
                    border: '1px solid currentColor',
                    borderRadius: 6,
                    color: 'inherit',
                    cursor: status === 'idle' ? 'pointer' : 'default',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '12px 18px',
                    ...style,
                }}
                type="button"
            >
                {status === 'sent' ? 'Report sent' : status === 'sending' ? 'Sending...' : label}
            </button>
            {status === 'sent' ? (
                <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ color: 'inherit', fontSize: 12, opacity: 0.78 }}>
                        {reportId ? `Report ID: ${reportId}` : 'Report queued. You can also copy details for support.'}
                    </span>
                    <button
                        onClick={() => { void handleCopyDiagnostics(); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 0,
                            textDecoration: 'underline',
                        }}
                        type="button"
                    >
                        {copyStatus === 'copied' ? 'Details copied' : 'Copy details'}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
