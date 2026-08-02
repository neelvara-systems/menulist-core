"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
    LuArrowRight,
    LuBadgeCheck,
    LuFileDown,
    LuLayers,
    LuLayoutDashboard,
    LuMegaphone,
    LuMenu,
    LuMessageSquare,
    LuPalette,
    LuRadar,
    LuRefreshCcw,
    LuShieldCheck,
    LuStore,
    LuVideo,
    LuX,
} from "react-icons/lu";
import { CAMPAIGNCUE_WEBSITE_FEATURE_PATHS } from "@constant/campaigncue/websiteFeatures";
import { CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS } from "@constant/campaigncue/websiteUseCases";

type DrawerLink = {
    label: string;
    detail: string;
    href: string;
    icon: IconType;
};

const PRODUCT_LINKS: DrawerLink[] = [
    {
        label: "Daily Campaign Desk",
        detail: "One cue from current facts.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk,
        icon: LuRadar,
    },
    {
        label: "Campaign Pack Studio",
        detail: "WhatsApp, Google, creative, print.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio,
        icon: LuMessageSquare,
    },
    {
        label: "Creative Studio",
        detail: "Finish checked campaign assets.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio,
        icon: LuPalette,
    },
    {
        label: "CueLayers",
        detail: "Reuse images with safe fallback.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers,
        icon: LuLayers,
    },
    {
        label: "Video Reel Studio",
        detail: "Render checked short videos locally.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio,
        icon: LuVideo,
    },
];

const REVIEW_LINKS: DrawerLink[] = [
    {
        label: "Trust Center",
        detail: "Claim, source, risk, action.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
        icon: LuShieldCheck,
    },
    {
        label: "Brand and proof",
        detail: "Playbook and proof deck.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
        icon: LuBadgeCheck,
    },
    {
        label: "Reusable templates",
        detail: "Refresh facts and export again.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
        icon: LuRefreshCcw,
    },
];

const USE_CASE_LINKS: DrawerLink[] = [
    {
        label: "Small business",
        detail: "Full journey from facts to pack.",
        href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
        icon: LuStore,
    },
    {
        label: "Pack examples",
        detail: "See outputs owners can use.",
        href: "/#studio",
        icon: LuFileDown,
    },
];

const QUICK_LINKS: DrawerLink[] = [
    {
        label: "Product loop",
        detail: "How the workflow moves.",
        href: "/#workflow",
        icon: LuLayoutDashboard,
    },
    {
        label: "Pack room",
        detail: "Pack, proof, export in one place.",
        href: "/#pack-room",
        icon: LuFileDown,
    },
    {
        label: "Trust",
        detail: "What is checked before use.",
        href: "/#trust",
        icon: LuShieldCheck,
    },
    {
        label: "FAQ",
        detail: "Plain answers.",
        href: "/#faq",
        icon: LuMessageSquare,
    },
];

function withBasePath(basePath: string, href: string): string {
    if (href.startsWith("#") || href.startsWith("mailto:")) return href;
    if (href === "/") return basePath || "/";
    return `${basePath}${href}`;
}

function DrawerSection({
    title,
    links,
    basePath,
    onNavigate,
}: {
    title: string;
    links: DrawerLink[];
    basePath: string;
    onNavigate: () => void;
}) {
    return (
        <section className="campaigncue-mobile-menu-section" aria-label={title}>
            <p>{title}</p>
            {links.map((link) => {
                const Icon = link.icon;
                return (
                    <a href={withBasePath(basePath, link.href)} key={link.label} onClick={onNavigate}>
                        <span aria-hidden="true">
                            <Icon />
                        </span>
                        <strong>{link.label}</strong>
                        <small>{link.detail}</small>
                    </a>
                );
            })}
        </section>
    );
}

export default function CampaignCueMobileNavigation({ basePath }: { basePath: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const drawerId = useId();
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const drawerRef = useRef<HTMLElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.body.dataset.campaigncueMobileMenu = "open";

        const focusFrame = window.requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const drawer = drawerRef.current;
            if (!drawer) return;
            const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ));
            if (!focusable.length) {
                event.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !drawer.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (active === last || !drawer.contains(active))) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.body.style.overflow = previousOverflow;
            delete document.body.dataset.campaigncueMobileMenu;
            window.removeEventListener("keydown", handleKeyDown);
            triggerRef.current?.focus();
        };
    }, [isOpen]);

    const openDrawer = () => setIsOpen(true);
    const closeDrawer = () => setIsOpen(false);
    const drawer = isOpen && typeof document !== "undefined"
        ? createPortal(
            <>
                <button
                    type="button"
                    className="campaigncue-mobile-menu-scrim"
                    aria-label="Close CampaignCue menu"
                    onClick={closeDrawer}
                />
                <aside
                    ref={drawerRef}
                    className="campaigncue-mobile-menu-drawer"
                    id={drawerId}
                    role="dialog"
                    aria-modal="true"
                    aria-label="CampaignCue mobile menu"
                >
                    <div className="campaigncue-mobile-menu-head">
                        <span className="campaigncue-brand-mark" aria-hidden="true">
                            <LuMegaphone />
                        </span>
                        <strong>CampaignCue</strong>
                        <button ref={closeButtonRef} type="button" aria-label="Close menu" onClick={closeDrawer}>
                            <LuX aria-hidden="true" />
                        </button>
                    </div>

                    <a
                        className="campaigncue-mobile-menu-overview"
                        href={withBasePath(basePath, "/")}
                        onClick={closeDrawer}
                    >
                        <span aria-hidden="true">
                            <LuLayoutDashboard />
                        </span>
                        <strong>Product overview</strong>
                        <small>Daily cue to checked export.</small>
                        <LuArrowRight aria-hidden="true" />
                    </a>

                    <nav aria-label="CampaignCue mobile navigation">
                        <DrawerSection
                            title="Product"
                            links={PRODUCT_LINKS}
                            basePath={basePath}
                            onNavigate={closeDrawer}
                        />
                        <DrawerSection
                            title="Review and reuse"
                            links={REVIEW_LINKS}
                            basePath={basePath}
                            onNavigate={closeDrawer}
                        />
                        <DrawerSection
                            title="Use cases"
                            links={USE_CASE_LINKS}
                            basePath={basePath}
                            onNavigate={closeDrawer}
                        />
                        <DrawerSection
                            title="Quick links"
                            links={QUICK_LINKS}
                            basePath={basePath}
                            onNavigate={closeDrawer}
                        />
                    </nav>

                    <a
                        className="campaigncue-mobile-menu-cta"
                        href={withBasePath(basePath, "/app")}
                        onClick={closeDrawer}
                    >
                        Open workspace
                        <LuArrowRight aria-hidden="true" />
                    </a>
                </aside>
            </>,
            document.body
        )
        : null;

    return (
        <div className="campaigncue-mobile-menu">
            <button
                ref={triggerRef}
                type="button"
                className="campaigncue-mobile-menu-trigger"
                aria-controls={drawerId}
                aria-expanded={isOpen}
                aria-label="Open CampaignCue menu"
                onClick={openDrawer}
            >
                <LuMenu aria-hidden="true" />
                <span>Menu</span>
            </button>

            {drawer}
        </div>
    );
}
