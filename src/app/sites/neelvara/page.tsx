import type { Metadata } from 'next';
import {
    LuArrowRight,
    LuBuilding2,
    LuExternalLink,
    LuLayers,
    LuMail,
} from 'react-icons/lu';
import {
    NEELVARA_CONTACT_EMAIL,
    NEELVARA_PRODUCT_LINEUP,
    NEELVARA_RELATIONSHIP_LINE,
    NEELVARA_SITE_DESCRIPTION,
    NEELVARA_SITE_TITLE,
    buildNeelvaraUrl,
} from './siteConfig';
import {
    BENTO_CARDS,
    BoundaryList,
    DirectoryCards,
    HeroStudioMock,
    PageShell,
    SegmentControl,
    StructuredData,
} from './content';
import { NeelvaraLink } from './SiteHeaderNav';
import SpotlightCard from './SpotlightCard';
import MenuListLogoMark from '@/components/website/shared/LogoMark';
import AnswerlatticeLogoMark from '@/components/atoms/answerlatticeLogoMark';

export const metadata: Metadata = {
    title: NEELVARA_SITE_TITLE,
    description: NEELVARA_SITE_DESCRIPTION,
    alternates: { canonical: buildNeelvaraUrl('/') },
};

const LEDGER_ROWS = [
    ['Company', 'Neelvara Systems'],
    ['Products', NEELVARA_PRODUCT_LINEUP.map((product) => product.name).join(' / ')],
    ['Contact', NEELVARA_CONTACT_EMAIL],
] as const;

const SPOTLIGHTS = [
    {
        icon: LuBuilding2,
        variant: 'blue' as const,
        title: 'Customer-facing facts need a stable foundation.',
        body: 'Menus, hours, business profiles, approved answers, and campaign context should not drift across public surfaces.',
        stat: 'Company focus',
    },
    {
        icon: LuLayers,
        variant: 'indigo' as const,
        title: 'Focused products handle different parts of the same problem.',
        body: 'MenuList keeps public business information aligned. Answerlattice governs approved answers. CampaignCue prepares reusable business context.',
        stat: 'Shared direction',
    },
    {
        icon: LuMail,
        variant: 'violet' as const,
        title: 'Company questions stay separate from product support.',
        body: 'Neelvara handles company, legal, privacy, and business inquiries. Product support starts on product websites.',
        stat: 'Clear routing',
    },
] as const;

function ProductLogo({ name }: { name: typeof NEELVARA_PRODUCT_LINEUP[number]['name'] }) {
    if (name === 'MenuList') {
        return <MenuListLogoMark height={28} className="nv-product-logo-svg" />;
    }

    if (name === 'Answerlattice') {
        return <AnswerlatticeLogoMark height={30} className="nv-product-logo-svg" idPrefix="neelvara-answerlattice-product-logo" />;
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            alt=""
            aria-hidden="true"
            className="nv-product-logo-img"
            height={38}
            src="/campaigncue-icon.svg"
            width={38}
        />
    );
}

export default function NeelvaraHomePage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="nv-hero">
                <div className="nv-wrap">
                    <div className="nv-hero-copy nv-reveal">
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Software infrastructure for customer-facing business information
                        </span>
                        <h1 className="serif">
                            Neelvara <em>Systems</em>
                        </h1>
                        <p>
                            Neelvara Systems builds focused products that help businesses
                            keep public facts, approved answers, and business context accurate,
                            usable, and consistent across customer-facing surfaces.
                        </p>
                        <div className="nv-actions">
                            <NeelvaraLink className="nv-button nv-button-solid nv-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </NeelvaraLink>
                            <a className="nv-button nv-button-glass nv-button-large" href={`mailto:${NEELVARA_CONTACT_EMAIL}`}>
                                Email Neelvara
                                <LuMail aria-hidden="true" />
                            </a>
                        </div>
                        <div className="nv-hero-meta mono" aria-label="Neelvara operating boundaries">
                            <span>Company website</span>
                            <i aria-hidden="true" />
                            <span>Product routing</span>
                            <i aria-hidden="true" />
                            <span>Direct email</span>
                        </div>
                    </div>
                    <HeroStudioMock />
                </div>
            </section>

            <section className="nv-ledger-section nv-reveal" aria-label="Neelvara operating summary">
                <div className="nv-wrap">
                    <div className="nv-ledger glass">
                        {LEDGER_ROWS.map(([label, value]) => (
                            <div key={label}>
                                <span className="mono">{label}</span>
                                <strong>{value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-section-head">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Why Neelvara exists
                        </span>
                        <h2 className="serif">
                            Customer-facing information should stay correct without constant attention.
                        </h2>
                    </div>
                    <SegmentControl items={['Company', 'Products', 'Contact']} />
                </div>
                <div className="nv-wrap">
                    <div className="nv-bento">
                        {BENTO_CARDS.map((card) => {
                            const Icon = card.icon;

                            return (
                                <article className={`nv-bento-card glass ${card.className}`} key={card.title}>
                                    <div className="nv-bento-card-head">
                                        <span className="nv-card-icon">
                                            <Icon aria-hidden="true" />
                                        </span>
                                        <span className="mono">{card.eyebrow}</span>
                                    </div>
                                    {card.className === 'nv-bento-tall' ? (
                                        <div className="nv-prism-visual" aria-hidden="true">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    ) : null}
                                    {card.className === 'nv-bento-wide' ? <BoundaryList /> : null}
                                    <h3>{card.title}</h3>
                                    <p>{card.body}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-spotlight-grid">
                    {SPOTLIGHTS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <SpotlightCard className="nv-spot-card" key={item.title} variant={item.variant}>
                                <span className="nv-card-icon">
                                    <Icon aria-hidden="true" />
                                </span>
                                <h3 className="serif">{item.title}</h3>
                                <p>{item.body}</p>
                                <div className="nv-spot-stat mono">{item.stat}</div>
                            </SpotlightCard>
                        );
                    })}
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap">
                    <figure className="nv-quote glass">
                        <span className="mono">Company relationship</span>
                        <blockquote className="serif">{NEELVARA_RELATIONSHIP_LINE}</blockquote>
                        <figcaption>
                            This is the company-level reference for the current lineup. Product-specific websites explain each product.
                        </figcaption>
                    </figure>
                </div>
            </section>

            <section className="nv-section nv-reveal" id="products-lineup">
                <div className="nv-wrap nv-product-section glass">
                    <div className="nv-product-summary">
                        <span className="mono">Current products</span>
                        <strong className="serif">Focused products</strong>
                        <p>Different products solve different parts of customer-facing business information.</p>
                    </div>
                    <div className="nv-product-list">
                        {NEELVARA_PRODUCT_LINEUP.map((product) => (
                            <a href={product.url} className="nv-product-row" key={product.name}>
                                <span className="nv-product-logo-wrap" aria-hidden="true">
                                    <ProductLogo name={product.name} />
                                </span>
                                <span className="mono">{product.status}</span>
                                <strong>{product.name}</strong>
                                <p>{product.summary}</p>
                                <LuExternalLink className="nv-product-link-icon" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-section-head">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Contact routes
                        </span>
                        <h2 className="serif">
                            Choose the right company contact route.
                        </h2>
                    </div>
                    <p>
                        Use the business inbox for company questions. Legal and privacy
                        questions have separate routes. Product questions start on product websites.
                    </p>
                </div>
                <div className="nv-wrap">
                    <DirectoryCards />
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap">
                    <div className="nv-final-band glass">
                        <div>
                            <span className="nv-eyebrow mono">
                                <span className="nv-pip" aria-hidden="true" />
                                Company questions
                            </span>
                            <h2 className="serif">
                                Company, legal, or privacy questions?
                            </h2>
                            <p>
                                Email Neelvara Systems for company-level questions. Product
                                support, onboarding, billing, and account questions start on the
                                relevant product site.
                            </p>
                        </div>
                        <div className="nv-actions">
                            <a className="nv-button nv-button-solid nv-button-large" href={`mailto:${NEELVARA_CONTACT_EMAIL}`}>
                                Email Neelvara
                                <LuMail aria-hidden="true" />
                            </a>
                            <NeelvaraLink className="nv-button nv-button-glass nv-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </NeelvaraLink>
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
