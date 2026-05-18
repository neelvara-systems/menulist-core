import { useTranslations } from 'next-intl';
import { LuCheck, LuFileText, LuGlobe, LuImage, LuLanguages, LuLink, LuMonitor, LuQrCode, LuShare2, LuSmartphone, LuStar } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

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
    { label: t('HowItWorks.flowPhoto'), x: 150 },
    { label: t('HowItWorks.flowPdf'), x: 430 },
    { label: t('HowItWorks.flowTypedText'), x: 710 },
  ];
  const flowOutputs = [
    { label: t('HowItWorks.flowQr'), x: 70 },
    { label: t('HowItWorks.flowWebPage'), x: 214 },
    { label: t('HowItWorks.flowScreens'), x: 358 },
    { label: t('HowItWorks.flowPdfOut'), x: 502 },
    { label: t('HowItWorks.flowOfficial'), x: 646 },
    { label: t('HowItWorks.flowApp'), x: 790 },
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
              <WebsiteMobileSupportHint />
              <WebsiteOwnerApprovalHint />
              <div style={{ marginTop: 'var(--ws-space-8)' }}>
                <WebsiteButton href="/create-menu">{t('HowItWorks.heroCta')}</WebsiteButton>
              </div>
            </AnimateOnScroll>
          </div>
      </SectionWrapper>

      {/* ── Animated System Flow Diagram ────── */}
      <section style={{ background: '#0f172a', padding: '5rem var(--ws-space-6)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem', letterSpacing: 0 }}>
            {t('HowItWorks.flowTitle')}
          </p>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '2.5rem' }}>
            {t('HowItWorks.flowSubtitle')}
          </p>
          <svg viewBox="0 0 860 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <style>{`
                @keyframes hiw-flow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
                .hiw-line { animation: hiw-flow 1.6s linear infinite; }
                .hiw-l0 { animation: hiw-flow 1.6s linear infinite 0s; }
                .hiw-l1 { animation: hiw-flow 1.6s linear infinite 0.18s; }
                .hiw-l2 { animation: hiw-flow 1.6s linear infinite 0.36s; }
                .hiw-l3 { animation: hiw-flow 1.6s linear infinite 0.54s; }
                .hiw-l4 { animation: hiw-flow 1.6s linear infinite 0.72s; }
                .hiw-l5 { animation: hiw-flow 1.6s linear infinite 0.9s; }
                .hiw-l6 { animation: hiw-flow 1.6s linear infinite 1.08s; }
                .hiw-l7 { animation: hiw-flow 1.6s linear infinite 1.26s; }
              `}</style>
            </defs>

            {/* Input nodes */}
            {flowInputs.map(({ label, x }) => (
              <g key={label}>
                <rect x={x - 52} y="10" width="104" height="38" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x={x} y="33" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">{label}</text>
              </g>
            ))}

            {/* Input → centre lines */}
            {[{ x: 150, delay: 'hiw-l0' }, { x: 430, delay: 'hiw-l1' }, { x: 710, delay: 'hiw-l2' }].map(({ x, delay }) => (
              <line key={x} className={delay} x1={x} y1="48" x2="430" y2="118" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.5" />
            ))}

            {/* Central MenuList node */}
            <rect x="290" y="118" width="280" height="58" rx="14" fill="#1d4ed8" />
            <text x="430" y="151" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="Inter, sans-serif">MenuList</text>

            {/* Centre → output lines */}
            {[{ x: 70, delay: 'hiw-l3' }, { x: 214, delay: 'hiw-l4' }, { x: 358, delay: 'hiw-l5' }, { x: 502, delay: 'hiw-l6' }, { x: 646, delay: 'hiw-l7' }, { x: 790, delay: 'hiw-l7' }].map(({ x, delay }) => (
              <line key={x} className={delay} x1="430" y1="176" x2={x} y2="240" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.5" />
            ))}

            {/* Output nodes */}
            {flowOutputs.map(({ label, x }) => (
              <g key={label}>
                <rect x={x - 52} y="240" width="104" height="42" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x={x} y="266" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">{label}</text>
              </g>
            ))}
          </svg>
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
                  <div key={p} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                    <LuCheck size={16} color="var(--ws-brand-secondary)" style={{ marginTop: '3px', flexShrink: 0 }} />
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
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 10px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>{t('HowItWorks.step1MockupDone')}</span>
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
                    <LuCheck size={16} color="#16a34a" style={{ marginLeft: 'auto', flexShrink: 0 }} />
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
                  <div key={p} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                    <LuCheck size={16} color="var(--ws-brand-secondary)" style={{ marginTop: '3px', flexShrink: 0 }} />
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
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)' }}>
                  <LuCheck size={24} color="#16a34a" />
                </div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ws-text-primary)' }}>{t('HowItWorks.step3Published')}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)' }}>
                {publishedSurfaces.map((s) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--ws-space-2) var(--ws-space-3)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-md)', border: '1px solid var(--ws-border-subtle)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{s}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>{t('HowItWorks.step3Live')}</span>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--ws-space-4)',
            marginTop: 'var(--ws-space-12)',
            maxWidth: '960px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {surfaces.map((surface, index) => {
            const Icon = surface.icon;
            return (
              <AnimateStaggerChild key={surface.title} index={index} style={{ height: '100%' }}>
                <div className="ws-card" style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start', height: '100%' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color="var(--ws-brand-secondary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{surface.title}</h3>
                    <p className="ws-caption" style={{ marginTop: '4px' }}>{surface.desc}</p>
                  </div>
                </div>
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
                  <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', marginTop: '7px', flexShrink: 0 }} />
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--ws-space-4)',
            marginTop: 'var(--ws-space-10)',
            maxWidth: '960px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {[LuStar, LuImage, LuQrCode, LuShare2, LuGlobe, LuCheck].map((Icon, index) => {
            const item = {
              icon: Icon,
              title: t(`HowItWorks.obp${index}Title`),
              desc: t(`HowItWorks.obp${index}Desc`),
            };
            return (
              <AnimateStaggerChild key={index} index={index} style={{ height: '100%' }}>
                <div className="ws-card" style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start', height: '100%' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color="var(--ws-brand-secondary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.title}</h3>
                    <p className="ws-caption" style={{ marginTop: '4px' }}>{item.desc}</p>
                  </div>
                </div>
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
