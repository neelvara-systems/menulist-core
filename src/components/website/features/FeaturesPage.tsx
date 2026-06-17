'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LuActivity, LuArrowRight, LuBadgeCheck, LuBarChart3, LuBot, LuBriefcase, LuCamera, LuCheck, LuEye, LuFileText, LuImage, LuLanguages, LuLayoutGrid, LuLink, LuList, LuMessageSquare, LuMonitor, LuPackage, LuPalette, LuPrinter, LuQrCode, LuRefreshCw, LuShield, LuSmartphone, LuSparkles, LuTrendingUp, LuUsers, LuZap } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const groupIds = ['setup', 'surfaces', 'brand', 'smart', 'operations', 'integrity'];
const groupIcons = [
  [LuCamera, LuImage, LuFileText, LuLanguages],
  [LuQrCode, LuLayoutGrid, LuMonitor, LuLink, LuFileText, LuList],
  [LuPalette, LuPackage, LuPrinter],
  [LuSparkles, LuUsers, LuBarChart3, LuTrendingUp],
  [LuBot, LuActivity, LuRefreshCw, LuZap, LuBriefcase, LuEye, LuMessageSquare, LuList, LuLink, LuSmartphone, LuUsers, LuMessageSquare, LuLanguages],
  [LuShield, LuCheck, LuBadgeCheck],
];

const featurePageHrefByCard = new Map<string, string>([
  ['0-0', '/features/menu-import'],
  ['0-1', '/features/menu-content-prep'],
  ['0-2', '/features/menu-content-prep'],
  ['0-3', '/features/menu-content-prep'],
  ['1-0', '/features/qr-menu-links'],
  ['1-1', '/features/official-business-page'],
  ['1-4', '/features/print-ready-kit'],
  ['1-5', '/features/public-discovery'],
  ['2-2', '/features/print-ready-kit'],
  ['3-0', '/features/featured-choices'],
  ['3-3', '/features/menu-quality-validation'],
  ['4-0', '/ai-menu-manager'],
  ['4-1', '/features/business-health'],
  ['4-9', '/features/owner-phone-dashboard'],
  ['4-11', '/features/customer-feedback-loop'],
  ['5-0', '/features/menu-quality-validation'],
  ['5-1', '/features/menu-quality-validation'],
  ['5-2', '/features/menu-quality-validation'],
]);

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
      href: featurePageHrefByCard.get(`${gi}-${fi}`),
    })),
  }));
  const analyticsCardIcons = [LuBarChart3, LuEye, LuTrendingUp, LuList];
  const analyticsCards = analyticsCardIcons.map((icon, i) => ({
    icon,
    title: t(`Features.analytics${i}Title`),
    desc: t(`Features.analytics${i}Desc`),
  }));

  return (
    <div className="ws-page">
      {/* Hero */}
      <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
        <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
          <AnimateOnScroll>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
              {t('Features.heroEyebrow')}
            </p>
            <WebsiteHeadline as="h1">
              {t('Features.heroTitle1')}<br />
              <span className="ws-headline__highlight">{t('Features.heroTitle2')}</span>
            </WebsiteHeadline>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
              {t('Features.heroSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('Features.heroCta')}</WebsiteButton>
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
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', backgroundColor: 'var(--ws-bg-accent)', padding: '3px 10px', borderRadius: '20px' }}>
                  {group.label}
                </span>
              </div>
              <SectionHeading
                title={group.heading}
                subtitle={group.subheading}
                centered={false}
              />
            </AnimateOnScroll>

            <div className="ws-feature-card-grid" style={{ marginTop: 'var(--ws-space-10)' }}>
              {group.features.map((feature, fi) => {
                const Icon = feature.icon;
                const card = (
                  <WebsiteFeatureCard
                    icon={Icon}
                    title={feature.title}
                    description={feature.desc}
                    action={feature.href ? (
                      <span className="ws-feature-card__action">
                        {t('Features.cardAction')}
                        <LuArrowRight size={15} aria-hidden="true" />
                      </span>
                    ) : undefined}
                    leadingIcon
                    compact
                  />
                );
                return (
                  <AnimateStaggerChild key={feature.title} index={fi}>
                    {feature.href ? (
                      <Link href={feature.href} className="ws-feature-card-link" aria-label={`${feature.title} - ${t('Features.cardCta')}`}>
                        {card}
                      </Link>
                    ) : card}
                  </AnimateStaggerChild>
                );
              })}
            </div>
          </div>
        </SectionWrapper>
      ))}

      <SectionWrapper variant="subtle">
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', marginBottom: 'var(--ws-space-3)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', backgroundColor: 'var(--ws-bg-accent)', padding: '3px 10px', borderRadius: '20px' }}>
                {t('Features.analyticsLabel')}
              </span>
            </div>
            <SectionHeading
              title={t('Features.analyticsTitle')}
              subtitle={t('Features.analyticsSubtitle')}
              centered={false}
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.08} className="ws-analytics-cross-map">
            <svg className="ws-analytics-cross-map__paths ws-analytics-cross-map__paths--desktop" viewBox="0 0 1000 560" aria-hidden="true" focusable="false">
              <line className="ws-analytics-cross-map__axis" x1="80" y1="280" x2="920" y2="280" />
              <line className="ws-analytics-cross-map__axis" x1="500" y1="54" x2="500" y2="506" />
              <path className="ws-analytics-cross-map__path" d="M500 280 L80 280" pathLength={1} />
              <path className="ws-analytics-cross-map__path" d="M500 280 L920 280" pathLength={1} />
              <path className="ws-analytics-cross-map__path" d="M500 280 L500 54" pathLength={1} />
              <path className="ws-analytics-cross-map__path" d="M500 280 L500 506" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-0" d="M500 280 L80 280" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-1" d="M500 280 L920 280" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-2" d="M500 280 L500 54" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-3" d="M500 280 L500 506" pathLength={1} />
            </svg>
            <svg className="ws-analytics-cross-map__paths ws-analytics-cross-map__paths--mobile" viewBox="0 0 360 860" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path className="ws-analytics-cross-map__path" d="M180 48 L180 812" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-0" d="M180 430 L180 48" pathLength={1} />
              <path className="ws-map-pulse ws-map-pulse-delay-1" d="M180 430 L180 812" pathLength={1} />
            </svg>

            {analyticsCards.map((item, index) => (
              <AnimateStaggerChild key={item.title} index={index} className={`ws-analytics-cross-map__slot ws-analytics-cross-map__slot--${index}`}>
                <WebsiteFeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.desc}
                  className="ws-analytics-cross-map__card"
                  compact
                />
              </AnimateStaggerChild>
            ))}

            <div className="ws-analytics-cross-map__core" aria-label="MenuList">
              <span className="ws-analytics-cross-map__ring ws-analytics-cross-map__ring--outer" />
              <div className="ws-analytics-cross-map__logo">
                <LogoMark height={42} />
              </div>
            </div>
          </AnimateOnScroll>

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
              {t('Features.analyticsFooter')}
            </p>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* Final CTA */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <WebsiteHeadline as="h2" text={t('Features.ctaTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('Features.ctaSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('Features.ctaCta')}</WebsiteButton>
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </div>
  );
}
