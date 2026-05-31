'use client';

import { FEATURE_FLAGS } from '@config/features';
import { helpCenterArticleRouting } from '@constant/navigations';
import { updateFaqFeedbackGeneric } from '@database/feedback/genericFeedback';
import { useFeedback } from '@hook/useFeedback';
import { fetchAnswerlatticePublicFaqs } from '@lib/answerlattice/publicContentClient';
import { getStoredContentFeedback, removeStoredContentFeedback, storeContentFeedback } from '@lib/contentFeedbackStorage';
import FeedbackSection from '@molecules/FeedbackSection';
import type { AnswerlatticeFaq } from '@type/answerlattice';
import { Button, Collapse, Empty, Flex, Skeleton, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuBookOpen } from 'react-icons/lu';

const { Paragraph, Text } = Typography;

const FallbackFaqs = () => {
    const t = useTranslations('HelpCenter');

    const faqs = [
        { key: '1', label: t('faqUpgrade'), children: <Text>{t('faqUpgradeAnswer')}</Text> },
        { key: '2', label: t('faqFormats'), children: <Text>{t('faqFormatsAnswer')}</Text> },
        { key: '3', label: t('faqProcessing'), children: <Text>{t('faqProcessingAnswer')}</Text> },
        { key: '4', label: t('faqEdit'), children: <Text>{t('faqEditAnswer')}</Text> },
    ];

    return <Collapse accordion items={faqs} />;
};

const FaqAnswer = ({ faq }: { faq: AnswerlatticeFaq }) => {
    const feedback = useFeedback(
        {
            contentType: 'faq',
            contentId: faq.id,
            initialLikes: faq.likes || 0,
            initialDislikes: faq.dislikes || 0,
        },
        {
            updateFeedback: async (contentId, type, increment) => {
                return await updateFaqFeedbackGeneric(contentId, type, increment);
            },
            storeFeedback: (userId, contentId, type) => {
                storeContentFeedback('faq', userId, contentId, type);
            },
            getStoredFeedback: (userId, contentId) => {
                return getStoredContentFeedback('faq', userId, contentId);
            },
            removeStoredFeedback: (userId, contentId) => {
                removeStoredContentFeedback('faq', userId, contentId);
            },
        },
    );

    return (
        <Flex vertical gap={12}>
            <Paragraph style={{ marginBottom: 0 }}>{faq.answer}</Paragraph>
            {(faq.tags || []).length > 0 && (
                <Flex wrap gap={6}>
                    {(faq.tags || []).slice(0, 6).map(tag => <Tag key={tag}>{tag}</Tag>)}
                </Flex>
            )}
            {faq.articleId && (
                <Button
                    type="link"
                    href={helpCenterArticleRouting(faq.articleId)}
                    icon={<LuBookOpen />}
                    style={{ alignSelf: 'flex-start', paddingInline: 0 }}
                >
                    Read full article
                </Button>
            )}
            <FeedbackSection
                likes={feedback.likes}
                dislikes={feedback.dislikes}
                feedbackGiven={feedback.feedbackGiven}
                isFeedbackModalVisible={feedback.isFeedbackModalVisible}
                onFeedback={feedback.handleFeedback}
                onFeedbackSubmit={feedback.handleFeedbackSubmit}
                onModalClose={() => feedback.setIsFeedbackModalVisible(false)}
                contentLabel="FAQ"
            />
        </Flex>
    );
};

const FaqView = () => {
    const [loading, setLoading] = useState(Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT));
    const [faqs, setFaqs] = useState<AnswerlatticeFaq[]>([]);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT) return;
        let mounted = true;
        setLoading(true);
        fetchAnswerlatticePublicFaqs()
            .then((items = []) => {
                if (!mounted) return;
                setFaqs(items);
                setFailed(false);
            })
            .catch(() => {
                if (!mounted) return;
                setFailed(true);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const items = useMemo(
        () => faqs.map(faq => ({
            key: faq.id,
            label: faq.question,
            children: <FaqAnswer faq={faq} />,
        })),
        [faqs],
    );

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT || failed) {
        return <FallbackFaqs />;
    }

    if (loading) {
        return <Skeleton active paragraph={{ rows: 4 }} />;
    }

    if (faqs.length === 0) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No FAQs published yet" />;
    }

    return <Collapse accordion items={items} />;
};

export default FaqView;
