'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import WebsiteButton from './WebsiteButton';

export default function StickyCta() {
  const t = useTranslations('Website');
  const [enabled, setEnabled] = useState(false);
  const [pastStart, setPastStart] = useState(false);
  const [nearStop, setNearStop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const syncEnabled = () => setEnabled(media.matches);

    syncEnabled();
    media.addEventListener('change', syncEnabled);

    return () => media.removeEventListener('change', syncEnabled);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPastStart(false);
      setNearStop(false);
      return;
    }

    const startTarget = document.getElementById('website-sticky-cta-start');
    const stopTarget = document.getElementById('website-sticky-cta-stop');

    if (!startTarget || !stopTarget || !('IntersectionObserver' in window)) {
      setPastStart(false);
      setNearStop(false);
      return;
    }

    const syncFromRects = () => {
      const startRect = startTarget.getBoundingClientRect();
      const stopRect = stopTarget.getBoundingClientRect();
      setPastStart(startRect.bottom <= 80);
      setNearStop(stopRect.top < window.innerHeight + 1000);
    };

    const startObserver = new IntersectionObserver(
      ([entry]) => {
        setPastStart(entry.boundingClientRect.bottom <= 80 && !entry.isIntersecting);
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 },
    );

    const stopObserver = new IntersectionObserver(
      ([entry]) => {
        setNearStop(entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight + 1000);
      },
      { rootMargin: '0px 0px 1000px 0px', threshold: 0 },
    );

    syncFromRects();
    const delayedSync = window.setTimeout(syncFromRects, 120);
    startObserver.observe(startTarget);
    stopObserver.observe(stopTarget);

    return () => {
      window.clearTimeout(delayedSync);
      startObserver.disconnect();
      stopObserver.disconnect();
    };
  }, [enabled]);

  const visible = pastStart && !nearStop;
  if (!enabled || !visible) return null;

  return (
    <div
      className="ws-sticky-cta"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        right: 'auto',
        zIndex: 90,
        width: 'min(calc(100vw - 32px), 760px)',
        transform: 'translate3d(-50%, 0, 0)',
      }}
    >
      <div
        className="ws-sticky-cta__inner"
        style={{
          backgroundColor: 'var(--ws-bg-sticky)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--ws-border-default)',
          borderRadius: '999px',
          minHeight: '62px',
          padding: '8px 10px 8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: 'var(--ws-shadow-lg)',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--ws-text-secondary)',
            display: 'none',
            maxWidth: '760px',
            lineHeight: 1.35,
          }}
          className="ws-sticky-cta-text"
        >
          {t('FinalCta.subtitle')}
        </span>
        <WebsiteButton href="/create-menu">
          {t('Hero.cta')}
        </WebsiteButton>
      </div>
    </div>
  );
}
