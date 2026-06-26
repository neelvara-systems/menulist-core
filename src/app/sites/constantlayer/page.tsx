import type { Metadata } from 'next';
import Image from 'next/image';
import {
    LuArrowRight,
    LuBuilding2,
    LuExternalLink,
    LuLayers,
    LuMail,
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
import MenuListLogoMark from '@/components/website/shared/LogoMark';
import AnswerlatticeLogoMark from '@/components/atoms/answerlatticeLogoMark';

export const metadata: Metadata = {
    title: CONSTANTLAYER_SITE_TITLE,
    description: CONSTANTLAYER_SITE_DESCRIPTION,
    alternates: { canonical: buildConstantLayerUrl('/') },
};

const LEDGER_ROWS = [
    ['Company', 'ConstantLayer Systems'],
    ['Products', CONSTANTLAYER_PRODUCT_LINEUP.map((product) => product.name).join(' / ')],
    ['Contact', CONSTANTLAYER_CONTACT_EMAIL],
] as const;

const STATS = [
    ['3', 'current products'],
    ['1', 'business email for company questions'],
    ['0', 'contact forms'],
    ['7', 'public company pages'],
] as const;

const SPOTLIGHTS = [
    {
        icon: LuBuilding2,
        variant: 'warm' as const,
        title: 'The company behind the current product lineup.',
        body: 'ConstantLayer Systems is the operating company behind MenuList, Answerlattice, and CampaignCue.',
        stat: 'Operating company',
    },
    {
        icon: LuLayers,
        variant: 'cool' as const,
        title: 'Three products, separate promises.',
        body: 'MenuList handles public business menus and facts. Answerlattice handles governed support answers. CampaignCue handles campaign-ready business context.',
        stat: 'Product boundaries',
    },
    {
        icon: LuMail,
        variant: 'amber' as const,
        title: 'Company questions go through email.',
        body: 'For company-level questions, send a short note by email. Product support still belongs on the product site.',
        stat: 'Email only',
    },
] as const;

function ProductLogo({ name }: { name: typeof CONSTANTLAYER_PRODUCT_LINEUP[number]['name'] }) {
    if (name === 'MenuList') {
        return <MenuListLogoMark height={28} className="cl-product-logo-svg" />;
    }

    if (name === 'Answerlattice') {
        return <AnswerlatticeLogoMark height={30} className="cl-product-logo-svg" idPrefix="constantlayer-answerlattice-product-logo" />;
    }

    return (
        <Image
            alt=""
            aria-hidden="true"
            className="cl-product-logo-img"
            height={38}
            src="/campaigncue-icon.svg"
            width={38}
        />
    );
}

export default function ConstantLayerHomePage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="cl-hero">
                <div className="cl-wrap">
                    <div className="cl-hero-copy cl-reveal">
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            Company behind MenuList, Answerlattice, and CampaignCue
                        </span>
                        <h1 className="serif">
                            ConstantLayer <em>Systems</em>
                        </h1>
                        <p>
                            We build business information products: MenuList for public menus
                            and store facts, Answerlattice for governed support answers, and
                            CampaignCue for campaign-ready business context.
                        </p>
                        <div className="cl-actions">
                            <ConstantLayerLink className="cl-button cl-button-solid cl-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </ConstantLayerLink>
                            <a className="cl-button cl-button-glass cl-button-large" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                                Email ConstantLayer
                                <LuMail aria-hidden="true" />
                            </a>
                        </div>
                        <div className="cl-hero-meta mono" aria-label="ConstantLayer operating boundaries">
                            <span>Business information products</span>
                            <i aria-hidden="true" />
                            <span>Email-only contact</span>
                            <i aria-hidden="true" />
                            <span>No contact form</span>
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
                            What ConstantLayer does
                        </span>
                        <h2 className="serif">
                            The company, products, and contact routes in one place.
                        </h2>
                    </div>
                    <SegmentControl items={['Company', 'Products', 'Contact']} />
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
                            This is the company-level reference for the current lineup. Product-specific websites explain each product.
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
                            Company information stays separate from <em>product support</em>.
                        </h2>
                    </div>
                    <p>
                        This site identifies the company and the current products. Product pricing,
                        onboarding, support, and account questions stay on the relevant product site.
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
                        <strong className="serif">{CONSTANTLAYER_PRODUCT_LINEUP.length} current products</strong>
                        <p>MenuList, Answerlattice, and CampaignCue are the products currently represented by ConstantLayer Systems.</p>
                    </div>
                    <div className="cl-product-list">
                        {CONSTANTLAYER_PRODUCT_LINEUP.map((product) => (
                            <a href={product.url} className="cl-product-row" key={product.name}>
                                <span className="cl-product-logo-wrap" aria-hidden="true">
                                    <ProductLogo name={product.name} />
                                </span>
                                <span className="mono">{product.status}</span>
                                <strong>{product.name}</strong>
                                <p>{product.summary}</p>
                                <LuExternalLink className="cl-product-link-icon" aria-hidden="true" />
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
                            Email the right inbox. <em>No</em> parent-site form.
                        </h2>
                    </div>
                    <p>
                            Use the business inbox for company questions. Legal and privacy
                            questions have separate routes.
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
                                Company questions
                            </span>
                            <h2 className="serif">
                                Need to reach ConstantLayer Systems?
                            </h2>
                            <p>
                                Email ConstantLayer for company, legal, privacy, or product
                                relationship questions. Product support and account questions stay
                                on the relevant product site.
                            </p>
                        </div>
                        <div className="cl-actions">
                            <a className="cl-button cl-button-solid cl-button-large" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                                Email ConstantLayer
                                <LuMail aria-hidden="true" />
                            </a>
                            <ConstantLayerLink className="cl-button cl-button-glass cl-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </ConstantLayerLink>
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
