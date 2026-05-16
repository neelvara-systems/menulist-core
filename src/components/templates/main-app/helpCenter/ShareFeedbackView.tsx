import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { addFeedback, getLatestFeedbackForUser } from '@database/feedback';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Feedback } from '@type/feedback';
import { Alert, Button, Col, Flex, Form, List, message, Rate, Row, Steps, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuHeartHandshake, LuInbox, LuLightbulb, LuStar, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import FeatureRequests from './FeatureRequests';
import FeatureUsage from './FeatureUsage';
import GeneralFeedback from './GeneralFeedback';

const { Title, Text } = Typography;

const ShareFeedbackView = () => {
    const t = useTranslations('HelpCenter');
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [latestFeedback, setLatestFeedback] = useState<Feedback | null>(null);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const fetchLatestFeedback = async () => {
            dispatch(startLoader('fetch-latest-feedback'));
            try {
                const feedback = await getLatestFeedbackForUser();
                setLatestFeedback(feedback);
            } catch (error) {
                message.error(t('failedToFetchFeedback'));
            } finally {
                dispatch(stopLoader('fetch-latest-feedback'));
            }
        };

        fetchLatestFeedback();
    }, [dispatch]);

    const handleSendFeedback = async (values: any) => {
        const feedbackType = steps[currentStep].key as Feedback['type'];
        const feedbackPayload: Partial<Feedback> = {
            type: feedbackType,
            rating: values.rating,
            comment: values.comment,
            featureComment: values.featureComment,
            featureIssues: values.featureIssues,
            featureRequest: values.featureRequest,
            votedPopularRequests: values.votedPopularRequests,
        };

        dispatch(startLoader('send-feedback'));
        try {
            const submittedFeedback = await addFeedback(feedbackPayload);
            message.success(t('feedbackSubmitted'));
            form.resetFields();
            setLatestFeedback(submittedFeedback as Feedback);
        } catch (error) {
            message.error(t('failedToSendFeedback'));
        } finally {
            dispatch(stopLoader('send-feedback'));
        }
    };

    const steps = [
        {
            title: t('generalFeedback'),
            content: <GeneralFeedback />,
            icon: <LuStar />,
            fields: ['rating', 'comment'],
            key: "general"
        },
        {
            title: t('featureUsage'),
            content: <FeatureUsage />,
            icon: <LuInbox />,
            fields: ['featureIssues', 'featureComment'],
            key: "feature_usage"
        },
        {
            title: t('featureRequests'),
            content: <FeatureRequests />,
            icon: <LuLightbulb />,
            fields: ['featureRequest', 'votedPopularRequests'],
            key: "feature_requests"
        },
    ];

    return (
        <>
            <Form form={form} onFinish={handleSendFeedback} layout="vertical" style={{ marginTop: 24 }}>
                <Steps
                    current={currentStep}
                    items={steps.map(item => ({ key: item.key, title: item.title, icon: item.icon }))}
                    onChange={setCurrentStep}
                    style={{ marginBottom: 24 }} />
                <div>{steps[currentStep].content}</div>

                <Row justify="end" gutter={8} style={{ marginTop: 24 }}>
                    <Col style={{ marginRight: "auto" }}>
                        <Button onClick={() => { form.resetFields(); setCurrentStep(0); }}>{t('cancel')}</Button>
                    </Col>
                    {currentStep > 0 && (
                        <Col>
                            <Button onClick={() => setCurrentStep(currentStep - 1)} icon={<LuArrowLeft />}>{t('previous')}</Button>
                        </Col>
                    )}
                    {currentStep < steps.length - 1 && (
                        <Col>
                            <Button type="primary" onClick={async () => {
                                try {
                                    await form.validateFields(steps[currentStep].fields);
                                    setCurrentStep(currentStep + 1);
                                } catch {
                                    // Form validation shows inline errors
                                }
                            }} icon={<LuArrowRight />}>{t('next')}</Button>
                        </Col>
                    )}
                    {currentStep === steps.length - 1 && (
                        <Col>
                            <Button type="primary" htmlType="submit" icon={<LuHeartHandshake />}>{t('submitFeedback')}</Button>
                        </Col>
                    )}
                </Row>
            </Form>

            {Boolean(latestFeedback?.comment || latestFeedback?.featureRequest) && (
                <Alert
                    style={{ marginTop: 44 }}
                    message={<>
                        Last submitted on <DateTimeDisplay value={latestFeedback.createdOn} />
                    </>}
                    description={<Flex vertical justify='flex-start' align='flex-start' gap="small">
                        <Text type="secondary">Rating: <Rate disabled style={{ margin: "unset" }} value={latestFeedback.rating} /></Text>
                        <Text type="secondary">General Feedback: <Text>{latestFeedback.comment}</Text></Text>
                        <Text type="secondary">Feature Feedback: <Text>{latestFeedback.featureComment}</Text></Text>
                        <Text type="secondary">Feature Issues: <Text>{latestFeedback.featureIssues?.join(', ')}</Text></Text>
                        <Text type="secondary">Feature Request: <Text>{latestFeedback.featureRequest}</Text></Text>
                        {latestFeedback.votedPopularRequests && latestFeedback.votedPopularRequests.length > 0 && (
                            <Text type="secondary">Voted On Features:
                                <List
                                    size="small"
                                    dataSource={latestFeedback.votedPopularRequests}
                                    renderItem={item => (
                                        <List.Item>
                                            <Text>{item.feature} - {item.interested ? <LuThumbsUp /> : <LuThumbsDown />}</Text>
                                        </List.Item>
                                    )}
                                />
                            </Text>
                        )}
                    </Flex>}
                    type="info"
                    showIcon
                />
            )}
        </>
    );
};

export default ShareFeedbackView;
