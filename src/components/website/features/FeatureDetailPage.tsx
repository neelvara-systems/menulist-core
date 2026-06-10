'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LuArrowRight } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import FeatureDetailJourney from './FeatureDetailJourney';
import FeatureDetailVisual from './FeatureDetailVisual';
import { featureDetailConfigs, type FeatureDetailSlug } from './featureDetailConfig';

type FeatureDetailPageProps = {
  slug: FeatureDetailSlug;
};

export default function FeatureDetailPage({ slug }: FeatureDetailPageProps) {
  const t = useTranslations('Website.FeatureDetail');
  const config = featureDetailConfigs[slug];

  return (
    <main className={`ws-feature-detail ws-feature-detail--${slug}`}>
      <section className="ws-feature-detail-hero">
        <div className="ws-container ws-feature-detail-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-feature-detail-hero__copy">
            <p className="ws-page-hero__eyebrow">{t(`${config.key}.heroEyebrow`)}</p>
            <WebsiteHeadline
              as="h1"
              text={t(`${config.key}.heroTitle`)}
              highlightedText={t(`${config.key}.heroHighlight`)}
            />
            <p className="ws-feature-detail-hero__subtitle">{t(`${config.key}.heroSubtitle`)}</p>
            <div className="ws-feature-detail-hero__actions">
              <WebsiteButton href="/create-menu">{t(`${config.key}.primaryCta`)}</WebsiteButton>
              <WebsiteButton href="/features" variant="ghost">{t(`${config.key}.secondaryCta`)}</WebsiteButton>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll preset="media" delay={0.1}>
            <FeatureDetailVisual config={config} />
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-feature-detail-strip" aria-label={t(`${config.key}.stripLabel`)}>
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-feature-detail-strip__inner">
            {config.stripIcons.map((Icon, index) => (
              <span key={index} className="ws-feature-detail-strip__item">
                <Icon size={16} aria-hidden="true" />
                {t(`${config.key}.strip${index}`)}
              </span>
            ))}
          </AnimateOnScroll>
        </div>
      </section>

      <FeatureDetailJourney config={config} />

      <section className="ws-section ws-section--subtle ws-feature-detail-support">
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t(`${config.key}.supportEyebrow`)}</p>
            <WebsiteHeadline
              as="h2"
              text={t(`${config.key}.supportTitle`)}
              highlightedText={t(`${config.key}.supportHighlight`)}
            />
            <p>{t(`${config.key}.supportSubtitle`)}</p>
          </AnimateOnScroll>

          <div className="ws-feature-detail-support__grid">
            {[0, 1].map((sectionIndex) => (
              <AnimateStaggerChild key={sectionIndex} index={sectionIndex} preset="card">
                <article className="ws-feature-detail-support__section">
                  <h3>{t(`${config.key}.support${sectionIndex}Title`)}</h3>
                  <p>{t(`${config.key}.support${sectionIndex}Desc`)}</p>
                  <div>
                    {[0, 1, 2].map((cardIndex) => {
                      const Icon = config.supportIcons[sectionIndex][cardIndex];

                      return (
                        <span key={cardIndex}>
                          <Icon size={16} aria-hidden="true" />
                          {t(`${config.key}.support${sectionIndex}Item${cardIndex}`)}
                        </span>
                      );
                    })}
                  </div>
                </article>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t(`${config.key}.proofEyebrow`)}</p>
            <WebsiteHeadline as="h2" text={t(`${config.key}.proofTitle`)} />
            <p>{t(`${config.key}.proofSubtitle`)}</p>
          </AnimateOnScroll>

          <div className="ws-feature-detail-proof__grid">
            {config.proofIcons.map((Icon, index) => (
              <AnimateStaggerChild key={index} index={index} preset="card" className="ws-feature-detail__reveal-card">
                <article className="ws-feature-detail-proof__card">
                  <Icon size={20} aria-hidden="true" />
                  <h3>{t(`${config.key}.proof${index}Title`)}</h3>
                  <p>{t(`${config.key}.proof${index}Desc`)}</p>
                </article>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </section>

      <section className="ws-section">
        <AnimateOnScroll preset="footer" className="ws-container ws-feature-detail-final">
          <p className="ws-page-hero__eyebrow">{t(`${config.key}.finalEyebrow`)}</p>
          <WebsiteHeadline as="h2" text={t(`${config.key}.finalTitle`)} highlightedText={t(`${config.key}.finalHighlight`)} />
          <p>{t(`${config.key}.finalSubtitle`)}</p>
          <div className="ws-feature-detail-final__actions">
            <WebsiteButton href="/create-menu">{t(`${config.key}.primaryCta`)}</WebsiteButton>
            <Link href="/features" className="ws-feature-detail-final__link">
              {t(`${config.key}.finalLink`)}
              <LuArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </AnimateOnScroll>
      </section>
    </main>
  );
}
