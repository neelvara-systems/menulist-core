import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const TILE_COUNT = 6;

export default function ProblemSection() {
  const t = useTranslations('Website');
  const problemTiles = Array.from({ length: TILE_COUNT }, (_, i) => ({
    label: t(`Problem.tile${i}Label`),
    description: t(`Problem.tile${i}Desc`),
  }));
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Problem.title')}
          highlightedText={t('Problem.highlight')}
        />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <p
          className="ws-body"
          style={{
            textAlign: 'center',
            maxWidth: 'var(--ws-max-w-text)',
            margin: 'var(--ws-space-6) auto 0',
          }}
        >
          {t('Problem.body')}
        </p>
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.15}>
        <p
          style={{
            textAlign: 'center',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--ws-text-primary)',
            marginTop: 'var(--ws-space-6)',
          }}
        >
          {t('Problem.conclusion')}
        </p>
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ws-space-4)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '900px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {problemTiles.map((tile, index) => (
          <AnimateStaggerChild key={tile.label} index={index}>
            <div
              className="ws-card"
              style={{
                textAlign: 'center',
                padding: 'var(--ws-space-6)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--ws-space-4)',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ws-error)' }} />
              </div>
              <h3 className="ws-h3" style={{ fontSize: '1rem' }}>
                {tile.label}
              </h3>
              <p className="ws-caption">{tile.description}</p>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>
    </SectionWrapper>
  );
}
