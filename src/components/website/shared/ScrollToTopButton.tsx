'use client';

import { useEffect, useState } from 'react';
import { LuArrowUp } from 'react-icons/lu';

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 50,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: 'var(--ws-bg-primary)',
        border: '1px solid var(--ws-border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ws-brand-secondary)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ws-border-default)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}
    >
      <LuArrowUp size={18} color="var(--ws-brand-secondary)" />
    </button>
  );
}
