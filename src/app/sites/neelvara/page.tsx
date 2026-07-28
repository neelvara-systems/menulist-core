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
    ComparisonTable,
    DirectoryCards,
    PageShell,
    StructuredData,
} from './content';
import ProductLogo from './ProductLogo';
import { NeelvaraLink } from './SiteHeaderNav';

export const metadata: Metadata = {
    title: NEELVARA_SITE_TITLE,
    description: NEELVARA_SITE_DESCRIPTION,
    alternates: { canonical: buildNeelvaraUrl('/') },
};

const LEDGER_ROWS = [
    ['Company', 'Neelvara Systems'],
    ['Operated products', NEELVARA_PRODUCT_LINEUP.map((product) => product.name).join(' and ')],
    ['Country', 'India'],
] as const;

const OPERATING_PRINCIPLES = [
    {
        icon: LuBuilding2,
        title: 'Accountable company reference',
        body: 'Company identity, operated products, and official contact routes remain easy to verify.',
    },
    {
        icon: LuLayers,
        title: 'Independent product surfaces',
        body: 'MenuList and Answerlattice keep their own policies, support paths, and product commitments.',
    },
    {
        icon: LuMail,
        title: 'Direct inquiry routing',
        body: 'Business, legal, and privacy questions begin with the company inbox that matches the request.',
    },
] as const;

export default function NeelvaraHomePage() {
    return (
        <PageShell>
            <StructuredData />

            <section className="nv-hero">
                <div className="nv-wrap nv-hero-layout">
                    <div className="nv-hero-copy nv-reveal">
                        <span className="nv-eyebrow mono">Neelvara Systems</span>
                        <h1 className="serif">Infrastructure for information customers rely on.</h1>
                        <p>
                            We operate focused products that keep public business facts and approved answers clear, current, and easy to use.
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
                    </div>
                    <div className="nv-hero-symbol nv-reveal" aria-hidden="true">
                        <span className="nv-hero-symbol-mark" />
                    </div>
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

            <section className="nv-section nv-operating-section nv-reveal">
                <div className="nv-wrap nv-operating-layout">
                    <div className="nv-section-intro">
                        <span className="nv-eyebrow mono">Operating approach</span>
                        <h2 className="serif">A focused company with clear responsibilities.</h2>
                        <p>Neelvara keeps company information, product commitments, and contact routes easy to understand.</p>
                    </div>
                    <div className="nv-principle-grid">
                        {OPERATING_PRINCIPLES.map((item) => {
                            const Icon = item.icon;

                            return (
                                <article className="nv-principle" key={item.title}>
                                    <span className="nv-card-icon">
                                        <Icon aria-hidden="true" />
                                    </span>
                                    <h3>{item.title}</h3>
                                    <p>{item.body}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="nv-relationship-section nv-reveal">
                <div className="nv-wrap nv-relationship-line">
                    <span className="mono">Company relationship</span>
                    <p>{NEELVARA_RELATIONSHIP_LINE}</p>
                </div>
            </section>

            <section className="nv-section nv-product-lineup nv-reveal" id="products-lineup">
                <div className="nv-wrap nv-product-section">
                    <div className="nv-product-summary">
                        <div>
                            <span className="mono">Current products</span>
                            <h2 className="serif">Two distinct information jobs.</h2>
                        </div>
                        <p>Each product has its own purpose, website, policies, and support route.</p>
                    </div>
                    <div className="nv-product-list">
                        {NEELVARA_PRODUCT_LINEUP.map((product) => (
                            <a
                                className="nv-product-row"
                                data-product={product.name.toLowerCase()}
                                href={product.url}
                                key={product.name}
                            >
                                <span className="nv-product-card-head">
                                    <span className="nv-product-logo-wrap" aria-hidden="true">
                                        <ProductLogo name={product.name} />
                                    </span>
                                    <span className="mono">{product.status}</span>
                                </span>
                                <h3>{product.name}</h3>
                                <p>{product.summary}</p>
                                <span className="nv-product-card-link">
                                    Visit product website
                                    <LuExternalLink className="nv-product-link-icon" aria-hidden="true" />
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-section-intro">
                    <span className="nv-eyebrow mono">Clear boundaries</span>
                    <h2 className="serif">Use the right surface for the right question.</h2>
                    <p>This company website stays narrow. Product commitments and signed-in work stay on the relevant product surface.</p>
                </div>
                <div className="nv-wrap">
                    <ComparisonTable />
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-section-intro">
                    <span className="nv-eyebrow mono">Contact routes</span>
                    <h2 className="serif">Reach the right company inbox.</h2>
                    <p>Business, legal, and privacy inquiries use company inboxes. Product support starts on product websites.</p>
                </div>
                <div className="nv-wrap">
                    <DirectoryCards />
                </div>
            </section>

            <section className="nv-section nv-final-section nv-reveal">
                <div className="nv-wrap nv-final-band glass">
                    <div>
                        <h2 className="serif">Company, legal, or privacy questions?</h2>
                        <p>Email Neelvara for company questions. Product support stays on the relevant product website.</p>
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
            </section>
        </PageShell>
    );
}
