import type { Metadata } from 'next';
import {
    LuArrowRight,
    LuBuilding2,
    LuExternalLink,
    LuLayers,
    LuMail,
    LuScale,
    LuShieldCheck,
} from 'react-icons/lu';
import {
    CONSTANTLAYER_CONTACT_EMAIL,
    CONSTANTLAYER_PRODUCT_LINEUP,
    CONSTANTLAYER_RELATIONSHIP_LINE,
    CONSTANTLAYER_SITE_DESCRIPTION,
    CONSTANTLAYER_SITE_TITLE,
    buildConstantLayerUrl,
} from './siteConfig';
import {
    BENTO_CARDS,
    BoundaryList,
    ComparisonTable,
    DirectoryCards,
    HeroStudioMock,
    MarqueeBand,
    OPERATING_ROWS,
    OperatingRows,
    PageShell,
    SegmentControl,
    StructuredData,
} from './content';
import { ConstantLayerLink } from './SiteHeaderNav';
import SpotlightCard from './SpotlightCard';

export const metadata: Metadata = {
    title: CONSTANTLAYER_SITE_TITLE,
    description: CONSTANTLAYER_SITE_DESCRIPTION,
    alternates: { canonical: buildConstantLayerUrl('/') },
};

const LEDGER_ROWS = [
    ['Entity', 'ConstantLayer Systems'],
    ['Public lineup', CONSTANTLAYER_PRODUCT_LINEUP.map((product) => product.name).join(' / ')],
    ['Public line', CONSTANTLAYER_RELATIONSHIP_LINE],
] as const;

const STATS = [
    ['3', 'current public surfaces'],
    ['0', 'forms or lead database'],
    ['0', 'Firebase writes'],
    ['7', 'public reference pages'],
] as const;

const SPOTLIGHTS = [
    {
        icon: LuBuilding2,
        variant: 'warm' as const,
        title: 'Company record, not another product funnel.',
        body: 'The site gives external visitors one place to verify the operating name and product relationship without entering an app flow.',
        stat: 'Static parent surface',
    },
    {
        icon: LuLayers,
        variant: 'cool' as const,
        title: 'Current public product surfaces stay separate.',
        body: 'MenuList, Answerlattice, and CampaignCue are the only product surfaces named here. Each keeps its own claims, onboarding paths, and support context.',
        stat: 'No blended product scope',
    },
    {
        icon: LuShieldCheck,
        variant: 'amber' as const,
        title: 'Inquiries route directly.',
        body: 'Business, legal, and privacy questions use explicit email routes instead of a form, account, or tracking workflow.',
        stat: 'No parent-site database',
    },
] as const;

export default function ConstantLayerHomePage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="cl-hero">
                <div className="cl-wrap">
                    <div className="cl-hero-copy cl-reveal">
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            Company reference for public product surfaces
                        </span>
                        <h1 className="serif">
                            ConstantLayer <em>Systems</em>
                        </h1>
                        <p>
                            A quiet company reference for business information products: a clear
                            entity reference, stable public records, and product relationships
                            that are easy to verify.
                        </p>
                        <div className="cl-actions">
                            <ConstantLayerLink className="cl-button cl-button-solid cl-button-large" href="/products">
                                View Product Lineup
                                <LuArrowRight aria-hidden="true" />
                            </ConstantLayerLink>
                            <a className="cl-button cl-button-glass cl-button-large" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                                Contact ConstantLayer
                                <LuMail aria-hidden="true" />
                            </a>
                        </div>
                        <div className="cl-hero-meta mono" aria-label="ConstantLayer operating boundaries">
                            <span>Static parent site</span>
                            <i aria-hidden="true" />
                            <span>No form</span>
                            <i aria-hidden="true" />
                            <span>No Firebase runtime</span>
                        </div>
                    </div>
                    <HeroStudioMock />
                </div>
            </section>

            <section className="cl-ledger-section cl-reveal" aria-label="ConstantLayer operating summary">
                <div className="cl-wrap">
                    <div className="cl-ledger glass">
                        {LEDGER_ROWS.map(([label, value]) => (
                            <div key={label}>
                                <span className="mono">{label}</span>
                                <strong>{value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <MarqueeBand />

            <section className="cl-section cl-reveal">
                <div className="cl-wrap cl-section-head">
                    <div>
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            The company layer
                        </span>
                        <h2 className="serif">
                            One glass surface for the <em>narrow</em> company questions.
                        </h2>
                    </div>
                    <SegmentControl items={['Entity', 'Products', 'Contacts']} />
                </div>
                <div className="cl-wrap">
                    <div className="cl-bento">
                        {BENTO_CARDS.map((card) => {
                            const Icon = card.icon;

                            return (
                                <article className={`cl-bento-card glass ${card.className}`} key={card.title}>
                                    <div className="cl-bento-card-head">
                                        <span className="cl-card-icon">
                                            <Icon aria-hidden="true" />
                                        </span>
                                        <span className="mono">{card.eyebrow}</span>
                                    </div>
                                    {card.className === 'cl-bento-tall' ? (
                                        <div className="cl-prism-visual" aria-hidden="true">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    ) : null}
                                    {card.className === 'cl-bento-wide' ? <BoundaryList /> : null}
                                    <h3>{card.title}</h3>
                                    <p>{card.body}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-wrap cl-spotlight-grid">
                    {SPOTLIGHTS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <SpotlightCard className="cl-spot-card" key={item.title} variant={item.variant}>
                                <span className="cl-card-icon">
                                    <Icon aria-hidden="true" />
                                </span>
                                <h3 className="serif">{item.title}</h3>
                                <p>{item.body}</p>
                                <div className="cl-spot-stat mono">{item.stat}</div>
                            </SpotlightCard>
                        );
                    })}
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-wrap">
                    <figure className="cl-quote glass">
                        <span className="mono">Public relationship line</span>
                        <blockquote className="serif">{CONSTANTLAYER_RELATIONSHIP_LINE}</blockquote>
                        <figcaption>
                            This is the company-level reference for the current public lineup. Product-specific websites explain each product.
                        </figcaption>
                    </figure>
                </div>
            </section>

            <section className="cl-section cl-section-tight cl-reveal">
                <div className="cl-wrap">
                    <div className="cl-stats glass">
                        {STATS.map(([value, label]) => (
                            <div key={label}>
                                <strong className="serif gradient-text">{value}</strong>
                                <span className="mono">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-wrap cl-section-head">
                    <div>
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            Boundary map
                        </span>
                        <h2 className="serif">
                            Company information stays separate from <em>product work</em>.
                        </h2>
                    </div>
                    <p>
                        The parent site is intentionally narrow. It identifies the company layer,
                        product relationships, and inquiry routes without becoming a product runtime.
                    </p>
                </div>
                <div className="cl-wrap">
                    <ComparisonTable />
                </div>
            </section>

            <section className="cl-section cl-reveal" id="products-lineup">
                <div className="cl-wrap cl-product-section glass">
                    <div className="cl-product-summary">
                        <span className="mono">Public lineup</span>
                        <strong className="serif">{CONSTANTLAYER_PRODUCT_LINEUP.length} current public surfaces</strong>
                        <p>One company reference for public relationship checks, legal routing, and product boundaries.</p>
                    </div>
                    <div className="cl-product-list">
                        {CONSTANTLAYER_PRODUCT_LINEUP.map((product) => (
                            <a href={product.url} className="cl-product-row" key={product.name}>
                                <span className="mono">{product.status}</span>
                                <strong>{product.name}</strong>
                                <p>{product.summary}</p>
                                <LuExternalLink aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-wrap cl-section-head">
                    <div>
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            Contact routes
                        </span>
                        <h2 className="serif">
                            Three direct inboxes, <em>no</em> parent-site form.
                        </h2>
                    </div>
                    <p>
                        Business, legal, and privacy contacts stay explicit and reviewable.
                        Sensitive documents should only be sent when requested by the right inbox.
                    </p>
                </div>
                <div className="cl-wrap">
                    <DirectoryCards />
                </div>
            </section>

            <section className="cl-section cl-reveal">
                <div className="cl-wrap">
                    <div className="cl-final-band glass">
                        <div>
                            <span className="cl-eyebrow mono">
                                <span className="cl-pip" aria-hidden="true" />
                                Reference complete
                            </span>
                            <h2 className="serif">
                                Verify the company layer, then move to the right public product.
                            </h2>
                            <p>
                                ConstantLayer keeps the entity and product relationship surface clear.
                                Product-specific details remain on product domains.
                            </p>
                        </div>
                        <div className="cl-actions">
                            <ConstantLayerLink className="cl-button cl-button-solid cl-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </ConstantLayerLink>
                            <a className="cl-button cl-button-glass cl-button-large" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                                Contact
                                <LuScale aria-hidden="true" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cl-section cl-section-tight cl-reveal">
                <div className="cl-wrap">
                    <OperatingRows rows={OPERATING_ROWS} />
                </div>
            </section>
        </PageShell>
    );
}
