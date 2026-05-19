'use client'

import { useEffect, useRef } from 'react';
import styles from './loginPage.module.scss';

type Particle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  seed: number;
};

type AuthParticleFlowBackgroundProps = {
  darkMode: boolean;
};

const getParticleCount = (width: number, darkMode: boolean) => {
  if (width <= 480) return darkMode ? 110 : 90;
  if (width <= 900) return darkMode ? 180 : 140;
  return darkMode ? 320 : 230;
};

const createParticle = (width: number, height: number, seed = Math.random()): Particle => {
  const x = Math.random() * width;
  const y = Math.random() * height;

  return {
    x,
    y,
    previousX: x,
    previousY: y,
    velocityX: (Math.random() - 0.5) * 0.4,
    velocityY: (Math.random() - 0.5) * 0.4,
    life: Math.random() * 140,
    maxLife: 90 + (Math.random() * 150),
    size: 0.8 + (Math.random() * 1.7),
    seed,
  };
};

const resetParticle = (particle: Particle, width: number, height: number) => {
  const next = createParticle(width, height, particle.seed + 0.17);

  particle.x = next.x;
  particle.y = next.y;
  particle.previousX = next.previousX;
  particle.previousY = next.previousY;
  particle.velocityX = next.velocityX;
  particle.velocityY = next.velocityY;
  particle.life = 0;
  particle.maxLife = next.maxLife;
  particle.size = next.size;
  particle.seed = next.seed;
};

export default function AuthParticleFlowBackground({ darkMode }: AuthParticleFlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = {
      x: -10000,
      y: -10000,
      previousX: -10000,
      previousY: -10000,
      velocityX: 0,
      velocityY: 0,
    };

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
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
      particles = Array.from({ length: getParticleCount(width, darkMode) }, () => createParticle(width, height));
    };

    const getFlowAngle = (particle: Particle, time: number) => {
      const x = particle.x * 0.0035;
      const y = particle.y * 0.004;
      const drift = time * 0.00018;

      return (
        Math.sin(x + drift + particle.seed)
        + Math.cos(y - drift)
        + Math.sin((x + y) * 1.4)
      ) * Math.PI;
    };

    const drawStatic = () => {
      context.clearRect(0, 0, width, height);

      particles.slice(0, Math.min(120, particles.length)).forEach((particle) => {
        const alpha = darkMode ? 0.22 : 0.18;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 1.35, 0, Math.PI * 2);
        context.fillStyle = darkMode
          ? `rgba(118, 232, 224, ${alpha})`
          : `rgba(18, 112, 138, ${alpha})`;
        context.fill();
      });
    };

    const draw = (time: number) => {
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = darkMode ? 'lighter' : 'source-over';

      particles.forEach((particle) => {
        particle.previousX = particle.x;
        particle.previousY = particle.y;

        const angle = getFlowAngle(particle, time);
        const flowX = Math.cos(angle) * 0.055;
        const flowY = Math.sin(angle) * 0.055;
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distanceSq = (dx * dx) + (dy * dy);
        const proximity = Math.min(1, 28000 / Math.max(distanceSq, 1));
        const centerQuietX = Math.abs((particle.x / Math.max(width, 1)) - 0.5) / 0.26;
        const centerQuietY = Math.abs((particle.y / Math.max(height, 1)) - 0.5) / 0.38;
        const centerQuiet = Math.min(1, Math.max(centerQuietX, centerQuietY));
        const edgeLift = 0.58 + (centerQuiet * 0.42);

        particle.velocityX = (particle.velocityX * 0.965) + flowX + (mouse.velocityX * proximity * 0.018);
        particle.velocityY = (particle.velocityY * 0.965) + flowY + (mouse.velocityY * proximity * 0.018);
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.life += 1;

        const outOfBounds = particle.x < -60 || particle.x > width + 60 || particle.y < -60 || particle.y > height + 60;
        if (outOfBounds || particle.life > particle.maxLife) {
          resetParticle(particle, width, height);
          return;
        }

        const lifeRatio = particle.life / particle.maxLife;
        const fadeIn = Math.min(lifeRatio / 0.12, 1);
        const fadeOut = Math.min((1 - lifeRatio) / 0.25, 1);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * (darkMode ? 0.38 : 0.36) * edgeLift;
        const lineWidth = particle.size * (darkMode ? 1.22 : 0.92);
        const hue = darkMode ? 176 + (particle.seed * 34) : 184 + (particle.seed * 18);
        const tailLength = darkMode ? 13 : 10;
        const tailX = particle.x - (particle.velocityX * tailLength);
        const tailY = particle.y - (particle.velocityY * tailLength);

        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(particle.x, particle.y);
        context.strokeStyle = `hsla(${hue}, ${darkMode ? 82 : 62}%, ${darkMode ? 70 : 34}%, ${alpha})`;
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        context.stroke();
      });

      context.globalCompositeOperation = 'source-over';
      mouse.velocityX *= 0.86;
      mouse.velocityY *= 0.86;
    };

    const animate = (time: number) => {
      if (document.hidden) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      if (time - lastDrawAt > 32) {
        lastDrawAt = time;
        draw(time);
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      mouse.previousX = mouse.x;
      mouse.previousY = mouse.y;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.velocityX = mouse.previousX < -9999 ? 0 : mouse.x - mouse.previousX;
      mouse.velocityY = mouse.previousY < -9999 ? 0 : mouse.y - mouse.previousY;
    };

    const handlePointerLeave = () => {
      mouse.x = -10000;
      mouse.y = -10000;
      mouse.previousX = -10000;
      mouse.previousY = -10000;
      mouse.velocityX = 0;
      mouse.velocityY = 0;
    };

    const handleResize = () => {
      resize();
      if (reducedMotion) {
        drawStatic();
        return;
      }

      context.clearRect(0, 0, width, height);
    };

    resize();

    if (reducedMotion) {
      drawStatic();
    } else {
      context.clearRect(0, 0, width, height);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerleave', handlePointerLeave);
      animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.particleFlowCanvas} ${darkMode ? styles.particleFlowCanvasDark : styles.particleFlowCanvasLight}`}
      aria-hidden="true"
    />
  );
}
