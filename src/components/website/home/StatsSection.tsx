import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const STAT_COUNT = 4;

export default function StatsSection() {
  const t = useTranslations('Website');
  const stats = Array.from({ length: STAT_COUNT }, (_, i) => ({
    number: t(`Stats.stat${i}Number`),
    suffix: i === 2 ? t('Stats.stat2Suffix') : undefined,
    label: t(`Stats.stat${i}Label`),
    desc: t(`Stats.stat${i}Desc`),
    accent: 'var(--ws-brand-primary)',
  }));
  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ws-text-muted)',
            marginBottom: 'var(--ws-space-4)',
          }}
        >
          {t('Stats.byTheNumbers')}
        </p>
        <SectionHeading
          title={t('Stats.title')}
          highlightedText={t('Stats.highlight')}
          centered
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--ws-space-4)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: 'var(--ws-space-12)',
        }}
      >
        {stats.map((stat, i) => (
          <AnimateStaggerChild key={stat.label} index={i}>
            <div
              style={{
                padding: 'var(--ws-space-6)',
                borderRadius: 'var(--ws-radius-lg)',
                backgroundColor: 'var(--ws-bg-subtle)',
                border: '1px solid var(--ws-border-default)',
                height: '100%',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 800,
                  color: stat.accent,
                  lineHeight: 1,
                  marginBottom: '4px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.number}
                {stat.suffix && (
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, marginLeft: '2px' }}>
                    {stat.suffix}
                  </span>
                )}
              </p>
              <p className="ws-body-sm" style={{ fontWeight: 600, marginBottom: 'var(--ws-space-2)' }}>
                {stat.label}
              </p>
              <p className="ws-caption" style={{ lineHeight: 1.5 }}>
                {stat.desc}
              </p>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>
    </SectionWrapper>
  );
}
