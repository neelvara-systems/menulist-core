import { useTranslations } from 'next-intl';
import { LuCheck, LuMapPin } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const outlets = ['Mumbai Central', 'Bandra', 'Andheri', 'Juhu', 'Pune'];

const desktopOutletPaths = [
  'M490 112 C348 154 234 198 140 270',
  'M490 112 C398 160 338 204 300 270',
  'M490 112 C490 172 490 218 490 270',
  'M490 112 C582 160 642 204 680 270',
  'M490 112 C632 154 746 198 840 270',
];

const mobileOutletPaths = [
  'M175 78.5 C134 106 96 132 67.5 164.5',
  'M175 78.5 C175 110 175 136 175 164.5',
  'M175 78.5 C216 106 254 132 282.5 164.5',
];

const masterItems = [
  { name: 'Butter Chicken', price: '₹320' },
  { name: 'Biryani', price: '₹450' },
  { name: 'Paneer Tikka', price: '₹280' },
  { name: 'Dal Makhani', price: '₹220' },
];

function OutletConnectorPaths({ paths }: { paths: string[] }) {
  return (
    <>
      {paths.map((path, index) => (
        <path
          className="ws-location-source-map__path"
          d={path}
          key={`path-${index}`}
        />
      ))}
      {paths.map((path, index) => (
        <path
          className="ws-map-pulse ws-location-map-pulse"
          d={path}
          key={`pulse-${index}`}
          pathLength={1}
        />
      ))}
    </>
  );
}

export default function MultiLocationPage() {
  const t = useTranslations('Website');
  const step1Points = Array.from({ length: 4 }, (_, i) => t(`MultiLocation.step1P${i}`));
  const step2Points = Array.from({ length: 4 }, (_, i) => t(`MultiLocation.step2P${i}`));
  const step3Points = [
    t('MultiLocation.step3P0'),
    t('MultiLocation.step3P1'),
    t('MultiLocation.step3P2'),
    t('MultiLocation.step3ReadinessPoint'),
  ];
  return (
    <main>
      {/* ── Hero ─────────────────────────────── */}
      <SectionWrapper>
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
          <AnimateOnScroll>
            <WebsiteHeadline
              as="h1"
              parts={[
                { text: t('MultiLocation.heroTitle1') },
                { text: t('MultiLocation.heroHighlight'), highlight: true },
              ]}
            />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', color: 'var(--ws-text-secondary)' }}>
              {t('MultiLocation.heroSubtitle')}
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('MultiLocation.heroCta')}</WebsiteButton>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Master-to-outlets map ───────────── */}
      <section className="ws-support-flow-section">
        <div className="ws-support-flow-section__inner">
          <AnimateOnScroll>
            <p className="ws-support-flow-section__title">{t('MultiLocation.flowTitle')}</p>
            <p className="ws-support-flow-section__subtitle">{t('MultiLocation.flowSubtitle')}</p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.08}>
            <div className="ws-location-source-map">
              <svg className="ws-location-source-map__paths ws-location-source-map__paths--desktop" viewBox="0 0 980 360" aria-hidden="true" focusable="false">
                <OutletConnectorPaths paths={desktopOutletPaths} />
              </svg>
              <svg className="ws-location-source-map__paths ws-location-source-map__paths--mobile" viewBox="0 0 350 267" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <OutletConnectorPaths paths={mobileOutletPaths} />
              </svg>

              <div className="ws-location-source-map__master">
                <div className="ws-location-source-map__logo">
                  <LogoMark height={30} />
                </div>
                <div>
                  <p>{t('MultiLocation.flowMaster')}</p>
                  <span>{t('MultiLocation.flowSsot')}</span>
                </div>
              </div>

              <div className="ws-location-source-map__outlets">
                {Array.from({ length: 5 }, (_, i) => (
                  <div className="ws-location-source-map__outlet ws-map-destination-pulse ws-location-card-pulse" key={i}>
                    <span className="ws-location-source-map__outlet-icon">
                      <LuMapPin size={16} />
                    </span>
                    <p>{t('MultiLocation.flowOutlet')} {i + 1}</p>
                    <span>{t('MultiLocation.flowInherits')}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── The Problem ──────────────────────── */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <WebsiteHeadline as="h2" text={t('MultiLocation.problemTitle')} style={{ marginBottom: 'var(--ws-space-4)' }} />
            <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-4)' }}>
              {t('MultiLocation.problemBody')}
            </p>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ws-brand-secondary)' }}>
              {t('MultiLocation.problemConclusion')}
            </p>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* ── Step 01 — Master menu ────────────── */}
      <SectionWrapper>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>01</span>
              <WebsiteHeadline as="h2" text={t('MultiLocation.step1Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('MultiLocation.step1Subtitle')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                {step1Points.map((p) => (
                  <div key={p} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <LuCheck size={16} color="var(--ws-brand-secondary)" style={{ flexShrink: 0 }} />
                    <p className="ws-body-sm">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            {/* Master menu + outlets mockup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              <div style={{ backgroundColor: 'var(--ws-bg-subtle)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-default)', backgroundColor: 'var(--ws-brand-primary)', display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'white' }}>{t('MultiLocation.step1MockupTitle')}</span>
                </div>
                {masterItems.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-subtle)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-primary)' }}>{item.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-brand-secondary)' }}>{item.price}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
                {outlets.map((o) => (
                  <span key={o} style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ws-text-secondary)', backgroundColor: 'var(--ws-bg-subtle)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-sm)', padding: '4px 10px' }}>
                    ✓ {o}
                  </span>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Step 02 — Local control ──────────── */}
      <SectionWrapper variant="subtle">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            {/* Local price override visual */}
            <div style={{ backgroundColor: 'var(--ws-bg-primary)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-default)', display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                <LuMapPin size={14} color="var(--ws-text-muted)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{t('MultiLocation.step2MockupOutlet')}</span>
              </div>
              <div style={{ padding: 'var(--ws-space-4)' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-muted)', marginBottom: 'var(--ws-space-3)' }}>Butter Chicken</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-3)' }}>
                  <div style={{ padding: 'var(--ws-space-3)', backgroundColor: 'var(--ws-bg-subtle)', borderRadius: 'var(--ws-radius-md)', border: '1px solid var(--ws-border-subtle)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', marginBottom: '4px' }}>{t('MultiLocation.step2MockupMasterPrice')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ws-text-secondary)', textDecoration: 'line-through' }}>₹320</p>
                  </div>
                  <div style={{ padding: 'var(--ws-space-3)', backgroundColor: 'var(--ws-bg-accent)', borderRadius: 'var(--ws-radius-md)', border: '1px solid var(--ws-brand-light)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ws-brand-secondary)', marginBottom: '4px' }}>{t('MultiLocation.step2MockupThisOutlet')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ws-brand-secondary)' }}>₹360</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', marginTop: 'var(--ws-space-3)' }}>{t('MultiLocation.step2MockupNote')}</p>
              </div>
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderTop: '1px solid var(--ws-border-subtle)', backgroundColor: 'var(--ws-bg-subtle)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--ws-success)', fontWeight: 600 }}>{t('MultiLocation.step2MockupLocked')}</p>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>02</span>
              <WebsiteHeadline as="h2" text={t('MultiLocation.step2Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('MultiLocation.step2Subtitle')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                {step2Points.map((p) => (
                  <div key={p} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <LuCheck size={16} color="var(--ws-brand-secondary)" style={{ flexShrink: 0 }} />
                    <p className="ws-body-sm">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Step 03 — One dashboard ──────────── */}
      <SectionWrapper>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>03</span>
              <WebsiteHeadline as="h2" text={t('MultiLocation.step3Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('MultiLocation.step3ReadinessSubtitle')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                {step3Points.map((p) => (
                  <div key={p} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <LuCheck size={16} color="var(--ws-brand-secondary)" style={{ flexShrink: 0 }} />
                    <p className="ws-body-sm">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            {/* Dashboard locations mockup */}
            <div style={{ backgroundColor: 'var(--ws-bg-subtle)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-default)', backgroundColor: 'var(--ws-bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{t('MultiLocation.step3MockupTitle')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ws-brand-secondary)', fontWeight: 600 }}>{t('MultiLocation.step3MockupManage')}</span>
              </div>
              {outlets.map((outlet, i) => (
                <AnimateStaggerChild key={outlet} index={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                      <LuMapPin size={13} color="var(--ws-text-muted)" />
                      <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-primary)' }}>{outlet}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>{t('MultiLocation.step3MockupActive')}</span>
                  </div>
                </AnimateStaggerChild>
              ))}
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--ws-brand-secondary)', fontWeight: 600, cursor: 'pointer' }}>{t('MultiLocation.step3MockupAdd')}</span>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Simple pricing ───────────────────── */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <WebsiteHeadline as="h2" text={t('MultiLocation.pricingTitle')} style={{ marginBottom: 'var(--ws-space-4)' }} />
            <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
              {t('MultiLocation.pricingSubtitle')}
            </p>
            <WebsiteButton href="/pricing" variant="ghost">{t('MultiLocation.pricingCta')}</WebsiteButton>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* ── CTA ──────────────────────────────── */}
      <SectionWrapper>
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-narrow)', margin: '0 auto' }}>
          <AnimateOnScroll>
            <WebsiteHeadline as="h2" text={t('MultiLocation.ctaTitle')} />
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('MultiLocation.ctaCta')}</WebsiteButton>
            </div>
            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('MultiLocation.ctaCaption')}
            </p>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>
    </main>
  );
}
