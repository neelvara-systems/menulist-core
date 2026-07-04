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
    DirectoryCards,
    HeroStudioMock,
    PageShell,
    StructuredData,
} from './content';
import BentoReferenceSection from './BentoReferenceSection';
import ProductLogo from './ProductLogo';
import { NeelvaraLink } from './SiteHeaderNav';
import SpotlightCard from './SpotlightCard';

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
        title: 'Public business facts need one accountable source.',
        body: 'Menus, hours, profiles, approved answers, and campaign context should stay clear before they reach customers.',
        stat: 'Company role',
    },
    {
        icon: LuLayers,
        variant: 'indigo' as const,
        title: 'Each product handles a distinct information job.',
        body: 'MenuList, Answerlattice, and CampaignCue keep product responsibilities separate while sharing one operating company.',
        stat: 'Product map',
    },
    {
        icon: LuMail,
        variant: 'violet' as const,
        title: 'Company questions stay separate from product support.',
        body: 'Neelvara handles company, legal, privacy, and business inquiries. Product support remains on product websites.',
        stat: 'Clear routing',
    },
] as const;

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
                            Neelvara Systems operates products that keep public business
                            facts, approved answers, and reusable business context clear
                            before they reach customers.
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
                            <span>Company reference</span>
                            <i aria-hidden="true" />
                            <span>Product boundaries</span>
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

            <BentoReferenceSection />

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
                            This is the company reference for the current lineup. Product websites explain each product.
                        </figcaption>
                    </figure>
                </div>
            </section>

            <section className="nv-section nv-reveal" id="products-lineup">
                <div className="nv-wrap nv-product-section glass">
                    <div className="nv-product-summary">
                        <span className="mono">Current products</span>
                        <strong className="serif">Operated products</strong>
                        <p>The company site identifies the operated products and points visitors to the right product website.</p>
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
                            Use the right company contact route.
                        </h2>
                    </div>
                    <p>
                        Business, legal, and privacy inquiries use company inboxes.
                        Product support starts on product websites.
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
                            Email Neelvara Systems for company questions. Product
                            support, onboarding, billing, and account questions stay on the
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
