import { Alert, Button, Card, Divider, Flex, Form, Input, Modal, Typography, App, theme } from 'antd';
import { getBoundedExportStringContext, logExportFailure } from '@lib/export/exportDiagnostics';
import { useCallback, useRef, useState } from 'react';
import { LuFileJson, LuSheet } from 'react-icons/lu';
import { Project } from './types';
import { getOutputJson } from './utils/excelUtils';

const SHARE_ENDPOINT_INVALID_MESSAGE = 'Use a public HTTPS API URL.';
const SHARE_ENDPOINT_URL_MAX_LENGTH = 2_048;
const SHARE_ENDPOINT_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'omit' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
    referrerPolicy: 'no-referrer' as ReferrerPolicy,
};

function isBlockedShareEndpointHost(hostname: string) {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost'
        || host.endsWith('.localhost')
        || host.endsWith('.local')
        || host === 'metadata.google.internal'
        || host === '0.0.0.0'
        || host.startsWith('127.')
        || host.startsWith('10.')
        || host.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
        || host.startsWith('169.254.')
        || host === '::1'
        || (host.includes(':') && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')));
}

function normalizeShareEndpointUrl(value: string) {
    if (value.length > SHARE_ENDPOINT_URL_MAX_LENGTH) return null;
    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:') return null;
        if (url.username || url.password) return null;
        if (isBlockedShareEndpointHost(url.hostname)) return null;
        url.hash = '';
        return url.toString();
    } catch {
        return null;
    }
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectData: Project;
    handleDownload: (type: 'json' | 'xlsx') => void;
}

export const ShareModal = ({ isOpen, onClose, projectData, handleDownload }: ShareModalProps) => {
    const { message: messageApi } = App.useApp();
    const [form] = Form.useForm();
    const [isSharing, setIsSharing] = useState(false);
    const { token } = theme.useToken();
    const actionInFlightRef = useRef(false);
    const modalEpochRef = useRef(0);
    const previousOpenRef = useRef(isOpen);
    const currentScopeRef = useRef({ isOpen, projectId: projectData.projectId });
    if (previousOpenRef.current !== isOpen) {
        previousOpenRef.current = isOpen;
        modalEpochRef.current += 1;
    }
    currentScopeRef.current = { isOpen, projectId: projectData.projectId };

    const isExpectedScope = useCallback((projectId: unknown, modalEpoch: number) => (
        currentScopeRef.current.isOpen
        && modalEpochRef.current === modalEpoch
        && String(currentScopeRef.current.projectId ?? '') === String(projectId ?? '')
    ), []);

    const handleClose = () => {
        modalEpochRef.current += 1;
        form.resetFields();
        onClose();
        setIsSharing(false);
    };

    const handleSubmit = async (values: { apiUrl: string }) => {
        let responseStatus: number | undefined;
        let categoryCount = 0;
        let itemCount = 0;
        const apiUrl = normalizeShareEndpointUrl(values.apiUrl);
        if (!apiUrl) {
            messageApi.error(SHARE_ENDPOINT_INVALID_MESSAGE);
            return;
        }
        if (actionInFlightRef.current) return;
        const expectedProjectId = projectData.projectId;
        const expectedModalEpoch = modalEpochRef.current;
        actionInFlightRef.current = true;
        try {
            setIsSharing(true);
            const data = getOutputJson(projectData);
            categoryCount = data.categories.length;
            itemCount = data.items.length;
            const response = await fetch(apiUrl, {
                ...SHARE_ENDPOINT_REQUEST_POLICY,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            responseStatus = response.status;

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (isExpectedScope(expectedProjectId, expectedModalEpoch)) {
                messageApi.success('Data shared successfully!');
                handleClose();
            }
        } catch (error) {
            logExportFailure('project_share_endpoint_post_failed', error, {
                ...getBoundedExportStringContext('apiUrl', apiUrl),
                ...getBoundedExportStringContext('projectId', expectedProjectId),
                categoryCount,
                itemCount,
                responseStatus,
            });
            if (isExpectedScope(expectedProjectId, expectedModalEpoch)) {
                messageApi.error('Failed to share data. Please check the API URL and try again.');
            }
        } finally {
            actionInFlightRef.current = false;
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
                        message: SHARE_ENDPOINT_INVALID_MESSAGE,
                        validator: (_, value) => {
                            if (typeof value !== 'string' || !normalizeShareEndpointUrl(value)) {
                                return Promise.reject(new Error(SHARE_ENDPOINT_INVALID_MESSAGE));
                            }
                            return Promise.resolve();
                        }
                    }]}
                >
                    <Input.TextArea maxLength={SHARE_ENDPOINT_URL_MAX_LENGTH} placeholder="https://yourapi.domain.com/menu-data" />
                </Form.Item>

                <Alert
                    message="API Endpoint Requirements"
                    description={
                        <Flex vertical gap="small">
                            <Typography.Text type="secondary">Your API endpoint must meet the following criteria:</Typography.Text>
                            <div style={{ paddingLeft: 8 }}>
                                <Flex vertical>
                                    <Typography.Text type="secondary">• Accepts <Typography.Text strong>POST</Typography.Text> requests.</Typography.Text>
                                    <Typography.Text type="secondary">• Uses <Typography.Text strong>HTTPS</Typography.Text> on a public domain.</Typography.Text>
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
