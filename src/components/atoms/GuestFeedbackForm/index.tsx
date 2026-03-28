'use client';

/**
 * GuestFeedbackForm Component
 * 
 * Public-facing feedback form for restaurant guests.
 * Mobile-first design, no authentication required.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { DEFAULT_FEEDBACK_SETTINGS, FeedbackDefaults, GuestFeedbackFormValues, GuestFeedbackSubmitState } from '@type/guestFeedback';
import { Button, Form, Input, message } from 'antd';
import React, { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { StarRating } from './StarRating';

const { TextArea } = Input;

interface GuestFeedbackFormProps {
    /** Tenant ID */
    tId: number;
    /** Store ID */
    sId: number;
    /** Project ID */
    projectId: string;
    /** Source of feedback */
    source: 'menu_footer' | 'feedback_qr' | 'direct_link';
    /** Store name for display */
    storeName?: string;
    /** Contact field settings */
    feedbackDefaults?: FeedbackDefaults;
    /** Callback after successful submission */
    onSuccess?: (reviewUrl?: string | null) => void;
}

// Types imported from @type/guestFeedback:
// - GuestFeedbackFormValues
// - GuestFeedbackSubmitState

export const GuestFeedbackForm: React.FC<GuestFeedbackFormProps> = ({
    tId,
    sId,
    projectId,
    source,
    storeName,
    feedbackDefaults,
    onSuccess,
}) => {
    const [form] = Form.useForm<GuestFeedbackFormValues>();
    const [rating, setRating] = useState<number>(0);
    const [submitState, setSubmitState] = useState<GuestFeedbackSubmitState>('idle');
    const [reviewUrl, setReviewUrl] = useState<string | null>(null);

    // Merge with defaults
    const settings = { ...DEFAULT_FEEDBACK_SETTINGS, ...feedbackDefaults };

    const handleSubmit = async (values: GuestFeedbackFormValues) => {
        if (rating === 0) {
            message.error('Please select a rating');
            return;
        }

        setSubmitState('submitting');

        try {
            const response = await fetch('/api/public/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tId,
                    sId,
                    projectId,
                    source,
                    rating,
                    message: values.message,
                    customerName: values.customerName,
                    customerPhone: values.customerPhone,
                    customerEmail: values.customerEmail,
                    website: values.website, // Honeypot
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitState('success');
                setReviewUrl(data.reviewUrl || null);
                onSuccess?.(data.reviewUrl);
            } else {
                setSubmitState('error');
                message.error(data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            setSubmitState('error');
            message.error('Network error. Please try again.');
        }
    };

    // Success state - show thank you + Google Review CTA
    if (submitState === 'success') {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Thank you for your feedback!
                    </h2>
                    <p className="text-gray-600">
                        Your feedback helps us improve.
                    </p>
                </div>

                {/* Google Review CTA - Shown to ALL ratings (compliant) */}
                {reviewUrl && (
                    <div className="border-t pt-6">
                        <p className="text-sm text-gray-500 mb-4">
                            Would you like to share your experience on Google?
                        </p>
                        <a
                            href={reviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                            <FaGoogle className="text-[#4285F4]" />
                            Leave a Google Review
                        </a>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    Share Your Feedback
                </h2>
                {storeName && (
                    <p className="text-gray-500 text-sm">{storeName}</p>
                )}
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="space-y-4"
            >
                {/* Star Rating - Required */}
                <div className="text-center mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        How was your experience?
                    </label>
                    <div className="flex justify-center">
                        <StarRating
                            value={rating}
                            onChange={setRating}
                            disabled={submitState === 'submitting'}
                            size={44}
                        />
                    </div>
                    {rating === 0 && submitState === 'error' && (
                        <p className="text-red-500 text-xs mt-2">Please select a rating</p>
                    )}
                </div>

                {/* Message - Optional */}
                <Form.Item
                    name="message"
                    label="Tell us more (optional)"
                >
                    <TextArea
                        rows={3}
                        maxLength={300}
                        showCount
                        placeholder="What did you like? What can we improve?"
                        disabled={submitState === 'submitting'}
                    />
                </Form.Item>

                {/* Contact Fields - Based on settings */}
                {(settings.collectName || settings.collectPhone || settings.collectEmail) && (
                    <div className="border-t pt-4 mt-4">
                        <p className="text-xs text-gray-500 mb-3">
                            Optional: Leave your contact if you would like us to follow up
                        </p>

                        {settings.collectName && (
                            <Form.Item name="customerName" className="mb-3">
                                <Input
                                    placeholder="Your name"
                                    maxLength={60}
                                    disabled={submitState === 'submitting'}
                                />
                            </Form.Item>
                        )}

                        {settings.collectPhone && (
                            <Form.Item name="customerPhone" className="mb-3">
                                <Input
                                    placeholder="Phone number"
                                    maxLength={20}
                                    disabled={submitState === 'submitting'}
                                />
                            </Form.Item>
                        )}

                        {settings.collectEmail && (
                            <Form.Item
                                name="customerEmail"
                                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                                className="mb-3"
                            >
                                <Input
                                    placeholder="Email address"
                                    maxLength={120}
                                    disabled={submitState === 'submitting'}
                                />
                            </Form.Item>
                        )}
                    </div>
                )}

                {/* Honeypot - Hidden from users, visible to bots */}
                <Form.Item
                    name="website"
                    style={{ display: 'none' }}
                    aria-hidden="true"
                >
                    <Input tabIndex={-1} autoComplete="off" />
                </Form.Item>

                {/* Submit Button */}
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={submitState === 'submitting'}
                    disabled={rating === 0}
                    className="mt-4"
                >
                    {submitState === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
                </Button>
            </Form>

            {/* Privacy Note */}
            <p className="text-xs text-gray-400 text-center mt-4">
                Your feedback is private and goes directly to the restaurant.
            </p>
        </div>
    );
};

export default GuestFeedbackForm;
