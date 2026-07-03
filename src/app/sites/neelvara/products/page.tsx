import type { Metadata } from 'next';
import { LuArrowRight, LuExternalLink, LuLayers, LuMail } from 'react-icons/lu';
import {
    NEELVARA_CONTACT_EMAIL,
    NEELVARA_OG_IMAGE_PATH,
    NEELVARA_PRODUCT_LINEUP,
    NEELVARA_RELATIONSHIP_LINE,
    buildNeelvaraUrl,
} from '../siteConfig';
import { PageShell, StructuredData } from '../content';
import { NeelvaraLink } from '../SiteHeaderNav';
import MenuListLogoMark from '@/components/website/shared/LogoMark';
import AnswerlatticeLogoMark from '@/components/atoms/answerlatticeLogoMark';

export const metadata: Metadata = {
    title: 'Focused Products',
    description: 'Focused products operated by Neelvara Systems.',
    alternates: { canonical: buildNeelvaraUrl('/products') },
    openGraph: {
        title: 'Focused Products | Neelvara Systems',
        description: 'Focused products operated by Neelvara Systems.',
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
        title: 'Focused Products | Neelvara Systems',
        description: 'Focused products operated by Neelvara Systems.',
        images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
    },
};

type ProductName = typeof NEELVARA_PRODUCT_LINEUP[number]['name'];

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

function ProductLogo({ name }: { name: ProductName }) {
    if (name === 'MenuList') {
        return <MenuListLogoMark height={28} className="nv-product-logo-svg" />;
    }

    if (name === 'Answerlattice') {
        return <AnswerlatticeLogoMark height={30} className="nv-product-logo-svg" idPrefix="neelvara-answerlattice-products-logo" />;
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

export default function NeelvaraProductsPage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="nv-page-hero">
                <div className="nv-wrap nv-page-hero-inner">
                    <span className="nv-eyebrow mono">
                        <span className="nv-pip" aria-hidden="true" />
                        Current products
                    </span>
                    <h1 className="serif">Focused products. One shared direction.</h1>
                    <p>
                        Neelvara Systems builds independent software products that solve
                        different parts of customer-facing business information. Each product has
                        its own website, documentation, support, and product-specific terms.
                    </p>
                    <div className="nv-page-hero-meta glass">
                        <span className="mono">company website</span>
                        <span className="mono">product routing</span>
                        <span className="mono">separate product terms</span>
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-product-architecture">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Information layer
                        </span>
                        <h2 className="serif">Different products. One information layer.</h2>
                        <p>
                            The shared direction is simple: customer-facing business information
                            should be accurate, approved, reusable, and easy to route.
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
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Product boundaries
                        </span>
                        <h2 className="serif">Company information and product commitments stay separate.</h2>
                        <p>
                            Product-specific pricing, onboarding, support, documentation, privacy,
                            and terms remain on the individual product websites. Neelvara
                            Systems provides company-level information, legal information, and
                            product relationship context.
                        </p>
                    </div>
                    <ul className="nv-check-list">
                        <li>{NEELVARA_RELATIONSHIP_LINE}</li>
                        <li>Products evolve independently while the company provides the long-term foundation behind them.</li>
                        <li>Company-level questions can use Neelvara contact routes.</li>
                    </ul>
                </div>
            </section>

            <section className="nv-section nv-final-section nv-reveal">
                <div className="nv-wrap nv-final-band glass">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Looking for something specific?
                        </span>
                        <h2 className="serif">Use product sites for product questions and Neelvara for company questions.</h2>
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
