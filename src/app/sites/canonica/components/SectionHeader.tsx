import type { ReactNode } from 'react';

type SectionHeaderProps = {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    className?: string;
};

export default function SectionHeader({
    eyebrow,
    title,
    description,
    children,
    className = '',
}: SectionHeaderProps) {
    return (
        <div className={`mx-auto mb-10 max-w-3xl text-center ${className}`}>
            {eyebrow ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--cn-primary-light)]">
                    {eyebrow}
                </p>
            ) : null}
            <h2 className="text-3xl font-bold leading-tight text-[var(--cn-text)] sm:text-4xl lg:text-5xl">
                {title}
            </h2>
            {description ? (
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--cn-text-secondary)] sm:text-lg">
                    {description}
                </p>
            ) : null}
            {children}
        </div>
    );
}
