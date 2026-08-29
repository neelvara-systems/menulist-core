'use client';

import { useEffect, useRef } from 'react';
import { NEELVARA_PENDULUM_CYCLE_MS } from './motion';

type FieldParticle = {
    angle: number;
    cohesion: number;
    color: string;
    length: number;
    orbit: number;
    phase: number;
    rawAngleOffset: number;
    rawRadiusOffset: number;
    size: number;
    verticalScale: number;
};

const FIELD_COLORS = [
    '35 132 255',
    '20 87 217',
    '39 55 200',
    '101 66 232',
] as const;

function seededValue(seed: number): number {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

export default function NeelvaraHeroField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { alpha: true });
        const hero = canvas?.closest<HTMLElement>('.nv-hero');

        if (!canvas || !context || !hero) return undefined;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let animationFrame: number | undefined;
        let cssWidth = 0;
        let cssHeight = 0;
        let isIntersecting = false;
        let isDisposed = false;
        let particles: FieldParticle[] = [];
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

            const elapsedMs = reducedMotion.matches ? 0 : Math.max(0, now - startedAt);
            const cycle = reducedMotion.matches
                ? 0.5
                : (elapsedMs % NEELVARA_PENDULUM_CYCLE_MS) / NEELVARA_PENDULUM_CYCLE_MS;
            const pendulum = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
            const rhythm = Math.sin(cycle * Math.PI * 2);
            const organization = 0.42 + (pendulum * 0.58);
            const centerX = cssWidth / 2;
            const centerY = cssHeight * 0.49;
            const baseRadius = Math.max(90, Math.min(cssWidth * 0.25, cssHeight * 0.32));

            pointerX += (pointerTargetX - pointerX) * 0.075;
            pointerY += (pointerTargetY - pointerY) * 0.075;
            pointerInfluence += (pointerTargetInfluence - pointerInfluence) * 0.065;
            context.lineCap = 'round';

            for (const particle of particles) {
                const rawInfluence = (1 - organization) * (1 - particle.cohesion);
                const schoolTravel = (pendulum - 0.5) * (0.78 + (particle.cohesion * 0.18));
                const angle = particle.angle + schoolTravel + (particle.rawAngleOffset * rawInfluence);
                const breath = Math.sin((cycle * Math.PI * 2) + (particle.phase * 0.28))
                    * (5 + (particle.cohesion * 7));
                const radius = baseRadius
                    + particle.orbit
                    + (particle.rawRadiusOffset * rawInfluence)
                    + breath
                    + (rhythm * particle.cohesion * 3.5);
                const x = centerX + (Math.cos(angle) * radius * 1.8);
                const y = centerY + (Math.sin(angle) * radius * particle.verticalScale);
                const deltaX = x - pointerX;
                const deltaY = y - pointerY;
                const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
                const reach = Math.min(270, Math.max(150, cssWidth * 0.18));
                const force = Math.pow(Math.max(0, 1 - (distance / reach)), 2) * pointerInfluence;
                const push = force * 9;
                const eddy = force * (22 + (particle.cohesion * 10));
                const directionX = deltaX / distance;
                const directionY = deltaY / distance;
                const drawX = x + (directionX * push) - (directionY * eddy);
                const drawY = y + (directionY * push) + (directionX * eddy);
                const tangent = angle + (Math.PI / 2);
                const alpha = 0.2
                    + (particle.size * 0.09)
                    + (particle.cohesion * organization * 0.12)
                    + (force * 0.2);
                const drawLength = particle.length * (0.72 + (organization * 0.28));

                context.save();
                context.translate(drawX, drawY);
                context.rotate(tangent);
                context.globalAlpha = Math.min(0.72, alpha);
                context.strokeStyle = `rgb(${particle.color})`;
                context.lineWidth = particle.size + (force * 0.8);
                context.beginPath();
                context.moveTo(-drawLength / 2, 0);
                context.lineTo(drawLength / 2, 0);
                context.stroke();
                context.restore();
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
            const bounds = canvas.getBoundingClientRect();
            cssWidth = Math.max(1, bounds.width);
            cssHeight = Math.max(1, bounds.height);
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(cssWidth * pixelRatio);
            canvas.height = Math.round(cssHeight * pixelRatio);
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            pointerX = cssWidth / 2;
            pointerY = cssHeight / 2;
            pointerTargetX = pointerX;
            pointerTargetY = pointerY;

            const count = cssWidth < 640 ? 116 : Math.min(250, Math.round(cssWidth / 6.4));
            particles = Array.from({ length: count }, (_, index) => {
                const lane = index % 5;
                const scatter = seededValue(index + 1);
                const cohesion = 1 - (lane / 5);

                return {
                    angle: ((index / count) * Math.PI * 2) + ((scatter - 0.5) * 0.22),
                    cohesion,
                    color: FIELD_COLORS[(index + lane) % FIELD_COLORS.length],
                    length: 3.5 + (seededValue(index + 8) * 7),
                    orbit: (lane * Math.min(42, cssHeight * 0.055)) + ((scatter - 0.5) * 28),
                    phase: seededValue(index + 15) * Math.PI * 2,
                    rawAngleOffset: (seededValue(index + 19) - 0.5) * 1.15,
                    rawRadiusOffset: (seededValue(index + 21) - 0.5) * 130,
                    size: 1 + (seededValue(index + 23) * 1.35),
                    verticalScale: 0.72 + (seededValue(index + 42) * 0.18),
                };
            });

            requestDraw();
        };

        const resizeObserver = new ResizeObserver(rebuild);
        const intersectionObserver = new IntersectionObserver(([entry]) => {
            isIntersecting = entry.isIntersecting;
            if (isIntersecting) requestDraw();
        }, { rootMargin: '100px' });
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

        resizeObserver.observe(canvas);
        intersectionObserver.observe(canvas);
        document.addEventListener('visibilitychange', handleVisibility);
        reducedMotion.addEventListener('change', handleMotionPreference);
        hero.addEventListener('pointermove', handlePointerMove);
        hero.addEventListener('pointerleave', handlePointerLeave);
        hero.addEventListener('pointercancel', handlePointerLeave);
        rebuild();

        return () => {
            isDisposed = true;
            if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            document.removeEventListener('visibilitychange', handleVisibility);
            reducedMotion.removeEventListener('change', handleMotionPreference);
            hero.removeEventListener('pointermove', handlePointerMove);
            hero.removeEventListener('pointerleave', handlePointerLeave);
            hero.removeEventListener('pointercancel', handlePointerLeave);
        };
    }, []);

    return (
        <div className="nv-hero-field" aria-hidden="true">
            <canvas className="nv-hero-field-canvas" ref={canvasRef} />
        </div>
    );
}
