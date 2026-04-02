'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LuFileText, LuLayoutGrid, LuLink, LuMonitor, LuQrCode } from 'react-icons/lu';
import WebsiteButton from '../shared/WebsiteButton';

const surfaceKeys = [
  { key: 'surfaceQrMenu', icon: LuQrCode },
  { key: 'surfaceOfficialPage', icon: LuLayoutGrid },
  { key: 'surfaceDigitalScreen', icon: LuMonitor },
  { key: 'surfaceWebLink', icon: LuLink },
  { key: 'surfacePrintPdf', icon: LuFileText },
];

function SurfaceCard({ label, isActive, dark, children }: { label: string; isActive: boolean; dark?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: dark ? '#1e293b' : '#fff',
      border: `1.5px solid ${isActive ? 'var(--ws-brand-secondary)' : dark ? '#334155' : 'var(--ws-border-default)'}`,
      borderRadius: 'var(--ws-radius-lg)',
      padding: '14px',
      boxShadow: isActive ? '0 8px 30px -8px rgba(37,99,235,0.18)' : 'var(--ws-shadow-sm)',
      transition: 'all 0.4s ease',
      transform: isActive ? 'translateY(-4px)' : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ flex: 1 }}>{children}</div>
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.6875rem', fontWeight: 600, color: isActive ? 'var(--ws-brand-secondary)' : dark ? '#94a3b8' : 'var(--ws-text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const t = useTranslations('Website');
  const { data: session, status } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctaHref = status === 'authenticated' && session ? '/pricing' : '/get-started';

  useEffect(() => {
    const interval = setInterval(() => {
      if (!pausedRef.current) {
        setActiveIndex((prev) => (prev + 1) % surfaceKeys.length);
      }
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handleChipClick = (index: number) => {
    setActiveIndex(index);
    pausedRef.current = true;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 6000);
  };
  return (
    <section
      style={{
        padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-20)',
        backgroundColor: 'var(--ws-bg-primary)',
        textAlign: 'center',
      }}
    >
      <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
        <h1 className="ws-h1">
          {t('Hero.titlePart1')}<span className="ws-highlight">{t('Hero.titleHighlight')}</span>{t('Hero.titlePart2')}
        </h1>

        <p
          className="ws-body"
          style={{ marginTop: 'var(--ws-space-6)', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}
        >
          {t('Hero.subtitle')}
        </p>

        <div style={{ marginTop: 'var(--ws-space-8)' }}>
          <WebsiteButton href={ctaHref}>
            {t('Hero.cta')}
          </WebsiteButton>
        </div>

        <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
          {t('Hero.caption')}
        </p>
      </div>

      {/* Rotating surface indicator pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: 'var(--ws-space-12)', flexWrap: 'wrap' }}>
        {surfaceKeys.map((surface, i) => {
          const Icon = surface.icon;
          const isActive = i === activeIndex;
          return (
            <div
              key={surface.key}
              onClick={() => handleChipClick(i)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: isActive ? 'var(--ws-brand-primary)' : 'transparent', color: isActive ? '#fff' : 'var(--ws-text-muted)', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 500, transition: 'all 0.4s ease', border: `1px solid ${isActive ? 'var(--ws-brand-primary)' : 'var(--ws-border-default)'}`, cursor: 'pointer', userSelect: 'none' }}
            >
              <Icon size={14} />
              {t(`Hero.${surface.key}`)}
            </div>
          );
        })}
      </div>

      {/* Surface preview cards grid */}
      <div className="ws-container" style={{ marginTop: 'var(--ws-space-12)', maxWidth: '960px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--ws-space-4)' }}>
        {/* QR Menu card */}
        <SurfaceCard label={t('Hero.surfaceQrMenu')} isActive={activeIndex === 0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: 'var(--ws-bg-accent)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '5px', width: '70%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px' }} />
                  <div style={{ height: '4px', width: '40%', backgroundColor: 'var(--ws-brand-light)', borderRadius: '2px', marginTop: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Official Page card */}
        <SurfaceCard label={t('Hero.surfaceOfficialPage')} isActive={activeIndex === 1}>
          <div style={{ height: '6px', width: '40%', backgroundColor: 'var(--ws-brand-light)', borderRadius: '2px', marginBottom: '6px' }} />
          <div style={{ height: '5px', width: '70%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px', marginBottom: '6px' }} />
          <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
            <div style={{ flex: 1, height: '20px', backgroundColor: 'var(--ws-bg-accent)', borderRadius: '3px' }} />
            <div style={{ flex: 1, height: '20px', backgroundColor: 'var(--ws-bg-accent)', borderRadius: '3px' }} />
          </div>
          <div style={{ height: '4px', width: '55%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px' }} />
        </SurfaceCard>

        {/* Screen card */}
        <SurfaceCard label={t('Hero.surfaceDigitalScreen')} isActive={activeIndex === 2} dark>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ backgroundColor: '#334155', borderRadius: '3px', padding: '4px' }}>
                <div style={{ height: '16px', backgroundColor: '#475569', borderRadius: '2px', marginBottom: '3px' }} />
                <div style={{ height: '4px', width: '60%', backgroundColor: '#64748b', borderRadius: '1px' }} />
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Web / Link card */}
        <SurfaceCard label={t('Hero.surfaceWebLink')} isActive={activeIndex === 3}>
          <div style={{ height: '6px', width: '50%', backgroundColor: 'var(--ws-brand-light)', borderRadius: '2px', marginBottom: '6px' }} />
          <div style={{ height: '5px', width: '90%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px', marginBottom: '4px' }} />
          <div style={{ height: '5px', width: '75%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px', marginBottom: '8px' }} />
          <div style={{ height: '24px', backgroundColor: 'var(--ws-bg-accent)', borderRadius: '4px' }} />
        </SurfaceCard>

        {/* PDF card */}
        <SurfaceCard label={t('Hero.surfacePrintPdf')} isActive={activeIndex === 4}>
          <div style={{ height: '6px', width: '45%', backgroundColor: 'var(--ws-brand-light)', borderRadius: '2px', marginBottom: '8px' }} />
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: '4px', width: `${90 - n * 10}%`, backgroundColor: 'var(--ws-border-default)', borderRadius: '2px', marginBottom: '4px' }} />
          ))}
          <div style={{ borderTop: '1px dashed var(--ws-border-default)', marginTop: '4px', paddingTop: '6px' }}>
            <div style={{ height: '4px', width: '60%', backgroundColor: 'var(--ws-border-default)', borderRadius: '2px' }} />
          </div>
        </SurfaceCard>
      </div>
    </section>
  );
}
