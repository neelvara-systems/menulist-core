'use client' // Error components must be Client Components
import ErrorPageThemeWrapper from "@atoms/ErrorPageThemeWrapper";
import ErrorReportButton from "@/components/shared/debug/ErrorReportButton";
import { logger } from "@lib/monitoring/logger";
import { Button, Flex, Result, Typography } from "antd";
import { useEffect, useState } from 'react';
import { LuHelpCircle, LuRefreshCw } from "react-icons/lu";
const { Paragraph } = Typography


export default function Error({ error, reset }: {
    error: Error & { digest?: string }, reset: () => void
}) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Log the error to Sentry
        logger.error('App Error Boundary', error, {
            userAgent: window?.navigator?.userAgent,
            location: window?.location?.href,
            digest: error.digest,
        });
    }, [error])

    const handleRefresh = () => {
        setIsRefreshing(true);
        reset();
        // Fallback: Hard refresh if reset doesn't work
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const handleGetHelp = () => {
        // Open support in new tab or navigate to help center
        window.open('/help', '_blank');
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
