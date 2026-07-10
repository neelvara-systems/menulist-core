import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Alert, Button, Flex, Modal, Typography } from "antd";

const { Text } = Typography;

interface ProjectConfirmModalProps {
    isOpen: boolean;
    actionType: 'reset' | 'delete' | null;
    onCancel: () => void;
    onDelete: () => void;
    onReset: () => void;
    fileCount?: number;
    projectName?: string;
}

export const ProjectConfirmModal: React.FC<ProjectConfirmModalProps> = ({
    isOpen,
    actionType,
    onCancel,
    onDelete,
    onReset,
    fileCount = 0,
    projectName
}) => {
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    return (
        <Modal
            title={actionType === 'delete' ? `Delete ${offeringName}` : `Reset ${offeringName}`}
            centered
            open={isOpen}
            onCancel={onCancel}
            width={550}
            footer={[
                <Button
                    key="cancel"
                    onClick={onCancel}
                >
                    Cancel
                </Button>,
                actionType === 'delete' ? (
                    <Button
                        key="confirm-delete"
                        danger
                        type="primary"
                        onClick={onDelete}
                    >
                        {fileCount > 0 ? `Delete ${offeringName} & ${fileCount} File${fileCount > 1 ? 's' : ''}` : `Delete ${offeringName}`}
                    </Button>
                ) : (
                    <Button
                        key="confirm-reset"
                        danger
                        ghost
                        type="primary"
                        onClick={onReset}
                    >
                        Reset {offeringName}
                    </Button>
                )
            ]}
        >
            <Flex vertical gap={12}>
                {actionType === 'delete' ? (
                    <>
                        <Text>
                            {projectName ? (
                                <>
                                    Customers will no longer see <Text strong>&quot;{projectName}&quot;</Text>.
                                </>
                            ) : (
                                `Customers will no longer see this ${labels.offeringPhrase}.`
                            )}
                        </Text>
                        {fileCount > 0 && (
                            <Alert
                                message={`${fileCount} file${fileCount > 1 ? 's' : ''} will be permanently deleted`}
                                description="All uploaded files, extracted data, and generated content will be removed."
                                type="warning"
                                showIcon
                            />
                        )}
                        <Alert
                            message="This action cannot be undone"
                            description={`All ${labels.offeringPhrase} data will be permanently deleted and cannot be recovered.`}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <Text>
                            Are you sure you want to reset this {labels.offeringPhrase} and remove all files? Customers keep seeing the last saved version until you publish again.
                        </Text>
                        {fileCount > 0 && (
                            <Alert
                                message={`${fileCount} file${fileCount > 1 ? 's' : ''} will be removed`}
                                description={`All uploaded files and extracted data will be cleared. ${offeringName} settings will be preserved.`}
                                type="warning"
                                showIcon
                            />
                        )}
                        <Alert
                            message="This action cannot be undone"
                            type="warning"
                            showIcon
                        />
                    </>
                )}
            </Flex>
        </Modal>
    );
};
