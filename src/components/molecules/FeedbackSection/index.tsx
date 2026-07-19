import { Button, Flex, Form, Input, Modal, Typography, theme } from 'antd';
import React from 'react';
import { LuThumbsDown, LuThumbsUp } from 'react-icons/lu';

const { Text } = Typography;

export type FeedbackType = 'like' | 'dislike';

interface FeedbackSectionProps {
    likes: number;
    dislikes: number;
    feedbackGiven: FeedbackType | null;
    isFeedbackModalVisible: boolean;
    isSubmitting?: boolean;
    onFeedback: (type: FeedbackType) => void;
    onFeedbackSubmit: (comment: string) => Promise<boolean>;
    onModalClose: () => void;
    contentLabel?: string; // e.g., "article", "changelog entry", "FAQ"
}

/**
 * Reusable feedback section component
 * Used for articles, changelogs, FAQs, workflows, etc.
 */
const FeedbackSection: React.FC<FeedbackSectionProps> = ({
    likes,
    dislikes,
    feedbackGiven,
    isFeedbackModalVisible,
    isSubmitting = false,
    onFeedback,
    onFeedbackSubmit,
    onModalClose,
    contentLabel = 'content',
}) => {
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    const handleSubmit = async (values: { comment: string }) => {
        const saved = await onFeedbackSubmit(values.comment);
        if (saved) form.resetFields();
    };

    return (
        <>
            {/* Feedback Buttons */}
            <Flex
                justify="flex-end"
                align="center"
                gap={16}
                wrap
                style={{ padding: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}
            >
                <Text type="secondary" style={{ flex: '1 1 180px' }}>Was this {contentLabel} helpful?</Text>
                <Button
                    shape="round"
                    icon={<LuThumbsUp />}
                    onClick={() => onFeedback('like')}
                    disabled={isSubmitting || feedbackGiven === 'dislike'}
                    loading={isSubmitting && feedbackGiven !== 'dislike'}
                    type={feedbackGiven === 'like' ? 'primary' : 'default'}
                    aria-label={`Like this ${contentLabel}`}
                    title={feedbackGiven === 'like' ? 'Click to remove your like' : `Like this ${contentLabel}`}
                    style={{ minWidth: 44, minHeight: 44 }}
                >
                    {likes}
                </Button>
                <Button
                    shape="round"
                    icon={<LuThumbsDown />}
                    onClick={() => onFeedback('dislike')}
                    disabled={isSubmitting || feedbackGiven === 'like'}
                    loading={isSubmitting && feedbackGiven !== 'like'}
                    type={feedbackGiven === 'dislike' ? 'primary' : 'default'}
                    danger={feedbackGiven === 'dislike'}
                    aria-label={`Dislike this ${contentLabel}`}
                    title={feedbackGiven === 'dislike' ? 'Click to remove your dislike' : `Dislike this ${contentLabel}`}
                    style={{ minWidth: 44, minHeight: 44 }}
                >
                    {dislikes}
                </Button>
            </Flex>

            {/* Feedback Modal */}
            <Modal
                title="Help us improve"
                open={isFeedbackModalVisible}
                onCancel={onModalClose}
                footer={[
                    <Button key="back" onClick={onModalClose} disabled={isSubmitting} style={{ minHeight: 44 }}>
                        Skip
                    </Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()} loading={isSubmitting} disabled={isSubmitting} style={{ minHeight: 44 }}>
                        Send
                    </Button>,
                ]}
                width={500}
            >
                <Flex vertical gap={16} style={{ paddingTop: 8 }}>
                    <Text type="secondary">
                        Your feedback helps us understand what&apos;s not working and how we can make it better for you.
                    </Text>
                    <Form form={form} onFinish={handleSubmit} layout="vertical">
                        <Form.Item
                            name="comment"
                            label="What could we do better?"
                            rules={[{ required: true, message: 'Please share your thoughts with us' }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Input.TextArea
                                rows={5}
                                placeholder="Tell us what didn't work for you or what you'd like to see improved..."
                                maxLength={500}
                                showCount
                                style={{ resize: 'none' }}
                            />
                        </Form.Item>
                    </Form>
                </Flex>
            </Modal>
        </>
    );
};

export default FeedbackSection;
