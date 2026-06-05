import AnswerlatticeLink from './AnswerlatticeLink';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';
import AnswerlatticeLogoMark from './AnswerlatticeLogoMark';
import AnswerlatticeThemeSwitcher from './AnswerlatticeThemeSwitcher';
import {
    LuGithub,
    LuInstagram,
    LuLinkedin,
    LuTwitter,
    LuYoutube,
} from 'react-icons/lu';

const FOOTER_LINKS = {
    Product: [
        { label: 'Product', href: '/product' },
        { label: 'Set up support', href: '/product/launch-setup' },
        { label: 'In-app help widget', href: '/product/page-aware-widget' },
        { label: 'Help center and tickets', href: '/product/support-control' },
        { label: 'Review approved answers', href: '/product/knowledge-governance' },
        ...ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => ({ label: feature.label, href: feature.href })),
        { label: 'Use Cases', href: '/use-cases' },
        { label: 'Demo', href: '/demo' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Start support setup', href: '/get-started' },
    ],
    Resources: [
        { label: 'Resources', href: '/resources' },
        { label: 'Pre-Onboarding Kit', href: '/pre-onboarding' },
        { label: 'Pre-Onboarding Guide', href: '/pre-onboarding/guide' },
        { label: 'Widget Install', href: '/install' },
        { label: 'Developer Docs', href: '/developers' },
        { label: 'Developer Quickstarts', href: '/quickstarts' },
        { label: 'Comparisons', href: '/comparisons' },
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

const SOCIAL_LINKS = [
    { label: 'LinkedIn', href: 'https://example.com/answerlattice-linkedin', icon: LuLinkedin },
    { label: 'X', href: 'https://example.com/answerlattice-x', icon: LuTwitter },
    { label: 'Instagram', href: 'https://example.com/answerlattice-instagram', icon: LuInstagram },
    { label: 'YouTube', href: 'https://example.com/answerlattice-youtube', icon: LuYoutube },
    { label: 'GitHub', href: 'https://example.com/answerlattice-github', icon: LuGithub },
];

export default function AnswerlatticeFooter({ basePath = '' }: { basePath?: string }) {
    return (
        <footer className="border-t border-white/[0.06] bg-[var(--al-footer-bg)]">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid gap-12 md:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2">
                            <AnswerlatticeLogoMark idPrefix="answerlattice-footer" height={32} />
                            <span className="text-lg font-semibold text-white">AnswerLattice</span>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-[#6b6b8a]">
                            Support layer for SaaS and digital products.
                            Knowledge intake, page-aware help, hosted docs, owner Q&A, and approved answers before fallback.
                        </p>
                        <div className="mt-5 flex items-center gap-2" aria-label="AnswerLattice social links">
                            {SOCIAL_LINKS.map((social) => {
                                const Icon = social.icon;

                                return (
                                    <a
                                        key={social.label}
                                        aria-label={social.label}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-[#a0a0c0] transition hover:border-teal-300/25 hover:bg-teal-500/[0.08] hover:text-white"
                                        href={social.href}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        <Icon size={17} aria-hidden />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                {/* Link Columns */}
                    {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                        <div key={title} data-answerlattice-reveal-item>
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                {title}
                            </h4>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.href}>
                                        <AnswerlatticeLink
                                            basePath={basePath}
                                            href={link.href}
                                            className="text-sm text-[#a0a0c0] transition-colors hover:text-white"
                                        >
                                            {link.label}
                                        </AnswerlatticeLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-12 border-t border-white/[0.06] pt-8">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <p className="text-xs text-[#505070]">
                            &copy; {new Date().getFullYear()} AnswerLattice. All rights reserved.
                        </p>
                        <p className="text-xs text-[#505070]">
                            Governed answer infrastructure for SaaS and digital-product support.
                        </p>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <AnswerlatticeThemeSwitcher />
                    </div>
                </div>
            </div>
        </footer>
    );
}
