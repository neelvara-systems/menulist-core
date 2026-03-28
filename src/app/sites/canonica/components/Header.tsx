'use client';

import { useState } from 'react';
import CanonicaLink from './CanonicaLink';

const NAV_LINKS = [
    { label: 'Product', href: '/product' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
];

export default function CanonicaHeader({ basePath = '' }: { basePath?: string }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const L = (props: { href: string; className?: string; onClick?: () => void; children: React.ReactNode }) => (
        <CanonicaLink basePath={basePath} {...props} />
    );

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a1a]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <L href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                        <span className="text-sm font-bold text-indigo-400">C</span>
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-white">Canonica</span>
                </L>

                <nav className="hidden items-center gap-8 md:flex">
                    {NAV_LINKS.map((link) => (
                        <L key={link.href} href={link.href} className="text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white">
                            {link.label}
                        </L>
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <L href="/contact" className="text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white">Contact</L>
                    <L href="/get-started" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600">
                        Get Early Access
                    </L>
                </div>

                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[#a0a0c0] transition-colors hover:text-white md:hidden"
                    aria-label="Toggle menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {mobileOpen
                            ? <path d="M18 6L6 18M6 6l12 12" />
                            : <path d="M3 12h18M3 6h18M3 18h18" />}
                    </svg>
                </button>
            </div>

            {mobileOpen && (
                <div className="border-t border-white/[0.06] bg-[#0a0a1a] px-6 py-4 md:hidden">
                    <nav className="flex flex-col gap-3">
                        {NAV_LINKS.map((link) => (
                            <L key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-[#a0a0c0] transition-colors hover:bg-white/[0.03] hover:text-white">
                                {link.label}
                            </L>
                        ))}
                        <L href="/get-started" onClick={() => setMobileOpen(false)}
                            className="mt-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-center text-sm font-semibold text-white">
                            Get Early Access
                        </L>
                    </nav>
                </div>
            )}
        </header>
    );
}
