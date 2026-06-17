'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBot,
  LuCheckCircle2,
  LuImage,
  LuMessageSquare,
  LuPalette,
  LuShieldCheck,
  LuUpload,
  LuZap,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const operationIcons = [LuMessageSquare, LuBadgeCheck, LuImage, LuUpload, LuPalette, LuZap];
const safetyIcons = [LuShieldCheck, LuCheckCircle2, LuBadgeCheck];
const demoCommands = ['demo0', 'demo1', 'demo2', 'demo3', 'demo4', 'demo5'];

export default function AiMenuManagerPage() {
  const t = useTranslations('Website');

  return (
    <main className="ws-ai-menu-manager-page">
      <section className="ws-ai-menu-manager-hero">
        <div className="ws-container ws-ai-menu-manager-hero__inner">
          <AnimateOnScroll className="ws-ai-menu-manager-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              parts={[
                { text: t('AiMenuManagerPage.heroTitleStart') },
                { text: t('AiMenuManagerPage.heroTitleHighlight'), highlight: true },
                { text: t('AiMenuManagerPage.heroTitleEnd') },
              ]}
            />
            <p className="ws-ai-menu-manager-hero__subtitle">{t('AiMenuManagerPage.heroSubtitle')}</p>
            <div className="ws-ai-menu-manager-hero__actions">
              <WebsiteButton href="/create-menu">{t('AiMenuManagerPage.primaryCta')}</WebsiteButton>
              <WebsiteButton href="/features" variant="ghost">{t('AiMenuManagerPage.secondaryCta')}</WebsiteButton>
            </div>
            <div className="ws-ai-menu-manager-hero__trust">
              {[0, 1, 2].map((index) => (
                <span key={index}>
                  <LuShieldCheck size={15} aria-hidden="true" />
                  {t(`AiMenuManagerPage.trust${index}`)}
                </span>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll className="ws-ai-menu-manager-hero__visual" delay={0.08}>
            <div className="ws-ai-menu-manager-agent-card">
              <div className="ws-ai-menu-manager-agent-card__top">
                <span>
                  <LuBot size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>{t('AiMenuManagerPage.agentTitle')}</strong>
                  <small>{t('AiMenuManagerPage.agentSubtitle')}</small>
                </div>
              </div>
              <div className="ws-ai-menu-manager-agent-card__message">
                <small>{t('AiMenuManagerPage.ownerSays')}</small>
                <p>{t('AiMenuManagerPage.ownerMessage')}</p>
              </div>
              <div className="ws-ai-menu-manager-agent-card__proposal">
                <span>{t('AiMenuManagerPage.preparedCard')}</span>
                <h2>{t('AiMenuManagerPage.cardTitle')}</h2>
                <p>{t('AiMenuManagerPage.cardBody')}</p>
                <div>
                  <strong>{t('AiMenuManagerPage.cardOld')}</strong>
                  <LuArrowRight size={16} aria-hidden="true" />
                  <strong>{t('AiMenuManagerPage.cardNew')}</strong>
                </div>
              </div>
              <div className="ws-ai-menu-manager-agent-card__buttons">
                <button type="button">{t('AiMenuManagerPage.approve')}</button>
                <button type="button">{t('AiMenuManagerPage.change')}</button>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.flowEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('AiMenuManagerPage.flowTitle')} highlightedText={t('AiMenuManagerPage.flowHighlight')} />
            <p>{t('AiMenuManagerPage.flowSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-ai-menu-manager-flow">
          {[0, 1, 2, 3].map((index) => (
            <AnimateStaggerChild key={index} index={index}>
              <article>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{t(`AiMenuManagerPage.flow${index}Title`)}</h3>
                <p>{t(`AiMenuManagerPage.flow${index}Desc`)}</p>
              </article>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.commandsEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('AiMenuManagerPage.commandsTitle')} />
            <p>{t('AiMenuManagerPage.commandsSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-ai-menu-manager-command-grid">
          {demoCommands.map((key, index) => (
            <AnimateStaggerChild key={key} index={index}>
              <div className="ws-ai-menu-manager-command">
                <span>{t(`AiMenuManagerPage.${key}Input`)}</span>
                <strong>{t(`AiMenuManagerPage.${key}Output`)}</strong>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.opsEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('AiMenuManagerPage.opsTitle')} highlightedText={t('AiMenuManagerPage.opsHighlight')} />
            <p>{t('AiMenuManagerPage.opsSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-feature-detail-proof__grid">
          {operationIcons.map((Icon, index) => (
            <AnimateStaggerChild key={index} index={index}>
              <WebsiteFeatureCard
                icon={Icon}
                title={t(`AiMenuManagerPage.ops${index}Title`)}
                description={t(`AiMenuManagerPage.ops${index}Desc`)}
                compact
              />
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.safetyEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('AiMenuManagerPage.safetyTitle')} />
            <p>{t('AiMenuManagerPage.safetySubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-feature-detail-proof__grid">
          {safetyIcons.map((Icon, index) => (
            <AnimateStaggerChild key={index} index={index}>
              <WebsiteFeatureCard
                icon={Icon}
                title={t(`AiMenuManagerPage.safety${index}Title`)}
                description={t(`AiMenuManagerPage.safety${index}Desc`)}
                compact
              />
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <section className="ws-ai-menu-manager-final">
        <div className="ws-container">
          <AnimateOnScroll>
            <p className="ws-page-hero__eyebrow">{t('AiMenuManagerPage.finalEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('AiMenuManagerPage.finalTitle')} highlightedText={t('AiMenuManagerPage.finalHighlight')} />
            <p>{t('AiMenuManagerPage.finalSubtitle')}</p>
            <div className="ws-ai-menu-manager-final__actions">
              <WebsiteButton href="/create-menu">{t('AiMenuManagerPage.finalCta')}</WebsiteButton>
              <Link href="/pricing">
                {t('AiMenuManagerPage.finalLink')}
                <LuArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
