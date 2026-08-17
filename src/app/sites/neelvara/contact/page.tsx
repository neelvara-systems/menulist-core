import type { Metadata } from 'next';
import { LuExternalLink } from 'react-icons/lu';
import {
    NEELVARA_OG_IMAGE_PATH,
    NEELVARA_PUBLIC_BRAND,
    NEELVARA_PRODUCT_LINEUP,
    buildNeelvaraUrl,
} from '../siteConfig';
import { DirectoryCards, PageShell, StructuredData } from '../content';

export const metadata: Metadata = {
    title: 'Contact',
    description: 'Company, legal, privacy, partnership, and business inquiry routes for Neelvara Systems.',
    alternates: { canonical: buildNeelvaraUrl('/contact') },
    openGraph: {
        title: 'Contact | Neelvara Systems',
        description: 'Company, legal, privacy, partnership, and business inquiry routes for Neelvara Systems.',
        url: buildNeelvaraUrl('/contact'),
        siteName: NEELVARA_PUBLIC_BRAND,
        type: 'website',
        images: [
            {
                url: buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH),
                width: 1200,
                height: 630,
                alt: 'Neelvara Systems, Neelvara, MenuList and Answerlattice',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Contact | Neelvara Systems',
        description: 'Company, legal, privacy, partnership, and business inquiry routes for Neelvara Systems.',
        images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
    },
};

export default function NeelvaraContactPage() {
    return (
        <PageShell>
            <StructuredData />
            <section className="nv-page-hero">
                <div className="nv-wrap nv-page-hero-inner">
                    <div className="nv-page-hero-copy nv-reveal">
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Contact Neelvara Systems
                        </span>
                        <h1 className="serif">Start with the right contact route.</h1>
                        <p>
                            Choose a Neelvara inbox for company, legal, privacy,
                            partnership, or business questions.
                        </p>
                    </div>
                </div>
            </section>

            <section className="nv-section nv-reveal">
                <div className="nv-wrap nv-section-head">
                    <div>
                        <span className="nv-eyebrow mono">
                            <span className="nv-pip" aria-hidden="true" />
                            Company inboxes
                        </span>
                        <h2 className="serif">Use the email that best matches the inquiry.</h2>
                    </div>
                    <p>
                        A short, high-level first message is enough. The right inbox can ask for
                        supporting details if needed.
                    </p>
                </div>
                <div className="nv-wrap">
                    <DirectoryCards />
                </div>
            </section>

            <section className="nv-section nv-section-tight nv-reveal">
                <div className="nv-wrap nv-text-panel nv-contact-note">
                    <div>
                        <h2 className="serif">Looking for product support?</h2>
                        <p>
                            MenuList and Answerlattice keep product-specific
                            support, documentation, onboarding, billing, and account questions on
                            their own websites.
                        </p>
                    </div>
                    <div className="nv-support-product-grid">
                        {NEELVARA_PRODUCT_LINEUP.map((product) => (
                            <a className="nv-support-product-link" href={product.url} key={product.name}>
                                <span className="mono">{product.status}</span>
                                <strong>{product.name}</strong>
                                <LuExternalLink aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="nv-section nv-section-tight nv-reveal">
                <div className="nv-wrap nv-text-panel nv-contact-note">
                    <div>
                        <h2 className="serif">Keep the first message focused.</h2>
                        <p>
                            Do not include private records, secrets, customer datasets, or
                            sensitive documents unless the legal or privacy inbox asks for them.
                        </p>
                    </div>
                    <ul className="nv-check-list">
                        <li>Use the business email for general company, partnership, or product relationship questions.</li>
                        <li>Use the legal email for vendor, entity, or contract verification.</li>
                        <li>Use the privacy email for company website privacy questions.</li>
                        <li>Country of operation: India.</li>
                    </ul>
                </div>
            </section>

        </PageShell>
    );
}
