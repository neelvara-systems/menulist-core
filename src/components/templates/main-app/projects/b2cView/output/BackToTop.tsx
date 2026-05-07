/**
 * Back to Top Button (G07)
 * 
 * Constitutional requirement: "Back to top" always available on long menus
 * 
 * HARD RULES:
 * - Appears after scrolling 300px
 * - Fixed bottom-right position
 * - Mobile-first sizing
 * - Smooth scroll behavior
 * - Cannot be disabled
 * 
 * This is accessibility infrastructure, not optional UX enhancement.
 */

import { useEffect, useState } from 'react';
import { LuArrowUp } from 'react-icons/lu';
import { MenuMoodConfig } from '../designSystem';

interface BackToTopProps {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    moodConfig: MenuMoodConfig;
}

export default function BackToTop({ scrollContainerRef, moodConfig }: BackToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;

        const handleScroll = () => {
            const containerScrollTop = container?.scrollTop || 0;
            const windowScrollTop = typeof window !== 'undefined' ? window.scrollY : 0;
            setIsVisible(Math.max(containerScrollTop, windowScrollTop) > 300);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        container?.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [scrollContainerRef]);

    const scrollToTop = () => {
        const container = scrollContainerRef.current;
        if (container && container.scrollTop > 0) {
            container.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
            return;
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    if (!isVisible) return null;

    return (
        <button
            onClick={scrollToTop}
            style={{
                position: 'fixed',
                bottom: 'calc(24px + env(safe-area-inset-bottom))',
                right: '16px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: moodConfig.accentColor,
                color: '#000',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999, // Below modals, above content
                transition: 'transform 0.2s, opacity 0.2s',
            }}
            className="active:scale-90"
            aria-label="Back to top"
        >
            <LuArrowUp size={24} />
        </button>
    );
}
