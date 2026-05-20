'use client';

import type { CSSProperties, ReactNode } from 'react';

interface AnimateOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

export default function AnimateOnScroll({ children, delay = 0, className, style }: AnimateOnScrollProps) {
  void delay;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

interface AnimateStaggerChildProps {
  children: ReactNode;
  index?: number;
  className?: string;
  style?: CSSProperties;
}

export function AnimateStaggerChild({ children, index = 0, className, style }: AnimateStaggerChildProps) {
  void index;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
