import { Alert, Button, Card, Divider, Flex, Form, Input, Modal, Typography, message, theme } from 'antd';
import { useState } from 'react';
import { LuFileJson, LuSheet } from 'react-icons/lu';
import { Project } from './types';
import { getOutputJson } from './utils/excelUtils';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectData: Project;
    handleDownload: (type: 'json' | 'xlsx') => void;
}

export const ShareModal = ({ isOpen, onClose, projectData, handleDownload }: ShareModalProps) => {
    const [form] = Form.useForm();
    const [isSharing, setIsSharing] = useState(false);
    const { token } = theme.useToken();

    const handleClose = () => {
        form.resetFields();
        onClose();
        setIsSharing(false);
    };

    const handleSubmit = async (values: { apiUrl: string }) => {
        try {
            setIsSharing(true);
            const data = getOutputJson(projectData);
            const response = await fetch(values.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            message.success('Data shared successfully!');
            handleClose();
        } catch (error) {
            console.error('Error sharing data:', error);
            message.error('Failed to share data. Please check the API URL and try again.');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal
            title="Share Menu Data"
            open={isOpen}
            onCancel={handleClose}
            footer={null}
        >

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Form.Item
                    name="apiUrl"
                    label="API URL"
                    rules={[{
                        required: true,
                        message: 'Please enter the API URL',
                        type: 'url',
                        validator: (_, value) => {
                            if (!value) return Promise.reject();
                            try {
                                new URL(value);
                                return Promise.resolve();
                            } catch {
                                return Promise.reject('Please enter a valid URL');
                            }
                        }
                    }]}
                >
                    <Input.TextArea placeholder="https://yourapi.domain.com/menu-data" />
                </Form.Item>

                <Alert
                    message="API Endpoint Requirements"
                    description={
                        <Flex vertical gap="small">
                            <Typography.Text type="secondary">Your API endpoint must meet the following criteria:</Typography.Text>
                            <div style={{ paddingLeft: 8 }}>
                                <Flex vertical>
                                    <Typography.Text type="secondary">• Accepts <Typography.Text strong>POST</Typography.Text> requests.</Typography.Text>
                                    <Typography.Text type="secondary">• Is publicly accessible <Typography.Text strong>without authentication</Typography.Text>.</Typography.Text>
                                    <Typography.Text type="secondary">• Expects a JSON payload in the <Typography.Text strong>request body</Typography.Text>.</Typography.Text>
                                </Flex>
                            </div>
                        </Flex>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Form.Item>
                    <Flex gap={8} justify="end">
                        <Button onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSharing}
                        // disabled={!form.getFieldValue('apiUrl')}
                        >
                            Share Data
                        </Button>
                    </Flex>
                </Form.Item>

                <>
                    <Divider plain>Or Download As a File</Divider>
                    <div style={{ marginTop: 16, marginBottom: 24 }}>
                        <Flex gap="middle">
                            <Card
                                hoverable
                                onClick={() => handleDownload('json')}
                                styles={{
                                    body: {
                                        padding: '20px',
                                        backgroundColor: token.colorInfoBg,
                                        borderColor: token.colorInfo,
                                        borderRadius: 12,
                                    }
                                }}
                                style={{ flex: 1, textAlign: 'center', borderRadius: 12, }}
                            >
                                <Flex vertical align="center" gap="small">
                                    <LuFileJson style={{ fontSize: '28px', color: token.colorInfo }} />
                                    <Typography.Text strong style={{ color: token.colorInfo }}>Download .JSON</Typography.Text>
                                </Flex>
                            </Card>
                            <Card
                                hoverable
                                onClick={() => handleDownload('xlsx')}
                                styles={{
                                    body: {
                                        padding: '20px',
                                        backgroundColor: token.colorSuccessBg,
                                        borderColor: token.colorSuccess,
                                        borderRadius: 12,
                                    }
                                }}
                                style={{ flex: 1, textAlign: 'center', borderRadius: 12 }}
                            >
                                <Flex vertical align="center" gap="small">
                                    <LuSheet style={{ fontSize: '28px', color: token.colorSuccess }} />
                                    <Typography.Text strong style={{ color: token.colorSuccess }}>Download .XLSX</Typography.Text>
                                </Flex>
                            </Card>
                        </Flex>
                    </div>
                </>
            </Form>
        </Modal>
    );
};
