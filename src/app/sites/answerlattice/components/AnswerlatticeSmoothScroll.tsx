"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Lenis from "lenis";

const HEADER_ANCHOR_OFFSET = -88;

function createAnswerlatticeLenis() {
    return new Lenis({
        anchors: {
            offset: HEADER_ANCHOR_OFFSET,
            duration: 0.72,
        },
        autoRaf: true,
        duration: 0.82,
        easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
        prevent: shouldPreventLenis,
        smoothWheel: true,
        stopInertiaOnNavigate: true,
        syncTouch: false,
        wheelMultiplier: 0.94,
    });
}

function shouldUseSmoothScroll() {
    if (typeof window === "undefined") {
        return false;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    return !reducedMotion && finePointer && window.innerWidth >= 1024;
}

function shouldPreventLenis(node: HTMLElement) {
    return Boolean(
        node.closest(
            [
                "[data-lenis-prevent]",
                "[role='dialog']",
                "[aria-modal='true']",
                ".al-mobile-drawer",
                ".al-mobile-drawer-backdrop",
            ].join(", "),
        ),
    );
}

function addMediaQueryChangeListener(query: MediaQueryList, handler: () => void) {
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", handler);
        return () => query.removeEventListener("change", handler);
    }

    query.addListener(handler);
    return () => query.removeListener(handler);
}

export default function AnswerlatticeSmoothScroll(): null {
    const pathname = usePathname();

    useEffect(() => {
        const siteRoot = document.querySelector(".answerlattice-site");
        if (!siteRoot) {
            return undefined;
        }

        const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
        let lenis: Lenis | null = null;

        const destroyLenis = () => {
            if (lenis) {
                lenis.destroy();
                lenis = null;
                delete document.documentElement.dataset.answerlatticeSmoothScroll;
            }
        };

        const startLenis = () => {
            if (lenis || !shouldUseSmoothScroll()) {
                return;
            }

            lenis = createAnswerlatticeLenis();
            document.documentElement.dataset.answerlatticeSmoothScroll = "enabled";
        };

        const handleEnvironmentChange = () => {
            if (!shouldUseSmoothScroll()) {
                destroyLenis();
                return;
            }

            startLenis();
        };

        startLenis();

        window.addEventListener("resize", handleEnvironmentChange);
        const removeReducedMotionListener = addMediaQueryChangeListener(reducedMotionQuery, handleEnvironmentChange);
        const removePointerListener = addMediaQueryChangeListener(pointerQuery, handleEnvironmentChange);

        return () => {
            window.removeEventListener("resize", handleEnvironmentChange);
            removeReducedMotionListener();
            removePointerListener();
            destroyLenis();
        };
    }, [pathname]);

    return null;
}
