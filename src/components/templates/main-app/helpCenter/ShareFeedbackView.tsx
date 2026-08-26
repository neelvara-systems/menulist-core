import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { addFeedback, getLatestFeedbackForUser } from '@database/feedback';
import type { AnswerlatticeFeedbackSubmission } from '@lib/answerlattice/feedbackBoundary';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Feedback } from '@type/feedback';
import { Alert, Button, Col, Flex, Form, List, App, Rate, Row, Steps, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuHeartHandshake, LuInbox, LuLightbulb, LuRefreshCw, LuStar, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import FeatureRequests from './FeatureRequests';
import FeatureUsage from './FeatureUsage';
import GeneralFeedback from './GeneralFeedback';

const { Title, Text } = Typography;

const ShareFeedbackView = () => {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('HelpCenter');
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [latestFeedback, setLatestFeedback] = useState<Feedback | null>(null);
    const [latestFeedbackLoadFailed, setLatestFeedbackLoadFailed] = useState(false);
    const [isLoadingLatestFeedback, setIsLoadingLatestFeedback] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitFailed, setSubmitFailed] = useState(false);
    const submittingRef = useRef(false);
    const dispatch = useAppDispatch();

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

    const fetchLatestFeedback = useCallback(async () => {
        setLatestFeedbackLoadFailed(false);
        setIsLoadingLatestFeedback(true);
        dispatch(startLoader('fetch-latest-feedback'));
        try {
            const feedback = await getLatestFeedbackForUser();
            setLatestFeedback(feedback);
        } catch (error) {
            setLatestFeedback(null);
            setLatestFeedbackLoadFailed(true);
            messageApi.error(t('failedToFetchFeedback'));
        } finally {
            dispatch(stopLoader('fetch-latest-feedback'));
            setIsLoadingLatestFeedback(false);
        }
    }, [dispatch, t]);

    useEffect(() => {
        void fetchLatestFeedback();
    }, [fetchLatestFeedback]);

    const moveToStep = (step: number) => {
        setSubmitFailed(false);
        setCurrentStep(step);
    };

    const handleSendFeedback = async (values: Record<string, unknown>) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        setSubmitFailed(false);
        const feedbackType = steps[currentStep].key as AnswerlatticeFeedbackSubmission['type'];
        const feedbackPayload = {
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
            messageApi.success(t('feedbackSubmitted'));
            form.resetFields();
            setLatestFeedback(submittedFeedback as Feedback);
        } catch (error) {
            setSubmitFailed(true);
            messageApi.error(t('failedToSendFeedback'));
        } finally {
            dispatch(stopLoader('send-feedback'));
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleSubmitCurrentFeedback = async () => {
        try {
            const values = await form.validateFields(steps[currentStep].fields);
            await handleSendFeedback(values);
        } catch {
            // Form validation shows inline errors
        }
    };

    return (
        <>
            {latestFeedbackLoadFailed && (
                <Alert
                    style={{ marginTop: 24 }}
                    message={t('failedToFetchFeedback')}
                    type="error"
                    showIcon
                    action={(
                        <Button
                            aria-label={t('failedToFetchFeedback')}
                            icon={<LuRefreshCw aria-hidden="true" />}
                            loading={isLoadingLatestFeedback}
                            onClick={() => void fetchLatestFeedback()}
                            size="small"
                        />
                    )}
                />
            )}

            <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                <Steps
                    current={currentStep}
                    items={steps.map(item => ({ key: item.key, title: item.title, icon: item.icon }))}
                    onChange={isSubmitting ? undefined : moveToStep}
                    style={{ marginBottom: 24 }} />
                <div>{steps[currentStep].content}</div>

                {submitFailed && (
                    <Alert
                        style={{ marginTop: 24 }}
                        message={t('failedToSendFeedback')}
                        type="error"
                        showIcon
                    />
                )}

                <Row justify="end" gutter={8} style={{ marginTop: 24 }}>
                    <Col style={{ marginRight: "auto" }}>
                        <Button disabled={isSubmitting} onClick={() => { form.resetFields(); setSubmitFailed(false); setCurrentStep(0); }}>{t('cancel')}</Button>
                    </Col>
                    {currentStep > 0 && (
                        <Col>
                            <Button disabled={isSubmitting} onClick={() => moveToStep(currentStep - 1)} icon={<LuArrowLeft />}>{t('previous')}</Button>
                        </Col>
                    )}
                    {currentStep < steps.length - 1 && (
                        <Col>
                            <Button disabled={isSubmitting} onClick={() => moveToStep(currentStep + 1)} icon={<LuArrowRight />}>{t('next')}</Button>
                        </Col>
                    )}
                    <Col>
                        <Button
                            type="primary"
                            onClick={handleSubmitCurrentFeedback}
                            icon={<LuHeartHandshake />}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            {t('submitFeedback')}
                        </Button>
                    </Col>
                </Row>
            </Form>

            {latestFeedback?.createdOn && (
                <Alert
                    style={{ marginTop: 44 }}
                    message={<>
                        {t('lastSubmittedOn')} <DateTimeDisplay value={latestFeedback.createdOn} />
                    </>}
                    description={<Flex vertical justify='flex-start' align='flex-start' gap="small">
                        {latestFeedback.rating ? <Text type="secondary">{t('rating')} <Rate disabled style={{ margin: "unset" }} value={latestFeedback.rating} /></Text> : null}
                        {latestFeedback.comment ? <Text type="secondary">{t('generalFeedbackLabel')} <Text>{latestFeedback.comment}</Text></Text> : null}
                        {latestFeedback.featureComment ? <Text type="secondary">{t('featureFeedbackLabel')} <Text>{latestFeedback.featureComment}</Text></Text> : null}
                        {latestFeedback.featureIssues?.length ? <Text type="secondary">{t('featureIssuesLabel')} <Text>{latestFeedback.featureIssues.join(', ')}</Text></Text> : null}
                        {latestFeedback.featureRequest ? <Text type="secondary">{t('featureRequestLabel2')} <Text>{latestFeedback.featureRequest}</Text></Text> : null}
                        {latestFeedback.votedPopularRequests && latestFeedback.votedPopularRequests.length > 0 && (
                            <Text type="secondary">{t('votedOnFeatures')}
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
