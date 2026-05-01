import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const BULLET_COUNT = 6;

export default function SolutionSection() {
  const t = useTranslations('Website');
  const bulletPoints = Array.from({ length: BULLET_COUNT }, (_, i) => ({
    title: t(`Solution.bullet${i}Title`),
    desc: t(`Solution.bullet${i}Desc`),
  }));
  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <SectionHeading
          title={t('Solution.title')}
          highlightedText={t('Solution.highlight')}
          subtitle={t('Solution.subtitle')}
        />
      </AnimateOnScroll>

      {/* System Diagram */}
      <AnimateOnScroll delay={0.1}>
        <div
          style={{
            marginTop: 'var(--ws-space-12)',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
          }}
        >
          <svg viewBox="0 0 600 210" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <style>{`
                @keyframes ws-flow {
                  from { stroke-dashoffset: 24; }
                  to   { stroke-dashoffset: 0; }
                }
                .ws-flow-line {
                  animation: ws-flow 1.4s linear infinite;
                }
                .ws-flow-line-d1 { animation: ws-flow 1.4s linear infinite 0s; }
                .ws-flow-line-d2 { animation: ws-flow 1.4s linear infinite 0.2s; }
                .ws-flow-line-d3 { animation: ws-flow 1.4s linear infinite 0.4s; }
                .ws-flow-line-d4 { animation: ws-flow 1.4s linear infinite 0.6s; }
              `}</style>
            </defs>

            {/* Central node */}
            <rect x="213" y="10" width="174" height="52" rx="12" fill="var(--ws-brand-primary)" />
            <text x="300" y="41" textAnchor="middle" fill="white" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif">{t('Solution.svgYourMenu')}</text>

            {/* Animated connection lines — staggered delays for electricity effect */}
            {[0, 1, 2, 3].map((i) => {
              const x = 75 + i * 150;
              return (
                <line
                  key={i}
                  className={`ws-flow-line-d${i + 1}`}
                  x1="300" y1="62" x2={x} y2="132"
                  stroke="var(--ws-brand-secondary)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeOpacity="0.5"
                />
              );
            })}

            {/* Surface nodes */}
            {['svgQr', 'svgScreens', 'svgWeb', 'svgPrint'].map((key, i) => {
              const x = 75 + i * 150;
              return (
                <g key={key}>
                  <rect x={x - 46} y="132" width="92" height="42" rx="8" fill="var(--ws-bg-subtle)" stroke="var(--ws-border-default)" strokeWidth="1.5" />
                  <text x={x} y="158" textAnchor="middle" fill="var(--ws-text-secondary)" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">{t(`Solution.${key}`)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </AnimateOnScroll>

      {/* Bullet points grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '900px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {bulletPoints.map((point) => (
          <div key={point.title} style={{ display: 'flex', gap: 'var(--ws-space-3)' }}>
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
              <p className="ws-body-sm" style={{ fontWeight: 600 }}>{point.title}</p>
              <p className="ws-caption" style={{ marginTop: '2px' }}>{point.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimateOnScroll delay={0.2}>
        {/* Relief anchor — visually emphasized */}
        <p
          className="ws-body"
          style={{
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.0625rem',
          }}
        >
          {t('Solution.reliefAnchor')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
