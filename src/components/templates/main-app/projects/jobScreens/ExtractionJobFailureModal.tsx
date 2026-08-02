'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Modal, Result, theme } from 'antd';
import {
    MENULIST_ANSWERLATTICE_TARGETS,
    getMenuListAnswerlatticeTargetProps,
} from '@lib/answerlattice/referenceClients/menuListGuidedResolution';

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
                icon={(
                    <ContextualStateIllustration
                        color={token.colorTextQuaternary}
                        size={112}
                        variant="photoErrorContext"
                    />
                )}
                status="error"
                title="Processing Failed"
                subTitle={message || `An error occurred while processing your ${labels.offeringLower} files. Please try again.`}
                extra={[
                    <Button
                        {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_RETRY)}
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
