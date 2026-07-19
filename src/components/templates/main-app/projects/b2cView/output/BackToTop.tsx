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

import { type MouseEvent, type PointerEvent, type TouchEvent, useEffect, useState } from 'react';
import { LuArrowUp } from 'react-icons/lu';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { MenuMoodConfig } from '../designSystem';

interface BackToTopProps {
    activeLanguage?: string;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    moodConfig: MenuMoodConfig;
}

const getScrollableAncestors = (element: HTMLElement | null): HTMLElement[] => {
    const ancestors: HTMLElement[] = [];
    let current = element?.parentElement || null;

    while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const canScroll = /(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`);
        if (canScroll && current.scrollHeight > current.clientHeight + 1) {
            ancestors.push(current);
        }
        current = current.parentElement;
    }

    return ancestors;
};

const getDocumentScrollTop = (): number => Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
);

const getCurrentScrollTop = (container: HTMLElement | null): number => {
    const ancestorScrollTop = getScrollableAncestors(container).reduce(
        (max, ancestor) => Math.max(max, ancestor.scrollTop || 0),
        0,
    );

    return Math.max(container?.scrollTop || 0, ancestorScrollTop, getDocumentScrollTop());
};

export default function BackToTop({ activeLanguage, scrollContainerRef, moodConfig }: BackToTopProps) {
    const [isVisible, setIsVisible] = useState(false);
    const t = createPublicCustomerTranslator(activeLanguage);

    useEffect(() => {
        const container = scrollContainerRef.current;
        const scrollAncestors = getScrollableAncestors(container);
        const getAnchorHidden = () => {
            const topAnchor = document.querySelector('[data-menu-top-anchor]');
            if (!topAnchor) return false;

            const rect = topAnchor.getBoundingClientRect();
            return rect.bottom < 0 || rect.top > window.innerHeight;
        };

        const handleScroll = () => {
            setIsVisible(getCurrentScrollTop(container) > 300 || getAnchorHidden());
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        container?.addEventListener('scroll', handleScroll, { passive: true });
        scrollAncestors.forEach((ancestor) => ancestor.addEventListener('scroll', handleScroll, { passive: true }));

        const topAnchor = document.querySelector('[data-menu-top-anchor]');
        const observer = topAnchor
            ? new IntersectionObserver(
                ([entry]) => {
                    setIsVisible(!entry.isIntersecting || getCurrentScrollTop(container) > 300);
                },
                {
                    root: null,
                    threshold: 0.01,
                },
            )
            : null;

        if (topAnchor && observer) {
            observer.observe(topAnchor);
        }
        const interval = window.setInterval(handleScroll, 500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll, true);
            container?.removeEventListener('scroll', handleScroll);
            scrollAncestors.forEach((ancestor) => ancestor.removeEventListener('scroll', handleScroll));
            observer?.disconnect();
            window.clearInterval(interval);
        };
    }, [scrollContainerRef]);

    const stopPressPropagation = (event: PointerEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
        event.stopPropagation();
    };

    const scrollToTop = (event?: MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        const container = scrollContainerRef.current;
        const topAnchor = document.querySelector('[data-menu-top-anchor]');
        const forceScrollTop = () => {
            if (container) container.scrollTop = 0;
            getScrollableAncestors(container).forEach((ancestor) => {
                ancestor.scrollTop = 0;
            });
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            window.scrollTo(0, 0);
        };

        topAnchor?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });

        if (container && container.scrollTop > 0) {
            container.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }

        getScrollableAncestors(container).forEach((ancestor) => {
            if (ancestor.scrollTop > 0) {
                ancestor.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                });
            }
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

        document.documentElement?.scrollTo?.({
            top: 0,
            behavior: 'smooth',
        });

        document.body?.scrollTo?.({
            top: 0,
            behavior: 'smooth',
        });

        setIsVisible(false);
        window.setTimeout(forceScrollTop, 250);
        window.setTimeout(() => {
            setIsVisible(getCurrentScrollTop(container) > 300);
        }, 700);
    };

    if (!isVisible) return null;

    return (
        <button
            type="button"
            onClick={scrollToTop}
            onPointerDown={stopPressPropagation}
            onTouchStart={stopPressPropagation}
            style={{
                position: 'fixed',
                bottom: 'calc(16px + env(safe-area-inset-bottom))',
                right: '16px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: `${moodConfig.accentColor}26`,
                color: moodConfig.accentColor,
                border: `1px solid ${moodConfig.accentColor}50`,
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.14)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9601, // Above bottom prompts, below modals/popovers
                transition: 'transform 0.2s, opacity 0.2s',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
            }}
            className="active:scale-90"
            aria-label={t('menu.backToTop')}
        >
            <LuArrowUp size={22} strokeWidth={2.4} />
        </button>
    );
}
