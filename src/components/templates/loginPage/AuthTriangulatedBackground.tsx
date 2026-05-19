'use client'

import { useEffect, useRef } from 'react';
import styles from './loginPage.module.scss';

type Point = {
  x: number;
  y: number;
};

type Triangle = [Point, Point, Point];

type AuthTriangulatedBackgroundProps = {
  darkMode: boolean;
};

const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  const x = x1 - x2;
  const y = y1 - y2;
  return Math.sqrt((x * x) + (y * y));
};

const getSeededValue = (value: number, seed: number) => {
  const x = Math.sin((value * 12.9898) + (seed * 78.233)) * 43758.5453;
  return x - Math.floor(x);
};

const buildTriangles = (width: number, height: number, seed: number): Triangle[] => {
  const cellSize = Math.max(92, Math.min(150, Math.round(Math.sqrt(width * height) / 8)));
  const margin = cellSize * 1.25;
  const columns = Math.ceil((width + (margin * 2)) / cellSize) + 1;
  const rows = Math.ceil((height + (margin * 2)) / cellSize) + 1;
  const jitter = cellSize * 0.34;
  const points: Point[][] = [];

  for (let row = 0; row <= rows; row += 1) {
    const rowPoints: Point[] = [];

    for (let column = 0; column <= columns; column += 1) {
      const edgePoint = row === 0 || column === 0 || row === rows || column === columns;
      const randomBase = ((row + 1) * 101) + ((column + 1) * 37);
      const xOffset = edgePoint ? 0 : (getSeededValue(randomBase, seed) - 0.5) * jitter;
      const yOffset = edgePoint ? 0 : (getSeededValue(randomBase + 17, seed) - 0.5) * jitter;

      rowPoints.push({
        x: (column * cellSize) - margin + xOffset,
        y: (row * cellSize) - margin + yOffset,
      });
    }

    points.push(rowPoints);
  }

  const triangles: Triangle[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = points[row][column];
      const topRight = points[row][column + 1];
      const bottomLeft = points[row + 1][column];
      const bottomRight = points[row + 1][column + 1];
      const flip = getSeededValue((row * 53) + (column * 97), seed) > 0.5;

      if (flip) {
        triangles.push([topLeft, topRight, bottomLeft]);
        triangles.push([topRight, bottomRight, bottomLeft]);
      } else {
        triangles.push([topLeft, topRight, bottomRight]);
        triangles.push([topLeft, bottomRight, bottomLeft]);
      }
    }
  }

  return triangles;
};

export default function AuthTriangulatedBackground({ darkMode }: AuthTriangulatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seed = Math.random() * 1000;
    const pointer = {
      x: window.innerWidth * 0.72,
      y: window.innerHeight * 0.25,
    };
    let width = 0;
    let height = 0;
    let triangles: Triangle[] = [];
    let animationFrame = 0;
    let lastDrawAt = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      triangles = buildTriangles(width, height, seed);
    };

    const draw = (time: number) => {
      const phase = reducedMotion ? 0 : time * 0.0002;
      const background = context.createLinearGradient(0, 0, width, height);
      const maxDistance = Math.max(width, height) * 0.9;

      background.addColorStop(0, darkMode ? '#020711' : '#f8fdff');
      background.addColorStop(0.48, darkMode ? '#062532' : '#eaf7fa');
      background.addColorStop(1, darkMode ? '#07111f' : '#f4fbff');

      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      triangles.forEach((triangle) => {
        const [a, b, c] = triangle;
        const centerX = (a.x + b.x + c.x) / 3;
        const centerY = (a.y + b.y + c.y) / 3;
        const pointerDistance = getDistance(centerX, centerY, pointer.x, pointer.y);
        const focus = 1 - Math.min(pointerDistance / maxDistance, 1);
        const wave = (
          Math.sin((centerX * 0.006) + phase)
          + Math.cos((centerY * 0.007) - phase)
          + Math.sin(((centerX + centerY) * 0.003) + phase)
          + 3
        ) / 6;
        const hue = darkMode ? 184 + (wave * 38) : 184 + (wave * 28);
        const saturation = darkMode ? 34 + (focus * 16) : 38 + (focus * 14);
        const lightness = darkMode
          ? 12 + (wave * 12) + (focus * 16)
          : 89 - (wave * 12) - (focus * 11);

        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.lineTo(c.x, c.y);
        context.closePath();
        context.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        context.strokeStyle = darkMode
          ? `hsla(${hue}, ${saturation + 8}%, ${Math.min(lightness + 12, 70)}%, 0.36)`
          : `hsla(${hue}, ${saturation + 8}%, ${Math.max(lightness - 16, 45)}%, 0.32)`;
        context.lineWidth = 0.8;
        context.fill();
        context.stroke();
      });

      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(width, height) * 0.55);
      glow.addColorStop(0, darkMode ? 'rgba(48, 196, 184, 0.16)' : 'rgba(22, 119, 255, 0.12)');
      glow.addColorStop(1, 'rgba(22, 119, 255, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    };

    const animate = (time: number) => {
      if (time - lastDrawAt > 42) {
        lastDrawAt = time;
        draw(time);
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const handleResize = () => {
      resize();
      draw(performance.now());
    };

    resize();
    draw(0);

    if (!reducedMotion) {
      window.addEventListener('pointermove', handlePointerMove);
      animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [darkMode]);

  return <canvas ref={canvasRef} className={styles.triangulatedBgCanvas} aria-hidden="true" />;
}
