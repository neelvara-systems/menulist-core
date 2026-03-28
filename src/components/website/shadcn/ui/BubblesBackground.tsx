import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Bubble {
  id: number;
  size: number;
  duration: number;
  delay: number;
  xStart: number;
  xEnd: number;
}

const BubblesBackground = ({ bubbleCount = 20 }: { bubbleCount?: number }) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Ensure this only runs on the client
    const generateBubbles = () => {
      const newBubbles = Array.from({ length: bubbleCount }).map((_, i) => {
        const size = Math.random() * 10 + 4; // 4px to 14px
        const duration = Math.random() * 10 + 10; // 10s to 20s
        const delay = Math.random() * 10; // 0s to 10s
        const xStart = Math.random() * 100;
        const xEnd = xStart + (Math.random() - 0.5) * 40;
        
        return {
          id: i,
          size,
          duration,
          delay,
          xStart,
          xEnd,
        };
      });
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, [bubbleCount]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0" aria-hidden="true">
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="absolute rounded-full bg-cyan-400/20"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.xStart}%`,
            boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)', // cyan-400
          }}
          initial={{ bottom: '-20px', opacity: 0 }}
          animate={{
            bottom: '100%',
            left: `${bubble.xEnd}%`,
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

export default BubblesBackground;
