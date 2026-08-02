'use client'

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { Button, Card, Flex, Result, theme } from 'antd';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import { getBoundedHelpChatStringContext, logHelpChatFailure } from './helpChatDiagnostics';

const HELP_CHAT_ERROR_BOUNDARY_TRIGGERED = 'help_chat_error_boundary_triggered';

function ChatErrorResult({ onReset }: { onReset: () => void }) {
    const { token } = theme.useToken();

    return (
        <Result
            icon={(
                <ContextualStateIllustration
                    color={token.colorTextQuaternary}
                    size={112}
                    variant="warningContext"
                />
            )}
            status="warning"
            title="Something went wrong"
            subTitle="The chat encountered an unexpected error. Please try again."
            extra={(
                <Flex justify="center">
                    <Button
                        type="primary"
                        icon={<LuRefreshCw />}
                        onClick={onReset}
                    >
                        Try Again
                    </Button>
                </Flex>
            )}
        />
    );
}

interface Props {
    children: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary for the Help Chat feature.
 * Catches render errors in any child component and shows a friendly fallback
 * instead of crashing the entire modal to a white screen.
 * 
 * Customer-facing — must degrade gracefully.
 */
class ChatErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logHelpChatFailure(HELP_CHAT_ERROR_BOUNDARY_TRIGGERED, error, {
            componentStackFrameCount: (errorInfo.componentStack ?? '')
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .length,
            ...getBoundedHelpChatStringContext('componentStack', errorInfo.componentStack ?? undefined),
        });
    }

    handleReset = () => {
        this.setState({ hasError: false });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChatErrorResult onReset={this.handleReset} />
                </Card>
            );
        }

        return this.props.children;
    }
}

export default ChatErrorBoundary;
