import { useOfferingLabels } from '@hook/useOfferingLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { Flex, Progress, Typography } from 'antd';
import { LuCheckCircle, LuFileText, LuSparkles, LuUpload } from 'react-icons/lu';

const { Text } = Typography;

type ProcessingStage = 'uploading' | 'reading' | 'extracting' | 'complete';

interface ProcessingOverlayProps {
    stage: ProcessingStage;
    fileName?: string;
    progress?: number;
}

function getStageConfig(labels: OfferingLabels) {
    return {
        uploading: {
            icon: <LuUpload size={40} />,
            title: 'Uploading your file...',
            description: `Just a moment while we save your content`,
            color: '#1890ff',
            step: 1
        },
        reading: {
            icon: <LuFileText size={40} />,
            title: `Reading your ${labels.offeringLower}...`,
            description: `Our AI is looking at your ${labels.offeringLower}`,
            color: '#52c41a',
            step: 2
        },
        extracting: {
            icon: <LuSparkles size={40} />,
            title: `Finding all your ${labels.itemsPlural}...`,
            description: `Extracting ${labels.itemsPlural}, prices, and descriptions`,
            color: '#faad14',
            step: 3
        },
        complete: {
            icon: <LuCheckCircle size={40} />,
            title: 'All done!',
            description: `Your ${labels.offeringLower} is ready to edit`,
            color: '#52c41a',
            step: 4
        }
    };
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
    stage,
    fileName,
    progress
}) => {
    const labels = useOfferingLabels();
    const config = getStageConfig(labels)[stage];
    const totalSteps = 4;
    const percentComplete = ((config.step - 1) / (totalSteps - 1)) * 100;

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            gap={24}
            style={{
                width: '100%',
                padding: '40px 20px',
                minHeight: 300
            }}
        >
            {/* Icon with pulse animation */}
            <div
                className="animate__animated animate__pulse animate__infinite"
                style={{
                    color: config.color,
                    marginBottom: 8
                }}
            >
                {config.icon}
            </div>

            {/* Title */}
            <Text
                strong
                style={{
                    fontSize: 20,
                    textAlign: 'center',
                    marginBottom: -8
                }}
            >
                {config.title}
            </Text>

            {/* Description */}
            <Text
                type="secondary"
                style={{
                    fontSize: 14,
                    textAlign: 'center',
                    maxWidth: 400
                }}
            >
                {config.description}
            </Text>

            {/* File name (if provided) */}
            {fileName && (
                <Text
                    type="secondary"
                    style={{
                        fontSize: 12,
                        fontStyle: 'italic'
                    }}
                >
                    {fileName}
                </Text>
            )}

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 400 }}>
                <Progress
                    percent={progress !== undefined ? progress : percentComplete}
                    strokeColor={config.color}
                    showInfo={false}
                    style={{ marginBottom: 8 }}
                />
                <Flex justify="space-between">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Step {config.step} of {totalSteps}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {progress !== undefined ? `${Math.round(progress)}%` : `${Math.round(percentComplete)}%`}
                    </Text>
                </Flex>
            </div>

            {/* Fun tip */}
            {stage !== 'complete' && (
                <Flex
                    vertical
                    align="center"
                    style={{
                        marginTop: 16,
                        padding: '12px 20px',
                        background: '#f5f5f5',
                        borderRadius: 8,
                        maxWidth: 400
                    }}
                >
                    <Text
                        type="secondary"
                        style={{
                            fontSize: 12,
                            textAlign: 'center',
                            lineHeight: 1.5
                        }}
                    >
                        💡 <strong>Tip:</strong> This usually takes 10-30 seconds depending on content size
                    </Text>
                </Flex>
            )}
        </Flex>
    );
};
