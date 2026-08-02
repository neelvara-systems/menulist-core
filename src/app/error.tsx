'use client' // Error components must be Client Components
import ErrorPageThemeWrapper from "@atoms/ErrorPageThemeWrapper";
import ErrorReportButton from "@/components/shared/debug/ErrorReportButton";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { openIsolatedBrowserUrl } from "@lib/browser/openIsolatedBrowserUrl";
import { Button, Flex, Result, Typography } from "antd";
import { useEffect, useRef, useState } from 'react';
import { LuHelpCircle, LuRefreshCw } from "react-icons/lu";
const { Paragraph } = Typography

const APP_ERROR_BOUNDARY_RENDERED = 'app_error_boundary_rendered';
const APP_ERROR_HELP_OPEN_FAILED = 'app_error_help_open_failed';
const APP_ERROR_HELP_REDIRECT_FAILED = 'app_error_help_redirect_failed';
const HELP_ROUTE = '/help';

export default function Error({ error, reset }: {
    error: Error & { digest?: string }, reset: () => void
}) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        logRuntimeFailure(APP_ERROR_BOUNDARY_RENDERED, error, {
            hasDigest: Boolean(error?.digest),
            ...getBoundedRuntimeStringContext('digest', error?.digest),
            ...getBoundedRuntimeStringContext('location', window.location.href),
            ...getBoundedRuntimeStringContext('userAgent', window.navigator.userAgent),
        });
    }, [error])

    useEffect(() => () => {
        if (refreshFallbackTimerRef.current) {
            clearTimeout(refreshFallbackTimerRef.current);
            refreshFallbackTimerRef.current = null;
        }
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        // Schedule before reset so a successful boundary unmount can cancel it.
        refreshFallbackTimerRef.current = setTimeout(() => {
            refreshFallbackTimerRef.current = null;
            window.location.reload();
        }, 100);
        reset();
    };

    const handleGetHelp = () => {
        const diagnosticContext = {
            flow: 'help_handoff',
            ...getBoundedRuntimeStringContext('helpRoute', HELP_ROUTE),
            ...getBoundedRuntimeStringContext('location', window.location.href),
        };

        try {
            openIsolatedBrowserUrl(HELP_ROUTE);
        } catch (openError) {
            logRuntimeFailure(APP_ERROR_HELP_OPEN_FAILED, openError, diagnosticContext);
            try {
                window.location.assign(HELP_ROUTE);
            } catch (redirectError) {
                logRuntimeFailure(APP_ERROR_HELP_REDIRECT_FAILED, redirectError, diagnosticContext);
            }
        }
    };

    return (
        <ErrorPageThemeWrapper>
            <Flex vertical justify="center" align="center" style={{ width: "100vw", height: "100vh", padding: 24 }}>
                <Result
                    status="500"
                    title="Something went wrong"
                    subTitle={
                        <Flex vertical align="center" gap={8} style={{ maxWidth: 480 }}>
                            <Paragraph style={{ fontSize: 15, margin: 0, textAlign: 'center' }}>
                                Don&apos;t worry—this happens occasionally. Try refreshing the page to continue.
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
                                If the problem continues, our support team is here to help.
                            </Paragraph>
                        </Flex>
                    }
                />
                <Flex gap={12} justify="center" style={{ marginTop: 8 }}>
                    <Button
                        size="large"
                        type="primary"
                        icon={<LuRefreshCw />}
                        onClick={handleRefresh}
                        loading={isRefreshing}
                    >
                        Refresh Page
                    </Button>
                    <Button
                        size="large"
                        type="default"
                        icon={<LuHelpCircle />}
                        onClick={handleGetHelp}
                    >
                        Get Help
                    </Button>
                </Flex>
                <ErrorReportButton
                    error={error}
                    source="app-error-boundary"
                    style={{ marginTop: 16 }}
                />
            </Flex>
        </ErrorPageThemeWrapper>
    )
}
