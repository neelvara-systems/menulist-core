'use client';

import { useEffect, useRef } from 'react';
import { NEELVARA_PENDULUM_CYCLE_MS } from './motion';

type AuraPoint = {
    x: number;
    y: number;
    color: string;
    phase: number;
};

const BRAND_STOPS = [
    { at: 0, color: [35, 132, 255] },
    { at: 0.42, color: [20, 87, 217] },
    { at: 0.62, color: [39, 55, 200] },
    { at: 1, color: [101, 66, 232] },
] as const;

function mixBrandColor(position: number): string {
    const rightIndex = BRAND_STOPS.findIndex((stop) => position <= stop.at);
    const right = BRAND_STOPS[Math.max(1, rightIndex === -1 ? BRAND_STOPS.length - 1 : rightIndex)];
    const left = BRAND_STOPS[BRAND_STOPS.indexOf(right) - 1];
    const progress = (position - left.at) / (right.at - left.at);
    const channels = left.color.map((channel, index) => (
        Math.round(channel + ((right.color[index] - channel) * progress))
    ));

    return `rgb(${channels.join(' ')})`;
}

export default function NeelvaraAuraOrb() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { alpha: true });

        if (!canvas || !context) return undefined;

        const logo = new Image();
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let animationFrame: number | undefined;
        let cssWidth = 0;
        let cssHeight = 0;
        let isIntersecting = false;
        let isDisposed = false;
        let points: AuraPoint[] = [];
        let pointerX = 0;
        let pointerY = 0;
        let pointerTargetX = 0;
        let pointerTargetY = 0;
        let pointerInfluence = 0;
        let pointerTargetInfluence = 0;
        const startedAt = performance.now();

        const canAnimate = () => (
            !isDisposed
            && isIntersecting
            && !document.hidden
            && !reducedMotion.matches
        );

        const draw = (now: number) => {
            animationFrame = undefined;
            context.clearRect(0, 0, cssWidth, cssHeight);

            if (!points.length) return;

            const elapsed = Math.max(0, now - startedAt);
            const cycle = reducedMotion.matches
                ? 0.25
                : (elapsed % NEELVARA_PENDULUM_CYCLE_MS) / NEELVARA_PENDULUM_CYCLE_MS;
            const pendulum = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
            const sweepX = cssWidth * (0.25 + (pendulum * 0.5));
            const sweepWidth = Math.max(46, Math.min(92, cssWidth * 0.07));

            pointerX += (pointerTargetX - pointerX) * 0.12;
            pointerY += (pointerTargetY - pointerY) * 0.12;
            pointerInfluence += (pointerTargetInfluence - pointerInfluence) * 0.1;

            for (const point of points) {
                const sweep = Math.exp(-Math.pow((point.x - sweepX) / sweepWidth, 2));
                const idleX = Math.sin((elapsed / 1450) + point.phase) * 0.55;
                const idleY = Math.cos((elapsed / 1720) + (point.phase * 1.37)) * 0.55;
                const pointerDeltaX = point.x - pointerX;
                const pointerDeltaY = point.y - pointerY;
                const pointerDistance = Math.max(0.001, Math.hypot(pointerDeltaX, pointerDeltaY));
                const pointerReach = Math.max(130, Math.min(190, cssWidth * 0.15));
                const pointerForce = Math.pow(Math.max(0, 1 - (pointerDistance / pointerReach)), 2) * pointerInfluence;
                const push = pointerForce * 13;
                const orbit = pointerForce * 5.2;
                const directionX = pointerDeltaX / pointerDistance;
                const directionY = pointerDeltaY / pointerDistance;
                const drawX = point.x + idleX + (directionX * push) - (directionY * orbit);
                const drawY = point.y + idleY + (directionY * push) + (directionX * orbit);
                const radius = 1.02 + (sweep * 0.92) + (pointerForce * 0.36);
                const alpha = 0.64 + (sweep * 0.3) + (pointerForce * 0.06);

                context.globalAlpha = Math.min(1, alpha);
                context.fillStyle = point.color;
                context.beginPath();
                context.arc(drawX, drawY, radius, 0, Math.PI * 2);
                context.fill();
            }

            context.globalAlpha = 1;

            if (canAnimate()) {
                animationFrame = window.requestAnimationFrame(draw);
            }
        };

        const requestDraw = () => {
            if (animationFrame !== undefined) return;
            animationFrame = window.requestAnimationFrame(draw);
        };

        const rebuild = () => {
            if (!logo.complete || !logo.naturalWidth) return;

            const bounds = canvas.getBoundingClientRect();
            cssWidth = Math.max(1, bounds.width);
            cssHeight = Math.max(1, bounds.height);
            pointerX = cssWidth / 2;
            pointerY = cssHeight / 2;
            pointerTargetX = pointerX;
            pointerTargetY = pointerY;
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(cssWidth * pixelRatio);
            canvas.height = Math.round(cssHeight * pixelRatio);
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            const logoWidth = Math.min(cssWidth * 0.72, 690);
            const logoHeight = logoWidth * (686 / 1135);
            const left = (cssWidth - logoWidth) / 2;
            const top = ((cssHeight - logoHeight) / 2) - Math.min(34, cssHeight * 0.05);
            const samplingCanvas = document.createElement('canvas');
            const sampleWidth = Math.max(1, Math.round(logoWidth));
            const sampleHeight = Math.max(1, Math.round(logoHeight));
            samplingCanvas.width = sampleWidth;
            samplingCanvas.height = sampleHeight;
            const samplingContext = samplingCanvas.getContext('2d', { willReadFrequently: true });

            if (!samplingContext) return;

            samplingContext.drawImage(logo, 0, 0, sampleWidth, sampleHeight);
            const pixels = samplingContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
            const spacing = cssWidth < 640 ? 5 : 6;
            const nextPoints: AuraPoint[] = [];

            for (let y = spacing / 2; y < sampleHeight; y += spacing) {
                for (let x = spacing / 2; x < sampleWidth; x += spacing) {
                    const pixelIndex = ((Math.floor(y) * sampleWidth) + Math.floor(x)) * 4;
                    if (pixels[pixelIndex + 3] < 90) continue;

                    nextPoints.push({
                        x: left + x,
                        y: top + y,
                        color: mixBrandColor(x / sampleWidth),
                        phase: (((x * 12.9898) + (y * 78.233)) % 1) * Math.PI * 2,
                    });
                }
            }

            points = nextPoints;
            requestDraw();
        };

        const resizeObserver = new ResizeObserver(rebuild);
        const intersectionObserver = new IntersectionObserver(([entry]) => {
            isIntersecting = entry.isIntersecting;
            if (isIntersecting) requestDraw();
        }, { rootMargin: '120px' });
        const handleVisibility = () => {
            if (!document.hidden) requestDraw();
        };
        const handleMotionPreference = () => requestDraw();
        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch' || reducedMotion.matches) return;
            const bounds = canvas.getBoundingClientRect();
            pointerTargetX = event.clientX - bounds.left;
            pointerTargetY = event.clientY - bounds.top;
            pointerTargetInfluence = 1;
            requestDraw();
        };
        const handlePointerLeave = () => {
            pointerTargetInfluence = 0;
            requestDraw();
        };

        logo.addEventListener('load', rebuild);
        logo.src = '/neelvara-logo.svg';
        resizeObserver.observe(canvas);
        intersectionObserver.observe(canvas);
        document.addEventListener('visibilitychange', handleVisibility);
        reducedMotion.addEventListener('change', handleMotionPreference);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerleave', handlePointerLeave);
        canvas.addEventListener('pointercancel', handlePointerLeave);

        return () => {
            isDisposed = true;
            if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
            logo.removeEventListener('load', rebuild);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            document.removeEventListener('visibilitychange', handleVisibility);
            reducedMotion.removeEventListener('change', handleMotionPreference);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerleave', handlePointerLeave);
            canvas.removeEventListener('pointercancel', handlePointerLeave);
        };
    }, []);

    return (
        <div className="nv-footer-aura" aria-hidden="true">
            <canvas className="nv-footer-aura-canvas" ref={canvasRef} />
        </div>
    );
}
