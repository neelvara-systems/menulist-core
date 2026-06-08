import { useTranslations } from 'next-intl';
import {
  LuActivity,
  LuBarChart3,
  LuCheckCircle2,
  LuClipboardCheck,
  LuMessageSquare,
  LuShieldCheck,
  LuSmartphone,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';

const proofCards = [
  { icon: LuClipboardCheck, key: 'proof0' },
  { icon: LuBarChart3, key: 'proof1' },
  { icon: LuShieldCheck, key: 'proof2' },
  { icon: LuSmartphone, key: 'proof3' },
];

export default function BusinessHealthSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper className="ws-business-health">
      <AnimateOnScroll>
        <SectionHeading
          title={t('BusinessHealth.title')}
          highlightedText={[t('BusinessHealth.primaryHighlight'), t('BusinessHealth.highlight')]}
          subtitle={t('BusinessHealth.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-business-health__layout">
        <AnimateOnScroll className="ws-business-health__visual-wrap" delay={0.08}>
          <div className="ws-business-health__visual" role="group" aria-label={t('BusinessHealth.panelLabel')}>
            <div className="ws-business-health__panel">
              <div className="ws-business-health__panel-head">
                <div className="ws-business-health__panel-icon" aria-hidden="true">
                  <LuActivity size={22} />
                </div>
                <div>
                  <span className="ws-business-health__panel-meta">{t('BusinessHealth.panelMeta')}</span>
                  <h3>{t('BusinessHealth.panelTitle')}</h3>
                </div>
                <span className="ws-business-health__badge">
                  <LuCheckCircle2 size={14} />
                  {t('BusinessHealth.panelBadge')}
                </span>
              </div>

              <p className="ws-business-health__panel-message">{t('BusinessHealth.panelMessage')}</p>
              <p className="ws-business-health__freshness">{t('BusinessHealth.panelFreshness')}</p>

              <div className="ws-business-health__metrics">
                {[0, 1, 2].map((index) => (
                  <div className="ws-business-health__metric" key={index}>
                    <span>{t(`BusinessHealth.metric${index}Label`)}</span>
                    <strong>{t(`BusinessHealth.metric${index}Value`)}</strong>
                  </div>
                ))}
              </div>

              <div className="ws-business-health__question">
                <div>
                  <span>{t('BusinessHealth.questionLabel')}</span>
                  <p>{t('BusinessHealth.questionText')}</p>
                </div>
                <LuMessageSquare size={20} aria-hidden="true" />
              </div>

              <div className="ws-business-health__answer">
                <span>{t('BusinessHealth.answerLabel')}</span>
                <p>{t('BusinessHealth.answerText')}</p>
              </div>
            </div>
          </div>
        </AnimateOnScroll>

        <div className="ws-business-health__proof-grid">
          {proofCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <AnimateStaggerChild key={card.key} index={index} style={{ height: '100%' }}>
                <WebsiteFeatureCard
                  compact
                  icon={Icon}
                  title={t(`BusinessHealth.${card.key}Title`)}
                  description={t(`BusinessHealth.${card.key}Desc`)}
                />
              </AnimateStaggerChild>
            );
          })}
        </div>
      </div>

      <AnimateOnScroll delay={0.16}>
        <p className="ws-caption ws-business-health__caption">{t('BusinessHealth.caption')}</p>
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.18}>
        <div className="ws-business-health__actions">
          <WebsiteButton href="/features/business-health">{t('BusinessHealth.learnMoreCta')}</WebsiteButton>
          <WebsiteButton href="/create-menu" variant="ghost">{t('BusinessHealth.uploadCta')}</WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
