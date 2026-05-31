import CanonicaLink from './CanonicaLink';
import { CANONICA_SUPPORT_FEATURES } from '../productFeatures';
import CanonicaLogoMark from './CanonicaLogoMark';

const FOOTER_LINKS = {
    Product: [
        { label: 'Product', href: '/product' },
        { label: 'Set up support', href: '/product/launch-setup' },
        { label: 'In-app help widget', href: '/product/page-aware-widget' },
        { label: 'Help center + tickets', href: '/product/support-control' },
        { label: 'Review approved answers', href: '/product/knowledge-governance' },
        ...CANONICA_SUPPORT_FEATURES.map((feature) => ({ label: feature.label, href: feature.href })),
        { label: 'Use Cases', href: '/use-cases' },
        { label: 'Demo', href: '/demo' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Start Free Setup', href: '/get-started' },
    ],
    Resources: [
        { label: 'Resources', href: '/resources' },
        { label: 'Pre-Onboarding Kit', href: '/pre-onboarding' },
        { label: 'Pre-Onboarding Guide', href: '/pre-onboarding/guide' },
        { label: 'Widget Install', href: '/install' },
        { label: 'Developer Quickstarts', href: '/quickstarts' },
        { label: 'Integrations', href: '/integrations' },
        { label: 'ROI Calculator', href: '/roi-calculator' },
        { label: 'Proof Pack', href: '/proof' },
        { label: 'AI-built SaaS', href: '/use-cases/ai-built-saas' },
        { label: 'Page-Aware Widget', href: '/page-aware-support-widget' },
        { label: 'Hosted Help Center', href: '/hosted-help-center-for-saas' },
        { label: 'Updates', href: '/updates' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Security', href: '/security' },
        { label: 'Security One-Pager', href: '/security-one-pager' },
    ],
    Company: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms of Service', href: '/terms-of-service' },
    ],
};

export default function CanonicaFooter({ basePath = '' }: { basePath?: string }) {
    return (
        <footer className="border-t border-white/[0.06] bg-[#070714]">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid gap-12 md:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2">
                            <CanonicaLogoMark idPrefix="canonica-footer" height={32} />
                            <span className="text-lg font-semibold text-white">Canonica</span>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-[#6b6b8a]">
                            Support layer for AI-built SaaS apps.
                            Knowledge intake, page-aware help, hosted docs, owner Q&A, and approved answers before fallback.
                        </p>
                    </div>

                {/* Link Columns */}
                    {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                        <div key={title} data-canonica-reveal-item>
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                {title}
                            </h4>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.href}>
                                        <CanonicaLink
                                            basePath={basePath}
                                            href={link.href}
                                            className="text-sm text-[#a0a0c0] transition-colors hover:text-white"
                                        >
                                            {link.label}
                                        </CanonicaLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
                    <p className="text-xs text-[#505070]">
                        &copy; {new Date().getFullYear()} Canonica. All rights reserved.
                    </p>
                    <p className="text-xs text-[#505070]">
                        Support knowledge control plane for SaaS.
                    </p>
                </div>
            </div>
        </footer>
    );
}
