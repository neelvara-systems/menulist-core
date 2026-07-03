'use client';

import type { AnchorHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode, RefObject } from 'react';
import { useRef } from 'react';

export type SpotlightVariant = 'blue' | 'indigo' | 'violet' | 'default';

type BaseProps = {
    children: ReactNode;
    className?: string;
    variant?: SpotlightVariant;
};

type ArticleProps = BaseProps & HTMLAttributes<HTMLElement> & {
    as?: 'article';
};

type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: 'a';
};

type SpotlightCardProps = ArticleProps | AnchorProps;

export default function SpotlightCard({
    as = 'article',
    children,
    className = '',
    variant = 'default',
    ...props
}: SpotlightCardProps) {
    const ref = useRef<HTMLElement | null>(null);

    const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
        const element = ref.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        element.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };

    const classes = ['nv-spot', `nv-spot-${variant}`, className].filter(Boolean).join(' ');

    if (as === 'a') {
        return (
            <a
                {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                className={classes}
                onMouseMove={handleMouseMove}
                ref={ref as RefObject<HTMLAnchorElement>}
            >
                {children}
            </a>
        );
    }

    return (
        <article
            {...(props as HTMLAttributes<HTMLElement>)}
            className={classes}
            onMouseMove={handleMouseMove}
            ref={ref}
        >
            {children}
        </article>
    );
}
