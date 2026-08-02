import { Button, Flex, message, Progress, Typography } from 'antd';
import { useEffect, useRef } from 'react';
import { LuLoader, LuX } from 'react-icons/lu';

interface LoadingMessageProps {
    open: boolean;
    progress?: number;
    message?: string;
    onCancel?: () => void;
}

export const normalizeLoadingProgress = (progress: number | undefined): number | null => {
    if (typeof progress !== 'number' || !Number.isFinite(progress)) return null;
    return Math.min(Math.max(Math.round(progress), 0), 100);
};

function LoadingMessage({ open, progress, message: customMessage, onCancel }: LoadingMessageProps) {
    const [messageApi, contextHolder] = message.useMessage();
    const key = 'updatable';
    const lastContentRef = useRef<string>('');
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;

    useEffect(() => {
        if (open) {
            // Build content based on props
            const normalizedProgress = normalizeLoadingProgress(progress);
            const hasProgress = normalizedProgress !== null;
            const currentStep = customMessage || 'Work in progress...';
            const progressText = hasProgress ? ` (${normalizedProgress}%)` : '';
            const content = `${currentStep}${progressText}`;
            const contentKey = `${content}:${Boolean(onCancel)}`;

            // Only update if content changed to prevent flickering
            if (contentKey !== lastContentRef.current) {
                lastContentRef.current = contentKey;

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
                                    percent={normalizedProgress}
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
                                        onCancelRef.current?.();
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
