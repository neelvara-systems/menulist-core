import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuClock3, LuLink, LuRefreshCw, LuSearchCheck, LuServer, LuShieldCheck, LuUsers } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const OUTCOME_COUNT = 8;
const outcomeIcons = [LuShieldCheck, LuClock3, LuRefreshCw, LuBadgeCheck, LuSearchCheck, LuServer, LuLink, LuUsers];

export default function SmartFeaturesSection() {
  const t = useTranslations('Website');
  const outcomes = Array.from({ length: OUTCOME_COUNT }, (_, i) => ({
    icon: outcomeIcons[i],
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
        {outcomes.map((outcome, index) => {
          const Icon = outcome.icon;
          return (
            <AnimateStaggerChild key={outcome.title} index={index} style={{ height: '100%' }}>
              <div className="ws-card ws-icon-card">
                <div className="ws-icon-card__icon ws-icon-card__icon--sm">
                  <Icon size={20} color="var(--ws-brand-secondary)" />
                </div>
                <div className="ws-icon-card__content">
                  <h3 className="ws-icon-card__title">{outcome.title}</h3>
                  <p className="ws-caption" style={{ marginTop: '2px' }}>
                    {outcome.desc}
                  </p>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
