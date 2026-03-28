'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimateOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimateOnScroll({ children, delay = 0, className, style }: AnimateOnScrollProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function AnimateStaggerChild({ children, index = 0, className, style }: { children: ReactNode; index?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
