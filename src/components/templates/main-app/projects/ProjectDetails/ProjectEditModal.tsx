import { useOfferingLabels } from '@hook/useOfferingLabels';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { getBase64 } from '@util/utils';
import { Button, Flex, Form, FormInstance, Image, Input, Modal, Switch, Upload, message } from "antd";
import { LuImagePlus, LuTrash2 } from 'react-icons/lu';
import { ProjectMetadata } from '../types';

export interface ProjectFormData {
    name: string;
    description?: string;
    active?: boolean;
    projectImage?: string | null;
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
    const projectImage = Form.useWatch('projectImage', form) as string | null | undefined;

    const handleProjectImageSelect = async (file: File) => {
        try {
            const rawBase64 = await getBase64(file);
            const optimized = await optimizeImage(rawBase64, MENU_IMAGE_CONFIG);
            form.setFieldValue('projectImage', optimized.dataUrl);
        } catch (error) {
            console.error('Failed to prepare project image:', error);
            message.error('Could not prepare image. Please try again.');
        }

        return false;
    };

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
                <Form.Item hidden name="projectImage">
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item label={`${offeringName} Image`}>
                    <Flex gap={12} vertical>
                        {projectImage ? (
                            <Flex align="center" gap={12}>
                                <Image
                                    alt={`${offeringName} preview`}
                                    height={88}
                                    preview={false}
                                    src={projectImage}
                                    style={{ borderRadius: 12, objectFit: 'cover' }}
                                    width={132}
                                />
                                <Flex gap={8} vertical>
                                    <Upload accept="image/*" beforeUpload={handleProjectImageSelect} showUploadList={false}>
                                        <Button icon={<LuImagePlus size={16} />}>Replace image</Button>
                                    </Upload>
                                    <Button
                                        danger
                                        icon={<LuTrash2 size={16} />}
                                        onClick={() => form.setFieldValue('projectImage', null)}
                                    >
                                        Remove image
                                    </Button>
                                </Flex>
                            </Flex>
                        ) : (
                            <Upload accept="image/*" beforeUpload={handleProjectImageSelect} showUploadList={false}>
                                <Button icon={<LuImagePlus size={16} />}>Upload image</Button>
                            </Upload>
                        )}
                        <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                            Optional. This image appears on the Official Business Page menu card.
                        </span>
                    </Flex>
                </Form.Item>
            </Form>
        </Modal>
    );
};
