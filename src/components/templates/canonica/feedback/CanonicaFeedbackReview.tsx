'use client';

import { FEATURE_FLAGS } from '@config/features';
import FeedbackAdminTemplate from '@template/platform/feedbackAdmin';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Alert } from 'antd';

export default function CanonicaFeedbackReview() {
    const session = useClientAuthSession();
    const tId = Number(session?.tId || 0);
    const sId = Number(session?.sId || 0);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_FEEDBACK_REVIEW) {
        return (
            <Alert
                showIcon
                type="info"
                message="Feedback review is disabled"
                description="Enable ENABLE_CANONICA_FEEDBACK_REVIEW to review Help Center feedback inside Canonica."
            />
        );
    }

    if (!tId || !sId) {
        return (
            <Alert
                showIcon
                type="warning"
                message="Canonica workspace scope is missing"
                description="Open Canonica from a workspace account before reviewing feedback."
            />
        );
    }

    return (
        <FeedbackAdminTemplate
            embedded
            scope={{ tId, sId }}
            title="Feedback Review"
            description="Review ratings, product feedback, feature requests, and suggestions from the Help Center. Assign product surfaces, then turn important items into Support Board cards or answer proposals when they reveal a support gap."
        />
    );
}
