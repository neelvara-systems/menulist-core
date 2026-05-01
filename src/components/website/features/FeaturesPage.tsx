'use client';

import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuBarChart3, LuBriefcase, LuCamera, LuCheck, LuEye, LuFileText, LuImage, LuLanguages, LuLayoutGrid, LuLink, LuList, LuMessageSquare, LuMonitor, LuPackage, LuPalette, LuPrinter, LuQrCode, LuRefreshCw, LuShield, LuSparkles, LuTrendingUp, LuUsers, LuZap } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const groupIds = ['setup', 'surfaces', 'brand', 'smart', 'operations', 'integrity'];
const groupIcons = [
  [LuCamera, LuImage, LuFileText, LuLanguages],
  [LuQrCode, LuLayoutGrid, LuMonitor, LuLink, LuFileText, LuList],
  [LuPalette, LuPackage, LuPrinter],
  [LuSparkles, LuUsers, LuBarChart3, LuTrendingUp],
  [LuRefreshCw, LuZap, LuBriefcase, LuEye, LuMessageSquare, LuList],
  [LuShield, LuCheck, LuBadgeCheck],
];

export default function FeaturesPage() {
  const t = useTranslations('Website');
  const featureGroups = groupIds.map((id, gi) => ({
    id,
    label: t(`Features.group${gi}Label`),
    heading: t(`Features.group${gi}Heading`),
    subheading: t(`Features.group${gi}Subheading`),
    features: groupIcons[gi].map((icon, fi) => ({
      icon,
      title: t(`Features.group${gi}F${fi}Title`),
      desc: t(`Features.group${gi}F${fi}Desc`),
    })),
  }));

  return (
    <div className="ws-page">
      {/* Hero */}
      <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
        <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
          <AnimateOnScroll>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
              {t('Features.heroEyebrow')}
            </p>
            <h1 className="ws-h1">
              {t('Features.heroTitle1')}<br />
              <span className="ws-highlight">{t('Features.heroTitle2')}</span>
            </h1>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
              {t('Features.heroSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/get-started">{t('Features.heroCta')}</WebsiteButton>
            </div>
          </AnimateOnScroll>
        </div>

        {/* Feature group nav pills */}
        <AnimateOnScroll delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)', marginTop: 'var(--ws-space-12)', flexWrap: 'wrap' }}>
            {featureGroups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(group.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--ws-text-secondary)',
                  border: '1px solid var(--ws-border-default)',
                  textDecoration: 'none',
                  transition: 'all var(--ws-transition-fast)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ws-brand-primary)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--ws-brand-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--ws-text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--ws-border-default)';
                }}
              >
                {group.label}
              </a>
            ))}
          </div>
        </AnimateOnScroll>
      </section>

      {/* Feature Groups */}
      {featureGroups.map((group, gi) => (
        <SectionWrapper key={group.id} variant={gi % 2 === 0 ? 'subtle' : 'default'}>
          <div id={group.id} style={{ scrollMarginTop: '5rem' }}>
            <AnimateOnScroll>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', marginBottom: 'var(--ws-space-3)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ws-brand-secondary)', backgroundColor: 'var(--ws-bg-accent)', padding: '3px 10px', borderRadius: '20px' }}>
                  {group.label}
                </span>
              </div>
              <SectionHeading
                title={group.heading}
                subtitle={group.subheading}
                centered={false}
              />
            </AnimateOnScroll>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--ws-space-4)',
                marginTop: 'var(--ws-space-10)',
                maxWidth: '960px',
                gridAutoRows: '1fr',
              }}
            >
              {group.features.map((feature, fi) => {
                const Icon = feature.icon;
                return (
                  <AnimateStaggerChild key={feature.title} index={fi}>
                    <div className="ws-card" style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start', height: '100%' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={20} color="var(--ws-brand-secondary)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{feature.title}</h3>
                        <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{feature.desc}</p>
                      </div>
                    </div>
                  </AnimateStaggerChild>
                );
              })}
            </div>
          </div>
        </SectionWrapper>
      ))}

      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <SectionHeading
            title="Your menu, understood after it goes live"
            subtitle="MenuList records decision-ready customer signals from the public menu and official business page, then shows them as clear owner metrics."
          />
        </AnimateOnScroll>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--ws-space-4)',
            marginTop: 'var(--ws-space-10)',
            maxWidth: '960px',
            marginLeft: 'auto',
            marginRight: 'auto',
            gridAutoRows: '1fr',
          }}
        >
          {[
            {
              title: 'Session quality is measured',
              desc: 'Menu sessions, engaged sessions, intent sessions, and action sessions are counted anonymously.',
            },
            {
              title: 'Interest stays attached to items and categories',
              desc: 'Item views, item taps, top categories, searches, no-result searches, and unavailable-item taps stay visible.',
            },
            {
              title: 'Final actions show what worked',
              desc: 'Calls, WhatsApp, directions, reservations, order clicks, shares, and official-page CTA taps feed Action Rate.',
            },
            {
              title: 'Pro turns metrics into next actions',
              desc: 'Eligible Pro plans can show a short action list and plain-language summaries from settled dashboard data.',
            },
          ].map((item, index) => (
            <AnimateStaggerChild key={item.title} index={index}>
              <div className="ws-card" style={{ height: '100%' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.title}</h3>
                <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{item.desc}</p>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>

        <AnimateOnScroll delay={0.1}>
          <p
            className="ws-caption"
            style={{
              textAlign: 'center',
              marginTop: 'var(--ws-space-8)',
              maxWidth: '720px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            No vanity analytics. No invasive tracking. MenuList focuses on decision-ready signals and privacy-conscious reporting: no customer names, no emails, no payment details, no scroll heatmaps, no hover tracking, and no exact GPS coordinates in this analytics flow.
          </p>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* Final CTA */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <h2 className="ws-h2">
              {t('Features.ctaTitle')}
            </h2>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('Features.ctaSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/get-started">{t('Features.ctaCta')}</WebsiteButton>
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </div>
  );
}
