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

    return (
        <Modal
            title={actionType === 'delete' ? "Delete Catalog" : "Reset Catalog"}
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
                        {fileCount > 0 ? `Delete Catalog & ${fileCount} File${fileCount > 1 ? 's' : ''}` : 'Delete Catalog'}
                    </Button>
                ) : (
                    <Button
                        key="confirm-reset"
                        danger
                        ghost
                        type="primary"
                        onClick={onReset}
                    >
                        Reset Catalog
                    </Button>
                )
            ]}
        >
            <Flex vertical gap={12}>
                {actionType === 'delete' ? (
                    <>
                        <Text>
                            Are you sure you want to delete{' '}
                            {projectName ? (
                                <>
                                    <Text strong>&quot;{projectName}&quot;</Text>?
                                </>
                            ) : (
                                'this catalog?'
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
                            description="All catalog data will be permanently deleted and cannot be recovered."
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <Text>
                            Are you sure you want to reset this catalog and remove all files?
                        </Text>
                        {fileCount > 0 && (
                            <Alert
                                message={`${fileCount} file${fileCount > 1 ? 's' : ''} will be removed`}
                                description="All uploaded files and extracted data will be cleared. Catalog settings will be preserved."
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
