import type { Metadata } from 'next';
import type { IconType } from 'react-icons';
import {
    LuArrowRight,
    LuArrowUpRight,
    LuBuilding2,
    LuExternalLink,
    LuFileText,
    LuGlobe2,
    LuLayers,
    LuMail,
    LuMenuSquare,
    LuNetwork,
    LuScale,
    LuShieldCheck,
} from 'react-icons/lu';
import {
    NEELVARA_CONTACT_EMAIL,
    NEELVARA_LEGAL_EMAIL,
    NEELVARA_LOGO_PATH,
    NEELVARA_OG_IMAGE_PATH,
    NEELVARA_PRIVACY_EMAIL,
    NEELVARA_PRODUCT_LINEUP,
    NEELVARA_RELATIONSHIP_LINE,
    NEELVARA_SITE_DESCRIPTION,
    buildNeelvaraUrl,
} from './siteConfig';
import ScrollRevealController from './ScrollRevealController';
import { NeelvaraLink, SiteHeaderNav } from './SiteHeaderNav';
import SpotlightCard, { type SpotlightVariant } from './SpotlightCard';

function serializeJsonLd(data: Record<string, unknown>): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

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
    lastUpdated?: string;
    cards: InfoCard[];
    sections: Array<{
        title: string;
        body: string;
        items?: string[];
    }>;
    closing?: {
        eyebrow: string;
        title: string;
        body: string;
        ctaLabel: string;
        ctaHref: string;
        ctaExternal?: boolean;
    };
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
    { label: 'Contact', href: '/contact' },
];

export const OPERATING_ROWS: InfoCard[] = [
    {
        title: 'Company reference',
        description: 'Business, legal, and privacy questions route to direct Neelvara email addresses.',
        icon: LuBuilding2,
        meta: 'Direct inboxes',
        variant: 'blue',
    },
    {
        title: 'Current products',
        description: NEELVARA_RELATIONSHIP_LINE,
        icon: LuLayers,
        meta: 'Current products',
        variant: 'indigo',
    },
    {
        title: 'Business inbox',
        description: 'Company questions use direct email routing; product support remains on product sites.',
        icon: LuShieldCheck,
        meta: 'Company email',
        variant: 'violet',
    },
];

export const DIRECTORY_ROWS = [
    {
        label: 'Business',
        value: NEELVARA_CONTACT_EMAIL,
        href: `mailto:${NEELVARA_CONTACT_EMAIL}`,
        description: 'General company and product relationship questions.',
        icon: LuMail,
    },
    {
        label: 'Legal',
        value: NEELVARA_LEGAL_EMAIL,
        href: `mailto:${NEELVARA_LEGAL_EMAIL}`,
        description: 'Vendor, entity, and contract verification.',
        icon: LuScale,
    },
    {
        label: 'Privacy',
        value: NEELVARA_PRIVACY_EMAIL,
        href: `mailto:${NEELVARA_PRIVACY_EMAIL}`,
        description: 'Company website privacy questions and policy routing.',
        icon: LuShieldCheck,
    },
] as const;

const PRODUCT_ICON_BY_NAME: Record<typeof NEELVARA_PRODUCT_LINEUP[number]['name'], IconType> = {
    MenuList: LuMenuSquare,
    Answerlattice: LuNetwork,
    CampaignCue: LuLayers,
};

export const PAGE_DATA: Record<PageData['slug'], PageData> = {
    products: {
        slug: 'products',
        title: 'Operated Products',
        description: 'Current operated products and product website routing for Neelvara Systems.',
        eyebrow: 'Operated products',
        cards: NEELVARA_PRODUCT_LINEUP.map((product, index) => ({
            title: product.name,
            description: product.summary,
            icon: PRODUCT_ICON_BY_NAME[product.name],
            href: product.url,
            meta: product.status,
            variant: index === 0 ? 'blue' : index === 1 ? 'indigo' : 'violet',
        })),
        sections: [
            {
                title: 'Product boundary',
                body: 'This company site identifies operated products and routes visitors to the correct product website.',
                items: [
                    'MenuList, Answerlattice, and CampaignCue keep separate websites, policies, support paths, and product commitments.',
                    'Only approved operated products appear on this website.',
                    'Company, legal, and privacy questions route through the Neelvara contact paths.',
                ],
            },
        ],
    },
    about: {
        slug: 'about',
        title: 'About',
        description: 'Neelvara Systems operates infrastructure for customer-facing business information that should stay accurate without constant maintenance.',
        eyebrow: 'Company overview',
        cards: [
            {
                title: 'Business information',
                description: 'The work is centered on public facts, approved answers, and reusable business context.',
                icon: LuFileText,
                meta: 'Customer-facing facts',
                variant: 'blue',
            },
            {
                title: 'Quiet operation',
                description: 'The company favors maintained information sources over noisy dashboards or broad public promises.',
                icon: LuShieldCheck,
                meta: 'Low noise',
                variant: 'indigo',
            },
            {
                title: 'Operational fit',
                description: 'The operating lens is maintenance reduction: fewer repeated updates, clearer public facts, and less support drift.',
                icon: LuBuilding2,
                meta: 'Infrastructure lens',
                variant: 'violet',
            },
        ],
        sections: [
            {
                title: 'Why the company exists',
                body: 'Neelvara Systems exists because unclear public facts, unapproved answers, and scattered business context create avoidable customer friction.',
                items: [
                    'The company site stays calm, narrow, and factual.',
                    'Product details stay on product domains.',
                    'MenuList, Answerlattice, and CampaignCue operate as separate products with separate product surfaces.',
                    'Company copy identifies the operating company behind those products.',
                ],
            },
            {
                title: 'What this company website does not claim',
                body: 'This company site does not present Neelvara Systems as a general back-office software suite.',
                items: [
                    'No POS, payroll, accounting, CRM, delivery, or internal operations platform is claimed on this company website.',
                    'Product websites explain product capabilities instead of stretching the company site.',
                    'Company pages make product operation and contact routes easy to verify.',
                ],
            },
        ],
        closing: {
            eyebrow: 'Company boundary',
            title: 'Products keep their own websites. Neelvara provides the company reference behind them.',
            body: NEELVARA_RELATIONSHIP_LINE,
            ctaLabel: 'View Products',
            ctaHref: '/products',
        },
    },
    contact: {
        slug: 'contact',
        title: 'Contact',
        description: 'Contact Neelvara Systems for company, legal, privacy, partnership, or business inquiries.',
        eyebrow: 'Contact points',
        cards: DIRECTORY_ROWS.map((row) => ({
            title: row.label,
            description: row.value,
            icon: row.icon,
            href: row.href,
            meta: row.description,
            variant: row.label === 'Business' ? 'blue' : row.label === 'Legal' ? 'indigo' : 'violet',
        })),
        sections: [
            {
                title: 'Choose the right contact',
                body: 'Use the email that matches the company inquiry. Product support, onboarding, billing, and account questions should start from the product website.',
                items: [
                    'Use the business email for general company or product relationship questions.',
                    'Use the legal email for vendor, entity, or contract verification.',
                    'Use the privacy email for website privacy or data inquiries.',
                ],
            },
            {
                title: 'Before you contact us',
                body: 'A short, high-level first message is enough. The right inbox can ask for supporting details if needed.',
                items: [
                    'Do not include private records, secrets, customer datasets, or sensitive documents unless requested.',
                    'Mention the relevant product only if the question is about a product relationship or routing issue.',
                    'Country of operation: India.',
                ],
            },
            {
                title: 'Looking for product support?',
                body: 'MenuList, Answerlattice, and CampaignCue keep product-specific support and documentation on their own websites.',
                items: NEELVARA_PRODUCT_LINEUP.map((product) => `${product.name}: ${product.url}`),
            },
        ],
        closing: {
            eyebrow: 'Company contact',
            title: 'Company questions start with email.',
            body: `For company questions about Neelvara Systems, email ${NEELVARA_CONTACT_EMAIL}.`,
            ctaLabel: 'Email Neelvara',
            ctaHref: `mailto:${NEELVARA_CONTACT_EMAIL}`,
            ctaExternal: true,
        },
    },
    legal: {
        slug: 'legal',
        title: 'Legal',
        description: 'Public entity and product relationship information for Neelvara Systems.',
        eyebrow: 'Entity information',
        cards: [
            {
                title: 'Operating trade name',
                description: 'Neelvara Systems',
                icon: LuBuilding2,
                meta: 'Public entity reference',
                variant: 'blue',
            },
            {
                title: 'Product relationship',
                description: NEELVARA_RELATIONSHIP_LINE,
                icon: LuLayers,
                meta: 'Lineup statement',
                variant: 'indigo',
            },
            {
                title: 'Country of operation',
                description: 'India',
                icon: LuGlobe2,
                meta: 'Country',
                variant: 'violet',
            },
        ],
        sections: [
            {
                title: 'Public entity information',
                body: 'This page provides company reference information for Neelvara Systems. It is not a product pricing page, product app, or customer support portal.',
                items: [
                    'Operating trade name: Neelvara Systems.',
                    'Country of operation: India.',
                    `Legal inquiries: ${NEELVARA_LEGAL_EMAIL}.`,
                ],
            },
            {
                title: 'Product policy split',
                body: 'Neelvara Systems keeps company legal information separate from product policies.',
                items: [
                    NEELVARA_RELATIONSHIP_LINE,
                    'Product pricing, onboarding, support, billing, cancellation, refund, and service terms belong on the relevant product website.',
                    'This page does not claim private-limited status, subsidiaries, or a holding-company structure.',
                ],
            },
            {
                title: 'Sensitive identifiers',
                body: 'Sensitive registration or tax identifiers are not published on this public company website unless reviewed and approved for the specific use.',
                items: [
                    'Do not use this page as a substitute for a contract, invoice, or verified legal document.',
                    'Vendor, entity, or contract verification should use the legal email.',
                ],
            },
        ],
        closing: {
            eyebrow: 'Legal contact',
            title: 'Need entity or contract verification?',
            body: 'Use the legal inbox for vendor, entity, or contract questions. Product commitments stay on product-specific terms.',
            ctaLabel: 'Email Legal',
            ctaHref: `mailto:${NEELVARA_LEGAL_EMAIL}`,
            ctaExternal: true,
        },
    },
    privacy: {
        slug: 'privacy',
        title: 'Privacy Policy',
        description: 'This Privacy Policy explains how Neelvara Systems handles information related to this company website.',
        eyebrow: 'Privacy Policy',
        lastUpdated: 'June 26, 2026',
        cards: [
            {
                title: 'Summary',
                description: 'This website is an informational company website with no account system or contact form.',
                icon: LuFileText,
                meta: 'Company website',
                variant: 'blue',
            },
            {
                title: 'Email communication',
                description: 'If you email us, we receive the information you choose to send.',
                icon: LuShieldCheck,
                meta: 'Visitor initiated',
                variant: 'indigo',
            },
            {
                title: 'Privacy questions',
                description: NEELVARA_PRIVACY_EMAIL,
                icon: LuMail,
                meta: 'Email route',
                variant: 'violet',
            },
        ],
        sections: [
            {
                title: 'Summary',
                body: 'Neelvara Systems keeps this company website limited to public information pages.',
                items: [
                    'There is no account system, newsletter signup, or embedded inquiry form on this company website.',
                    'There is no Neelvara-owned analytics or advertising tracking on this company website.',
                    'Product-level privacy details belong on the relevant product site.',
                ],
            },
            {
                title: 'Information we receive',
                body: 'We receive information only when it is involved in ordinary website delivery or when you choose to contact us.',
                items: [
                    'Hosting, CDN, and security layers may process page-request metadata and operational logs.',
                    'If you send email, your email address, message content, attachments, and related mail metadata are handled by the relevant inbox provider.',
                    'Do not send sensitive records unless the legal or privacy inbox asks for them.',
                ],
            },
            {
                title: 'Email communication',
                body: 'Email is the contact method for this company website.',
                items: [
                    'Email messages are handled by the relevant business, legal, or privacy inbox.',
                    'We may keep email records where needed to respond, maintain context, or satisfy legitimate business or legal requirements.',
                    'Product support emails should be sent through the relevant product support route.',
                ],
            },
            {
                title: 'Website infrastructure',
                body: 'This company website is delivered through ordinary hosting, domain, CDN, and security infrastructure.',
                items: [
                    'Those providers may process technical data needed to load pages, protect the site, and maintain service reliability.',
                    'This company website does not include a user account area, checkout, newsletter, or lead form.',
                    'No product data is entered or managed through this company website.',
                ],
            },
            {
                title: 'How information is used',
                body: 'Information related to this website is used for basic operation, security, and responding to messages you send.',
                items: [
                    'We may use email communication to answer company, legal, privacy, partnership, or business-related inquiries.',
                    'We do not use this company website to create product accounts or customer profiles.',
                    'We do not sell personal information collected through this company website.',
                ],
            },
            {
                title: 'Product privacy',
                body: 'This Privacy Policy applies only to the Neelvara Systems company website.',
                items: [
                    'MenuList, Answerlattice, and CampaignCue may maintain separate privacy policies for their product websites and product services.',
                    'Product account, business, support, campaign, billing, or customer interaction data is governed by the relevant product policy.',
                    'Product privacy questions should start from the relevant product website or support path.',
                ],
            },
            {
                title: 'Changes to this policy',
                body: 'If this company website changes in a way that affects privacy, this policy should be updated before the change is launched.',
                items: [
                    'Forms, analytics, newsletters, accounts, downloads, or gated content require privacy review before launch.',
                    'The last updated date shows the current published version of this policy.',
                ],
            },
            {
                title: 'Privacy questions',
                body: `Privacy questions about this company website should be sent to ${NEELVARA_PRIVACY_EMAIL}.`,
                items: [
                    'Use the product website for product-specific privacy questions.',
                    'Use the legal inbox for vendor, entity, or contract verification.',
                ],
            },
        ],
        closing: {
            eyebrow: 'Privacy questions',
            title: 'Questions about this Privacy Policy?',
            body: `Email ${NEELVARA_PRIVACY_EMAIL} for privacy questions about the Neelvara Systems company website.`,
            ctaLabel: 'Email Privacy',
            ctaHref: `mailto:${NEELVARA_PRIVACY_EMAIL}`,
            ctaExternal: true,
        },
    },
    terms: {
        slug: 'terms',
        title: 'Terms of Use',
        description: 'These Terms govern use of the Neelvara Systems company website.',
        eyebrow: 'Terms of Use',
        lastUpdated: 'June 26, 2026',
        cards: [
            {
                title: 'Informational use',
                description: 'This website provides company, product relationship, legal, privacy, and contact information.',
                icon: LuFileText,
                meta: 'Website use',
                variant: 'blue',
            },
            {
                title: 'Product separation',
                description: 'Product usage, billing, refunds, support, and availability are governed by the relevant product terms.',
                icon: LuLayers,
                meta: 'Separated terms',
                variant: 'indigo',
            },
            {
                title: 'Questions',
                description: NEELVARA_LEGAL_EMAIL,
                icon: LuMail,
                meta: 'Legal email',
                variant: 'violet',
            },
        ],
        sections: [
            {
                title: 'Acceptance',
                body: 'By using this website, you agree to these Terms of Use for the Neelvara Systems company website.',
                items: [
                    'If you do not agree with these Terms, do not use this website.',
                    'These Terms apply only to the Neelvara Systems company website.',
                ],
            },
            {
                title: 'Use of this website',
                body: 'This website may be used to read public company information and find official contact routes.',
                items: [
                    'Do not use this website or its content in a way that creates confusion about Neelvara Systems or its products.',
                ],
            },
            {
                title: 'Restrictions',
                body: 'Do not misuse the website, its content, or the names associated with Neelvara Systems.',
                items: [
                    'Do not disrupt, scrape, impersonate, interfere with, or attempt unauthorized access to this website.',
                    'Do not use this website for unlawful, misleading, abusive, or infringing activity.',
                    'Do not imply approval, partnership, or endorsement unless it has been confirmed in writing.',
                ],
            },
            {
                title: 'Product separation',
                body: 'Products operated by Neelvara Systems may maintain separate terms, privacy policies, pricing pages, support paths, and product commitments.',
                items: [
                    'Product usage, billing, refunds, cancellation, onboarding, support, service availability, and account terms belong on the relevant product website.',
                    'Company website copy should not be treated as a product feature commitment.',
                    'Product websites may change independently from this company website.',
                ],
            },
            {
                title: 'Intellectual property',
                body: 'The Neelvara Systems name, product names, logos, page design, and website content are protected by applicable intellectual property rights.',
                items: [
                    'Do not copy, modify, or present this content as your own.',
                    'Do not misuse product names or logos in a way that suggests authorization or endorsement.',
                ],
            },
            {
                title: 'No product commitments',
                body: 'This website is a company information surface. It does not provide checkout, subscriptions, product onboarding, or customer support workflows.',
                items: [
                    'Product commitments must come from the relevant product website, contract, invoice, or approved communication.',
                    'Nothing on this website guarantees product availability, pricing, roadmap, uptime, or support response times.',
                ],
            },
            {
                title: 'Disclaimers and limitation',
                body: 'This website is provided for general company information. Use it at your own discretion.',
                items: [
                    'Information may be updated, removed, or corrected without notice.',
                    'To the maximum extent permitted by applicable law, Neelvara Systems is not liable for indirect or consequential loss from use of this website.',
                ],
            },
            {
                title: 'Governing law and contact',
                body: 'These Terms are intended to be governed by the laws of India unless a specific written agreement states otherwise.',
                items: [
                    `Legal questions should be sent to ${NEELVARA_LEGAL_EMAIL}.`,
                    'Product-specific legal questions should start from the relevant product website or product contact path.',
                ],
            },
        ],
        closing: {
            eyebrow: 'Legal questions',
            title: 'Questions about these Terms?',
            body: `Email ${NEELVARA_LEGAL_EMAIL} for questions about the Neelvara Systems company website terms.`,
            ctaLabel: 'Email Legal',
            ctaHref: `mailto:${NEELVARA_LEGAL_EMAIL}`,
            ctaExternal: true,
        },
    },
};

export const MARQUEE_ITEMS = [
    'Neelvara Systems',
    'MenuList',
    'Answerlattice',
    'CampaignCue',
    'Customer-facing business information',
    'Company email',
    'Privacy inbox',
    'Legal inbox',
];

export const COMPARISON_ROWS: ComparisonRow[] = [
    {
        label: 'Purpose',
        company: 'Company name, current products, and official contact routes.',
        products: 'Product capabilities, pricing, onboarding, policies, and support.',
        apps: 'Signed-in product workflows, account settings, and product data.',
    },
    {
        label: 'Contact',
        company: 'Business, legal, and privacy email addresses.',
        products: 'Product support, help docs, and account guidance.',
        apps: 'Signed-in actions, team operations, and account work.',
    },
    {
        label: 'Data',
        company: 'Static public pages and visitor-initiated email.',
        products: 'Product-specific public policies and support paths.',
        apps: 'Product data governed by each product architecture.',
    },
    {
        label: 'Claims',
        company: 'Narrow, verifiable company statements.',
        products: 'Capability, pricing, and product commitments.',
        apps: 'Operational behavior shown to signed-in users.',
    },
];

export function buildPageMetadata(page: PageData): Metadata {
    return {
        title: page.title,
        description: page.description,
        alternates: {
            canonical: buildNeelvaraUrl(`/${page.slug}`),
        },
        openGraph: {
            title: `${page.title} | Neelvara Systems`,
            description: page.description,
            url: buildNeelvaraUrl(`/${page.slug}`),
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
            title: `${page.title} | Neelvara Systems`,
            description: page.description,
            images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
        },
    };
}

export function NeelvaraLogoMark() {
    return <span className="nv-logo-mark" aria-hidden="true" />;
}

export function SiteHeader() {
    return (
        <header className="nv-header">
            <div className="nv-header-inner glass">
                <NeelvaraLink href="/" className="nv-brand" aria-label="Neelvara Systems home">
                    <NeelvaraLogoMark />
                    <span>Neelvara</span>
                </NeelvaraLink>
                <SiteHeaderNav items={NAV_ITEMS} />
                <div className="nv-header-actions">
                    <a className="nv-button nv-button-ghost" href={`mailto:${NEELVARA_CONTACT_EMAIL}`}>
                        Contact
                    </a>
                    <NeelvaraLink className="nv-button nv-button-glass" href="/products">
                        Products
                        <LuArrowRight aria-hidden="true" />
                    </NeelvaraLink>
                </div>
            </div>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="nv-footer">
            <div className="nv-wrap nv-footer-inner">
                <div className="nv-footer-brandline">
                    <NeelvaraLogoMark />
                    <p>© 2026 Neelvara Systems</p>
                </div>
                <div className="nv-footer-links" aria-label="Footer navigation">
                    <NeelvaraLink href="/products">Products</NeelvaraLink>
                    <NeelvaraLink href="/about">About</NeelvaraLink>
                    <NeelvaraLink href="/legal">Legal</NeelvaraLink>
                    <NeelvaraLink href="/privacy">Privacy</NeelvaraLink>
                    <NeelvaraLink href="/terms">Terms</NeelvaraLink>
                    <NeelvaraLink href="/contact">Contact</NeelvaraLink>
                </div>
            </div>
        </footer>
    );
}

export function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="neelvara-site">
            <div className="nv-page-mesh" aria-hidden="true" />
            <div className="nv-grain" aria-hidden="true" />
            <ScrollRevealController />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
        </div>
    );
}

export function OperatingRows({ rows }: { rows: InfoCard[] }) {
    return (
        <div className="nv-operating-rows">
            {rows.map((row) => {
                const Icon = row.icon;
                const content = (
                    <>
                        <span className="nv-card-icon">
                            <Icon aria-hidden="true" />
                        </span>
                        <span className="nv-card-meta mono">{row.meta || 'Reference'}</span>
                        <h3>{row.title}</h3>
                        <p>{row.description}</p>
                    </>
                );

                if (row.href) {
                    return (
                        <SpotlightCard
                            as="a"
                            className="nv-operating-card"
                            href={row.href}
                            key={row.title}
                            variant={row.variant}
                            aria-label={`Open ${row.title}`}
                        >
                            {content}
                            <LuExternalLink className="nv-card-link-icon" aria-hidden="true" />
                        </SpotlightCard>
                    );
                }

                return (
                    <SpotlightCard className="nv-operating-card" key={row.title} variant={row.variant}>
                        {content}
                    </SpotlightCard>
                );
            })}
        </div>
    );
}

export function StructuredData() {
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${buildNeelvaraUrl('/')}#organization`,
                name: 'Neelvara Systems',
                url: buildNeelvaraUrl('/'),
                logo: buildNeelvaraUrl(NEELVARA_LOGO_PATH),
                email: NEELVARA_CONTACT_EMAIL,
                contactPoint: [
                    {
                        '@type': 'ContactPoint',
                        email: NEELVARA_CONTACT_EMAIL,
                        contactType: 'general inquiries',
                    },
                    {
                        '@type': 'ContactPoint',
                        email: NEELVARA_LEGAL_EMAIL,
                        contactType: 'legal inquiries',
                    },
                    {
                        '@type': 'ContactPoint',
                        email: NEELVARA_PRIVACY_EMAIL,
                        contactType: 'privacy inquiries',
                    },
                ],
                knowsAbout: NEELVARA_PRODUCT_LINEUP.map((product) => product.name),
            },
            {
                '@type': 'WebSite',
                '@id': `${buildNeelvaraUrl('/')}#website`,
                name: 'Neelvara Systems',
                url: buildNeelvaraUrl('/'),
                publisher: {
                    '@id': `${buildNeelvaraUrl('/')}#organization`,
                },
                description: NEELVARA_SITE_DESCRIPTION,
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: serializeJsonLd(graph),
            }}
        />
    );
}

export function HeroStudioMock() {
    const pipelineRows = [
        ['Company', 'reference', '#2384ff'],
        ['Products', 'operated', '#2737c8'],
        ['Policies', 'separate', '#6542e8'],
        ['Contact', 'email', '#1457d9'],
    ] as const;

    return (
        <div className="nv-hero-mock glass nv-reveal">
            <div className="nv-hero-mock-head mono">
                <span className="nv-traffic" aria-hidden="true">
                    <span />
                    <span />
                    <span />
        </span>
                <span>neelvara.com / company website</span>
            </div>
            <div className="nv-hero-mock-grid">
                <div className="nv-mock-tile">
                    <span className="nv-tile-label mono">Reference routing</span>
                    <strong className="serif">Mapped</strong>
                    <p>Company identity, product boundaries, and contact routes stay easy to verify.</p>
                    <div className="nv-spark-bars" aria-hidden="true">
                        {[36, 44, 30, 58, 46, 68, 82, 74].map((height) => (
                            <span style={{ height: `${height}%` }} key={height} />
                        ))}
                    </div>
                </div>
                <div className="nv-mock-tile">
                    <span className="nv-tile-label mono">Company website</span>
                    <div className="nv-pipeline-list">
                        {pipelineRows.map(([label, meta, color]) => (
                            <span className="nv-pipeline-row mono" key={label}>
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
        <div className="nv-marquee-wrap" aria-label="Neelvara reference scope">
            <div className="nv-marquee-track">
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
            <div className="nv-table-wrap glass nv-reveal">
                <table className="nv-comparison-table">
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>
                                <span>Neelvara</span>
                                <em>Company reference</em>
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
            <div className="nv-table-cards">
                {COMPARISON_ROWS.map((row) => (
                    <article className="glass" key={row.label}>
                        <span className="mono">{row.label}</span>
                        <h3>Neelvara</h3>
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

export function SecondaryPage({ page }: { page: PageData }) {
    const closing = page.closing ?? {
        eyebrow: 'Company relationship',
        title: NEELVARA_RELATIONSHIP_LINE,
        body: NEELVARA_SITE_DESCRIPTION,
        ctaLabel: 'View Products',
        ctaHref: '/products',
    };

    return (
        <PageShell>
            <StructuredData />
            <section className="nv-page-hero">
                <div className="nv-wrap nv-page-hero-inner">
                    <span className="nv-eyebrow mono">
                        <span className="nv-pip" aria-hidden="true" />
                        {page.eyebrow}
                    </span>
                    <h1 className="serif">{page.title}</h1>
                    <p>{page.description}</p>
                    <div className="nv-page-hero-meta glass">
                        {page.lastUpdated ? <span className="mono">Last updated: {page.lastUpdated}</span> : null}
                        <span className="mono">company website</span>
                        <span className="mono">{page.slug}</span>
                    </div>
                </div>
            </section>
            <section className="nv-section nv-reveal">
                <div className="nv-wrap">
                    <OperatingRows rows={page.cards} />
                </div>
            </section>
            {page.sections.map((section) => (
                <section className="nv-section nv-section-tight nv-reveal" key={section.title}>
                    <div className="nv-wrap nv-text-panel glass">
                        <div>
                            <span className="nv-eyebrow mono">
                                <span className="nv-pip" aria-hidden="true" />
                                {page.slug === 'privacy' || page.slug === 'terms' ? 'Policy section' : 'Company note'}
                            </span>
                            <h2 className="serif">{section.title}</h2>
                            <p>{section.body}</p>
                        </div>
                        {section.items ? (
                            <ul className="nv-check-list">
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </section>
            ))}
            <section className="nv-section nv-final-section nv-reveal">
                <div className="nv-wrap nv-final-band glass">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            {closing.eyebrow}
                        </span>
                        <h2 className="serif">{closing.title}</h2>
                        <p>{closing.body}</p>
                    </div>
                    <div className="nv-actions">
                        {closing.ctaExternal ? (
                            <a className="nv-button nv-button-solid nv-button-large" href={closing.ctaHref}>
                                {closing.ctaLabel}
                                <LuMail aria-hidden="true" />
                            </a>
                        ) : (
                            <NeelvaraLink className="nv-button nv-button-solid nv-button-large" href={closing.ctaHref}>
                                {closing.ctaLabel}
                                <LuArrowRight aria-hidden="true" />
                            </NeelvaraLink>
                        )}
                    </div>
                </div>
            </section>
        </PageShell>
    );
}

export function DirectoryCards() {
    return (
        <div className="nv-routing-grid">
            {DIRECTORY_ROWS.map((row) => {
                const Icon = row.icon;

                return (
                    <a className="nv-routing-card glass" href={row.href} key={row.label}>
                        <span className="nv-card-icon">
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
