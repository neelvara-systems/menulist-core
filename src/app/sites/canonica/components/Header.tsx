'use client';

import type { IconType } from 'react-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LuBell,
    LuBookOpen,
    LuArrowRight,
    LuChevronDown,
    LuCreditCard,
    LuDownload,
    LuEye,
    LuFileText,
    LuHelpCircle,
    LuLayoutDashboard,
    LuMail,
    LuMapPin,
    LuMenu,
    LuMessageSquare,
    LuRocket,
    LuShieldCheck,
    LuTicket,
    LuUsers,
    LuX,
    LuZap,
} from 'react-icons/lu';
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

const MOBILE_NAV_ICONS: Record<string, IconType> = {
    '/product': LuLayoutDashboard,
    '/product/launch-setup': LuRocket,
    '/product/page-aware-widget': LuMessageSquare,
    '/product/support-control': LuHelpCircle,
    '/product/knowledge-governance': LuShieldCheck,
    '/product/team-access': LuUsers,
    '/product/knowledge-base': LuBookOpen,
    '/product/faq-management': LuHelpCircle,
    '/product/changelog': LuFileText,
    '/product/tickets': LuTicket,
    '/product/support-board': LuLayoutDashboard,
    '/product/workflow-notifications': LuBell,
    '/product/proactive-help': LuZap,
    '/use-cases': LuMapPin,
    '/demo': LuEye,
    '/install': LuDownload,
    '/pricing': LuCreditCard,
    '/resources': LuBookOpen,
    '/updates': LuBell,
    '/contact': LuMail,
    '/get-started': LuRocket,
};

const DRAWER_OPEN_DELAY_MS = 20;
const DRAWER_TRANSITION_MS = 300;

type HeaderLinkProps = Omit<ComponentProps<typeof CanonicaLink>, 'basePath'>;

function MobileNavIcon({ icon: Icon }: { icon: IconType }) {
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.035] text-teal-200">
            <Icon size={16} aria-hidden />
        </span>
    );
}

function MegaMenuIcon({ icon: Icon }: { icon: IconType }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/10 bg-teal-300/[0.07] text-teal-200 transition-colors group-hover/menu-item:border-teal-200/20 group-hover/menu-item:bg-teal-300/[0.12] group-hover/menu-item:text-white">
            <Icon size={17} aria-hidden />
        </span>
    );
}

function getMobileNavIcon(href: string) {
    return MOBILE_NAV_ICONS[href] || LuFileText;
}

export default function CanonicaHeader({ basePath = '' }: { basePath?: string }) {
    const [isDrawerMounted, setIsDrawerMounted] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const openTimerRef = useRef<number | null>(null);
    const closeTimerRef = useRef<number | null>(null);

    const clearDrawerTimers = useCallback(() => {
        if (openTimerRef.current !== null) {
            window.clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const openDrawer = useCallback(() => {
        clearDrawerTimers();
        setIsDrawerMounted(true);
        openTimerRef.current = window.setTimeout(() => {
            openTimerRef.current = null;
            setIsDrawerVisible(true);
        }, DRAWER_OPEN_DELAY_MS);
    }, [clearDrawerTimers]);

    const closeDrawer = useCallback(() => {
        if (!isDrawerMounted) return;
        if (openTimerRef.current !== null) {
            window.clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }
        setIsDrawerVisible(false);
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null;
            setIsDrawerMounted(false);
        }, DRAWER_TRANSITION_MS);
    }, [isDrawerMounted]);
    const L = (props: HeaderLinkProps) => (
        <CanonicaLink basePath={basePath} {...props} />
    );

    useEffect(() => {
        document.body.style.overflow = isDrawerMounted ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerMounted]);

    useEffect(() => {
        return () => clearDrawerTimers();
    }, [clearDrawerTimers]);

    useEffect(() => {
        if (!isDrawerMounted) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDrawer();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawerMounted, closeDrawer]);

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

                            <div className="absolute left-1/2 top-full z-[80] hidden w-[44rem] -translate-x-1/2 pt-3 group-hover/product:block group-focus-within/product:block">
                                <div className="rounded-2xl border border-white/[0.08] bg-[#09091a] p-3 shadow-2xl shadow-black/50">
                                    <L
                                        href="/product"
                                        className="group/menu-item mb-3 flex items-center gap-3 rounded-xl border border-teal-200/10 bg-gradient-to-r from-teal-300/[0.08] to-sky-400/[0.04] p-3 transition hover:border-teal-200/20 hover:bg-white/[0.05]"
                                    >
                                        <MegaMenuIcon icon={LuLayoutDashboard} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-white">Product overview</span>
                                            <span className="mt-0.5 block text-xs leading-relaxed text-[#9a9ab8]">
                                                Setup, widget, hosted help, tickets, team access, and answer review.
                                            </span>
                                        </span>
                                        <LuArrowRight size={16} className="shrink-0 text-teal-200/70 transition-transform group-hover/menu-item:translate-x-0.5 group-hover/menu-item:text-white" aria-hidden />
                                    </L>
                                    <div className="grid gap-3 lg:grid-cols-[1fr_1.05fr]">
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-2.5">
                                            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                                Product areas
                                            </div>
                                            <div className="grid gap-2">
                                                {CANONICA_PRODUCT_AREAS.map((area) => {
                                                    const Icon = getMobileNavIcon(area.href);
                                                    return (
                                                        <L
                                                            key={area.href}
                                                            href={area.href}
                                                            className="group/menu-item flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-teal-500/[0.06]"
                                                        >
                                                            <MegaMenuIcon icon={Icon} />
                                                            <span className="min-w-0">
                                                                <span className="block text-xs font-semibold text-[#eeeeff]">{area.label}</span>
                                                                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-[#8585a3]">
                                                                    {area.description}
                                                                </span>
                                                            </span>
                                                        </L>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-2.5">
                                            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                                Product features
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {CANONICA_SUPPORT_FEATURES.map((feature) => {
                                                    const Icon = getMobileNavIcon(feature.href);
                                                    return (
                                                        <L
                                                            key={feature.href}
                                                            href={feature.href}
                                                            className="group/menu-item flex min-h-[4.25rem] items-start gap-2.5 rounded-xl p-2.5 transition hover:bg-sky-400/[0.055]"
                                                        >
                                                            <MegaMenuIcon icon={Icon} />
                                                            <span className="min-w-0">
                                                                <span className="block text-xs font-semibold text-[#eeeeff]">{feature.label}</span>
                                                                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-[#8585a3]">
                                                                    {feature.heroBullets[0]}
                                                                </span>
                                                            </span>
                                                        </L>
                                                    );
                                                })}
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
                        aria-expanded={isDrawerVisible}
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

            {isDrawerMounted && (
                <>
                    <div
                        aria-hidden="true"
                        className={`cn-mobile-drawer-backdrop fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm md:hidden ${isDrawerVisible ? 'cn-mobile-drawer-backdrop--open' : ''}`}
                        onClick={closeDrawer}
                    />
                    <aside
                        aria-label="Canonica navigation"
                        aria-modal="true"
                        className={`cn-mobile-drawer fixed bottom-0 right-0 top-0 z-[100] flex w-[min(360px,88vw)] flex-col border-l border-white/[0.08] bg-[#0a0a1a] shadow-2xl shadow-black/60 md:hidden ${isDrawerVisible ? 'cn-mobile-drawer--open' : ''}`}
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
                                    className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[#f4f4ff] transition-colors hover:border-teal-300/25 hover:bg-teal-500/[0.06]"
                                    onClick={closeDrawer}
                                >
                                    <MobileNavIcon icon={getMobileNavIcon('/product')} />
                                    <span>Product overview</span>
                                </L>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Product areas
                                    </div>
                                    {CANONICA_PRODUCT_AREAS.map((area) => {
                                        const Icon = getMobileNavIcon(area.href);
                                        return (
                                            <L
                                                key={area.href}
                                                href={area.href}
                                                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                                onClick={closeDrawer}
                                            >
                                                <MobileNavIcon icon={Icon} />
                                                <span>{area.label}</span>
                                            </L>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Product features
                                    </div>
                                    {CANONICA_SUPPORT_FEATURES.map((feature) => {
                                        const Icon = getMobileNavIcon(feature.href);
                                        return (
                                            <L
                                                key={feature.href}
                                                href={feature.href}
                                                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                                onClick={closeDrawer}
                                            >
                                                <MobileNavIcon icon={Icon} />
                                                <span>{feature.label}</span>
                                            </L>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Other
                                    </div>
                                    {MOBILE_OTHER_LINKS.map((link) => {
                                        const Icon = getMobileNavIcon(link.href);
                                        return (
                                            <L
                                                key={link.href}
                                                href={link.href}
                                                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                                onClick={closeDrawer}
                                            >
                                                <MobileNavIcon icon={Icon} />
                                                <span>{link.label}</span>
                                            </L>
                                        );
                                    })}
                                </div>
                            </div>
                        </nav>

                        <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0a1a] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                            <L
                                href="/get-started"
                                data-canonica-event="mobile_header_cta_clicked"
                                data-canonica-label="start_setup"
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                                onClick={closeDrawer}
                            >
                                <LuRocket size={16} aria-hidden />
                                Start free setup
                            </L>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}
