'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LuBarChart3, LuCheck, LuEye, LuMousePointerClick, LuPhoneCall, LuShieldCheck, LuTags } from 'react-icons/lu';
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

      <AnimateOnScroll delay={0.1}>
        <div className="ws-draft-visual-frame ws-draft-visual-frame--wide">
          <Image
            src="/images/website/menulist-analytics-proof.webp"
            alt={t('AnalyticsInsights.title')}
            width={1500}
            height={900}
            loading="eager"
            unoptimized
            sizes="(min-width: 1024px) 920px, 100vw"
            className="ws-draft-product-image"
          />
        </div>
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
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
              <div className="ws-card ws-icon-card">
                <div className="ws-icon-card__icon ws-icon-card__icon--lg">
                  <Icon size={22} color="var(--ws-brand-secondary)" />
                </div>
                <div className="ws-icon-card__content">
                  <h3 className="ws-icon-card__title ws-icon-card__title--lg">{signal.title}</h3>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <AnimateStaggerChild index={analyticsSignals.length}>
          <div className="ws-card ws-icon-card ws-icon-card--stacked" style={{ height: '100%' }}>
            <div className="ws-icon-card__header">
              <div className="ws-icon-card__icon">
                <LuEye size={20} color="var(--ws-brand-secondary)" />
              </div>
              <div className="ws-icon-card__content">
                <h3 className="ws-icon-card__title">{t('AnalyticsInsights.ownerCardTitle')}</h3>
              </div>
            </div>
            <ul className="ws-check-list">
              {ownerVisibility.map((item) => (
                <li key={item} className="ws-check-list__item">
                  <LuCheck className="ws-check-list__icon" size={15} />
                  <span className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>

        <AnimateStaggerChild index={analyticsSignals.length + 1}>
          <div className="ws-card ws-icon-card ws-icon-card--stacked" style={{ height: '100%' }}>
            <div className="ws-icon-card__header">
              <div className="ws-icon-card__icon">
                <LuShieldCheck size={20} color="var(--ws-brand-secondary)" />
              </div>
              <div className="ws-icon-card__content">
                <h3 className="ws-icon-card__title">{t('AnalyticsInsights.safetyCardTitle')}</h3>
              </div>
            </div>
            <ul className="ws-check-list">
              {transparencyPoints.map((point) => (
                <li key={point} className="ws-check-list__item">
                  <LuCheck className="ws-check-list__icon" size={15} />
                  <span className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>{point}</span>
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
