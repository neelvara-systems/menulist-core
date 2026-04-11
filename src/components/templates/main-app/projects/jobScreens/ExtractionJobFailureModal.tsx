'use client';

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Modal, Result, theme } from 'antd';
import { LuXCircle } from 'react-icons/lu';

interface ExtractionJobFailureModalProps {
    open: boolean;
    message?: string;
    onClose: () => void;
}

/**
 * ExtractionJobFailureModal
 * 
 * Displayed when an extraction job fails.
 * Shows a user-friendly error message and allows retry.
 * 
 * On close, clears the error state and allows user to attempt processing again.
 */
export default function ExtractionJobFailureModal({
    open,
    message,
    onClose,
}: ExtractionJobFailureModalProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={480}
        >
            <Result
                icon={<LuXCircle size={64} style={{ color: token.colorError }} />}
                status="error"
                title="Processing Failed"
                subTitle={message || `An error occurred while processing your ${labels.offeringLower} files. Please try again.`}
                extra={[
                    <Button
                        key="retry"
                        type="primary"
                        size="large"
                        onClick={onClose}
                    >
                        Try Again
                    </Button>
                ]}
            />
        </Modal>
    );
}
