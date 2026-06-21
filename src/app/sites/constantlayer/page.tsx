import type { Metadata } from 'next';
import { LuArrowRight, LuExternalLink, LuMail } from 'react-icons/lu';
import {
    CONSTANTLAYER_CONTACT_EMAIL,
    CONSTANTLAYER_PRODUCT_LINEUP,
    CONSTANTLAYER_RELATIONSHIP_LINE,
    CONSTANTLAYER_SITE_DESCRIPTION,
    CONSTANTLAYER_SITE_TITLE,
    buildConstantLayerUrl,
} from './siteConfig';
import {
    DIRECTORY_ROWS,
    OPERATING_ROWS,
    OperatingRows,
    PageShell,
    StructuredData,
    SystemScene,
} from './content';

export const metadata: Metadata = {
    title: CONSTANTLAYER_SITE_TITLE,
    description: CONSTANTLAYER_SITE_DESCRIPTION,
    alternates: { canonical: buildConstantLayerUrl('/') },
};

export default function ConstantLayerHomePage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="cl-hero">
                <SystemScene />
                <div className="cl-container cl-hero-inner">
                    <span className="cl-eyebrow">Operating layer for the product portfolio</span>
                    <h1>
                        <span>ConstantLayer</span>
                        <span>Systems</span>
                    </h1>
                    <p>
                        A quiet company layer for business information products: a clear
                        entity reference, stable public records, and product relationships
                        that are easy to verify.
                    </p>
                    <div className="cl-actions">
                        <a className="cl-primary-action" href="#products-lineup">
                            View Product Lineup
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="cl-secondary-action" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                            Contact ConstantLayer
                        </a>
                    </div>
                </div>
            </section>

            <section className="cl-entity-ledger-section cl-reveal" aria-label="ConstantLayer operating summary">
                <div className="cl-container">
                    <div className="cl-hero-ledger">
                        <div>
                            <span>Entity</span>
                            <strong>ConstantLayer Systems</strong>
                        </div>
                        <div>
                            <span>Lineup</span>
                            <strong>{CONSTANTLAYER_PRODUCT_LINEUP.map((product) => product.name).join(' / ')}</strong>
                        </div>
                        <div>
                            <span>Public line</span>
                            <strong>{CONSTANTLAYER_RELATIONSHIP_LINE}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cl-section cl-section-subtle cl-reveal">
                <div className="cl-container cl-editorial-intro">
                    <span className="cl-section-number">01</span>
                    <div>
                        <span className="cl-eyebrow">Purpose</span>
                        <h2>A public reference for the company layer behind the product portfolio.</h2>
                    </div>
                    <p>
                        ConstantLayer Systems gives company-level references one stable source:
                        which products sit in the lineup, where inquiries go, and which
                        product relationships are true today.
                    </p>
                </div>
            </section>

            <section className="cl-section cl-product-section cl-reveal" id="products-lineup">
                <div className="cl-container cl-product-story">
                    <div className="cl-product-summary" aria-label="ConstantLayer portfolio summary">
                        <span className="cl-product-kicker">Portfolio</span>
                        <strong>{CONSTANTLAYER_PRODUCT_LINEUP.length} product surfaces</strong>
                        <p>One company reference for public relationship checks, legal routing, and product boundaries.</p>
                        <div className="cl-product-summary-list">
                            {CONSTANTLAYER_PRODUCT_LINEUP.map((product) => (
                                <span key={product.name}>{product.name}</span>
                            ))}
                        </div>
                    </div>
                    <div className="cl-product-copy">
                        <span className="cl-eyebrow">Product lineup</span>
                        <h2>MenuList, Answerlattice, and CampaignCue share one company reference.</h2>
                        <p>
                            Product-specific websites explain each product. ConstantLayer keeps
                            the company-level reference for entity, legal, privacy, and
                            product relationship checks.
                        </p>
                        <div className="cl-product-list">
                            {CONSTANTLAYER_PRODUCT_LINEUP.map((product) => (
                                <a href={product.url} className="cl-product-row" key={product.name}>
                                    <span>{product.status}</span>
                                    <strong>{product.name}</strong>
                                    <p>{product.summary}</p>
                                    <LuExternalLink aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="cl-section cl-section-subtle cl-reveal">
                <div className="cl-container">
                    <div className="cl-section-heading cl-section-heading-split">
                        <div>
                            <span className="cl-eyebrow">Operating principles</span>
                            <h2>Company information stays clear, narrow, and verifiable.</h2>
                        </div>
                        <p>
                            This site is intentionally separate from product marketing. It keeps
                            entity, portfolio relationship, legal, privacy, and contact references
                            easy to confirm.
                        </p>
                    </div>
                    <OperatingRows rows={OPERATING_ROWS} />
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-container cl-directory-section">
                    <div>
                        <span className="cl-eyebrow">Contact</span>
                        <h2>Company-level references stay separate from product work.</h2>
                        <p>
                            Business, legal, and privacy contacts are intentionally direct. No
                            form, no lead capture, no database.
                        </p>
                    </div>
                    <div className="cl-directory-list">
                        {DIRECTORY_ROWS.map((row) => (
                            <a href={row.href} className="cl-directory-row" key={row.label}>
                                <span>{row.label}</span>
                                <strong>{row.value}</strong>
                                <LuMail aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
