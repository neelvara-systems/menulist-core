import React, { useMemo } from 'react';
import styles from './styles.module.scss';

interface AnimatedGradientBubblesProps {
  colors?: string[];
  count?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

const seededUnit = (seed: number) => {
  let value = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  value ^= value >>> 16;
  return value / 4294967295;
};

const AnimatedGradientBubbles = ({ colors = ['#ffbe0b', '#fb5607', '#8338ec'], count = 3, speed = 'medium' }: AnimatedGradientBubblesProps) => {
  const bubbles = useMemo(() => {
    const speedConfig = {
      slow: { min: 10, range: 5 },    // 10s to 15s
      medium: { min: 7, range: 5 },  // 7s to 12s
      fast: { min: 3, range: 4 },      // 3s to 7s
    };

    const { min, range } = speedConfig[speed];
    const baseSeed = count * 97 + speed.length * 31 + colors.join('|').length;

    return Array.from({ length: count }).map((_, index) => {
      const seed = baseSeed + index * 11;
      const size = Math.floor(seededUnit(seed + 1) * 150) + 100; // 100px to 250px
      const top = seededUnit(seed + 2) * 100;
      const left = seededUnit(seed + 3) * 100;
      const animationDuration = Math.floor(seededUnit(seed + 4) * range) + min;
      const animationDelay = seededUnit(seed + 5) * -20; // -20s to 0s

      return {
        id: index,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          top: `${top}%`,
          left: `${left}%`,
          background: colors[index % colors.length],
          animationDuration: `${animationDuration}s`,
          animationDelay: `${animationDelay}s`,
          transform: `translate(-${left}%, -${top}%)`,
          '--x': `${seededUnit(seed + 6) * 200 - 100}px`,
          '--y': `${seededUnit(seed + 7) * 200 - 100}px`,
        } as React.CSSProperties,
      };
    });
  }, [count, colors, speed]);

  return (
    <div className={styles.bubblesContainer}>
      {bubbles.map(bubble => (
        <div key={bubble.id} className={styles.bubble} style={bubble.style} />
      ))}
    </div>
  );
};

export default AnimatedGradientBubbles;
