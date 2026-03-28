import { Button, Flex, message, Progress, Typography } from 'antd';
import { useEffect, useRef } from 'react';
import { LuLoader, LuX } from 'react-icons/lu';

interface LoadingMessageProps {
    open: boolean;
    progress?: number;
    message?: string;
    onCancel?: () => void;
}

function LoadingMessage({ open, progress, message: customMessage, onCancel }: LoadingMessageProps) {
    const [messageApi, contextHolder] = message.useMessage();
    const key = 'updatable';
    const lastContentRef = useRef<string>('');

    useEffect(() => {
        if (open) {
            // Build content based on props
            const hasProgress = typeof progress === 'number';
            const currentStep = customMessage || 'Work in progress...';
            const progressText = hasProgress ? ` (${Math.round(progress)}%)` : '';
            const content = `${currentStep}${progressText}`;

            // Only update if content changed to prevent flickering
            if (content !== lastContentRef.current) {
                lastContentRef.current = content;

                messageApi.open({
                    key,
                    type: 'loading',
                    icon: <LuLoader className="animate__animated animate__infinite animate__rotateIn" style={{ fontSize: '18px', marginRight: 6 }} />,
                    content: (
                        <Flex align="center" gap={8}>
                            <Typography.Text style={{ margin: 0 }}>
                                {content}
                            </Typography.Text>
                            {hasProgress && (
                                <Progress
                                    percent={Math.round(progress)}
                                    size="small"
                                    showInfo={false}
                                    style={{ width: 80, margin: 0 }}
                                />
                            )}
                            {onCancel && (
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<LuX size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancel();
                                    }}
                                    style={{ marginLeft: 4, padding: '2px 4px', height: 'auto' }}
                                />
                            )}
                        </Flex>
                    ),
                    duration: 0,
                });
            }
        } else {
            lastContentRef.current = '';
            messageApi.destroy(key);
        }
    }, [open, messageApi, progress, customMessage, onCancel])

    return (
        <>
            {contextHolder}
        </>
    )
}

export default LoadingMessage