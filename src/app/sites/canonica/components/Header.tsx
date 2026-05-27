'use client';

import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuMenu, LuX } from 'react-icons/lu';
import { CANONICA_PRODUCT_AREAS } from '../productAreas';
import { CANONICA_SUPPORT_FEATURES } from '../productFeatures';
import CanonicaLogoMark from './CanonicaLogoMark';
import CanonicaLink from './CanonicaLink';

const NAV_LINKS = [
    { label: 'Product', href: '/product' },
    { label: 'Use Cases', href: '/use-cases' },
    { label: 'Demo', href: '/demo' },
    { label: 'Install', href: '/install' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Resources', href: '/resources' },
    { label: 'Updates', href: '/updates' },
];

const MOBILE_OTHER_LINKS = [
    ...NAV_LINKS.filter((link) => link.href !== '/product'),
    { label: 'Contact', href: '/contact' },
];

type HeaderLinkProps = Omit<ComponentProps<typeof CanonicaLink>, 'basePath'>;

export default function CanonicaHeader({ basePath = '' }: { basePath?: string }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const openDrawer = () => setIsDrawerOpen(true);
    const closeDrawer = () => setIsDrawerOpen(false);
    const L = (props: HeaderLinkProps) => (
        <CanonicaLink basePath={basePath} {...props} />
    );

    useEffect(() => {
        document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    useEffect(() => {
        if (!isDrawerOpen) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDrawer();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawerOpen]);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a1a]/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <L href="/" className="flex items-center gap-2">
                        <CanonicaLogoMark idPrefix="canonica-header" height={32} />
                        <span className="text-lg font-semibold tracking-tight text-white">Canonica</span>
                    </L>

                    <nav className="hidden items-center gap-5 lg:gap-6 md:flex">
                        <div className="group/product relative flex h-16 items-center">
                            <L
                                href="/product"
                                className="inline-flex h-16 items-center gap-1 text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white focus:outline-none focus-visible:text-white"
                            >
                                Product
                                <LuChevronDown size={14} className="transition group-hover/product:rotate-180 group-focus-within/product:rotate-180" aria-hidden />
                            </L>

                            <div className="absolute left-1/2 top-full z-[80] hidden w-[40rem] -translate-x-1/2 pt-3 group-hover/product:block group-focus-within/product:block">
                                <div className="rounded-2xl border border-white/[0.08] bg-[#09091a] p-3 shadow-2xl shadow-black/50">
                                    <L
                                        href="/product"
                                        className="mb-2 block rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
                                    >
                                        <div className="text-sm font-semibold text-white">Product overview</div>
                                        <p className="mt-1 text-xs leading-relaxed text-[#8f8faa]">
                                            The full support layer: setup, team access, widget, hosted help, ticket fallback, and answer review.
                                        </p>
                                    </L>
                                    <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div>
                                            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                                Product areas
                                            </div>
                                            <div className="grid gap-2">
                                                {CANONICA_PRODUCT_AREAS.map((area) => (
                                                    <L
                                                        key={area.href}
                                                        href={area.href}
                                                        className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-teal-300/25 hover:bg-teal-500/[0.06]"
                                                    >
                                                        <div className="text-xs font-semibold text-[#d6d6ef]">{area.label}</div>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-[#808099]">{area.description}</p>
                                                    </L>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                                Product features
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {CANONICA_SUPPORT_FEATURES.map((feature) => (
                                                    <L
                                                        key={feature.href}
                                                        href={feature.href}
                                                        className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-sky-300/25 hover:bg-sky-400/[0.055]"
                                                    >
                                                        <div className="text-xs font-semibold text-[#d6d6ef]">{feature.label}</div>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-[#808099]">{feature.heroBullets[0]}</p>
                                                    </L>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {NAV_LINKS.filter((link) => link.href !== '/product').map((link) => (
                            <L key={link.href} href={link.href} className="text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white">
                                {link.label}
                            </L>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                        <L href="/contact" className="text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white">Contact</L>
                        <L
                            href="/get-started"
                            data-canonica-event="header_cta_clicked"
                            data-canonica-label="start_setup"
                            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                        >
                            Start free setup
                        </L>
                    </div>

                    <button
                        aria-expanded={isDrawerOpen}
                        aria-label="Open navigation"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#a0a0c0] transition-colors hover:text-white md:hidden"
                        onClick={openDrawer}
                        onTouchStart={openDrawer}
                        type="button"
                    >
                        <LuMenu size={22} aria-hidden />
                    </button>
                </div>
            </header>

            {isDrawerOpen && (
                <>
                    <div
                        aria-hidden="true"
                        className="cn-mobile-drawer-backdrop cn-mobile-drawer-backdrop--open fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm md:hidden"
                        onClick={closeDrawer}
                    />
                    <aside
                        aria-label="Canonica navigation"
                        aria-modal="true"
                        className="cn-mobile-drawer cn-mobile-drawer--open fixed bottom-0 right-0 top-0 z-[100] flex w-[min(360px,88vw)] flex-col border-l border-white/[0.08] bg-[#0a0a1a] shadow-2xl shadow-black/60 md:hidden"
                        role="dialog"
                    >
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5 pt-[env(safe-area-inset-top)]">
                            <L href="/" className="flex items-center gap-2" onClick={closeDrawer}>
                                <CanonicaLogoMark idPrefix="canonica-drawer" height={30} />
                                <span className="text-lg font-semibold tracking-tight text-white">Canonica</span>
                            </L>
                            <button
                                aria-label="Close navigation"
                                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#a0a0c0] transition-colors hover:bg-white/[0.04] hover:text-white"
                                onClick={closeDrawer}
                                type="button"
                            >
                                <LuX size={22} aria-hidden />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto px-5 py-4">
                            <div className="flex flex-col gap-3">
                                <L
                                    href="/product"
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[#f4f4ff] transition-colors hover:border-teal-300/25 hover:bg-teal-500/[0.06]"
                                    onClick={closeDrawer}
                                >
                                    Product overview
                                </L>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Product areas
                                    </div>
                                    {CANONICA_PRODUCT_AREAS.map((area) => (
                                        <L
                                            key={area.href}
                                            href={area.href}
                                            className="rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                            onClick={closeDrawer}
                                        >
                                            {area.label}
                                        </L>
                                    ))}
                                </div>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Product features
                                    </div>
                                    {CANONICA_SUPPORT_FEATURES.map((feature) => (
                                        <L
                                            key={feature.href}
                                            href={feature.href}
                                            className="rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                            onClick={closeDrawer}
                                        >
                                            {feature.label}
                                        </L>
                                    ))}
                                </div>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Other
                                    </div>
                                    {MOBILE_OTHER_LINKS.map((link) => (
                                        <L
                                            key={link.href}
                                            href={link.href}
                                            className="rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                            onClick={closeDrawer}
                                        >
                                            {link.label}
                                        </L>
                                    ))}
                                </div>
                            </div>
                        </nav>

                        <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0a1a] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                            <L
                                href="/get-started"
                                data-canonica-event="mobile_header_cta_clicked"
                                data-canonica-label="start_setup"
                                className="flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                                onClick={closeDrawer}
                            >
                                Start free setup
                            </L>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}
