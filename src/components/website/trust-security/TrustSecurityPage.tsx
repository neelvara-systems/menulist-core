'use client';

import { useTranslations } from 'next-intl';
import { LuCheck, LuDatabase, LuGlobe, LuKey, LuLock, LuServer, LuShield, LuUserCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

const trustPillars = [
  {
    icon: LuLock,
    key: 'ownership',
    points: 3,
  },
  {
    icon: LuDatabase,
    key: 'isolation',
    points: 3,
  },
  {
    icon: LuKey,
    key: 'authentication',
    points: 3,
  },
  {
    icon: LuUserCheck,
    key: 'staffAccess',
    points: 3,
  },
  {
    icon: LuGlobe,
    key: 'https',
    points: 3,
  },
  {
    icon: LuServer,
    key: 'cloud',
    points: 3,
  },
  {
    icon: LuShield,
    key: 'webhooks',
    points: 3,
  },
  {
    icon: LuUserCheck,
    key: 'analytics',
    points: 3,
  },
  {
    icon: LuCheck,
    key: 'integrity',
    points: 3,
  },
];

export default function TrustSecurityPage() {
  const t = useTranslations('Website');
  const proofItems = Array.from({ length: 3 }, (_, i) => t(`TrustSecurity.proof${i}`));
  const securityFacts = Array.from({ length: 8 }, (_, i) => ({
    label: t(`TrustSecurity.fact${i}Label`),
    value: t(`TrustSecurity.fact${i}Value`),
  }));

  return (
    <div className="ws-page">
      <WebsitePageHero
        eyebrow={t('TrustSecurity.heroEyebrow')}
        parts={[
          { text: t('TrustSecurity.heroTitle') },
          { text: t('TrustSecurity.heroHighlight'), highlight: true },
        ]}
        subtitle={t('TrustSecurity.heroSubtitle')}
      >
        <WebsiteProofStrip items={proofItems} />
        <WebsiteMobileSupportHint />
        <WebsiteOwnerApprovalHint />
      </WebsitePageHero>

      {/* At-a-glance facts */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <SectionHeading
            title={t('TrustSecurity.factsTitle')}
            subtitle={t('TrustSecurity.factsSubtitle')}
          />
        </AnimateOnScroll>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          {securityFacts.map((fact, i) => (
            <AnimateStaggerChild key={fact.label} index={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flexShrink: 0, maxWidth: '180px' }}>{fact.value}</span>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust Pillars */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <SectionHeading
            title={t('TrustSecurity.pillarsTitle')}
            subtitle={t('TrustSecurity.pillarsSubtitle')}
          />
        </AnimateOnScroll>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
          {trustPillars.map((pillar, i) => {
            const Icon = pillar.icon;
            const title = t(`TrustSecurity.${pillar.key}Title`);
            const desc = t(`TrustSecurity.${pillar.key}Desc`);
            const points = Array.from({ length: pillar.points }, (_, pointIndex) => t(`TrustSecurity.${pillar.key}Point${pointIndex}`));
            return (
              <AnimateStaggerChild key={pillar.key} index={i}>
                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={22} color="var(--ws-brand-secondary)" />
                    </div>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>{title}</h3>
                      <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{desc}</p>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                    {points.map((point) => (
                      <li key={point} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                        <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateStaggerChild>
            );
          })}
        </div>
      </SectionWrapper>

      {/* Responsible disclosure */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto', textAlign: 'center' }}>
            <WebsiteHeadline as="h2" text={t('TrustSecurity.disclosureTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('TrustSecurity.disclosureBody')}
            </p>
            <p style={{ marginTop: 'var(--ws-space-4)', fontSize: '0.9375rem', color: 'var(--ws-text-secondary)' }}>
              {t('TrustSecurity.reachUs')}{' '}
              <a href="mailto:security@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>
                security@menulist.ai
              </a>
            </p>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <WebsiteHeadline as="h2" text={t('TrustSecurity.ctaTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('TrustSecurity.ctaSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('TrustSecurity.cta')}</WebsiteButton>
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </div>
  );
}
