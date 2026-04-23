import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, Form, FormInstance, Input, Modal, Switch } from "antd";
import { ProjectMetadata } from '../types';

export interface ProjectFormData {
    name: string;
    description?: string;
    active?: boolean;
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
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    return (
        <Modal
            title={editingProject ? `Edit ${offeringName}` : `Create New ${offeringName}`}
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
                                Reset {offeringName}
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
                initialValues={{ active: true }}
            >
                <Form.Item
                    name="name"
                    label={`${offeringName} Name`}
                    rules={[{ required: true, message: `Please enter a ${labels.offeringPhrase} name` }]}
                >
                    <Input placeholder={`Enter ${labels.offeringPhrase} name`} />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea
                        placeholder={`Enter ${labels.offeringPhrase} description`}
                        rows={3}
                        maxLength={200}
                        showCount
                    />
                </Form.Item>
                <Form.Item
                    name="active"
                    label="Active"
                    valuePropName="checked"
                >
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
            </Form>
        </Modal>
    );
};
