'use client';

import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import ProductLogo, { type NeelvaraProductName } from './ProductLogo';

type SignalProduct = {
    name: NeelvaraProductName;
    tagline: string;
};

const MAX_POINTER_OFFSET = 14;
const MAX_ROTATE_X = 7;
const MAX_ROTATE_Y = 9;

export default function SignalConstellation({ products }: { products: SignalProduct[] }) {
    const constellationRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    }, []);

    const updatePointerPosition = (event: PointerEvent<HTMLDivElement>) => {
        const constellation = constellationRef.current;
        if (!constellation || event.pointerType === 'touch') return;

        const bounds = constellation.getBoundingClientRect();
        const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
        const x = normalizedX * MAX_POINTER_OFFSET;
        const y = normalizedY * MAX_POINTER_OFFSET;
        const rotateX = normalizedY * -MAX_ROTATE_X;
        const rotateY = normalizedX * MAX_ROTATE_Y;
        const nodeRotateX = rotateX * -0.35;
        const nodeRotateY = rotateY * -0.35;
        const shadowX = normalizedX * -20;
        const shadowY = 36 + normalizedY * 12;
        const glowX = (normalizedX + 0.5) * 100;
        const glowY = (normalizedY + 0.5) * 100;

        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
        frameRef.current = window.requestAnimationFrame(() => {
            constellation.style.setProperty('--nv-signal-x', `${x.toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-y', `${y.toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-node-x', `${(-x * 0.5).toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-node-y', `${(-y * 0.5).toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-rotate-x', `${rotateX.toFixed(2)}deg`);
            constellation.style.setProperty('--nv-signal-rotate-y', `${rotateY.toFixed(2)}deg`);
            constellation.style.setProperty('--nv-signal-node-rotate-x', `${nodeRotateX.toFixed(2)}deg`);
            constellation.style.setProperty('--nv-signal-node-rotate-y', `${nodeRotateY.toFixed(2)}deg`);
            constellation.style.setProperty('--nv-signal-shadow-x', `${shadowX.toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-shadow-y', `${shadowY.toFixed(2)}px`);
            constellation.style.setProperty('--nv-signal-glow-x', `${glowX.toFixed(2)}%`);
            constellation.style.setProperty('--nv-signal-glow-y', `${glowY.toFixed(2)}%`);
            constellation.style.setProperty('--nv-signal-scale', '1.018');
            frameRef.current = null;
        });
    };

    const resetPointerPosition = () => {
        const constellation = constellationRef.current;
        if (!constellation) return;

        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
        frameRef.current = window.requestAnimationFrame(() => {
            constellation.style.setProperty('--nv-signal-x', '0px');
            constellation.style.setProperty('--nv-signal-y', '0px');
            constellation.style.setProperty('--nv-signal-node-x', '0px');
            constellation.style.setProperty('--nv-signal-node-y', '0px');
            constellation.style.setProperty('--nv-signal-rotate-x', '0deg');
            constellation.style.setProperty('--nv-signal-rotate-y', '0deg');
            constellation.style.setProperty('--nv-signal-node-rotate-x', '0deg');
            constellation.style.setProperty('--nv-signal-node-rotate-y', '0deg');
            constellation.style.setProperty('--nv-signal-shadow-x', '0px');
            constellation.style.setProperty('--nv-signal-shadow-y', '42px');
            constellation.style.setProperty('--nv-signal-glow-x', '50%');
            constellation.style.setProperty('--nv-signal-glow-y', '50%');
            constellation.style.setProperty('--nv-signal-scale', '1');
            frameRef.current = null;
        });
    };

    return (
        <div
            aria-hidden="true"
            className="nv-signal-constellation nv-reveal"
            onPointerLeave={resetPointerPosition}
            onPointerMove={updatePointerPosition}
            ref={constellationRef}
        >
            <div className="nv-signal-mark-stage">
                <img
                    alt=""
                    className="nv-signal-mark-depth"
                    decoding="async"
                    height="686"
                    src="/neelvara-logo.svg"
                    width="1135"
                />
                <img
                    alt=""
                    className="nv-signal-mark"
                    decoding="async"
                    fetchPriority="high"
                    height="686"
                    src="/neelvara-logo.svg"
                    width="1135"
                />
                <span className="nv-signal-mark-sheen" />
            </div>
            {products.map((product, index) => (
                <div
                    className={`nv-signal-node nv-signal-node-${index + 1}`}
                    key={product.name}
                >
                    <span className="nv-signal-node-logo">
                        <ProductLogo name={product.name} />
                    </span>
                    <span className="nv-signal-node-copy">
                        <strong>{product.name}</strong>
                        <span>{product.tagline}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}
