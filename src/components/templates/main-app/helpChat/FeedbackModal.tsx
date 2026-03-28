'use client';

import { Button, Checkbox, Flex, Form, Input, message, Modal, Typography, theme } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: { reasonsToImprove: string[], comments: string }) => Promise<void>;
}

export const feedbackOptions = [
    { label: 'Answer is incorrect or inaccurate', value: 'not_factually_correct' },
    { label: 'Answer is not helpful', value: 'not_helpful' },
    { label: 'Didn\'t follow my instructions', value: 'not_following_instructions' },
    { label: 'Answer is inappropriate', value: 'harmful_or_offensive' },
    { label: 'Response was too slow', value: 'answer_took_too_long' },
    { label: 'Something else', value: 'other' },
];

export default function FeedbackModal({ visible, onClose, onSubmit }: FeedbackModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    const handleFinish = async (values: { reasonsToImprove: any[], comments: string }) => {
        setLoading(true);
        try {
            await onSubmit(values);
            form.resetFields();
            // Keep loading state active while modal closes for better UX
            // Modal will be destroyed anyway, so no need to reset loading
            onClose();
            // Success message handled by parent handler
        } catch (error) {
            message.error('Failed to submit feedback. Please try again.');
            setLoading(false); // Only reset on error
        }
    };

    return (
        <Modal
            title={
                <div style={{ paddingBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>What went wrong?</div>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                        Your feedback helps us improve responses for everyone
                    </Text>
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            centered
            width={540}
            styles={{ 
                content: { borderRadius: 16 },
                header: { paddingBottom: 16, borderBottom: `1px solid ${token.colorBorderSecondary}` },
                body: { paddingTop: 24 }
            }}
        >
            <Form form={form} onFinish={handleFinish} layout="vertical">
                <Form.Item 
                    name="reasonsToImprove" 
                    label={
                        <Text style={{ fontSize: 14, fontWeight: 500 }}>
                            What issues did you encounter? (Select all that apply)
                        </Text>
                    }
                    style={{ marginBottom: 20 }}
                >
                    <Checkbox.Group style={{ width: '100%' }}>
                        <Flex vertical gap={10}>
                            {feedbackOptions.map(option => (
                                <Checkbox 
                                    key={option.value} 
                                    value={option.value}
                                    style={{ 
                                        margin: 0,
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        width: '100%',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = token.colorPrimary;
                                        e.currentTarget.style.backgroundColor = token.colorPrimaryBg;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = token.colorBorderSecondary;
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <span style={{ fontSize: 14 }}>{option.label}</span>
                                </Checkbox>
                            ))}
                        </Flex>
                    </Checkbox.Group>
                </Form.Item>
                
                <Form.Item 
                    name="comments" 
                    label={
                        <Text style={{ fontSize: 14, fontWeight: 500 }}>
                            Additional details (optional)
                        </Text>
                    }
                    style={{ marginBottom: 24 }}
                >
                    <Input.TextArea 
                        rows={4} 
                        placeholder="Tell us more about what went wrong or how we can improve..." 
                        style={{ borderRadius: 8 }}
                        maxLength={500}
                        showCount
                    />
                </Form.Item>
                
                <Form.Item style={{ marginBottom: 0 }}>
                    <Flex justify="end" align="center" gap={10}>
                        <Button 
                            onClick={onClose}
                            size="large"
                            style={{ borderRadius: 8, minWidth: 90 }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                            size="large"
                            style={{ borderRadius: 8, minWidth: 90 }}
                        >
                            Submit
                        </Button>
                    </Flex>
                </Form.Item>
            </Form>
        </Modal>
    );
}
