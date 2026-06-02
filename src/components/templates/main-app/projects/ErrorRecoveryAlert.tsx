'use client';

import { formatDateTime } from '@util/dateTime';
import { Alert, Button, Card, Collapse, Flex, List, Tag, Typography, theme } from 'antd';
import { useFormatter } from 'next-intl';
import { LuAlertCircle, LuRefreshCw, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface FailedFile {
    uid: string;
    name: string;
    error: string;
    timestamp: number;
}

interface ErrorRecoveryAlertProps {
    failedFiles: FailedFile[];
    onRetry: (fileUid: string) => void;
    onRetryAll: () => void;
    onDismiss: () => void;
}

/**
 * ErrorRecoveryAlert Component
 * 
 * Displays failed file uploads with retry options
 * 
 * Features:
 * - Shows count of failed files
 * - Lists each failed file with error message
 * - Individual retry buttons per file
 * - "Retry All" button for bulk retry
 * - Dismiss button to clear failures
 * - Collapsible details panel
 * 
 * @see ASSESSMENT-01-UPLOAD.md Task 13: Error Recovery UI
 */
export default function ErrorRecoveryAlert({
    failedFiles,
    onRetry,
    onRetryAll,
    onDismiss
}: ErrorRecoveryAlertProps) {
    const { token } = theme.useToken();
    const formatter = useFormatter();

    if (failedFiles.length === 0) return null;

    return (
        <Card
            style={{
                borderColor: token.colorError,
                borderWidth: 2,
                marginBottom: 16
            }}
        >
            <Flex vertical gap={16}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Flex align="center" gap={8}>
                        <LuAlertCircle size={24} style={{ color: token.colorError }} />
                        <div>
                            <Title level={5} style={{ margin: 0, color: token.colorError }}>
                                {failedFiles.length} File{failedFiles.length > 1 ? 's' : ''} Failed to Process
                            </Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Review errors below and retry processing
                            </Text>
                        </div>
                    </Flex>
                    <Button
                        icon={<LuX />}
                        onClick={onDismiss}
                        type="text"
                        danger
                    >
                        Dismiss
                    </Button>
                </Flex>

                {/* Quick Actions */}
                <Flex gap={8}>
                    <Button
                        type="primary"
                        icon={<LuRefreshCw />}
                        onClick={onRetryAll}
                        size="large"
                    >
                        Retry All {failedFiles.length} File{failedFiles.length > 1 ? 's' : ''}
                    </Button>
                </Flex>

                {/* Failed Files List */}
                <Collapse
                    defaultActiveKey={['1']}
                    ghost
                    items={[
                        {
                            key: '1',
                            label: (
                                <Text strong>
                                    View Details ({failedFiles.length} failed)
                                </Text>
                            ),
                            children: (
                                <List
                                    dataSource={failedFiles}
                                    renderItem={(item) => (
                                        <List.Item
                                            style={{
                                                background: token.colorErrorBg,
                                                padding: '12px 16px',
                                                borderRadius: 8,
                                                marginBottom: 8,
                                                border: `1px solid ${token.colorErrorBorder}`
                                            }}
                                            actions={[
                                                <Button
                                                    key="retry"
                                                    size="small"
                                                    icon={<LuRefreshCw />}
                                                    onClick={() => onRetry(item.uid)}
                                                    type="primary"
                                                >
                                                    Retry
                                                </Button>
                                            ]}
                                        >
                                            <Flex vertical gap={4} style={{ flex: 1 }}>
                                                <Flex align="center" gap={8}>
                                                    <Text strong style={{ color: token.colorError }}>
                                                        {item.name}
                                                    </Text>
                                                    <Tag color="error">Failed</Tag>
                                                </Flex>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Error: {item.error}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 11, color: token.colorTextTertiary }}>
                                                    Failed at: {formatDateTime(item.timestamp, 'datetime', formatter)}
                                                </Text>
                                            </Flex>
                                        </List.Item>
                                    )}
                                />
                            )
                        }
                    ]}
                />

                {/* Help Text */}
                <Alert
                    type="info"
                    showIcon
                    message="Common Solutions"
                    description={
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                            <li>Check your internet connection</li>
                            <li>Ensure file is not corrupted (try re-uploading)</li>
                            <li>Verify file meets size requirements (max 10MB for images, 50MB for PDFs)</li>
                            <li>Try uploading one file at a time</li>
                        </ul>
                    }
                    style={{ marginTop: 8 }}
                />
            </Flex>
        </Card>
    );
}
