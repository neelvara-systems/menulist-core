'use client'

import { Button, Card, Flex, Result } from 'antd';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LuRefreshCw } from 'react-icons/lu';

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
        // Errors are caught here — no console.error per codebase rules
        // In production, this could be sent to Sentry or similar
    }

    handleReset = () => {
        this.setState({ hasError: false });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Result
                        status="warning"
                        title="Something went wrong"
                        subTitle="The chat encountered an unexpected error. Please try again."
                        extra={
                            <Flex justify="center">
                                <Button
                                    type="primary"
                                    icon={<LuRefreshCw />}
                                    onClick={this.handleReset}
                                >
                                    Try Again
                                </Button>
                            </Flex>
                        }
                    />
                </Card>
            );
        }

        return this.props.children;
    }
}

export default ChatErrorBoundary;
