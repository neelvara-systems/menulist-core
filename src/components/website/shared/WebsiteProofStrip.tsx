'use client';

import { LuCheckCircle } from 'react-icons/lu';
import { AnimateStaggerChild } from './AnimateOnScroll';

interface WebsiteProofStripProps {
  items: string[];
  className?: string;
}

export default function WebsiteProofStrip({ items, className = '' }: WebsiteProofStripProps) {
  return (
    <div className={`ws-proof-strip ${className}`}>
      {items.map((item, index) => (
        <AnimateStaggerChild key={item} index={index}>
          <div className="ws-proof-strip__item">
            <LuCheckCircle size={18} />
            <span>{item}</span>
          </div>
        </AnimateStaggerChild>
      ))}
    </div>
  );
}
