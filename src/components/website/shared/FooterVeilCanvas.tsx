'use client';

import { useEffect, useRef } from 'react';

type VeilLine = {
  y: number;
  amplitude: number;
  phase: number;
  speed: number;
  width: number;
  alpha: number;
  hueShift: number;
};

const createLine = (index: number, count: number): VeilLine => {
  const seed = Math.sin(index * 91.7) * 10000;
  const noise = seed - Math.floor(seed);
  const secondarySeed = Math.sin(index * 47.3 + 11.9) * 10000;
  const secondaryNoise = secondarySeed - Math.floor(secondarySeed);

  return {
    y: count <= 1 ? 0.5 : index / (count - 1),
    amplitude: 0.025 + noise * 0.05,
    phase: noise * Math.PI * 2,
    speed: 0.00018 + secondaryNoise * 0.00022,
    width: 0.75 + noise * 1.3,
    alpha: 0.06 + secondaryNoise * 0.1,
    hueShift: noise,
  };
};

export default function FooterVeilCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const parent = canvas?.parentElement;

    if (!canvas || !context || !parent) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lines: VeilLine[] = [];

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lineCount = Math.max(22, Math.min(64, Math.floor(width / 32)));
      lines = Array.from({ length: lineCount }, (_, index) => createLine(index, lineCount));
    };

    const drawLine = (line: VeilLine, time: number) => {
      const verticalOffset = Math.sin(time * line.speed + line.phase) * height * line.amplitude;
      const baseY = height * (0.08 + line.y * 0.84) + verticalOffset;
      const segment = Math.max(140, width / 5);
      const cyan = 188 + Math.round(line.hueShift * 28);
      const blue = 222 + Math.round(line.hueShift * 24);
      const alpha = motionQuery.matches ? line.alpha * 0.72 : line.alpha;

      const gradient = context.createLinearGradient(0, baseY, width, baseY);
      gradient.addColorStop(0, `hsla(${cyan}, 78%, 58%, ${alpha * 0.25})`);
      gradient.addColorStop(0.42, `hsla(${cyan}, 86%, 62%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${blue}, 92%, 62%, ${alpha * 0.55})`);

      context.beginPath();
      context.moveTo(-segment, baseY);

      for (let x = -segment; x < width + segment; x += segment) {
        const nextX = x + segment;
        const waveA = Math.sin(time * line.speed * 1.4 + line.phase + x * 0.008);
        const waveB = Math.cos(time * line.speed * 1.9 + line.phase * 0.7 + x * 0.006);
        const cp1Y = baseY + waveA * height * line.amplitude * 2.7;
        const cp2Y = baseY + waveB * height * line.amplitude * 2.2;
        const endY = baseY + Math.sin(time * line.speed + nextX * 0.006 + line.phase) * height * line.amplitude;

        context.bezierCurveTo(
          x + segment * 0.33,
          cp1Y,
          x + segment * 0.66,
          cp2Y,
          nextX,
          endY,
        );
      }

      context.lineWidth = line.width;
      context.strokeStyle = gradient;
      context.shadowBlur = 10;
      context.shadowColor = `hsla(${cyan}, 85%, 64%, ${alpha * 0.75})`;
      context.stroke();
    };

    const render = (time = 0) => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      lines.forEach((line) => drawLine(line, time));

      context.globalCompositeOperation = 'source-over';
      context.shadowBlur = 0;

      if (!motionQuery.matches) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    resize();
    render(0);

    const refreshSize = () => {
        resize();
        if (motionQuery.matches) {
          render(0);
        }
      };

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(refreshSize)
      : null;

    observer?.observe(parent);
    window.addEventListener('resize', refreshSize);

    const handleMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      render(0);
    };

    motionQuery.addEventListener?.('change', handleMotionChange);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', refreshSize);
      motionQuery.removeEventListener?.('change', handleMotionChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="ws-footer-veil-canvas" aria-hidden="true" />;
}
