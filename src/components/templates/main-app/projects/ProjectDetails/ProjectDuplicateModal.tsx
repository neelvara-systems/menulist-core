import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
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
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    // Reset form when project changes or modal opens
    useEffect(() => {
        if (open && project) {
            const primaryLanguage = getPrimaryLocalizedLanguage(project.name, 'en');
            form.setFieldsValue({
                name: `Copy of ${getLocalizedText(project.name, undefined, primaryLanguage, 'Untitled')}`,
                description: getLocalizedText(project.description, undefined, primaryLanguage, '')
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
            title={`Duplicate ${offeringName}`}
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
                                Original {labels.offeringPhrase}: <Text strong>{project ? getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled') : ''}</Text>
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                All categories, {labels.itemsPlural}, images, languages, and theme will be copied.
                            </Text>
                        </Flex>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form.Item
                    name="name"
                    label={`New ${offeringName} Name`}
                    rules={[
                        { required: true, message: `Please enter a ${labels.offeringPhrase} name` },
                        { max: 100, message: `${offeringName} name must be less than 100 characters` }
                    ]}
                >
                    <Input placeholder={`Enter new ${labels.offeringPhrase} name`} />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description (Optional)"
                    rules={[
                        { max: 500, message: 'Description must be less than 500 characters' }
                    ]}
                >
                    <Input.TextArea
                        placeholder={`Enter description (e.g., Seasonal ${offeringName})`}
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
                                        <Text strong>Seasonal updates:</Text> Duplicate your current {labels.offeringPhrase}, then adjust prices, timing, or featured {labels.itemsPlural}
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Multi-location:</Text> Copy your main {labels.offeringPhrase} and adjust local pricing or availability
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
