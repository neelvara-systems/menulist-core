'use client';

import { type KeyboardEvent, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
    LuCheck,
    LuCpu,
    LuDatabase,
    LuFingerprint,
    LuGlobe2,
    LuLock,
    LuScale,
} from 'react-icons/lu';

type BentoTabKey = 'company' | 'products' | 'contact';

type PrimaryCard = {
    key: BentoTabKey;
    icon: IconType;
    eyebrow: string;
    title: string;
    body: string;
    visual: 'prism' | 'boundaries' | 'none';
};

type SupportCard = {
    icon: IconType;
    eyebrow: string;
    title: string;
    body: string;
};

const PRIMARY_CARDS: PrimaryCard[] = [
    {
        key: 'company',
        icon: LuFingerprint,
        eyebrow: 'Company',
        title: 'Neelvara Systems is the company reference for the current product lineup.',
        body: 'This site identifies the company name, operated products, and official contact routes.',
        visual: 'prism',
    },
    {
        key: 'products',
        icon: LuGlobe2,
        eyebrow: 'Products',
        title: 'Each operated product has a clear public role.',
        body: 'MenuList handles public business facts. Answerlattice governs approved answers and support knowledge.',
        visual: 'boundaries',
    },
    {
        key: 'contact',
        icon: LuLock,
        eyebrow: 'Contact',
        title: 'Company questions have direct email routes.',
        body: 'Visitors can email Neelvara for company, legal, or privacy questions. Product questions start on product websites.',
        visual: 'none',
    },
] as const;

const SUPPORT_CARDS: SupportCard[] = [
    {
        icon: LuDatabase,
        eyebrow: 'Policies',
        title: 'Company policies stay separate from product policies.',
        body: 'This website covers company privacy and terms. Product policies remain on the relevant product sites.',
    },
    {
        icon: LuCpu,
        eyebrow: 'Support',
        title: 'Product questions start at product sites.',
        body: 'Each product owns its support path, documentation, onboarding, and account questions.',
    },
    {
        icon: LuScale,
        eyebrow: 'Legal',
        title: 'Company facts stay narrow and verifiable.',
        body: 'Legal copy stays limited to public company information and approved product relationship statements.',
    },
] as const;

const BOUNDARY_ROWS = [
    'Company reference',
    'Product websites',
    'Contact routing',
    'Policy boundaries',
] as const;

function BoundaryList() {
    return (
        <ul className="nv-boundary-list">
            {BOUNDARY_ROWS.map((label) => (
                <li key={label}>
                    <LuCheck aria-hidden="true" />
                    <span>{label}</span>
                </li>
            ))}
        </ul>
    );
}

function CardVisual({ visual }: { visual: PrimaryCard['visual'] }) {
    if (visual === 'prism') {
        return (
            <div className="nv-prism-visual" aria-hidden="true">
                <span className="nv-prism-source-mark" />
            </div>
        );
    }

    if (visual === 'boundaries') {
        return <BoundaryList />;
    }

    return null;
}

export default function BentoReferenceSection() {
    const [activeKey, setActiveKey] = useState<BentoTabKey>('company');
    const activeCard = useMemo(
        () => PRIMARY_CARDS.find((card) => card.key === activeKey) || PRIMARY_CARDS[0],
        [activeKey],
    );
    const ActiveIcon = activeCard.icon;

    const selectAdjacentTab = (direction: -1 | 1) => {
        const currentIndex = PRIMARY_CARDS.findIndex((card) => card.key === activeKey);
        const nextIndex = (currentIndex + direction + PRIMARY_CARDS.length) % PRIMARY_CARDS.length;
        setActiveKey(PRIMARY_CARDS[nextIndex].key);
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            selectAdjacentTab(1);
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            selectAdjacentTab(-1);
        }
    };

    return (
        <section className="nv-section nv-reveal">
            <div className="nv-wrap nv-section-head">
                <div>
                    <span className="nv-eyebrow mono">
                        <span className="nv-pip" aria-hidden="true" />
                        Why Neelvara exists
                    </span>
                    <h2 className="serif">
                        Customer-facing information needs a clear company reference.
                    </h2>
                </div>
                <div className="nv-segmented" role="tablist" aria-label="Reference areas">
                    {PRIMARY_CARDS.map((card) => {
                        const active = card.key === activeKey;

                        return (
                            <button
                                aria-controls="neelvara-reference-panel"
                                aria-selected={active}
                                className={active ? 'is-active' : undefined}
                                id={`neelvara-reference-tab-${card.key}`}
                                key={card.key}
                                onClick={() => setActiveKey(card.key)}
                                onKeyDown={handleTabKeyDown}
                                role="tab"
                                tabIndex={active ? 0 : -1}
                                type="button"
                            >
                                {card.eyebrow}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="nv-wrap">
                <div className="nv-bento nv-bento-interactive">
                    <article
                        aria-labelledby={`neelvara-reference-tab-${activeCard.key}`}
                        className="nv-bento-card nv-bento-feature glass"
                        id="neelvara-reference-panel"
                        role="tabpanel"
                    >
                        <div className="nv-bento-card-head">
                            <span className="nv-card-icon">
                                <ActiveIcon aria-hidden="true" />
                            </span>
                            <span className="mono">{activeCard.eyebrow}</span>
                        </div>
                        <CardVisual visual={activeCard.visual} />
                        <h3>{activeCard.title}</h3>
                        <p>{activeCard.body}</p>
                    </article>
                    {SUPPORT_CARDS.map((card) => {
                        const Icon = card.icon;

                        return (
                            <article className="nv-bento-card nv-bento-support glass" key={card.title}>
                                <div className="nv-bento-card-head">
                                    <span className="nv-card-icon">
                                        <Icon aria-hidden="true" />
                                    </span>
                                    <span className="mono">{card.eyebrow}</span>
                                </div>
                                <h3>{card.title}</h3>
                                <p>{card.body}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
