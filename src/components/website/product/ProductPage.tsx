import { useTranslations } from 'next-intl';
import { LuCheck, LuFileText, LuGlobe, LuImage, LuLanguages, LuLink, LuMonitor, LuQrCode, LuShare2, LuSmartphone, LuStar, LuType, LuZap } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const surfaceIcons = [LuQrCode, LuLink, LuMonitor, LuFileText, LuGlobe, LuSmartphone];
const aiIcons = [LuImage, LuFileText, LuLanguages];
const aiKeys = ['step2AiImages', 'step2AiDesc', 'step2AiTranslations'];
const aiSubKeys = ['step2AiImagesSub', 'step2AiDescSub', 'step2AiTranslationsSub'];

const sampleItems = [
  { name: 'Grilled Salmon', price: '₹450' },
  { name: 'Caesar Salad', price: '₹280' },
  { name: 'Cheese Burger', price: '₹320' },
  { name: 'Pasta Pomodoro', price: '₹260' },
  { name: 'Tiramisu', price: '₹180' },
];

export default function ProductPage() {
  const t = useTranslations('Website');
  const surfaces = surfaceIcons.map((icon, i) => ({
    icon,
    title: t(`Surfaces.surface${i}Title`),
    desc: t(`Surfaces.surface${i}Desc`),
  }));
  const step1Points = Array.from({ length: 4 }, (_, i) => t(`HowItWorks.step1P${i}`));
  const step3Points = Array.from({ length: 3 }, (_, i) => t(`HowItWorks.step3P${i}`));
  const step4Points = Array.from({ length: 4 }, (_, i) => t(`HowItWorks.step4P${i}`));
  const flowInputs = [
    { key: 'flowPhoto', Icon: LuImage },
    { key: 'flowPdf', Icon: LuFileText },
    { key: 'flowTypedText', Icon: LuType },
  ];
  const flowOutputs = [
    { key: 'flowQr', Icon: LuQrCode, pulseClass: 'ws-map-card-output-arrival-0' },
    { key: 'flowWebPage', Icon: LuLink, pulseClass: 'ws-map-card-output-arrival-1' },
    { key: 'flowScreens', Icon: LuMonitor, pulseClass: 'ws-map-card-output-arrival-2' },
    { key: 'flowPdfOut', Icon: LuFileText, pulseClass: 'ws-map-card-output-arrival-3' },
    { key: 'flowOfficial', Icon: LuGlobe, pulseClass: 'ws-map-card-output-arrival-4' },
    { key: 'flowApp', Icon: LuSmartphone, pulseClass: 'ws-map-card-output-arrival-5' },
  ];
  const publishedSurfaces = Array.from({ length: 6 }, (_, i) => t(`HowItWorks.step3Surface${i}`));
  const aiFeatures = aiIcons.map((icon, i) => ({
    icon,
    label: t(`HowItWorks.${aiKeys[i]}`),
    sub: t(`HowItWorks.${aiSubKeys[i]}`),
  }));
  return (
    <main>
      {/* ── Hero ─────────────────────────────── */}
      <SectionWrapper>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <AnimateOnScroll>
              <WebsiteHeadline
                as="h1"
                parts={[
                { text: t('HowItWorks.heroTitle') },
                { text: t('HowItWorks.heroHighlight'), highlight: true },
              ]}
            />
              <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', color: 'var(--ws-text-secondary)' }}>
                {t('HowItWorks.heroSubtitle')}
              </p>
              <div style={{ marginTop: 'var(--ws-space-8)' }}>
                <WebsiteButton href="/create-menu">{t('HowItWorks.heroCta')}</WebsiteButton>
              </div>
            </AnimateOnScroll>
          </div>
      </SectionWrapper>

      {/* ── Source-to-surfaces map ───────────── */}
      <section className="ws-support-flow-section">
        <div className="ws-support-flow-section__inner">
          <AnimateOnScroll>
            <p className="ws-support-flow-section__title">{t('HowItWorks.flowTitle')}</p>
            <p className="ws-support-flow-section__subtitle">{t('HowItWorks.flowSubtitle')}</p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.08}>
            <div className="ws-page-source-map ws-page-source-map--surfaces">
              <svg className="ws-page-source-map__paths ws-page-source-map__paths--desktop" viewBox="0 0 980 360" aria-hidden="true" focusable="false">
                <path className="ws-page-source-map__path" d="M190 84 C312 84 328 176 452 176" />
                <path className="ws-page-source-map__path" d="M190 176 C312 176 328 176 452 176" />
                <path className="ws-page-source-map__path" d="M190 268 C312 268 328 176 452 176" />
                <path className="ws-page-source-map__path" d="M476 176 C552 176 552 106 576 106" />
                <path className="ws-page-source-map__path" d="M476 176 C640 176 660 106 770 106" />
                <path className="ws-page-source-map__path" d="M476 176 C548 176 554 180 576 180" />
                <path className="ws-page-source-map__path" d="M476 176 C640 176 660 180 770 180" />
                <path className="ws-page-source-map__path" d="M476 176 C552 176 552 254 576 254" />
                <path className="ws-page-source-map__path" d="M476 176 C640 176 660 254 770 254" />
                <path className="ws-page-source-map__path" d="M756 106 H770" />
                <path className="ws-page-source-map__path" d="M756 180 H770" />
                <path className="ws-page-source-map__path" d="M756 254 H770" />
                <path className="ws-map-pulse ws-map-pulse-delay-0" pathLength={1} d="M190 84 C312 84 328 176 452 176" />
                <path className="ws-map-pulse ws-map-pulse-delay-1" pathLength={1} d="M190 176 C312 176 328 176 452 176" />
                <path className="ws-map-pulse ws-map-pulse-delay-2" pathLength={1} d="M190 268 C312 268 328 176 452 176" />
                <path className="ws-map-pulse ws-map-pulse-output-0" pathLength={1} d="M476 176 C552 176 552 106 576 106" />
                <path className="ws-map-pulse ws-map-pulse-output-1" pathLength={1} d="M476 176 C640 176 660 106 770 106" />
                <path className="ws-map-pulse ws-map-pulse-output-2" pathLength={1} d="M476 176 C548 176 554 180 576 180" />
                <path className="ws-map-pulse ws-map-pulse-output-3" pathLength={1} d="M476 176 C640 176 660 180 770 180" />
                <path className="ws-map-pulse ws-map-pulse-output-4" pathLength={1} d="M476 176 C552 176 552 254 576 254" />
                <path className="ws-map-pulse ws-map-pulse-output-5" pathLength={1} d="M476 176 C640 176 660 254 770 254" />
                <path className="ws-map-pulse ws-map-pulse-output-1" pathLength={1} d="M756 106 H770" />
                <path className="ws-map-pulse ws-map-pulse-output-3" pathLength={1} d="M756 180 H770" />
                <path className="ws-map-pulse ws-map-pulse-output-5" pathLength={1} d="M756 254 H770" />
              </svg>
              <svg className="ws-page-source-map__paths ws-page-source-map__paths--mobile" viewBox="0 0 350 491" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="ws-page-source-map__path" d="M67 107.5 C85 128 112 145 137 162" />
                <path className="ws-page-source-map__path" d="M175 107.5 C175 122 175 135 175 143.5" />
                <path className="ws-page-source-map__path" d="M283 107.5 C265 128 238 145 213 162" />
                <path className="ws-page-source-map__path" d="M108 246 C96 258 82 266 68.5 275.5" />
                <path className="ws-page-source-map__path" d="M175 251.5 C175 260 175 268 175 275.5" />
                <path className="ws-page-source-map__path" d="M242 246 C254 258 268 266 281.5 275.5" />
                <path className="ws-page-source-map__path" d="M125 251.5 C88 292 80 332 68.5 374" />
                <path className="ws-page-source-map__path" d="M175 251.5 C175 300 175 335 175 374" />
                <path className="ws-page-source-map__path" d="M225 251.5 C262 292 270 332 281.5 374" />
                <path className="ws-map-pulse ws-map-pulse-delay-0" pathLength={1} d="M67 107.5 C85 128 112 145 137 162" />
                <path className="ws-map-pulse ws-map-pulse-delay-1" pathLength={1} d="M175 107.5 C175 122 175 135 175 143.5" />
                <path className="ws-map-pulse ws-map-pulse-delay-2" pathLength={1} d="M283 107.5 C265 128 238 145 213 162" />
                <path className="ws-map-pulse ws-map-pulse-output-0" pathLength={1} d="M108 246 C96 258 82 266 68.5 275.5" />
                <path className="ws-map-pulse ws-map-pulse-output-1" pathLength={1} d="M175 251.5 C175 260 175 268 175 275.5" />
                <path className="ws-map-pulse ws-map-pulse-output-2" pathLength={1} d="M242 246 C254 258 268 266 281.5 275.5" />
                <path className="ws-map-pulse ws-map-pulse-output-3" pathLength={1} d="M125 251.5 C88 292 80 332 68.5 374" />
                <path className="ws-map-pulse ws-map-pulse-output-4" pathLength={1} d="M175 251.5 C175 300 175 335 175 374" />
                <path className="ws-map-pulse ws-map-pulse-output-5" pathLength={1} d="M225 251.5 C262 292 270 332 281.5 374" />
              </svg>

              <div className="ws-page-source-map__stack">
                {flowInputs.map(({ key, Icon }) => (
                  <div className="ws-page-source-map__item" key={key}>
                    <span className="ws-page-source-map__icon">
                      <Icon size={18} />
                    </span>
                    <span>{t(`HowItWorks.${key}`)}</span>
                  </div>
                ))}
              </div>

              <div className="ws-page-source-map__core" aria-label="MenuList">
                <span className="ws-page-source-map__ring ws-page-source-map__ring--outer" />
                <span className="ws-page-source-map__ring ws-page-source-map__ring--inner" />
                <div className="ws-page-source-map__logo">
                  <LogoMark height={42} />
                </div>
                <div className="ws-page-source-map__gate">
                  <LuZap size={14} />
                  <span>{t('Workflow.pipelinePrepares')}</span>
                </div>
              </div>

              <div className="ws-page-source-map__stack ws-page-source-map__stack--outputs">
                {flowOutputs.map(({ key, Icon, pulseClass }) => (
                  <div className={`ws-page-source-map__item ws-map-destination-pulse ${pulseClass}`} key={key}>
                    <span className="ws-page-source-map__icon">
                      <Icon size={18} />
                    </span>
                    <span>{t(`HowItWorks.${key}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── Step 01 — Upload ─────────────────── */}
      <SectionWrapper>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--ws-space-16)',
            alignItems: 'center',
            maxWidth: '960px',
            margin: '0 auto',
          }}
        >
          <AnimateOnScroll>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>01</span>
              <WebsiteHeadline as="h2" text={t('HowItWorks.step1Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('HowItWorks.step1Subtitle')}
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
            {/* CSS mockup — extracted menu items */}
            <div style={{ backgroundColor: 'var(--ws-bg-subtle)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-default)', backgroundColor: 'var(--ws-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{t('HowItWorks.step1MockupTitle')}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ws-success)', backgroundColor: 'var(--ws-bg-success-soft)', padding: '2px 10px', borderRadius: '20px', border: '1px solid var(--ws-success)' }}>{t('HowItWorks.step1MockupDone')}</span>
              </div>
              <div style={{ padding: 'var(--ws-space-2) 0' }}>
                {sampleItems.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--ws-space-3) var(--ws-space-4)', borderBottom: '1px solid var(--ws-border-subtle)' }}>
                    <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-primary)' }}>{item.name}</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ws-brand-secondary)' }}>{item.price}</span>
                  </div>
                ))}
                <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-muted)' }}>{t('HowItWorks.step1MockupMore')}</span>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Step 02 — AI prepares everything ── */}
      <SectionWrapper variant="subtle">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--ws-space-16)',
            alignItems: 'center',
            maxWidth: '960px',
            margin: '0 auto',
          }}
        >
          {/* Visuals first on this step */}
          <AnimateOnScroll>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
              {aiFeatures.map(({ icon: Icon, label, sub }, i) => (
                <AnimateStaggerChild key={label} index={i}>
                  <div style={{ backgroundColor: 'var(--ws-bg-primary)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', padding: 'var(--ws-space-4) var(--ws-space-5)', display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={22} color="var(--ws-brand-secondary)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ws-text-primary)' }}>{label}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-muted)', marginTop: '1px' }}>{sub}</p>
                    </div>
                <LuCheck size={16} color="var(--ws-success)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  </div>
                </AnimateStaggerChild>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>02</span>
              <WebsiteHeadline as="h2" text={t('HowItWorks.step2Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-4)' }}>
                {t('HowItWorks.step2Subtitle')}
              </p>
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)' }}>
                {t('HowItWorks.step2Subtitle2')}
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Step 03 — Publish ────────────────── */}
      <SectionWrapper>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--ws-space-16)',
            alignItems: 'center',
            maxWidth: '960px',
            margin: '0 auto',
          }}
        >
          <AnimateOnScroll>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>03</span>
              <WebsiteHeadline as="h2" text={t('HowItWorks.step3Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('HowItWorks.step3Subtitle')}
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
            {/* Published confirmation visual */}
            <div style={{ backgroundColor: 'var(--ws-bg-subtle)', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-lg)', padding: 'var(--ws-space-6)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--ws-space-5)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--ws-bg-success-soft)', border: '2px solid var(--ws-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)' }}>
                  <LuCheck size={24} color="var(--ws-success)" />
                </div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ws-text-primary)' }}>{t('HowItWorks.step3Published')}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)' }}>
                {publishedSurfaces.map((s) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--ws-space-2) var(--ws-space-3)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-md)', border: '1px solid var(--ws-border-subtle)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{s}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ws-success)' }}>{t('HowItWorks.step3Live')}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Your menu, everywhere ─────────────── */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <WebsiteHeadline as="h2" text={t('HowItWorks.surfacesTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)', color: 'var(--ws-text-secondary)' }}>
              {t('HowItWorks.surfacesSubtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="ws-feature-card-grid">
          {surfaces.map((surface, index) => {
            const Icon = surface.icon;
            return (
              <AnimateStaggerChild key={surface.title} index={index} style={{ height: '100%' }}>
                <WebsiteFeatureCard
                  icon={Icon}
                  title={surface.title}
                  description={surface.desc}
                  compact
                />
              </AnimateStaggerChild>
            );
          })}
        </div>
      </SectionWrapper>

      {/* ── Step 04 — Stays current ───────────── */}
      <SectionWrapper>
        <AnimateOnScroll>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>04</span>
            <WebsiteHeadline as="h2" text={t('HowItWorks.step4Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
            <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-8)' }}>
              {t('HowItWorks.step4Subtitle')}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--ws-space-4)',
              }}
            >
                {step4Points.map((p, i) => (
                  <AnimateStaggerChild key={p} index={i}>
                  <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', flexShrink: 0 }} />
                    <p className="ws-body-sm">{p}</p>
                  </div>
                </AnimateStaggerChild>
                ))}
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* ── Dedicated OBP Section ───────────────── */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-6)' }}>
              <LuGlobe size={28} color="var(--ws-brand-secondary)" />
            </div>
            <WebsiteHeadline as="h2" text={t('HowItWorks.obpTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)', color: 'var(--ws-text-secondary)' }}>
              {t('HowItWorks.obpSubtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="ws-feature-card-grid" style={{ marginTop: 'var(--ws-space-10)' }}>
          {[LuStar, LuImage, LuQrCode, LuShare2, LuGlobe, LuCheck].map((Icon, index) => {
            const item = {
              icon: Icon,
              title: t(`HowItWorks.obp${index}Title`),
              desc: t(`HowItWorks.obp${index}Desc`),
            };
            return (
              <AnimateStaggerChild key={index} index={index} style={{ height: '100%' }}>
                <WebsiteFeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.desc}
                  compact
                />
              </AnimateStaggerChild>
            );
          })}
        </div>
      </SectionWrapper>

      {/* ── CTA ──────────────────────────────────────── */}
      <SectionWrapper variant="subtle">
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-narrow)', margin: '0 auto' }}>
          <AnimateOnScroll>
            <WebsiteHeadline as="h2" text={t('HowItWorks.ctaTitle')} />
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('HowItWorks.ctaCta')}</WebsiteButton>
            </div>
            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('HowItWorks.ctaCaption')}
            </p>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>
    </main>
  );
}
