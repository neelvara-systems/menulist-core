import { useTranslations } from 'next-intl';
import {
  LuActivity,
  LuArrowRight,
  LuCheckCircle,
  LuClipboardCheck,
  LuMessageCircle,
  LuShieldCheck,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import Link from '../shared/WebsiteLink';

const proofCards = [
  {
    key: 'ai',
    Icon: LuMessageCircle,
    href: '/ai-menu-manager',
    accent: 'message',
  },
  {
    key: 'health',
    Icon: LuActivity,
    href: '/features/business-health',
    accent: 'health',
  },
] as const;

const pointIcons = [LuClipboardCheck, LuShieldCheck, LuCheckCircle];

export default function OwnerProofSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper className="ws-owner-proof-section">
      <AnimateOnScroll>
        <SectionHeading
          title={t('OwnerProof.title')}
          highlightedText={t('OwnerProof.highlight')}
          subtitle={t('OwnerProof.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-owner-proof__grid">
        {proofCards.map((card, cardIndex) => {
          const points = pointIcons.map((Icon, pointIndex) => ({
            Icon,
            text: t(`OwnerProof.${card.key}Point${pointIndex}`),
          }));

          return (
            <AnimateStaggerChild
              key={card.key}
              index={cardIndex}
              className={`ws-owner-proof__card ws-owner-proof__card--${card.accent}`}
            >
              <div className="ws-owner-proof__card-head">
                <span className="ws-owner-proof__card-icon" aria-hidden="true">
                  <card.Icon size={22} />
                </span>
                <div>
                  <p>{t(`OwnerProof.${card.key}Eyebrow`)}</p>
                  <h3>{t(`OwnerProof.${card.key}Title`)}</h3>
                </div>
              </div>

              <p className="ws-owner-proof__desc">{t(`OwnerProof.${card.key}Desc`)}</p>

              <div className="ws-owner-proof__points">
                {points.map((point) => (
                  <div key={point.text} className="ws-owner-proof__point">
                    <point.Icon size={16} aria-hidden="true" />
                    <span>{point.text}</span>
                  </div>
                ))}
              </div>

              <Link href={card.href} className="ws-owner-proof__link">
                {t(`OwnerProof.${card.key}Cta`)} <LuArrowRight size={16} />
              </Link>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <AnimateOnScroll className="ws-owner-proof__caption" delay={0.14}>
        {t('OwnerProof.caption')}
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
