import { Button, Flex, Form, FormInstance, Input, Modal } from "antd";
import { ProjectMetadata } from '../types';

export interface ProjectFormData {
    name: string;
    description?: string;
}


interface ProjectEditModalProps {
    isOpen: boolean;
    editingProject: ProjectMetadata | null;
    form: FormInstance<ProjectFormData>;
    onCancel: () => void;
    onSubmit: () => void;
    onReset: () => void;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
    isOpen,
    editingProject,
    form,
    onCancel,
    onSubmit,
    onReset,
}) => {
    return (
        <Modal
            title={editingProject ? 'Edit Catalog' : 'Create New Catalog'}
            open={isOpen}
            centered
            onOk={onSubmit}
            onCancel={onCancel}
            maskClosable={false}
            footer={
                <Flex justify="space-between" align="center">
                    {/* Reset link - only show when editing */}
                    <div>
                        {editingProject && (
                            <Button
                                type="text"
                                danger
                                size="small"
                                onClick={onReset}
                            >
                                Reset Catalog
                            </Button>
                        )}
                    </div>
                    {/* Primary action */}
                    <Button type="primary" onClick={onSubmit}>
                        {editingProject ? 'Update' : 'Create'}
                    </Button>
                </Flex>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{}}
            >
                <Form.Item
                    name="name"
                    label="Catalog Name"
                    rules={[{ required: true, message: 'Please enter a catalog name' }]}
                >
                    <Input placeholder="Enter catalog name" />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea
                        placeholder="Enter catalog description"
                        rows={3}
                        maxLength={200}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};
