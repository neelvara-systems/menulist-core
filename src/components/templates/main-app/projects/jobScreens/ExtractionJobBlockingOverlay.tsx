'use client';

/**
 * Extraction Job Blocking Overlay
 * 
 * Hard-blocks the UI when an extraction job is running (local or master).
 * User cannot navigate away or perform other actions until job completes.
 * 
 * Shows:
 * - Local job progress when own project has active job
 * - Master job blocking message when outlet's master has active job
 */

import { Button, Flex, Progress, Spin, Typography } from 'antd';
import { LuLoader2, LuPause } from 'react-icons/lu';

const { Title, Text } = Typography;

interface ExtractionJobBlockingOverlayProps {
    /** Whether overlay is visible */
    visible: boolean;
    /** Whether this is a local job (vs inherited master job) */
    isLocalJob: boolean;
    /** Progress percentage (0-100) for local jobs */
    progress?: number;
    /** Current step description */
    currentStep?: string;
    /** Blocking message (for master job blocking) */
    blockingMessage?: string;
    /** Cancel callback (only for local jobs that are processing) */
    onCancel?: () => void;
    /** Whether cancel is available */
    canCancel?: boolean;
}

export default function ExtractionJobBlockingOverlay({
    visible,
    isLocalJob,
    progress = 0,
    currentStep = 'Processing...',
    blockingMessage,
    onCancel,
    canCancel = false,
}: ExtractionJobBlockingOverlayProps) {
    if (!visible) return null;

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            gap={24}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
            }}
        >
            {isLocalJob ? (
                // Local job progress UI
                <>
                    <Spin indicator={<LuLoader2 size={48} className="animate-spin" />} />
                    <Title level={3} style={{ margin: 0 }}>
                        Processing Menu Files
                    </Title>
                    <Progress
                        percent={progress}
                        status="active"
                        style={{ width: 300 }}
                    />
                    <Text type="secondary">{currentStep}</Text>
                    {canCancel && onCancel && (
                        <Button
                            icon={<LuPause />}
                            onClick={onCancel}
                            danger
                        >
                            Cancel Processing
                        </Button>
                    )}
                </>
            ) : (
                // Master job blocking UI
                <>
                    <Spin indicator={<LuLoader2 size={48} className="animate-spin" />} />
                    <Title level={3} style={{ margin: 0 }}>
                        Master Menu Update in Progress
                    </Title>
                    <Text
                        type="secondary"
                        style={{ maxWidth: 400, textAlign: 'center' }}
                    >
                        {blockingMessage || 'The master outlet is updating menu data. Please wait for the update to complete.'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        This screen will automatically update when the master finishes.
                    </Text>
                </>
            )}
        </Flex>
    );
}
