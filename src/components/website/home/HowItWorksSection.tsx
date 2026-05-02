import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const STEP_COUNT = 4;

export default function HowItWorksSection() {
  const t = useTranslations('Website');
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => ({
    number: String(i + 1),
    title: t(`HowItWorks.step${i}Title`),
    desc: t(`HowItWorks.step${i}Desc`),
  }));

  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <SectionHeading title={t('HowItWorks.title')} />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {steps.map((step, index) => (
          <AnimateStaggerChild key={step.number} index={index} style={{ textAlign: 'center', position: 'relative' }}>
            {/* Connector line (not on last item) */}
            {index < steps.length - 1 && (
              <div
                className="ws-step-connector"
                style={{
                  position: 'absolute',
                  top: '24px',
                  left: '55%',
                  right: '-45%',
                  height: '2px',
                  backgroundColor: 'var(--ws-border-default)',
                }}
              />
            )}

            {/* Step number circle */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--ws-bg-accent)',
                border: '2px solid var(--ws-brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--ws-space-4)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ws-brand-primary)' }}>
                {step.number}
              </span>
            </div>

            <h3 className="ws-h3" style={{ fontSize: '1rem' }}>
              {step.title}
            </h3>
            <p className="ws-caption" style={{ maxWidth: '240px', margin: '0 auto' }}>
              {step.desc}
            </p>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll delay={0.15}>
        <p className="ws-caption" style={{ textAlign: 'center', marginTop: 'var(--ws-space-8)' }}>
          {t('HowItWorks.noTechnicalKnowledge')}
        </p>

        <div style={{ textAlign: 'center', marginTop: 'var(--ws-space-6)' }}>
          <WebsiteButton href="/get-started">
            {t('HowItWorks.cta')}
          </WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
