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
    <SectionWrapper className="ws-source-proof-section">
      <AnimateOnScroll>
        <div className="ws-source-proof-band">
          <div className="ws-source-proof-band__intro">
            <p>{t('Stats.byTheNumbers')}</p>
            <SectionHeading
              title={t('Stats.title')}
              highlightedText={t('Stats.highlight')}
              centered={false}
            />
          </div>

          <div className="ws-source-proof-grid">
            {stats.map((stat, i) => (
              <AnimateStaggerChild key={stat.label} index={i}>
                <div className="ws-source-proof-item">
                  <p>
                    {stat.number}
                    {stat.suffix && <span>{stat.suffix}</span>}
                  </p>
                  <h3>{stat.label}</h3>
                  <span>{stat.desc}</span>
                </div>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
