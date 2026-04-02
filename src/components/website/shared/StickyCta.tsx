'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import WebsiteButton from './WebsiteButton';

export default function StickyCta() {
  const t = useTranslations('Website');
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);

  const ctaHref = status === 'authenticated' && session ? '/pricing' : '/get-started';

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      // Show after 25% scroll, hide in last 15% (FinalCta is visible)
      setVisible(scrollPercent > 0.25 && scrollPercent < 0.85);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--ws-border-default)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--ws-text-secondary)',
            display: 'none',
          }}
          className="ws-sticky-cta-text"
        >
          {t('FinalCta.subtitle')}
        </span>
        <WebsiteButton href={ctaHref}>
          {t('Hero.cta')}
        </WebsiteButton>
      </div>
    </div>
  );
}
