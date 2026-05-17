import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const TILE_COUNT = 4;

export default function ProblemSection() {
  const t = useTranslations('Website');
  const problemTiles = Array.from({ length: TILE_COUNT }, (_, i) => ({
    label: t(`Problem.tile${i}Label`),
    description: t(`Problem.tile${i}Desc`),
  }));
  return (
    <SectionWrapper id="problem" variant="subtle" className="ws-problem-redesign">
      <div className="ws-problem-layout">
        <div>
          <AnimateOnScroll>
            <SectionHeading
              title={t('Problem.title')}
              highlightedText={t('Problem.highlight')}
              centered={false}
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.1}>
            <p className="ws-body ws-problem-body">
              {t('Problem.body')}
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            <p className="ws-problem-conclusion">
              {t('Problem.conclusion')}
            </p>
          </AnimateOnScroll>
        </div>

        <div className="ws-problem-drift-stack" aria-label={t('Problem.stackLabel')}>
          {problemTiles.map((tile, index) => (
            <AnimateStaggerChild key={tile.label} index={index}>
              <div className="ws-problem-drift-card">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{tile.label}</h3>
                  <p>{tile.description}</p>
                </div>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
