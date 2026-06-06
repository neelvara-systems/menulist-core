import type { ReactNode } from 'react';
import AnswerlatticeLink from './AnswerlatticeLink';
import PageProofStrip, { type PageProofStripItem } from './PageProofStrip';

type PageHeroAction = {
    label: string;
    href: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
    event?: string;
    eventLabel?: string;
};

type PageHeroProps = {
    eyebrow: ReactNode;
    title: ReactNode;
    description: ReactNode;
    basePath?: string;
    actions?: PageHeroAction[];
    proofItems?: PageProofStripItem[];
    align?: 'center' | 'left';
    children?: ReactNode;
    className?: string;
    contentClassName?: string;
    proofClassName?: string;
};

export default function PageHero({
    eyebrow,
    title,
    description,
    basePath = '',
    actions = [],
    proofItems,
    align = 'center',
    children,
    className = '',
    contentClassName = '',
    proofClassName = '',
}: PageHeroProps) {
    const isSplit = Boolean(children);
    const copyAlignClass = align === 'center' ? 'al-page-hero__copy--center' : '';

    return (
        <section className={`al-page-hero ${className}`}>
            <div className={`al-page-hero__inner ${isSplit ? 'al-page-hero__inner--split' : 'al-page-hero__inner--center'}`}>
                <div className={`al-page-hero__copy ${copyAlignClass} ${contentClassName}`}>
                    <p className="al-page-hero__eyebrow">{eyebrow}</p>
                    <h1 className="al-page-hero__title">{title}</h1>
                    <p className="al-page-hero__description">{description}</p>
                    {actions.length ? (
                        <div className="al-page-hero__actions">
                            {actions.map((action) => (
                                <AnswerlatticeLink
                                    key={`${action.href}-${action.label}`}
                                    basePath={basePath}
                                    href={action.href}
                                    data-answerlattice-event={action.event}
                                    data-answerlattice-label={action.eventLabel || action.label}
                                    className={`al-page-hero__button al-page-hero__button--${action.variant || 'secondary'}`}
                                >
                                    {action.label}
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    ) : null}
                    {proofItems?.length ? (
                        <PageProofStrip
                            className={`al-page-hero__proof ${align === 'center' ? 'mx-auto' : ''} max-w-6xl text-left ${proofClassName}`}
                            items={proofItems}
                        />
                    ) : null}
                </div>
                {children}
            </div>
        </section>
    );
}
