'use client';

import {
    createElement,
    useLayoutEffect,
    useRef,
    type ReactNode,
} from 'react';

function AccessibleConfirmContent({
    children,
    label,
}: {
    children?: ReactNode;
    label: string;
}) {
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const dialog = contentRef.current?.closest<HTMLElement>('[role="dialog"]')
            || contentRef.current?.querySelector<HTMLElement>('[role="dialog"]');
        if (!dialog) return;

        dialog.removeAttribute('aria-labelledby');
        dialog.setAttribute('aria-label', label);
    }, [label]);

    return createElement('div', { ref: contentRef, style: { display: 'contents' } }, children);
}

function AccessibleConfirmTitle({ label }: { label: string }) {
    const titleRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const dialog = titleRef.current?.closest<HTMLElement>('[role="dialog"]');
        if (!dialog) return;

        dialog.removeAttribute('aria-labelledby');
        dialog.setAttribute('aria-label', label);
    }, [label]);

    return createElement('span', { ref: titleRef, style: { display: 'contents' } }, label);
}

export const labelConfirmDialog = (label: string) => function renderAccessibleConfirm(
    modal: ReactNode,
): ReactNode {
    return createElement(AccessibleConfirmContent, { label }, modal);
};

export const labelConfirmDialogTitle = (label: string): ReactNode => (
    createElement(AccessibleConfirmTitle, { label })
);
