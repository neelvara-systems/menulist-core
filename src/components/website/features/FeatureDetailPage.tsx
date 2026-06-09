'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LuArrowRight } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import { featureDetailConfigs, type FeatureDetailSlug } from './featureDetailConfig';

type FeatureDetailPageProps = {
  slug: FeatureDetailSlug;
};

export default function FeatureDetailPage({ slug }: FeatureDetailPageProps) {
  const t = useTranslations('Website.FeatureDetail');
  const config = featureDetailConfigs[slug];
  const HeroIcon = config.heroIcon;

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
            <div className="ws-feature-detail-preview" aria-label={t(`${config.key}.previewLabel`)} role="group">
              <div className="ws-feature-detail-preview__bar">
                <span>{t(`${config.key}.previewMeta`)}</span>
                <span>{t(`${config.key}.previewStatus`)}</span>
              </div>
              <div className="ws-feature-detail-preview__main">
                <span>
                  <HeroIcon size={30} aria-hidden="true" />
                </span>
                <h2>{t(`${config.key}.previewTitle`)}</h2>
                <p>{t(`${config.key}.previewBody`)}</p>
              </div>
              <div className="ws-feature-detail-preview__pills">
                {[0, 1, 2].map((index) => (
                  <span key={index}>{t(`${config.key}.previewPill${index}`)}</span>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section ws-feature-detail-story">
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t(`${config.key}.storyEyebrow`)}</p>
            <WebsiteHeadline as="h2" text={t(`${config.key}.storyTitle`)} highlightedText={t(`${config.key}.storyHighlight`)} />
            <p>{t(`${config.key}.storySubtitle`)}</p>
          </AnimateOnScroll>

          <div className="ws-feature-detail-story__grid">
            {config.storyIcons.map((Icon, index) => (
              <AnimateStaggerChild key={index} index={index} preset="card" className="ws-feature-detail__reveal-card">
                <article className="ws-feature-detail-story__card">
                  <span className="ws-feature-detail-story__index">{index + 1}</span>
                  <Icon size={22} aria-hidden="true" />
                  <h3>{t(`${config.key}.story${index}Title`)}</h3>
                  <p>{t(`${config.key}.story${index}Desc`)}</p>
                </article>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </section>

      <section className="ws-section ws-section--subtle">
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
