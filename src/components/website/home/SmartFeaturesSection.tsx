import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const OUTCOME_COUNT = 6;

export default function SmartFeaturesSection() {
  const t = useTranslations('Website');
  const outcomes = Array.from({ length: OUTCOME_COUNT }, (_, i) => ({
    title: t(`SmartFeatures.outcome${i}Title`),
    desc: t(`SmartFeatures.outcome${i}Desc`),
  }));
  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <SectionHeading
          title={t('SmartFeatures.title')}
          highlightedText={t('SmartFeatures.highlight')}
          subtitle={t('SmartFeatures.subtitle')}
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {outcomes.map((outcome, index) => (
          <AnimateStaggerChild key={outcome.title} index={index}>
            <div style={{ display: 'flex', gap: 'var(--ws-space-3)' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--ws-brand-secondary)',
                  marginTop: '8px',
                  flexShrink: 0,
                }}
              />
              <div>
                <p className="ws-body-sm" style={{ fontWeight: 600 }}>
                  {outcome.title}
                </p>
                <p className="ws-caption" style={{ marginTop: '2px' }}>
                  {outcome.desc}
                </p>
              </div>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>
    </SectionWrapper>
  );
}
