'use client';

/**
 * FeedbackNudge — Inline timed feedback prompt on public menu page
 * 
 * Shows a subtle card after the user has spent time on the menu page,
 * linking to the existing feedback form. Appears once per session.
 * 
 * Behavior:
 * - Appears after 18s on page OR 55% scroll depth
 * - Once per session (sessionStorage key)
 * - Links to existing /feedback/[projectId] page
 * - Non-intrusive: inline card, not a popup or modal
 * - Respects feedbackEnabled and feature flag
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MenuMoodConfig } from '../designSystem';

interface FeedbackNudgeProps {
    /** Project ID for feedback link */
    projectId: string;
    /** Store's Google review URL (if set) */
    reviewUrl?: string;
    /** Menu mood config for consistent styling */
    moodConfig: MenuMoodConfig;
    /** Scroll container ref for scroll depth tracking */
    scrollContainerRef?: React.RefObject<HTMLElement>;
}

const SESSION_KEY_PREFIX = 'ml_feedback_nudge_';
const SHOW_DELAY_MS = 18000; // 18 seconds
const SCROLL_THRESHOLD = 0.55; // 55% scroll depth

export default function FeedbackNudge({
    projectId,
    reviewUrl,
    moodConfig,
    scrollContainerRef,
}: FeedbackNudgeProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasTriggeredRef = useRef(false);

    const sessionKey = `${SESSION_KEY_PREFIX}${projectId}`;

    // Check if already shown this session
    const wasShownThisSession = useCallback(() => {
        try {
            return sessionStorage.getItem(sessionKey) === '1';
        } catch {
            return false;
        }
    }, [sessionKey]);

    const markAsShown = useCallback(() => {
        try {
            sessionStorage.setItem(sessionKey, '1');
        } catch {
            // sessionStorage not available
        }
    }, [sessionKey]);

    const showNudge = useCallback(() => {
        if (hasTriggeredRef.current || wasShownThisSession()) return;
        hasTriggeredRef.current = true;
        setVisible(true);
        markAsShown();
    }, [wasShownThisSession, markAsShown]);

    // Timer-based trigger (18s)
    useEffect(() => {
        if (wasShownThisSession()) return;

        timerRef.current = setTimeout(showNudge, SHOW_DELAY_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [showNudge, wasShownThisSession]);

    // Scroll-based trigger (55% depth)
    useEffect(() => {
        if (wasShownThisSession()) return;

        const container = scrollContainerRef?.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            if (scrollHeight > 0) {
                const scrollPercent = scrollTop / scrollHeight;
                if (scrollPercent >= SCROLL_THRESHOLD) {
                    showNudge();
                }
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef, showNudge, wasShownThisSession]);

    if (!visible || dismissed) return null;

    return (
        <div
            style={{
                margin: '16px auto',
                maxWidth: 400,
                padding: '16px 20px',
                borderRadius: 12,
                backgroundColor: moodConfig.itemStyle.background || '#f9fafb',
                border: `1px solid ${moodConfig.itemStyle.borderColor || '#e5e7eb'}`,
                textAlign: 'center',
                animation: 'feedbackNudgeFadeIn 0.4s ease-out',
            }}
        >
            <style>{`
                @keyframes feedbackNudgeFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <p style={{
                margin: '0 0 12px 0',
                fontSize: 15,
                fontWeight: 500,
                color: moodConfig.headingColor,
                fontFamily: moodConfig.headingFont,
            }}>
                How was your experience?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                {/* Positive → Google review (if URL set) or feedback form */}
                <a
                    href={reviewUrl || `/feedback/${projectId}?source=menu_footer`}
                    target={reviewUrl ? '_blank' : '_self'}
                    rel={reviewUrl ? 'noopener noreferrer' : undefined}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: moodConfig.accentColor || '#3b82f6',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: 'none',
                        fontFamily: moodConfig.bodyFont,
                        transition: 'opacity 0.2s',
                    }}
                    className="hover:opacity-90"
                >
                    <span style={{ fontSize: 18 }}>🙂</span>
                    Loved it
                </a>

                {/* Negative/Neutral → Internal feedback */}
                <a
                    href={`/feedback/${projectId}?source=menu_footer`}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                        border: `1px solid ${moodConfig.itemStyle.borderColor || '#d1d5db'}`,
                        color: moodConfig.bodyColor,
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: 'none',
                        fontFamily: moodConfig.bodyFont,
                        transition: 'opacity 0.2s',
                    }}
                    className="hover:opacity-80"
                >
                    <span style={{ fontSize: 18 }}>💬</span>
                    Share feedback
                </a>
            </div>

            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: moodConfig.bodyColor,
                    opacity: 0.4,
                    fontSize: 11,
                    fontFamily: moodConfig.bodyFont,
                    padding: '4px 8px',
                }}
            >
                Not now
            </button>
        </div>
    );
}
