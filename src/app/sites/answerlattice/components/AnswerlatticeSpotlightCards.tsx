"use client";

import { useEffect } from "react";

const SPOTLIGHT_CARD_SELECTOR = [
    ".al-suite-card",
    ".al-suite-stack__card",
    ".al-business-solution__card",
    ".al-product-overview__feature-card",
    ".al-founder-fit__boundary-card",
    ".al-linear-proof__card",
    ".al-pricing-preview__card",
    ".al-objections__card",
].join(", ");

export default function AnswerlatticeSpotlightCards(): null {
    useEffect(() => {
        const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
        let frame = 0;
        let pendingPointer: { target: EventTarget | null; x: number; y: number } | null = null;

        const updateSpotlight = () => {
            frame = 0;
            if (!pendingPointer || !(pendingPointer.target instanceof Element)) {
                return;
            }

            const card = pendingPointer.target.closest<HTMLElement>(SPOTLIGHT_CARD_SELECTOR);
            if (!card || !card.closest(".answerlattice-site")) {
                return;
            }

            const rect = card.getBoundingClientRect();
            card.style.setProperty("--al-card-pointer-x", `${pendingPointer.x - rect.left}px`);
            card.style.setProperty("--al-card-pointer-y", `${pendingPointer.y - rect.top}px`);
        };

        const handlePointer = (event: PointerEvent) => {
            if (!finePointerQuery.matches || event.pointerType === "touch") {
                return;
            }

            pendingPointer = {
                target: event.target,
                x: event.clientX,
                y: event.clientY,
            };

            if (!frame) {
                frame = window.requestAnimationFrame(updateSpotlight);
            }
        };

        document.addEventListener("pointerover", handlePointer, { passive: true });
        document.addEventListener("pointermove", handlePointer, { passive: true });

        return () => {
            document.removeEventListener("pointerover", handlePointer);
            document.removeEventListener("pointermove", handlePointer);
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, []);

    return null;
}
