import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Alert, Card, Flex, Progress, Typography, theme } from 'antd';
import { LuCheckCircle, LuClock, LuUploadCloud } from 'react-icons/lu';

const { Text, Title } = Typography;

interface UploadProgressProps {
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'complete' | 'error';
    errorMessage?: string;
    estimatedTime?: number; // in seconds
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
    fileName,
    progress,
    status,
    errorMessage,
    estimatedTime
}) => {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();

    const getStatusConfig = () => {
        switch (status) {
            case 'uploading':
                return {
                    icon: <LuUploadCloud size={32} style={{ color: token.colorPrimary }} />,
                    title: 'Uploading...',
                    description: 'Sending your file to our servers',
                    color: token.colorPrimary,
                    showProgress: true
                };
            case 'processing':
                return {
                    icon: <LuClock size={32} style={{ color: token.colorWarning }} />,
                    title: 'Processing...',
                    description: `We're reading your ${labels.offeringLower} and extracting ${labels.itemsPlural}`,
                    color: token.colorWarning,
                    showProgress: true
                };
            case 'complete':
                return {
                    icon: <LuCheckCircle size={32} style={{ color: token.colorSuccess }} />,
                    title: 'Complete!',
                    description: `Your ${labels.offeringLower} is ready to edit`,
                    color: token.colorSuccess,
                    showProgress: false
                };
            case 'error':
                return {
                    icon: null,
                    title: 'Something went wrong',
                    description: errorMessage || 'Please try uploading again',
                    color: token.colorError,
                    showProgress: false
                };
        }
    };

    const config = getStatusConfig();

    return (
        <Card
            style={{
                width: '100%',
                maxWidth: 600,
                margin: '0 auto'
            }}
        >
            <Flex vertical gap={16}>
                {/* Status Icon & Title */}
                <Flex align="center" gap={12}>
                    {config.icon && (
                        <div className={status !== 'complete' ? 'animate__animated animate__pulse animate__infinite' : ''}>
                            {config.icon}
                        </div>
                    )}
                    <Flex vertical gap={4} style={{ flex: 1 }}>
                        <Title level={5} style={{ margin: 0 }}>
                            {config.title}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {config.description}
                        </Text>
                    </Flex>
                </Flex>

                {/* File Name */}
                <Card size="small" style={{ background: token.colorFillQuaternary }}>
                    <Text
                        strong
                        style={{
                            fontSize: 14,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        📄 {fileName}
                    </Text>
                </Card>

                {/* Progress Bar */}
                {config.showProgress && (
                    <div>
                        <Progress
                            percent={Math.round(progress)}
                            strokeColor={config.color}
                            status={status === 'processing' ? 'active' : 'normal'}
                        />
                        <Flex justify="space-between" style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {Math.round(progress)}% complete
                            </Text>
                            {estimatedTime && estimatedTime > 0 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    About {estimatedTime} seconds remaining
                                </Text>
                            )}
                        </Flex>
                    </div>
                )}

                {/* Error Message */}
                {status === 'error' && errorMessage && (
                    <Alert
                        message="Upload Failed"
                        description={errorMessage}
                        type="error"
                        showIcon
                    />
                )}

                {/* Helpful Tips */}
                {status === 'processing' && (
                    <Alert
                        message="💡 What's happening?"
                        description={`We're reading your ${labels.offeringLower} and automatically extracting ${labels.itemsPlural}, prices, and descriptions. This saves you hours of manual typing.`}
                        type="info"
                        showIcon={false}
                        style={{ background: token.colorInfoBg, border: `1px solid ${token.colorInfoBorder}` }}
                    />
                )}

                {status === 'complete' && (
                    <Alert
                        message="✨ Success!"
                        description={`Your ${labels.offeringLower} has been processed. You can now review and edit the extracted ${labels.itemsPlural}.`}
                        type="success"
                        showIcon={false}
                        style={{ background: token.colorSuccessBg, border: `1px solid ${token.colorSuccessBorder}` }}
                    />
                )}
            </Flex>
        </Card>
    );
};
