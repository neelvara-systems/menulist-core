'use client'

import { Button, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuArrowDown } from 'react-icons/lu';

interface ScrollToBottomButtonProps {
    visible: boolean;
    onClick: () => void;
}

interface UseScrollToBottomOptions {
    scrollContainerRef: React.RefObject<HTMLElement | null>;
    messagesEndRef: React.RefObject<HTMLElement | null>;
    hasMessages: boolean;
    sessionId?: string; // Session ID to detect session changes
    threshold?: number; // Distance in pixels to trigger button visibility
}

interface UseScrollToBottomReturn {
    showScrollButton: boolean;
    scrollToBottom: () => void;
}

/**
 * Custom hook to manage scroll-to-bottom functionality
 * Monitors scroll position and provides scroll-to-bottom action
 * 
 * @param scrollContainerRef - Ref to the scrollable container
 * @param messagesEndRef - Ref to the element at the bottom
 * @param hasMessages - Whether there are messages to scroll through
 * @param threshold - Distance from bottom in px to show button (default: 200)
 */
export const useScrollToBottom = ({
    scrollContainerRef,
    messagesEndRef,
    hasMessages,
    sessionId,
    threshold = 200
}: UseScrollToBottomOptions): UseScrollToBottomReturn => {
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Reset button state when session changes
    useEffect(() => {
        setShowScrollButton(false);
    }, [sessionId]);

    // Monitor scroll position to show/hide scroll-to-bottom button
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !hasMessages) {
            setShowScrollButton(false);
            return;
        }

        const normalizedThreshold = Number.isFinite(threshold) ? Math.max(threshold, 0) : 200;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            // Show button if user scrolled up more than threshold from bottom
            setShowScrollButton(distanceFromBottom > normalizedThreshold);
        };

        handleScroll();
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMessages, threshold, scrollContainerRef]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return {
        showScrollButton,
        scrollToBottom
    };
};

const ScrollToBottomButton = ({ visible, onClick }: ScrollToBottomButtonProps) => {
    const { token } = theme.useToken();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'sticky',
                        bottom: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        width: 48
                    }}
                >
                    <Button
                        size="large"
                        type="primary"
                        shape="circle"
                        icon={<LuArrowDown size={20} />}
                        onClick={onClick}
                        aria-label="Scroll to bottom"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ScrollToBottomButton;
