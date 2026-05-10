'use client';

import { useTranslations } from 'next-intl';
import { LuBarChart3, LuMousePointerClick, LuPhoneCall, LuShieldCheck, LuTags } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const analyticsSignalMeta = [
  { icon: LuMousePointerClick },
  { icon: LuTags },
  { icon: LuPhoneCall },
  { icon: LuBarChart3 },
];

const OWNER_VISIBILITY_COUNT = 5;
const TRANSPARENCY_POINT_COUNT = 4;

export default function AnalyticsInsightsSection() {
  const t = useTranslations('Website');
  const analyticsSignals = analyticsSignalMeta.map((meta, index) => ({
    ...meta,
    title: t(`AnalyticsInsights.signal${index}Title`),
    desc: t(`AnalyticsInsights.signal${index}Desc`),
  }));
  const ownerVisibility = Array.from({ length: OWNER_VISIBILITY_COUNT }, (_, index) => (
    t(`AnalyticsInsights.ownerVisibility${index}`)
  ));
  const transparencyPoints = Array.from({ length: TRANSPARENCY_POINT_COUNT }, (_, index) => (
    t(`AnalyticsInsights.transparency${index}`)
  ));

  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('AnalyticsInsights.title')}
          highlightedText={t('AnalyticsInsights.highlight')}
          subtitle={t('AnalyticsInsights.subtitle')}
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {analyticsSignals.map((signal, index) => {
          const Icon = signal.icon;
          return (
            <AnimateStaggerChild key={signal.title} index={index}>
              <div
                className="ws-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--ws-space-4)',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--ws-radius-md)',
                    backgroundColor: 'var(--ws-bg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color="var(--ws-brand-secondary)" />
                </div>
                <div>
                  <h3 className="ws-h3" style={{ fontSize: '1.0625rem' }}>{signal.title}</h3>
                  <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{signal.desc}</p>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <AnimateStaggerChild index={analyticsSignals.length}>
          <div className="ws-card" style={{ height: '100%' }}>
            <h3 className="ws-h3" style={{ fontSize: '1rem' }}>{t('AnalyticsInsights.ownerCardTitle')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {ownerVisibility.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', marginTop: 7, flexShrink: 0 }} />
                  <span className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>

        <AnimateStaggerChild index={analyticsSignals.length + 1}>
          <div className="ws-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--ws-radius-md)',
                  backgroundColor: 'var(--ws-bg-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LuShieldCheck size={20} color="var(--ws-brand-secondary)" />
              </div>
              <h3 className="ws-h3" style={{ fontSize: '1rem', margin: 0 }}>{t('AnalyticsInsights.safetyCardTitle')}</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {transparencyPoints.map((point) => (
                <li key={point} className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>
      </div>

      <AnimateOnScroll delay={0.15}>
        <p
          className="ws-caption"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ws-space-10)',
            maxWidth: 'var(--ws-max-w-text)',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {t('AnalyticsInsights.footer')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
