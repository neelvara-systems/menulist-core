'use client';

import { Button, Checkbox, Flex, Form, Input, message, Modal } from 'antd';
import { useState } from 'react';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: { reasons: string[], comments: string }) => Promise<void>;
    feedbackData: {
        isGood: boolean;
        reasons: string[];
        comments: string;
    };
}

const feedbackOptions = [
    { label: 'Not factually correct', value: 'not_factually_correct' },
    { label: 'Not helpful', value: 'not_helpful' },
    { label: 'Not following instructions', value: 'not_following_instructions' },
    { label: 'Harmful or offensive', value: 'harmful_or_offensive' },
    { label: 'Answer took too long', value: 'answer_took_too_long' },
    { label: 'Other', value: 'other' },
];

export default function FeedbackModal({ visible, onClose, onSubmit, feedbackData }: FeedbackModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFinish = async (values: { reasons: string[], comments: string }) => {
        setLoading(true);
        try {
            await onSubmit(values);
            form.resetFields();
            onClose();
        } catch (error) {
            message.error('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="What went wrong?"
            open={visible}
            forceRender
            onCancel={onClose}
            footer={null}
            centered
            styles={{ content: { borderRadius: '12px' } }}
        >
            <p>Your feedback helps make this feature better for everyone.</p>
            <Form form={form} onFinish={handleFinish} layout="vertical" style={{ marginTop: '24px' }}>
                <Form.Item name="reasons">
                    <Checkbox.Group options={feedbackOptions} />
                </Form.Item>
                <Form.Item name="comments">
                    <Input.TextArea rows={4} placeholder="What's wrong? How can the response be improved?" />
                </Form.Item>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0, width: '100%' }}>
                    <Flex justify='end' align='center' gap={8}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={loading}>Submit</Button>
                    </Flex>
                </Form.Item>
            </Form>
        </Modal>
    );
}
