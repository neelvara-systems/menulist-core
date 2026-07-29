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
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import { normalizeOBPReviewUrl } from '@lib/obp/publicLinks';
import { normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { MenuMoodConfig } from '../designSystem';

type FeedbackNudgeStorageOperation = 'read' | 'write';

interface FeedbackNudgeProps {
    /** Project ID for feedback link */
    projectId: string;
    /** Store's Google review URL (if set) */
    reviewUrl?: string;
    /** Menu mood config for consistent styling */
    moodConfig: MenuMoodConfig;
    /** Scroll container ref for scroll depth tracking */
    scrollContainerRef?: React.RefObject<HTMLElement>;
    /** Owner-enabled language currently selected by the customer */
    activeLanguage?: string;
}

const SESSION_KEY_PREFIX = 'ml_feedback_nudge_';
const SHOW_DELAY_MS = 18000; // 18 seconds
const SCROLL_THRESHOLD = 0.55; // 55% scroll depth
const reportedFeedbackNudgeStorageFailures = new Set<FeedbackNudgeStorageOperation>();

function logFeedbackNudgeStorageFailure(
    operation: FeedbackNudgeStorageOperation,
    error: unknown,
    context: {
        sessionKey: string;
        projectId: string;
    },
): void {
    if (reportedFeedbackNudgeStorageFailures.has(operation)) return;
    reportedFeedbackNudgeStorageFailures.add(operation);

    const failureCode = operation === 'read'
        ? 'public_menu_feedback_nudge_storage_read_failed'
        : 'public_menu_feedback_nudge_storage_write_failed';

    logRuntimeFailure(failureCode, error, {
        operation,
        ...getBoundedRuntimeStringContext('sessionKey', context.sessionKey),
        ...getBoundedRuntimeStringContext('projectId', context.projectId),
        hasWindow: typeof window !== 'undefined',
    });
}

export default function FeedbackNudge({
    activeLanguage,
    projectId,
    reviewUrl,
    moodConfig,
    scrollContainerRef,
}: FeedbackNudgeProps) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const [visibleProjectId, setVisibleProjectId] = useState<string | null>(null);
    const [dismissedProjectId, setDismissedProjectId] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const triggeredProjectIdRef = useRef<string | null>(null);

    const normalizedProjectId = normalizeGuestFeedbackProjectId(projectId);
    const sessionKey = normalizedProjectId ? `${SESSION_KEY_PREFIX}${normalizedProjectId}` : null;
    const safeReviewUrl = normalizeOBPReviewUrl(reviewUrl);

    // Check if already shown this session
    const wasShownThisSession = useCallback(() => {
        if (!sessionKey) return true;
        try {
            return sessionStorage.getItem(sessionKey) === '1';
        } catch (error) {
            logFeedbackNudgeStorageFailure('read', error, { sessionKey, projectId });
            return false;
        }
    }, [projectId, sessionKey]);

    const markAsShown = useCallback(() => {
        if (!sessionKey) return;
        try {
            sessionStorage.setItem(sessionKey, '1');
        } catch (error) {
            logFeedbackNudgeStorageFailure('write', error, { sessionKey, projectId });
        }
    }, [projectId, sessionKey]);

    const showNudge = useCallback(() => {
        if (
            !normalizedProjectId
            || triggeredProjectIdRef.current === normalizedProjectId
            || wasShownThisSession()
        ) {
            return;
        }
        triggeredProjectIdRef.current = normalizedProjectId;
        setVisibleProjectId(normalizedProjectId);
        markAsShown();
    }, [markAsShown, normalizedProjectId, wasShownThisSession]);

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

        const handleScroll = () => {
            const containerScrollTop = container?.scrollTop || 0;
            const windowScrollTop = window.scrollY;
            const scrollTop = Math.max(containerScrollTop, windowScrollTop);
            const containerScrollHeight = container
                ? container.scrollHeight - container.clientHeight
                : 0;
            const windowScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollHeight = Math.max(containerScrollHeight, windowScrollHeight);
            if (scrollHeight > 0) {
                const scrollPercent = scrollTop / scrollHeight;
                if (scrollPercent >= SCROLL_THRESHOLD) {
                    showNudge();
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        container?.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [scrollContainerRef, showNudge, wasShownThisSession]);

    if (
        !normalizedProjectId
        || visibleProjectId !== normalizedProjectId
        || dismissedProjectId === normalizedProjectId
    ) {
        return null;
    }

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
                {t('menu.howWasExperience')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                {/* Positive → Google review (if URL set) or feedback form */}
                <a
                    href={safeReviewUrl || appendPublicLanguageParam(
                        `/feedback/${normalizedProjectId}?source=menu_footer`,
                        activeLanguage,
                    )}
                    target={safeReviewUrl ? '_blank' : '_self'}
                    rel={safeReviewUrl ? 'noopener noreferrer' : undefined}
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
                    {t('menu.lovedIt')}
                </a>

                {/* Negative/Neutral → Internal feedback */}
                <a
                    href={appendPublicLanguageParam(
                        `/feedback/${normalizedProjectId}?source=menu_footer`,
                        activeLanguage,
                    )}
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
                    {t('menu.shareFeedback')}
                </a>
            </div>

            <button
                onClick={() => setDismissedProjectId(normalizedProjectId)}
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
                {t('menu.notNow')}
            </button>
        </div>
    );
}
