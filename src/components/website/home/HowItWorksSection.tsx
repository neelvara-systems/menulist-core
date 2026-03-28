import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const steps = [
  {
    number: '1',
    title: 'Create your menu',
    desc: 'Upload a photo, PDF, or type it in. Takes a few minutes — the system reads and structures everything for you.',
  },
  {
    number: '2',
    title: 'We prepare everything for you',
    desc: 'Images, descriptions, and structure — done. No design work, no writing, no formatting.',
  },
  {
    number: '3',
    title: 'Publish and launch',
    desc: 'One click. Your menu goes live across all surfaces. You get a ready-to-use launch kit — table tent, entrance poster, counter sticker, and social posts.',
  },
  {
    number: '4',
    title: 'It stays updated everywhere',
    desc: 'Change a price, add an item, mark something sold out — every surface reflects it.',
  },
];

export default function HowItWorksSection() {
  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <SectionHeading title="How it works" />
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

            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: 'var(--ws-space-2)' }}>
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
          No technical knowledge required.
        </p>

        <div style={{ textAlign: 'center', marginTop: 'var(--ws-space-6)' }}>
          <WebsiteButton href="/get-started">
            Create your MenuList →
          </WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
