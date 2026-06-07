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
        <div className={`al-section-header mx-auto mb-10 max-w-3xl text-center ${className}`} data-answerlattice-reveal>
            {eyebrow ? (
                <p className="al-section-header__eyebrow">
                    {eyebrow}
                </p>
            ) : null}
            <h2 className="al-section-header__title">
                {title}
            </h2>
            {description ? (
                <p className="al-section-header__description">
                    {description}
                </p>
            ) : null}
            {children}
        </div>
    );
}
