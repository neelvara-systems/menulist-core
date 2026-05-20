import { useTranslations } from 'next-intl';
import { LuCheck, LuMapPin } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

const outlets = ['Mumbai Central', 'Bandra', 'Andheri', 'Juhu', 'Pune'];

const masterItems = [
  { name: 'Butter Chicken', price: '₹320' },
  { name: 'Biryani', price: '₹450' },
  { name: 'Paneer Tikka', price: '₹280' },
  { name: 'Dal Makhani', price: '₹220' },
];

export default function MultiLocationPage() {
  const t = useTranslations('Website');
  const step1Points = Array.from({ length: 4 }, (_, i) => t(`MultiLocation.step1P${i}`));
  const step2Points = Array.from({ length: 4 }, (_, i) => t(`MultiLocation.step2P${i}`));
  const step3Points = Array.from({ length: 4 }, (_, i) => t(`MultiLocation.step3P${i}`));
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
            <WebsiteMobileSupportHint />
            <WebsiteOwnerApprovalHint />
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/create-menu">{t('MultiLocation.heroCta')}</WebsiteButton>
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>

      {/* ── Dark animated flow diagram ──────── */}
      <section style={{ background: '#0f172a', padding: '5rem var(--ws-space-6)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem', letterSpacing: 0 }}>
            {t('MultiLocation.flowTitle')}
          </p>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '2.5rem' }}>
            {t('MultiLocation.flowSubtitle')}
          </p>
          <svg viewBox="0 0 860 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <style>{`
                @keyframes ml-flow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
                .ml-l0 { animation: ml-flow 1.5s linear infinite 0s; }
                .ml-l1 { animation: ml-flow 1.5s linear infinite 0.22s; }
                .ml-l2 { animation: ml-flow 1.5s linear infinite 0.44s; }
                .ml-l3 { animation: ml-flow 1.5s linear infinite 0.66s; }
                .ml-l4 { animation: ml-flow 1.5s linear infinite 0.88s; }
              `}</style>
            </defs>

            {/* Master Menu (HQ) — top central */}
            <rect x="295" y="14" width="270" height="58" rx="14" fill="#1d4ed8" />
            <text x="430" y="43" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">{t('MultiLocation.flowMaster')}</text>
            <text x="430" y="62" textAnchor="middle" fill="#93c5fd" fontSize="11" fontFamily="Inter, sans-serif">{t('MultiLocation.flowSsot')}</text>

            {/* Master → outlet lines (animated electricity) */}
            {[76, 206, 430, 654, 784].map((x, i) => (
              <line
                key={x}
                className={`ml-l${i}`}
                x1="430" y1="72"
                x2={x} y2="190"
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                strokeOpacity="0.55"
              />
            ))}

            {/* Outlet nodes */}
            {[76, 206, 430, 654, 784].map((x, i) => (
              <g key={x}>
                <rect x={x - 56} y="190" width="112" height="62" rx="10" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x={x} y="218" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">{t('MultiLocation.flowOutlet')} {i + 1}</text>
                <text x={x} y="238" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="Inter, sans-serif">{t('MultiLocation.flowInherits')}</text>
              </g>
            ))}
          </svg>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
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
                  <div style={{ padding: 'var(--ws-space-3)', backgroundColor: '#eff6ff', borderRadius: 'var(--ws-radius-md)', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '0.75rem', color: '#2563eb', marginBottom: '4px' }}>{t('MultiLocation.step2MockupThisOutlet')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1d4ed8' }}>₹360</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', marginTop: 'var(--ws-space-3)' }}>{t('MultiLocation.step2MockupNote')}</p>
              </div>
              <div style={{ padding: 'var(--ws-space-3) var(--ws-space-4)', borderTop: '1px solid var(--ws-border-subtle)', backgroundColor: 'var(--ws-bg-subtle)' }}>
                <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>{t('MultiLocation.step2MockupLocked')}</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--ws-space-16)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div>
              <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--ws-border-default)', lineHeight: 1, display: 'block', marginBottom: 'var(--ws-space-4)' }}>03</span>
              <WebsiteHeadline as="h2" text={t('MultiLocation.step3Title')} style={{ marginBottom: 'var(--ws-space-4)' }} />
              <p className="ws-body" style={{ color: 'var(--ws-text-secondary)', marginBottom: 'var(--ws-space-6)' }}>
                {t('MultiLocation.step3Subtitle')}
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
