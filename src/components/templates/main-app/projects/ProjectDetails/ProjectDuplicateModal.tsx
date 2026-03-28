import { Alert, Card, Flex, Form, Input, Modal, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { ProjectMetadata } from '../types';

const { Text } = Typography;
const { useToken } = theme;

interface ProjectDuplicateModalProps {
    open: boolean;
    project: ProjectMetadata | null;
    onCancel: () => void;
    onDuplicate: (newName: string, newDescription?: string) => Promise<void>;
}

export const ProjectDuplicateModal = ({ open, project, onCancel, onDuplicate }: ProjectDuplicateModalProps) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { token } = useToken();

    // Reset form when project changes or modal opens
    useEffect(() => {
        if (open && project) {
            form.setFieldsValue({
                name: `Copy of ${project.name}`,
                description: project.description || ''
            });
        }
    }, [open, project, form]);

    const handleSubmit = async (values: { name: string; description?: string }) => {
        try {
            setLoading(true);
            await onDuplicate(values.name, values.description);
            form.resetFields();
            onCancel();
        } catch (error) {
            console.error('Duplicate failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title="📋 Duplicate Catalog"
            open={open}
            onOk={() => form.submit()}
            onCancel={handleCancel}
            okText="Duplicate"
            confirmLoading={loading}
            width={520}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Alert
                    message="Creating a copy"
                    description={
                        <Flex vertical gap={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Original catalog: <Text strong>{project?.name}</Text>
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                All categories, items, images, languages, and theme will be copied.
                            </Text>
                        </Flex>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form.Item
                    name="name"
                    label="New Catalog Name"
                    rules={[
                        { required: true, message: 'Please enter a catalog name' },
                        { max: 100, message: 'Catalog name must be less than 100 characters' }
                    ]}
                >
                    <Input placeholder="Enter new catalog name" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description (Optional)"
                    rules={[
                        { max: 500, message: 'Description must be less than 500 characters' }
                    ]}
                >
                    <Input.TextArea
                        placeholder="Enter description (e.g., Summer 2024 Menu)"
                        rows={3}
                    />
                </Form.Item>

                {/* Helpful Tips */}
                <Card
                    size="small"
                    style={{
                        background: token.colorInfoBg,
                        borderColor: token.colorInfoBorder,
                        borderRadius: 6,
                        marginTop: 8
                    }}
                >
                    <Flex gap={8} align="flex-start">
                        <Text style={{ fontSize: 16 }}>💡</Text>
                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                Common Use Cases
                            </Text>
                            <Flex vertical gap={6} style={{ paddingLeft: 8 }}>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Seasonal Menus:</Text> Copy &ldquo;Summer 2024&rdquo; → Create &ldquo;Fall 2024&rdquo;, then update items
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Multi-Location:</Text> Copy main menu → Adjust prices/items for different locations
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Testing Changes:</Text> Duplicate before major edits to keep original safe
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>
            </Form>
        </Modal>
    );
};
