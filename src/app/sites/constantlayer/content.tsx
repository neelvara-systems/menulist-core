import type { Metadata } from 'next';
import type { IconType } from 'react-icons';
import {
    LuArrowRight,
    LuArrowUpRight,
    LuBuilding2,
    LuCheck,
    LuCpu,
    LuDatabase,
    LuExternalLink,
    LuFileText,
    LuFingerprint,
    LuGlobe2,
    LuLayers,
    LuLock,
    LuMail,
    LuMenuSquare,
    LuMinus,
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
import SpotlightCard, { type SpotlightVariant } from './SpotlightCard';

type NavItem = {
    label: string;
    href: string;
    activeHrefs?: string[];
};

export type InfoCard = {
    title: string;
    description: string;
    icon: IconType;
    href?: string;
    meta?: string;
    variant?: SpotlightVariant;
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

type ComparisonRow = {
    label: string;
    company: string;
    products: string;
    apps: string;
};

export const NAV_ITEMS: NavItem[] = [
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Legal', href: '/legal', activeHrefs: ['/legal', '/privacy', '/terms'] },
    { label: 'Contact', href: '/contact' },
];

export const OPERATING_ROWS: InfoCard[] = [
    {
        title: 'Company contact',
        description: 'Business, legal, and privacy questions route to direct ConstantLayer email addresses.',
        icon: LuBuilding2,
        meta: 'Direct inboxes',
        variant: 'warm',
    },
    {
        title: 'Product lineup',
        description: 'MenuList, Answerlattice, and CampaignCue are the current products represented here.',
        icon: LuLayers,
        meta: 'Current products',
        variant: 'cool',
    },
    {
        title: 'Business inbox',
        description: 'Company and product-relationship questions start with a direct email, not a web form.',
        icon: LuShieldCheck,
        meta: 'Company email',
        variant: 'amber',
    },
];

export const DIRECTORY_ROWS = [
    {
        label: 'Business',
        value: CONSTANTLAYER_CONTACT_EMAIL,
        href: `mailto:${CONSTANTLAYER_CONTACT_EMAIL}`,
        description: 'General company and product-relationship questions.',
        icon: LuMail,
    },
    {
        label: 'Legal',
        value: CONSTANTLAYER_LEGAL_EMAIL,
        href: `mailto:${CONSTANTLAYER_LEGAL_EMAIL}`,
        description: 'Vendor, entity, and contract verification.',
        icon: LuScale,
    },
    {
        label: 'Privacy',
        value: CONSTANTLAYER_PRIVACY_EMAIL,
        href: `mailto:${CONSTANTLAYER_PRIVACY_EMAIL}`,
        description: 'Parent-site privacy questions and policy routing.',
        icon: LuShieldCheck,
    },
] as const;

const PRODUCT_ICON_BY_NAME: Record<typeof CONSTANTLAYER_PRODUCT_LINEUP[number]['name'], IconType> = {
    MenuList: LuMenuSquare,
    Answerlattice: LuNetwork,
    CampaignCue: LuLayers,
};

export const PAGE_DATA: Record<PageData['slug'], PageData> = {
    products: {
        slug: 'products',
        title: 'Products',
        description: 'MenuList, Answerlattice, and CampaignCue are the current products represented by ConstantLayer Systems.',
        eyebrow: 'Public lineup',
        cards: CONSTANTLAYER_PRODUCT_LINEUP.map((product, index) => ({
            title: product.name,
            description: product.summary,
            icon: PRODUCT_ICON_BY_NAME[product.name],
            href: product.url,
            meta: product.status,
            variant: index === 0 ? 'warm' : index === 1 ? 'cool' : 'amber',
        })),
        sections: [
            {
                title: 'Product boundary',
                body: 'ConstantLayer Systems represents the current product lineup. Product details, pricing, onboarding, and support remain on each product website.',
                items: [
                    'MenuList, Answerlattice, and CampaignCue keep separate product sites and product-specific documentation.',
                    'Only approved public products appear on this website.',
                    'Company, legal, and privacy questions route through the ConstantLayer contact paths.',
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
                description: 'The work is centered on clear public business facts, approved answers, and practical product context.',
                icon: LuFileText,
                meta: 'Public facts',
                variant: 'warm',
            },
            {
                title: 'Quiet operation',
                description: 'The company favors reliable systems over noisy dashboards or broad promises.',
                icon: LuShieldCheck,
                meta: 'Low noise',
                variant: 'cool',
            },
            {
                title: 'Small business fit',
                description: 'The primary lens is practical ownership: less maintenance, fewer decisions, clearer support, and better public output.',
                icon: LuBuilding2,
                meta: 'Owner lens',
                variant: 'amber',
            },
        ],
        sections: [
            {
                title: 'Operating stance',
                body: 'ConstantLayer Systems exists to operate product infrastructure where incorrect or stale business information creates daily friction.',
                items: [
                    'The parent site stays calm, narrow, and factual.',
                    'Product-specific marketing stays on product domains.',
                    'MenuList, Answerlattice, and CampaignCue are represented as separate products.',
                    'GSTIN and sensitive registration details are not published unless explicitly approved.',
                ],
            },
        ],
    },
    contact: {
        slug: 'contact',
        title: 'Contact',
        description: 'Use the right ConstantLayer Systems contact point for business, legal, or privacy inquiries.',
        eyebrow: 'Contact points',
        cards: DIRECTORY_ROWS.map((row) => ({
            title: row.label,
            description: row.value,
            icon: row.icon,
            href: row.href,
            meta: row.description,
            variant: row.label === 'Business' ? 'warm' : row.label === 'Legal' ? 'cool' : 'amber',
        })),
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
            {
                title: 'Company questions',
                body: `For company-level questions about ConstantLayer Systems or its current products, email ${CONSTANTLAYER_CONTACT_EMAIL}.`,
                items: [
                    'Use the business inbox for company questions and product relationship questions.',
                    'Keep the first message high level; do not include private records, secrets, or customer datasets.',
                    'Product support should go through the relevant product site.',
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
                meta: 'Public reference',
                variant: 'warm',
            },
            {
                title: 'Product relationship',
                description: CONSTANTLAYER_RELATIONSHIP_LINE,
                icon: LuLayers,
                meta: 'Lineup statement',
                variant: 'cool',
            },
            {
                title: 'Legal contact',
                description: CONSTANTLAYER_LEGAL_EMAIL,
                icon: LuMail,
                meta: 'Email route',
                variant: 'amber',
            },
        ],
        sections: [
            {
                title: 'Public legal note',
                body: 'This page is the public entity reference for the parent website. It is not a product pricing page, owner dashboard, or customer support portal.',
                items: [
                    'Product terms and product workflows remain on each product site.',
                    'Sensitive entity identifiers are withheld from parent-site public copy unless legal review requires disclosure.',
                    'This page does not claim incorporation status, subsidiaries, or holding-company structure.',
                    'Legal inquiries should use the dedicated legal email.',
                ],
            },
            {
                title: 'Product policy split',
                body: 'ConstantLayer Systems keeps parent-site legal information separate from product policies.',
                items: [
                    'Product privacy, support, pricing, billing, cancellation, and refund terms belong on the relevant product site.',
                    'Only approved public products are included in parent-site legal copy.',
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
                meta: 'Informational only',
                variant: 'warm',
            },
            {
                title: 'No contact form',
                description: 'The site does not submit inquiries to an API or database.',
                icon: LuShieldCheck,
                meta: 'No API write',
                variant: 'cool',
            },
            {
                title: 'Privacy contact',
                description: CONSTANTLAYER_PRIVACY_EMAIL,
                icon: LuMail,
                meta: 'Email route',
                variant: 'amber',
            },
        ],
        sections: [
            {
                title: 'Website privacy stance',
                body: 'ConstantLayer Systems keeps this parent website limited to public informational pages. Product-level privacy details belong on the relevant product site.',
                items: [
                    'There is no newsletter signup or embedded inquiry form on this parent website.',
                    'There is no website account, lead database, product onboarding flow, or Firebase write path on this parent website.',
                    'There is no ConstantLayer-owned cookie banner or preference storage on this parent website.',
                    'Product-level privacy details belong on the relevant product site.',
                ],
            },
            {
                title: 'Information processed',
                body: 'The parent website may involve only limited technical request data and visitor-initiated email communication.',
                items: [
                    'Hosting, CDN, and security layers may process page-request metadata and operational logs.',
                    'The parent website does not use ConstantLayer-owned analytics, form storage, or preference storage.',
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
                meta: 'Website use',
                variant: 'warm',
            },
            {
                title: 'Product separation',
                description: 'Product usage is governed by the relevant product and its product terms.',
                icon: LuLayers,
                meta: 'Separated terms',
                variant: 'cool',
            },
            {
                title: 'Questions',
                description: CONSTANTLAYER_LEGAL_EMAIL,
                icon: LuMail,
                meta: 'Legal email',
                variant: 'amber',
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
                body: 'Product usage is governed by the relevant product and its product terms.',
                items: [
                    'Refund, cancellation, payment, warranty, and service-availability terms must be handled on product sites before paid services are accepted there.',
                    'Product websites may change their product pages, pricing, support paths, or terms independently from this parent site.',
                    'Legal questions should use the dedicated legal email.',
                ],
            },
        ],
    },
};

export const MARQUEE_ITEMS = [
    'ConstantLayer Systems',
    'MenuList',
    'Answerlattice',
    'CampaignCue',
    'Business information products',
    'Company email',
    'Privacy inbox',
    'Legal inbox',
];

export const COMPARISON_ROWS: ComparisonRow[] = [
    {
        label: 'Purpose',
        company: 'Company name, current products, and official contact routes.',
        products: 'Product details, pricing, onboarding, and customer-facing promises.',
        apps: 'Signed-in owner workflows, account settings, and product data.',
    },
    {
        label: 'Contact',
        company: 'Business, legal, and privacy email addresses.',
        products: 'Product support, sales, help docs, and account guidance.',
        apps: 'Owner actions, team operations, and account work.',
    },
    {
        label: 'Data',
        company: 'Static public pages and visitor-initiated email.',
        products: 'Product-specific public policies and support paths.',
        apps: 'Product data governed by each product architecture.',
    },
    {
        label: 'Claims',
        company: 'Narrow, verifiable company-level statements.',
        products: 'Capability, pricing, and product-specific promises.',
        apps: 'Operational behavior shown to signed-in users.',
    },
];

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
    return <span className="cl-logo-mark" aria-hidden="true" />;
}

export function SiteHeader() {
    return (
        <header className="cl-header">
            <div className="cl-header-inner glass">
                <ConstantLayerLink href="/" className="cl-brand" aria-label="ConstantLayer Systems home">
                    <ConstantLayerLogoMark />
                    <span>ConstantLayer</span>
                </ConstantLayerLink>
                <SiteHeaderNav items={NAV_ITEMS} />
                <div className="cl-header-actions">
                    <a className="cl-button cl-button-ghost" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                        Contact
                    </a>
                    <ConstantLayerLink className="cl-button cl-button-glass" href="/products">
                        Products
                        <LuArrowRight aria-hidden="true" />
                    </ConstantLayerLink>
                </div>
            </div>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="cl-footer">
            <div className="cl-wrap cl-footer-inner">
                <p>© 2026 ConstantLayer Systems</p>
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
            <div className="cl-page-mesh" aria-hidden="true" />
            <div className="cl-grain" aria-hidden="true" />
            <ScrollRevealController />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
        </div>
    );
}

export function SegmentControl({ items, activeIndex = 0 }: { items: string[]; activeIndex?: number }) {
    return (
        <div className="cl-segmented" aria-label="Reference areas">
            {items.map((item, index) => (
                <span className={index === activeIndex ? 'is-active' : undefined} key={item}>
                    {item}
                </span>
            ))}
        </div>
    );
}

export function OperatingRows({ rows }: { rows: InfoCard[] }) {
    return (
        <div className="cl-operating-rows">
            {rows.map((row) => {
                const Icon = row.icon;
                const content = (
                    <>
                        <span className="cl-card-icon">
                            <Icon aria-hidden="true" />
                        </span>
                        <span className="cl-card-meta mono">{row.meta || 'Reference'}</span>
                        <h3>{row.title}</h3>
                        <p>{row.description}</p>
                    </>
                );

                if (row.href) {
                    return (
                        <SpotlightCard
                            as="a"
                            className="cl-operating-card"
                            href={row.href}
                            key={row.title}
                            variant={row.variant}
                            aria-label={`Open ${row.title}`}
                        >
                            {content}
                            <LuExternalLink className="cl-card-link-icon" aria-hidden="true" />
                        </SpotlightCard>
                    );
                }

                return (
                    <SpotlightCard className="cl-operating-card" key={row.title} variant={row.variant}>
                        {content}
                    </SpotlightCard>
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

export function HeroStudioMock() {
    const pipelineRows = [
        ['Entity', 'current', '#8ee0ff'],
        ['Products', '3 products', '#b89cff'],
        ['Contacts', 'direct', '#ffb37a'],
        ['Storage', 'none', '#ff8fb1'],
    ] as const;

    return (
        <div className="cl-hero-mock glass cl-reveal">
            <div className="cl-hero-mock-head mono">
                <span className="cl-traffic" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
                <span>constantlayer.in / current products</span>
            </div>
            <div className="cl-hero-mock-grid">
                <div className="cl-mock-tile">
                    <span className="cl-tile-label mono">Lineup clarity</span>
                    <strong className="serif">3</strong>
                    <p>Current products represented by ConstantLayer Systems.</p>
                    <div className="cl-spark-bars" aria-hidden="true">
                        {[36, 44, 30, 58, 46, 68, 82, 74].map((height) => (
                            <span style={{ height: `${height}%` }} key={height} />
                        ))}
                    </div>
                </div>
                <div className="cl-mock-tile">
                    <span className="cl-tile-label mono">Reference pipeline</span>
                    <div className="cl-pipeline-list">
                        {pipelineRows.map(([label, meta, color]) => (
                            <span className="cl-pipeline-row mono" key={label}>
                                <i style={{ backgroundColor: color }} />
                                {label}
                                <small>{meta}</small>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MarqueeBand() {
    const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

    return (
        <div className="cl-marquee-wrap" aria-label="ConstantLayer reference scope">
            <div className="cl-marquee-track">
                {track.map((item, index) => (
                    <span className="mono" key={`${item}-${index}`}>
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function ComparisonTable() {
    return (
        <>
            <div className="cl-table-wrap glass cl-reveal">
                <table className="cl-comparison-table">
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>
                                <span>ConstantLayer</span>
                                <em>Company layer</em>
                            </th>
                            <th>Product websites</th>
                            <th>Owner apps</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARISON_ROWS.map((row) => (
                            <tr key={row.label}>
                                <th>{row.label}</th>
                                <td>{row.company}</td>
                                <td>{row.products}</td>
                                <td>{row.apps}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="cl-table-cards">
                {COMPARISON_ROWS.map((row) => (
                    <article className="glass" key={row.label}>
                        <span className="mono">{row.label}</span>
                        <h3>ConstantLayer</h3>
                        <p>{row.company}</p>
                        <dl>
                            <div>
                                <dt>Product websites</dt>
                                <dd>{row.products}</dd>
                            </div>
                            <div>
                                <dt>Owner apps</dt>
                                <dd>{row.apps}</dd>
                            </div>
                        </dl>
                    </article>
                ))}
            </div>
        </>
    );
}

export function BoundaryList() {
    const rows = [
        ['Static website', true],
        ['Company contacts', true],
        ['Product pricing', false],
        ['Owner dashboard', false],
        ['Contact form', false],
    ] as const;

    return (
        <ul className="cl-boundary-list">
            {rows.map(([label, allowed]) => (
                <li key={label}>
                    {allowed ? <LuCheck aria-hidden="true" /> : <LuMinus aria-hidden="true" />}
                    <span>{label}</span>
                </li>
            ))}
        </ul>
    );
}

export function SecondaryPage({ page }: { page: PageData }) {
    return (
        <PageShell>
            <StructuredData />
            <section className="cl-page-hero">
                <div className="cl-wrap cl-page-hero-inner">
                    <span className="cl-eyebrow mono">
                        <span className="cl-pip" aria-hidden="true" />
                        {page.eyebrow}
                    </span>
                    <h1 className="serif">{page.title}</h1>
                    <p>{page.description}</p>
                    <div className="cl-page-hero-meta glass">
                        <span className="mono">{page.slug}</span>
                        <span className="mono">company site</span>
                        <span className="mono">email routes</span>
                    </div>
                </div>
            </section>
            <section className="cl-section cl-reveal">
                <div className="cl-wrap">
                    <OperatingRows rows={page.cards} />
                </div>
            </section>
            {page.sections.map((section) => (
                <section className="cl-section cl-section-tight cl-reveal" key={section.title}>
                    <div className="cl-wrap cl-text-panel glass">
                        <div>
                            <span className="cl-eyebrow mono">
                                <span className="cl-pip" aria-hidden="true" />
                                Reference note
                            </span>
                            <h2 className="serif">{section.title}</h2>
                            <p>{section.body}</p>
                        </div>
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
                <div className="cl-wrap cl-final-band glass">
                    <div>
                        <span className="cl-eyebrow mono">
                            <span className="cl-pip" aria-hidden="true" />
                            Relationship
                        </span>
                        <h2 className="serif">{CONSTANTLAYER_RELATIONSHIP_LINE}</h2>
                        <p>{CONSTANTLAYER_SITE_DESCRIPTION}</p>
                    </div>
                    <div className="cl-actions">
                        {page.slug === 'products' || page.slug === 'contact' ? (
                            <a className="cl-button cl-button-solid cl-button-large" href={`mailto:${CONSTANTLAYER_CONTACT_EMAIL}`}>
                                Contact ConstantLayer
                                <LuMail aria-hidden="true" />
                            </a>
                        ) : (
                            <ConstantLayerLink className="cl-button cl-button-solid cl-button-large" href="/products">
                                View Products
                                <LuArrowRight aria-hidden="true" />
                            </ConstantLayerLink>
                        )}
                    </div>
                </div>
            </section>
        </PageShell>
    );
}

export const BENTO_CARDS = [
    {
        className: 'cl-bento-tall',
        icon: LuFingerprint,
        eyebrow: 'Company',
        title: 'ConstantLayer Systems builds business information products.',
        body: 'This site shows the company name, current product lineup, and official contact routes.',
    },
    {
        className: 'cl-bento-wide',
        icon: LuGlobe2,
        eyebrow: 'Products',
        title: 'MenuList, Answerlattice, and CampaignCue stay clearly separated.',
        body: 'Each product keeps its own website, onboarding, support, pricing, and product-specific terms.',
    },
    {
        className: 'cl-bento-med',
        icon: LuLock,
        eyebrow: 'Contact',
        title: 'Company questions go to email.',
        body: 'Visitors can email ConstantLayer for company, legal, or privacy questions. Product support stays on product sites.',
    },
    {
        className: 'cl-bento-med',
        icon: LuDatabase,
        eyebrow: 'No form',
        title: 'The site does not collect messages in a database.',
        body: 'There is no contact form, newsletter signup, account, or parent-site lead database.',
    },
    {
        className: 'cl-bento-small',
        icon: LuCpu,
        eyebrow: 'Support',
        title: 'Product support stays on product sites.',
        body: 'MenuList, Answerlattice, and CampaignCue handle their own product-specific questions.',
    },
    {
        className: 'cl-bento-small',
        icon: LuScale,
        eyebrow: 'Legal',
        title: 'Sensitive identifiers stay out of public copy.',
        body: 'The site avoids incorporation, holding-company, or GST claims unless approved.',
    },
] as const;

export function DirectoryCards() {
    return (
        <div className="cl-routing-grid">
            {DIRECTORY_ROWS.map((row) => {
                const Icon = row.icon;

                return (
                    <a className="cl-routing-card glass" href={row.href} key={row.label}>
                        <span className="cl-card-icon">
                            <Icon aria-hidden="true" />
                        </span>
                        <span className="mono">{row.label}</span>
                        <strong>{row.value}</strong>
                        <p>{row.description}</p>
                        <LuArrowUpRight aria-hidden="true" />
                    </a>
                );
            })}
        </div>
    );
}
