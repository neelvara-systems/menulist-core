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
    LuFileInput,
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
import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';
import AnswerlatticeLogoMark from './AnswerlatticeLogoMark';
import AnswerlatticeLink from './AnswerlatticeLink';
import AnswerlatticeThemeSwitcher from './AnswerlatticeThemeSwitcher';
import useIsMobile from '../../../../hooks/useIsMobile';

const NAV_LINKS = [
    { label: 'Product', href: '/product' },
    { label: 'Use Cases', href: '/use-cases' },
    { label: 'Resources', href: '/resources' },
    { label: 'Pricing', href: '/pricing' },
];

const MOBILE_OTHER_LINKS = [
    ...NAV_LINKS.filter((link) => link.href !== '/product'),
    { label: 'Demo', href: '/demo' },
    { label: 'Pre-Onboarding', href: '/pre-onboarding' },
    { label: 'Install', href: '/install' },
    { label: 'Security', href: '/security' },
    { label: 'Developers', href: '/developers' },
    { label: 'Comparisons', href: '/comparisons' },
    { label: 'Updates', href: '/updates' },
    { label: 'Contact', href: '/contact' },
];

const PRODUCT_AREA_NAV_LABELS: Record<string, string> = {
    '/product/launch-setup': 'Set up support',
    '/product/page-aware-widget': 'In-app support widget',
    '/product/support-control': 'Help center, FAQ and tickets',
    '/product/knowledge-governance': 'Review approved answers',
};

const PRODUCT_FEATURE_NAV_LABELS: Record<string, string> = {
    '/product/team-access': 'Team access',
    '/product/knowledge-intake': 'Import support knowledge',
    '/product/knowledge-base': 'Docs / Knowledge Base',
    '/product/faq-management': 'FAQ',
    '/product/changelog': 'Changelog',
    '/product/tickets': 'Tickets',
    '/product/support-board': 'Support Board',
    '/product/feedback-review': 'Feedback review',
    '/product/workflow-notifications': 'Slack/email notifications',
    '/product/proactive-help': 'Proactive help',
};

const RESOURCE_MENU_LINKS = [
    { label: 'Launch Checklist', href: '/resources/launch-support-checklist', icon: LuRocket },
    { label: 'Pre-Onboarding Package', href: '/resources/pre-onboarding-source-package', icon: LuFileInput },
    { label: 'Safe Page Context', href: '/resources/safe-page-context', icon: LuShieldCheck },
    { label: 'Widget Verification', href: '/resources/widget-install-verification', icon: LuMessageSquare },
    { label: 'Approved Answers', href: '/resources/approved-answers-before-fallback', icon: LuBookOpen },
    { label: 'Hosted Help Setup', href: '/resources/hosted-help-setup', icon: LuHelpCircle },
    { label: 'Runtime Safety', href: '/resources/support-runtime-safety', icon: LuZap },
    { label: 'Updates', href: '/updates', icon: LuBell },
    { label: 'FAQ', href: '/faq', icon: LuHelpCircle },
    { label: 'All Resources', href: '/resources', icon: LuLayoutDashboard },
];

const MOBILE_NAV_ICONS: Record<string, IconType> = {
    '/product': LuLayoutDashboard,
    '/product/launch-setup': LuRocket,
    '/product/page-aware-widget': LuMessageSquare,
    '/product/support-control': LuHelpCircle,
    '/product/knowledge-governance': LuShieldCheck,
    '/product/team-access': LuUsers,
    '/product/knowledge-intake': LuFileInput,
    '/product/knowledge-base': LuBookOpen,
    '/product/faq-management': LuHelpCircle,
    '/product/changelog': LuFileText,
    '/product/tickets': LuTicket,
    '/product/support-board': LuLayoutDashboard,
    '/product/feedback-review': LuMessageSquare,
    '/product/workflow-notifications': LuBell,
    '/product/proactive-help': LuZap,
    '/use-cases': LuMapPin,
    '/demo': LuEye,
    '/install': LuDownload,
    '/pricing': LuCreditCard,
    '/resources': LuBookOpen,
    '/resources/launch-support-checklist': LuRocket,
    '/resources/pre-onboarding-source-package': LuFileInput,
    '/resources/safe-page-context': LuShieldCheck,
    '/resources/widget-install-verification': LuMessageSquare,
    '/resources/approved-answers-before-fallback': LuBookOpen,
    '/resources/hosted-help-setup': LuHelpCircle,
    '/resources/support-runtime-safety': LuZap,
    '/comparisons': LuFileText,
    '/developers': LuFileText,
    '/pre-onboarding': LuFileInput,
    '/updates': LuBell,
    '/contact': LuMail,
    '/get-started': LuRocket,
};

const DRAWER_OPEN_DELAY_MS = 20;
const DRAWER_TRANSITION_MS = 300;

type HeaderLinkProps = Omit<ComponentProps<typeof AnswerlatticeLink>, 'basePath'>;

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

function getProductAreaNavLabel(area: { label: string; href: string }) {
    return PRODUCT_AREA_NAV_LABELS[area.href] || area.label;
}

function getProductFeatureNavLabel(feature: { label: string; href: string }) {
    return PRODUCT_FEATURE_NAV_LABELS[feature.href] || feature.label;
}

export default function AnswerlatticeHeader({ basePath = '' }: { basePath?: string }) {
    const [isDrawerMounted, setIsDrawerMounted] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const openTimerRef = useRef<number | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    const { isMobile, hasMounted } = useIsMobile(1280);
    const shouldShowMobileNavigation = hasMounted && isMobile;

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
        if (!shouldShowMobileNavigation) return;
        clearDrawerTimers();
        setIsDrawerMounted(true);
        openTimerRef.current = window.setTimeout(() => {
            openTimerRef.current = null;
            setIsDrawerVisible(true);
        }, DRAWER_OPEN_DELAY_MS);
    }, [clearDrawerTimers, shouldShowMobileNavigation]);

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
        <AnswerlatticeLink basePath={basePath} {...props} />
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

    useEffect(() => {
        if (!shouldShowMobileNavigation && isDrawerMounted) {
            closeDrawer();
        }
    }, [shouldShowMobileNavigation, isDrawerMounted, closeDrawer]);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[var(--al-header-bg)] backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <L href="/" className="flex items-center gap-2">
                        <AnswerlatticeLogoMark idPrefix="answerlattice-header" height={32} />
                        <span className="text-lg font-semibold tracking-tight text-white">AnswerLattice</span>
                    </L>

                    <nav className="hidden items-center gap-5 xl:flex">
                        <div className="group/product relative flex h-16 items-center">
                            <L
                                href="/product"
                                className="inline-flex h-16 items-center gap-1 text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white focus:outline-none focus-visible:text-white"
                            >
                                Product
                                <LuChevronDown size={14} className="transition group-hover/product:rotate-180 group-focus-within/product:rotate-180" aria-hidden />
                            </L>

                            <div
                                className="
                                    absolute left-1/2 top-full z-[80] w-[min(42rem,calc(100vw-3rem))]
                                    -translate-x-1/2 pt-3
                                    origin-top scale-95 opacity-0
                                    invisible translate-y-2
                                    transition-all duration-200 ease-out
                                    pointer-events-none
                                    group-hover/product:visible
                                    group-hover/product:translate-y-0
                                    group-hover/product:scale-100
                                    group-hover/product:opacity-100
                                    group-hover/product:pointer-events-auto
                                    group-focus-within/product:visible
                                    group-focus-within/product:translate-y-0
                                    group-focus-within/product:scale-100
                                    group-focus-within/product:opacity-100
                                    group-focus-within/product:pointer-events-auto
                                    motion-safe:transition-all
                                "
                            >
                                <div className="rounded-2xl border border-white/[0.08] bg-[#09091a] p-3 shadow-2xl shadow-black/50">
                                    <L
                                        href="/product"
                                        className="group/menu-item mb-3 flex min-h-12 items-center gap-3 rounded-xl border border-teal-200/10 bg-gradient-to-r from-teal-300/[0.08] to-teal-500/[0.04] px-3 py-2.5 transition hover:border-teal-200/20 hover:bg-white/[0.05]"
                                    >
                                        <MegaMenuIcon icon={LuLayoutDashboard} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-white">Product overview</span>
                                        </span>
                                        <LuArrowRight size={16} className="shrink-0 text-teal-200/70 transition-transform group-hover/menu-item:translate-x-0.5 group-hover/menu-item:text-white" aria-hidden />
                                    </L>

                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-2.5">
                                        <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                            Support areas
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {ANSWERLATTICE_PRODUCT_AREAS.map((area) => {
                                                const Icon = getMobileNavIcon(area.href);
                                                const label = getProductAreaNavLabel(area);
                                                return (
                                                    <L
                                                        key={area.href}
                                                        href={area.href}
                                                        title={label}
                                                        className="group/menu-item flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-teal-400/[0.055]"
                                                    >
                                                        <MegaMenuIcon icon={Icon} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-semibold text-[#eeeeff]">
                                                                {label}
                                                            </span>
                                                        </span>
                                                    </L>
                                                );
                                            })}
                                        </div>
                                        <div className="mb-2 mt-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                            Support tools
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => {
                                                const Icon = getMobileNavIcon(feature.href);
                                                const label = getProductFeatureNavLabel(feature);
                                                return (
                                                    <L
                                                        key={feature.href}
                                                        href={feature.href}
                                                        title={label}
                                                        className="group/menu-item flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-teal-400/[0.055]"
                                                    >
                                                        <MegaMenuIcon icon={Icon} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-semibold text-[#eeeeff]">
                                                                {label}
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
                        {NAV_LINKS.filter((link) => link.href !== '/product').map((link) => {
                            if (link.href !== '/resources') {
                                return (
                                    <L key={link.href} href={link.href} className="text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white">
                                        {link.label}
                                    </L>
                                );
                            }

                            return (
                                <div key={link.href} className="group/resources relative flex h-16 items-center">
                                    <L
                                        href="/resources"
                                        className="inline-flex h-16 items-center gap-1 text-sm font-medium text-[#a0a0c0] transition-colors hover:text-white focus:outline-none focus-visible:text-white"
                                    >
                                        Resources
                                        <LuChevronDown size={14} className="transition group-hover/resources:rotate-180 group-focus-within/resources:rotate-180" aria-hidden />
                                    </L>

                                    <div
                                        className="
                                            absolute left-1/2 top-full z-[80] w-[min(42rem,calc(100vw-3rem))]
                                            -translate-x-1/2 pt-3
                                            origin-top scale-95 opacity-0
                                            invisible translate-y-2
                                            transition-all duration-200 ease-out
                                            pointer-events-none
                                            group-hover/resources:visible
                                            group-hover/resources:translate-y-0
                                            group-hover/resources:scale-100
                                            group-hover/resources:opacity-100
                                            group-hover/resources:pointer-events-auto
                                            group-focus-within/resources:visible
                                            group-focus-within/resources:translate-y-0
                                            group-focus-within/resources:scale-100
                                            group-focus-within/resources:opacity-100
                                            group-focus-within/resources:pointer-events-auto
                                            motion-safe:transition-all
                                        "
                                    >
                                        <div className="rounded-2xl border border-white/[0.08] bg-[#09091a] p-3 shadow-2xl shadow-black/50">
                                            <L
                                                href="/resources"
                                                className="group/menu-item mb-3 flex min-h-12 items-center gap-3 rounded-xl border border-teal-200/10 bg-gradient-to-r from-teal-300/[0.08] to-teal-500/[0.04] px-3 py-2.5 transition hover:border-teal-200/20 hover:bg-white/[0.05]"
                                            >
                                                <MegaMenuIcon icon={LuLayoutDashboard} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-white">Resources overview</span>
                                                </span>
                                                <LuArrowRight size={16} className="shrink-0 text-teal-200/70 transition-transform group-hover/menu-item:translate-x-0.5 group-hover/menu-item:text-white" aria-hidden />
                                            </L>
                                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-2.5">
                                                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                                    Resource guides
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {RESOURCE_MENU_LINKS.filter((resourceLink) => resourceLink.href !== '/resources').map((resourceLink) => (
                                                        <L
                                                            key={resourceLink.href}
                                                            href={resourceLink.href}
                                                            className="group/menu-item flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-teal-400/[0.055]"
                                                        >
                                                            <MegaMenuIcon icon={resourceLink.icon} />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-xs font-semibold text-[#eeeeff]">{resourceLink.label}</span>
                                                            </span>
                                                        </L>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    <div className="hidden items-center gap-3 xl:flex">
                        <L
                            href="/get-started"
                            data-answerlattice-event="header_cta_clicked"
                            data-answerlattice-label="start_support_setup"
                            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                        >
                            Start support setup
                        </L>
                    </div>

                    {shouldShowMobileNavigation ? (
                        <button
                            aria-expanded={isDrawerVisible}
                            aria-label="Open navigation"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[#a0a0c0] transition-colors hover:text-white xl:hidden"
                            onClick={openDrawer}
                            onTouchStart={openDrawer}
                            type="button"
                        >
                            <LuMenu size={22} aria-hidden />
                        </button>
                    ) : null}
                </div>
            </header>

            {isDrawerMounted && shouldShowMobileNavigation && (
                <>
                    <div
                        aria-hidden="true"
                        className={`al-mobile-drawer-backdrop fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm ${isDrawerVisible ? 'al-mobile-drawer-backdrop--open' : ''}`}
                        onClick={closeDrawer}
                    />
                    <aside
                        aria-label="AnswerLattice navigation"
                        aria-modal="true"
                        className={`al-mobile-drawer fixed bottom-0 right-0 top-0 z-[100] flex w-[min(360px,88vw)] flex-col border-l border-white/[0.08] bg-[var(--al-bg)] shadow-2xl shadow-black/60 ${isDrawerVisible ? 'al-mobile-drawer--open' : ''}`}
                        role="dialog"
                    >
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5 pt-[env(safe-area-inset-top)]">
                            <L href="/" className="flex items-center gap-2" onClick={closeDrawer}>
                                <AnswerlatticeLogoMark idPrefix="answerlattice-drawer" height={30} />
                                <span className="text-lg font-semibold tracking-tight text-white">AnswerLattice</span>
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
                                        Support areas
                                    </div>
                                    {ANSWERLATTICE_PRODUCT_AREAS.map((area) => {
                                        const Icon = getMobileNavIcon(area.href);
                                        return (
                                            <L
                                                key={area.href}
                                                href={area.href}
                                                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                                onClick={closeDrawer}
                                            >
                                                <MobileNavIcon icon={Icon} />
                                                <span>{getProductAreaNavLabel(area)}</span>
                                            </L>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                                    <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                        Support tools
                                    </div>
                                    {ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => {
                                        const Icon = getMobileNavIcon(feature.href);
                                        return (
                                            <L
                                                key={feature.href}
                                                href={feature.href}
                                                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#d6d6ef] transition-colors hover:bg-white/[0.04] hover:text-white"
                                                onClick={closeDrawer}
                                            >
                                                <MobileNavIcon icon={Icon} />
                                                <span>{getProductFeatureNavLabel(feature)}</span>
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

                        <div className="shrink-0 border-t border-white/[0.06] bg-[var(--al-bg)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                            <div className="mb-3 flex justify-center">
                                <AnswerlatticeThemeSwitcher />
                            </div>
                            <L
                                href="/get-started"
                                data-answerlattice-event="mobile_header_cta_clicked"
                                data-answerlattice-label="start_support_setup"
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                                onClick={closeDrawer}
                            >
                                <LuRocket size={16} aria-hidden />
                                Start support setup
                            </L>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}
