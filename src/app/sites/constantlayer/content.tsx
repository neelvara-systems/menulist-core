import type { Metadata } from 'next';
import type { IconType } from 'react-icons';
import {
    LuArrowRight,
    LuBuilding2,
    LuExternalLink,
    LuFileText,
    LuLayers,
    LuMail,
    LuMenuSquare,
    LuNetwork,
    LuScale,
    LuShieldCheck,
} from 'react-icons/lu';
import {
    CONSTANTLAYER_CONTACT_EMAIL,
    CONSTANTLAYER_LEGAL_EMAIL,
    CONSTANTLAYER_PRIVACY_EMAIL,
    CONSTANTLAYER_PRODUCT_LINEUP,
    CONSTANTLAYER_RELATIONSHIP_LINE,
    CONSTANTLAYER_SITE_DESCRIPTION,
    buildConstantLayerUrl,
} from './siteConfig';
import ScrollRevealController from './ScrollRevealController';
import { ConstantLayerLink, SiteHeaderNav } from './SiteHeaderNav';

type NavItem = {
    label: string;
    href: string;
    activeHrefs?: string[];
};

type InfoCard = {
    title: string;
    description: string;
    icon: IconType;
    href?: string;
};

type PageData = {
    slug: 'products' | 'about' | 'contact' | 'legal' | 'privacy' | 'terms';
    title: string;
    description: string;
    eyebrow: string;
    cards: InfoCard[];
    sections: Array<{
        title: string;
        body: string;
        items?: string[];
    }>;
};

export const NAV_ITEMS: NavItem[] = [
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Legal', href: '/legal', activeHrefs: ['/legal', '/privacy', '/terms'] },
    { label: 'Contact', href: '/contact' },
];

export const OPERATING_ROWS: InfoCard[] = [
    {
        title: 'Entity clarity',
        description: 'ConstantLayer Systems is the company-level reference for business, legal, privacy, and product relationship checks.',
        icon: LuBuilding2,
    },
    {
        title: 'Product relationship',
        description: 'Each product keeps its own website, workflows, and product information while the company relationship stays clear here.',
        icon: LuLayers,
    },
    {
        title: 'Direct verification',
        description: 'Public company questions route to business, legal, and privacy contacts without a form, account, or data collection surface.',
        icon: LuShieldCheck,
    },
];

export const DIRECTORY_ROWS = [
    {
        label: 'Business',
        value: CONSTANTLAYER_CONTACT_EMAIL,
        href: `mailto:${CONSTANTLAYER_CONTACT_EMAIL}`,
    },
    {
        label: 'Legal',
        value: CONSTANTLAYER_LEGAL_EMAIL,
        href: `mailto:${CONSTANTLAYER_LEGAL_EMAIL}`,
    },
    {
        label: 'Privacy',
        value: CONSTANTLAYER_PRIVACY_EMAIL,
        href: `mailto:${CONSTANTLAYER_PRIVACY_EMAIL}`,
    },
];

const PRODUCT_ICON_BY_NAME: Record<typeof CONSTANTLAYER_PRODUCT_LINEUP[number]['name'], IconType> = {
    MenuList: LuMenuSquare,
    Answerlattice: LuNetwork,
    CampaignCue: LuLayers,
};

export const PAGE_DATA: Record<PageData['slug'], PageData> = {
    products: {
        slug: 'products',
        title: 'Products',
        description: 'MenuList, Answerlattice, and CampaignCue are product surfaces in the ConstantLayer Systems lineup.',
        eyebrow: 'Product lineup',
        cards: CONSTANTLAYER_PRODUCT_LINEUP.map((product) => ({
            title: product.name,
            description: product.summary,
            icon: PRODUCT_ICON_BY_NAME[product.name],
            href: product.url,
        })),
        sections: [
            {
                title: 'Product boundary',
                body: 'ConstantLayer Systems is the company layer. Product-specific claims, pricing, onboarding, and owner workflows remain on each product surface.',
                items: [
                    'MenuList, Answerlattice, and CampaignCue keep separate product sites and product-specific documentation.',
                    'Future products should be added here only when they have a public product surface or approved company reference.',
                    'Company, legal, and privacy references can point back to this site when an entity-level source is needed.',
                ],
            },
        ],
    },
    about: {
        slug: 'about',
        title: 'About',
        description: 'ConstantLayer Systems builds and operates infrastructure for business information that should stay correct without constant attention.',
        eyebrow: 'Company focus',
        cards: [
            {
                title: 'Business information',
                description: 'The work is centered on stable public facts, governed answers, product context, and source-backed business outputs.',
                icon: LuFileText,
            },
            {
                title: 'Quiet operation',
                description: 'The company favors reliable systems over noisy dashboards or broad promises.',
                icon: LuShieldCheck,
            },
            {
                title: 'Small business fit',
                description: 'The primary lens is practical ownership: less maintenance, fewer decisions, clearer support, and better public output.',
                icon: LuBuilding2,
            },
        ],
        sections: [
            {
                title: 'Operating stance',
                body: 'ConstantLayer Systems exists to operate product infrastructure where incorrect or stale business information creates daily friction.',
                items: [
                    'The parent site stays calm, narrow, and factual.',
                    'Product-specific marketing stays on product domains.',
                    'MenuList, Answerlattice, and CampaignCue are represented as separate product surfaces.',
                    'GSTIN and sensitive registration details are not published in v1 unless explicitly approved.',
                ],
            },
        ],
    },
    contact: {
        slug: 'contact',
        title: 'Contact',
        description: 'Use the right ConstantLayer Systems contact point for business, legal, or privacy inquiries.',
        eyebrow: 'Contact points',
        cards: [
            {
                title: 'Business',
                description: CONSTANTLAYER_CONTACT_EMAIL,
                icon: LuMail,
            },
            {
                title: 'Legal',
                description: CONSTANTLAYER_LEGAL_EMAIL,
                icon: LuScale,
            },
            {
                title: 'Privacy',
                description: CONSTANTLAYER_PRIVACY_EMAIL,
                icon: LuShieldCheck,
            },
        ],
        sections: [
            {
                title: 'Inquiry routing',
                body: 'This website does not collect messages through a form. Email keeps the first contact explicit and reviewable.',
                items: [
                    'Use the business email for general company or product relationship questions.',
                    'Use the legal email for vendor, entity, or contract verification.',
                    'Use the privacy email for website privacy or data inquiries.',
                    'Do not send PAN, residential address, private registration records, or sensitive documents unless the legal or privacy inbox requests them.',
                ],
            },
        ],
    },
    legal: {
        slug: 'legal',
        title: 'Legal',
        description: 'Entity and relationship information for ConstantLayer Systems.',
        eyebrow: 'Entity information',
        cards: [
            {
                title: 'Operating name',
                description: 'ConstantLayer Systems',
                icon: LuBuilding2,
            },
            {
                title: 'Product relationship',
                description: CONSTANTLAYER_RELATIONSHIP_LINE,
                icon: LuLayers,
            },
            {
                title: 'Legal contact',
                description: CONSTANTLAYER_LEGAL_EMAIL,
                icon: LuMail,
            },
        ],
        sections: [
            {
                title: 'Public legal note',
                body: 'This page is the public entity reference for the parent website. It is not a product pricing page, owner dashboard, or customer support portal.',
                items: [
                    'Product terms and product workflows remain on each product surface.',
                    'Sensitive entity identifiers are withheld from v1 public copy unless legal review requires disclosure.',
                    'This page does not claim incorporation status, subsidiaries, or holding-company structure.',
                    'Legal inquiries should use the dedicated legal email.',
                ],
            },
            {
                title: 'Product policy split',
                body: 'ConstantLayer Systems keeps parent-site legal information separate from product policies.',
                items: [
                    'Product privacy, support, pricing, billing, cancellation, and refund terms belong on the relevant product surface.',
                    'Future products should not be added to legal copy until their public surface and policy scope are approved.',
                    'Company-level references can link here, but product commitments should not be moved into this parent page.',
                ],
            },
        ],
    },
    privacy: {
        slug: 'privacy',
        title: 'Privacy',
        description: 'Privacy information for the ConstantLayer Systems website.',
        eyebrow: 'Privacy',
        cards: [
            {
                title: 'Static website',
                description: 'The parent website is informational and does not include an account system.',
                icon: LuFileText,
            },
            {
                title: 'No contact form',
                description: 'The site does not submit inquiries to an API or database.',
                icon: LuShieldCheck,
            },
            {
                title: 'Privacy contact',
                description: CONSTANTLAYER_PRIVACY_EMAIL,
                icon: LuMail,
            },
        ],
        sections: [
            {
                title: 'Website privacy stance',
                body: 'ConstantLayer Systems keeps this parent website limited to public informational pages. Product-level privacy details belong on the relevant product surface.',
                items: [
                    'There is no newsletter signup or embedded inquiry form in v1.',
                    'There is no website account, lead database, product onboarding flow, or Firebase write path in v1.',
                    'Product-level privacy details belong on the relevant product surface.',
                ],
            },
            {
                title: 'Information processed',
                body: 'The parent website may involve only limited technical request data and visitor-initiated email communication.',
                items: [
                    'Hosting, CDN, and security layers may process page-request metadata and operational logs.',
                    'If a visitor sends email, the email address, message content, and related mail metadata are handled by the mail provider and relevant inbox.',
                    'This parent notice does not cover product account, business, support, campaign, billing, or customer interaction data.',
                ],
            },
            {
                title: 'Privacy contact',
                body: 'Privacy questions for this website should use the dedicated privacy email.',
                items: [
                    'Privacy questions should use the dedicated privacy email.',
                    'Product-data questions should be routed to the relevant product policy and support path.',
                    'Any future form, analytics, newsletter, account, or gated download requires a privacy review before launch.',
                ],
            },
        ],
    },
    terms: {
        slug: 'terms',
        title: 'Terms',
        description: 'Terms for use of the ConstantLayer Systems website.',
        eyebrow: 'Terms',
        cards: [
            {
                title: 'Informational use',
                description: 'This website provides entity, product relationship, and contact information.',
                icon: LuFileText,
            },
            {
                title: 'Product separation',
                description: 'Product usage is governed by each product surface and its product terms.',
                icon: LuLayers,
            },
            {
                title: 'Questions',
                description: CONSTANTLAYER_LEGAL_EMAIL,
                icon: LuMail,
            },
        ],
        sections: [
            {
                title: 'Website terms',
                body: 'Use of this parent website is limited to reading public company and relationship information.',
                items: [
                    'Do not treat parent-site copy as a product feature commitment.',
                    'Do not copy or misuse the ConstantLayer Systems or product names.',
                    'This parent website does not provide checkout, subscriptions, product onboarding, or customer support workflows.',
                ],
            },
            {
                title: 'Product terms stay separate',
                body: 'Product usage is governed by the relevant product surface and its product terms.',
                items: [
                    'Refund, cancellation, payment, warranty, and service-availability terms must be handled on product surfaces before paid services are accepted there.',
                    'Product websites may change their product pages, pricing, support paths, or terms independently from this parent site.',
                    'Legal questions should use the dedicated legal email.',
                ],
            },
        ],
    },
};

export function buildPageMetadata(page: PageData): Metadata {
    return {
        title: page.title,
        description: page.description,
        alternates: {
            canonical: buildConstantLayerUrl(`/${page.slug}`),
        },
        openGraph: {
            title: `${page.title} | ConstantLayer Systems`,
            description: page.description,
            url: buildConstantLayerUrl(`/${page.slug}`),
            siteName: 'ConstantLayer Systems',
            type: 'website',
        },
    };
}

export function ConstantLayerLogoMark() {
    return (
        <span className="cl-logo-mark" aria-hidden="true">
            <span />
            <span />
            <span />
        </span>
    );
}

export function SystemScene() {
    return (
        <div className="cl-system-scene" aria-hidden="true">
            <div className="cl-scene-grid" />
            <div className="cl-scene-rail cl-scene-rail-a" />
            <div className="cl-scene-rail cl-scene-rail-b" />
            <div className="cl-scene-plane cl-scene-plane-a">
                <span />
                <span />
                <span />
            </div>
            <div className="cl-scene-plane cl-scene-plane-b">
                <span />
                <span />
                <span />
            </div>
            <div className="cl-scene-plane cl-scene-plane-c">
                <span />
                <span />
            </div>
            <div className="cl-scene-node cl-scene-node-a" />
            <div className="cl-scene-node cl-scene-node-b" />
        </div>
    );
}

export function SiteHeader() {
    return (
        <header className="cl-header">
            <ConstantLayerLink href="/" className="cl-brand" aria-label="ConstantLayer Systems home">
                <ConstantLayerLogoMark />
                <span>ConstantLayer Systems</span>
            </ConstantLayerLink>
            <SiteHeaderNav items={NAV_ITEMS} />
            <ConstantLayerLink
                className="cl-header-action"
                href="/products"
                aria-label="View product lineup"
                title="View product lineup"
            >
                Products
                <LuArrowRight aria-hidden="true" />
            </ConstantLayerLink>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="cl-footer">
            <div className="cl-footer-inner">
                <div>
                    <ConstantLayerLink href="/" className="cl-footer-brand">
                        <ConstantLayerLogoMark />
                        <span>ConstantLayer Systems</span>
                    </ConstantLayerLink>
                    <p>{CONSTANTLAYER_SITE_DESCRIPTION}</p>
                </div>
                <div className="cl-footer-links" aria-label="Footer navigation">
                    <ConstantLayerLink href="/products">Products</ConstantLayerLink>
                    <ConstantLayerLink href="/about">About</ConstantLayerLink>
                    <ConstantLayerLink href="/legal">Legal</ConstantLayerLink>
                    <ConstantLayerLink href="/privacy">Privacy</ConstantLayerLink>
                    <ConstantLayerLink href="/terms">Terms</ConstantLayerLink>
                    <ConstantLayerLink href="/contact">Contact</ConstantLayerLink>
                </div>
            </div>
        </footer>
    );
}

export function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="constantlayer-site">
            <ScrollRevealController />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
        </div>
    );
}

export function OperatingRows({ rows }: { rows: InfoCard[] }) {
    return (
        <div className="cl-operating-rows">
            {rows.map((row, index) => {
                const Icon = row.icon;

                const rowContent = (
                    <>
                        <span className="cl-row-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="cl-row-icon">
                            <Icon aria-hidden="true" />
                        </span>
                        <div>
                            <h3>{row.title}</h3>
                            <p>{row.description}</p>
                        </div>
                    </>
                );

                if (row.href) {
                    return (
                        <a className="cl-operating-row" href={row.href} key={row.title} aria-label={`Open ${row.title} website`}>
                            {rowContent}
                            <LuExternalLink className="cl-row-external-icon" aria-hidden="true" />
                        </a>
                    );
                }

                return (
                    <article className="cl-operating-row" key={row.title}>
                        {rowContent}
                    </article>
                );
            })}
        </div>
    );
}

export function StructuredData() {
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${buildConstantLayerUrl('/')}#organization`,
        name: 'ConstantLayer Systems',
        url: buildConstantLayerUrl('/'),
        email: CONSTANTLAYER_CONTACT_EMAIL,
        contactPoint: [
            {
                '@type': 'ContactPoint',
                email: CONSTANTLAYER_CONTACT_EMAIL,
                contactType: 'general inquiries',
            },
            {
                '@type': 'ContactPoint',
                email: CONSTANTLAYER_LEGAL_EMAIL,
                contactType: 'legal inquiries',
            },
            {
                '@type': 'ContactPoint',
                email: CONSTANTLAYER_PRIVACY_EMAIL,
                contactType: 'privacy inquiries',
            },
        ],
        knowsAbout: CONSTANTLAYER_PRODUCT_LINEUP.map((product) => product.name),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(organization),
            }}
        />
    );
}

export function SecondaryPage({ page }: { page: PageData }) {
    return (
        <PageShell>
            <StructuredData />
            <section className="cl-page-hero">
                <div className="cl-container cl-page-hero-inner">
                    <span className="cl-eyebrow">{page.eyebrow}</span>
                    <h1>{page.title}</h1>
                    <p>{page.description}</p>
                </div>
            </section>
            <section className="cl-section cl-section-subtle cl-reveal">
                <div className="cl-container">
                    <OperatingRows rows={page.cards} />
                </div>
            </section>
            {page.sections.map((section) => (
                <section className="cl-section cl-reveal" key={section.title}>
                    <div className="cl-container cl-text-panel">
                        <h2>{section.title}</h2>
                        <p>{section.body}</p>
                        {section.items ? (
                            <ul className="cl-check-list">
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </section>
            ))}
            <section className="cl-section cl-final-section cl-reveal">
                <div className="cl-container cl-final-band">
                    <div>
                        <span className="cl-eyebrow">Relationship</span>
                        <h2>{CONSTANTLAYER_RELATIONSHIP_LINE}</h2>
                        <p>{CONSTANTLAYER_SITE_DESCRIPTION}</p>
                    </div>
                    {page.slug === 'products' ? (
                        <a className="cl-primary-action" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                            Contact ConstantLayer
                            <LuMail aria-hidden="true" />
                        </a>
                    ) : (
                        <ConstantLayerLink className="cl-primary-action" href="/products">
                            View Products
                            <LuArrowRight aria-hidden="true" />
                        </ConstantLayerLink>
                    )}
                </div>
            </section>
        </PageShell>
    );
}
