import React, { useMemo } from 'react';
import styles from './styles.module.scss';

interface AnimatedGradientBubblesProps {
  colors?: string[];
  count?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

const AnimatedGradientBubbles = ({ colors = ['#ffbe0b', '#fb5607', '#8338ec'], count = 3, speed = 'medium' }: AnimatedGradientBubblesProps) => {
  const bubbles = useMemo(() => {
    const speedConfig = {
      slow: { min: 10, range: 5 },    // 10s to 15s
      medium: { min: 7, range: 5 },  // 7s to 12s
      fast: { min: 3, range: 4 },      // 3s to 7s
    };

    const { min, range } = speedConfig[speed];

    return Array.from({ length: count }).map((_, index) => {
      const size = Math.floor(Math.random() * 150) + 100; // 100px to 250px
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const animationDuration = Math.floor(Math.random() * range) + min;
      const animationDelay = Math.random() * -20; // -20s to 0s

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
          '--x': `${Math.random() * 200 - 100}px`,
          '--y': `${Math.random() * 200 - 100}px`,
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
