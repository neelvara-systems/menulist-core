import type { Metadata } from 'next';
import { LuArrowRight, LuExternalLink, LuLayers, LuMail } from 'react-icons/lu';
import {
    NEELVARA_CONTACT_EMAIL,
    NEELVARA_OG_IMAGE_PATH,
    NEELVARA_PRODUCT_LINEUP,
    NEELVARA_RELATIONSHIP_LINE,
    buildNeelvaraUrl,
} from '../siteConfig';
import { PagePrismPanel, PageShell, StructuredData } from '../content';
import ProductLogo, { type NeelvaraProductName } from '../ProductLogo';
import { NeelvaraLink } from '../SiteHeaderNav';

export const metadata: Metadata = {
    title: 'Operated Products',
    description: 'Current operated products and product website routing for Neelvara Systems.',
    alternates: { canonical: buildNeelvaraUrl('/products') },
    openGraph: {
        title: 'Operated Products | Neelvara Systems',
        description: 'Current operated products and product website routing for Neelvara Systems.',
        url: buildNeelvaraUrl('/products'),
        siteName: 'Neelvara Systems',
        type: 'website',
        images: [
            {
                url: buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH),
                width: 1200,
                height: 630,
                alt: 'Neelvara Systems',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Operated Products | Neelvara Systems',
        description: 'Current operated products and product website routing for Neelvara Systems.',
        images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
    },
};

type ProductName = NeelvaraProductName;

const PRODUCT_FOCUS: Record<ProductName, string[]> = {
    MenuList: ['Menus', 'Hours', 'Business profiles', 'Customer-facing details'],
    Answerlattice: ['Knowledge', 'Documentation', 'Approved answers', 'Support information'],
    CampaignCue: ['Business context', 'Campaign preparation', 'Reusable content', 'Creative assets'],
};

const PRODUCT_CATEGORY: Record<ProductName, string> = {
    MenuList: 'Public business information',
    Answerlattice: 'Approved business answers',
    CampaignCue: 'Reusable business context',
};

export default function NeelvaraProductsPage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="nv-page-hero">
                <div className="nv-wrap nv-page-hero-inner">
                    <div className="nv-page-hero-copy nv-reveal">
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Current products
                        </span>
                        <h1 className="serif">Products operated by Neelvara Systems.</h1>
                        <p>
                            The current lineup covers public facts, approved answers,
                            and reusable business context.
                        </p>
                        <div className="nv-page-hero-meta glass">
                            <span className="mono">company reference</span>
                            <span className="mono">product boundaries</span>
                            <span className="mono">separate terms</span>
                        </div>
                    </div>
                    <PagePrismPanel
                        eyebrow="Product map"
                        title="Operated Products"
                        rows={[
                            'MenuList: public facts',
                            'Answerlattice: approved answers',
                            'CampaignCue: reusable context',
                        ]}
                    />
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-product-architecture">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Product map
                        </span>
                        <h2 className="serif">Each product has a distinct role.</h2>
                        <p>
                            This company website identifies the lineup. Product websites
                            explain capabilities, support, pricing, and commitments.
                        </p>
                    </div>
                    <div className="nv-product-architecture-grid">
                        <div className="nv-product-architecture-root">
                            <LuLayers aria-hidden="true" />
                            <strong>Customer-facing business information</strong>
                        </div>
                        {NEELVARA_PRODUCT_LINEUP.map((product) => (
                            <a className="nv-product-architecture-card" href={product.url} key={product.name}>
                                <span className="nv-product-logo-wrap" aria-hidden="true">
                                    <ProductLogo name={product.name} />
                                </span>
                                <span className="mono">{PRODUCT_CATEGORY[product.name]}</span>
                                <strong>{product.name}</strong>
                                <p>{product.summary}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-product-detail-list">
                    {NEELVARA_PRODUCT_LINEUP.map((product) => (
                        <article className="nv-product-detail-card glass" key={product.name}>
                            <div className="nv-product-detail-head">
                                <span className="nv-product-logo-wrap" aria-hidden="true">
                                    <ProductLogo name={product.name} />
                                </span>
                                <div>
                                    <span className="mono">{PRODUCT_CATEGORY[product.name]}</span>
                                    <h2 className="serif">{product.name}</h2>
                                </div>
                            </div>
                            <p>{product.summary}</p>
                            <ul className="nv-product-focus-list">
                                {PRODUCT_FOCUS[product.name].map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                            <a className="nv-button nv-button-glass" href={product.url}>
                                Visit {product.name}
                                <LuExternalLink aria-hidden="true" />
                            </a>
                        </article>
                    ))}
                </div>
            </section>

            <section className="nv-section nv-section-tight nv-reveal">
                <div className="nv-wrap nv-text-panel glass">
                    <div>
                        <h2 className="serif">Company information and product commitments stay separate.</h2>
                        <p>
                            Product pricing, onboarding, support, documentation, privacy,
                            and terms remain on the individual product websites. Neelvara
                            Systems provides company reference information, legal information,
                            and product routing context.
                        </p>
                    </div>
                    <ul className="nv-check-list">
                        <li>{NEELVARA_RELATIONSHIP_LINE}</li>
                        <li>Each product has its own website, policy, support path, and operating commitments.</li>
                        <li>Company questions can use Neelvara contact routes.</li>
                    </ul>
                </div>
            </section>

            <section className="nv-section nv-final-section nv-reveal">
                <div className="nv-wrap nv-final-band glass">
                    <div>
                        <h2 className="serif">Use product sites for product work and Neelvara for company verification.</h2>
                        <p>
                            Product support, onboarding, billing, and account questions stay on
                            product websites. Company, legal, privacy, partnership, or business
                            inquiries can start with Neelvara Systems.
                        </p>
                    </div>
                    <div className="nv-actions">
                        <a className="nv-button nv-button-solid nv-button-large" href={`mailto:${NEELVARA_CONTACT_EMAIL}`}>
                            Email Neelvara
                            <LuMail aria-hidden="true" />
                        </a>
                        <NeelvaraLink className="nv-button nv-button-glass nv-button-large" href="/contact">
                            Contact Routes
                            <LuArrowRight aria-hidden="true" />
                        </NeelvaraLink>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
