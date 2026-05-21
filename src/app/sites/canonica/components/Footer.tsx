import CanonicaLink from './CanonicaLink';

const FOOTER_LINKS = {
    Product: [
        { label: 'Product', href: '/product' },
        { label: 'Use Cases', href: '/use-cases' },
        { label: 'Demo', href: '/demo' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Start Free', href: '/get-started' },
    ],
    Resources: [
        { label: 'Resources', href: '/resources' },
        { label: 'Widget Install', href: '/install' },
        { label: 'Updates', href: '/updates' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Security', href: '/security' },
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                                <span className="text-sm font-bold text-indigo-400">C</span>
                            </div>
                            <span className="text-lg font-semibold text-white">Canonica</span>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-[#6b6b8a]">
                            Page-aware support knowledge for small SaaS teams.
                            Approved answers before fallback.
                        </p>
                    </div>

                    {/* Link Columns */}
                    {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                        <div key={title}>
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
                        Built by the team behind{' '}
                        <a href="https://menulist.ai" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                            MenuList
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
