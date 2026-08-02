'use client' // Error components must be Client Components
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorPageThemeWrapper from "@atoms/ErrorPageThemeWrapper";
import ErrorReportButton from "@/components/shared/debug/ErrorReportButton";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { Button, Flex, Result, Typography, theme } from "antd";
import { useEffect } from 'react';
import { LuHelpCircle, LuRefreshCw, LuRotateCw } from "react-icons/lu";
const { Text } = Typography

const GLOBAL_PAGES_ERROR_BOUNDARY_RENDERED = 'global_pages_error_boundary_rendered';
const HELP_ROUTE = '/help';

export default function Error({ error, reset }: {
    error: Error & { digest?: string }, reset: () => void
}) {
    const { token } = theme.useToken();

    useEffect(() => {
        logRuntimeFailure(GLOBAL_PAGES_ERROR_BOUNDARY_RENDERED, error, {
            hasDigest: Boolean(error?.digest),
            ...getBoundedRuntimeStringContext('digest', error?.digest),
            ...getBoundedRuntimeStringContext('location', window.location.href),
            ...getBoundedRuntimeStringContext('userAgent', window.navigator.userAgent),
        });
    }, [error])

    return (
        <ErrorPageThemeWrapper>
            <Flex vertical justify="center" align="center" style={{ width: "100vw", height: "calc(100vh - 72px)" }}>
                <Result
                    icon={(
                        <ContextualStateIllustration
                            color={token.colorTextQuaternary}
                            size={176}
                            variant="serverErrorContext"
                        />
                    )}
                    status="500"
                    title="Something went wrong"
                    subTitle={<Flex vertical justify="center" align="center">
                        <Text>The page could not finish loading. Your saved information has not been changed.</Text>
                        <Text strong>Try again, refresh the page, or open Help if the problem continues.</Text>
                    </Flex>}
                />
                <Flex gap={10} justify="center" wrap>
                    <Button type="primary" icon={<LuRotateCw />} onClick={() => reset()}>Try Again</Button>
                    <Button type="default" icon={<LuRefreshCw />} onClick={() => window.location.reload()}>Refresh Page</Button>
                    <Button type="default" icon={<LuHelpCircle />} href={HELP_ROUTE}>Get Help</Button>
                </Flex>
                <ErrorReportButton
                    error={error}
                    source="global-pages-error-boundary"
                    style={{ marginTop: 16 }}
                />
            </Flex>
        </ErrorPageThemeWrapper>
    )
}
