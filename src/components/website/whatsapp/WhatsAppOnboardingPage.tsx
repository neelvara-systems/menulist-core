'use client';

import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuClipboardCheck,
  LuFileText,
  LuLink,
  LuMessageCircle,
  LuQrCode,
  LuShieldCheck,
  LuSparkles,
  LuStore,
  LuUpload,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import Link from '../shared/WebsiteLink';

const flowIcons = [LuMessageCircle, LuUpload, LuClipboardCheck, LuLink];
const businessIcons = [LuStore, LuSparkles, LuFileText, LuQrCode];
const trustIcons = [LuBadgeCheck, LuShieldCheck, LuClipboardCheck];
const boundaries = ['boundary0', 'boundary1', 'boundary2', 'boundary3', 'boundary4', 'boundary5'];

export default function WhatsAppOnboardingPage() {
  const t = useTranslations('Website');

  return (
    <main className="ws-whatsapp-page">
      <section className="ws-whatsapp-hero">
        <div className="ws-container ws-whatsapp-hero__inner">
          <AnimateOnScroll className="ws-whatsapp-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              parts={[
                { text: t('WhatsAppOnboardingPage.heroTitleStart') },
                { text: t('WhatsAppOnboardingPage.heroTitleHighlight'), highlight: true },
                { text: t('WhatsAppOnboardingPage.heroTitleEnd') },
              ]}
            />
            <p className="ws-whatsapp-hero__subtitle">{t('WhatsAppOnboardingPage.heroSubtitle')}</p>
            <p className="ws-whatsapp-hero__availability">{t('WhatsAppOnboardingPage.availability')}</p>
            <div className="ws-whatsapp-hero__actions">
              <WebsiteButton href="/create-menu">{t('WhatsAppOnboardingPage.primaryCta')}</WebsiteButton>
              <WebsiteButton href="/features/menu-import" variant="ghost">{t('WhatsAppOnboardingPage.secondaryCta')}</WebsiteButton>
            </div>
            <div className="ws-whatsapp-hero__trust">
              {[0, 1, 2].map((index) => (
                <span key={index}>
                  <LuShieldCheck size={15} aria-hidden="true" />
                  {t(`WhatsAppOnboardingPage.trust${index}`)}
                </span>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll className="ws-whatsapp-hero__visual" delay={0.08}>
            <div className="ws-whatsapp-chat" aria-label={t('WhatsAppOnboardingPage.chatLabel')}>
              <div className="ws-whatsapp-chat__top">
                <span>
                  <LuMessageCircle size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>{t('WhatsAppOnboardingPage.chatTitle')}</strong>
                  <small>{t('WhatsAppOnboardingPage.chatSubtitle')}</small>
                </div>
              </div>

              <div className="ws-whatsapp-bubble ws-whatsapp-bubble--owner">
                <small>{t('WhatsAppOnboardingPage.chatOwnerLabel')}</small>
                <p>{t('WhatsAppOnboardingPage.chatOwnerMessage')}</p>
                <span>{t('WhatsAppOnboardingPage.chatFile')}</span>
              </div>

              <div className="ws-whatsapp-bubble ws-whatsapp-bubble--menulist">
                <small>{t('WhatsAppOnboardingPage.chatMenuListLabel')}</small>
                <p>{t('WhatsAppOnboardingPage.chatReceived')}</p>
              </div>

              <div className="ws-whatsapp-preview-card">
                <span>{t('WhatsAppOnboardingPage.chatPreviewLabel')}</span>
                <strong>{t('WhatsAppOnboardingPage.chatPreviewTitle')}</strong>
                <p>{t('WhatsAppOnboardingPage.chatPreviewBody')}</p>
              </div>

              <div className="ws-whatsapp-bubble ws-whatsapp-bubble--owner ws-whatsapp-bubble--short">
                <p>{t('WhatsAppOnboardingPage.chatApprove')}</p>
              </div>

              <div className="ws-whatsapp-bubble ws-whatsapp-bubble--menulist">
                <small>{t('WhatsAppOnboardingPage.chatMenuListLabel')}</small>
                <p>{t('WhatsAppOnboardingPage.chatLive')}</p>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.flowEyebrow')}</p>
            <WebsiteHeadline
              as="h2"
              text={t('WhatsAppOnboardingPage.flowTitle')}
              highlightedText={t('WhatsAppOnboardingPage.flowHighlight')}
            />
            <p>{t('WhatsAppOnboardingPage.flowSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-whatsapp-flow-grid">
          {flowIcons.map((Icon, index) => (
            <AnimateStaggerChild key={index} index={index}>
              <WebsiteFeatureCard
                icon={Icon}
                title={t(`WhatsAppOnboardingPage.flow${index}Title`)}
                description={t(`WhatsAppOnboardingPage.flow${index}Desc`)}
                compact
              />
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.businessEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('WhatsAppOnboardingPage.businessTitle')} />
            <p>{t('WhatsAppOnboardingPage.businessSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-whatsapp-business-grid">
          {businessIcons.map((Icon, index) => (
            <AnimateStaggerChild key={index} index={index}>
              <WebsiteFeatureCard
                icon={Icon}
                title={t(`WhatsAppOnboardingPage.business${index}Title`)}
                description={t(`WhatsAppOnboardingPage.business${index}Desc`)}
                compact
              />
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.proofEyebrow')}</p>
            <WebsiteHeadline
              as="h2"
              text={t('WhatsAppOnboardingPage.proofTitle')}
              highlightedText={t('WhatsAppOnboardingPage.proofHighlight')}
            />
            <p>{t('WhatsAppOnboardingPage.proofSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-whatsapp-proof-grid">
          {trustIcons.map((Icon, index) => (
            <AnimateStaggerChild key={index} index={index}>
              <WebsiteFeatureCard
                icon={Icon}
                title={t(`WhatsAppOnboardingPage.proof${index}Title`)}
                description={t(`WhatsAppOnboardingPage.proof${index}Desc`)}
                compact
              />
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="ws-feature-detail__section-heading">
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.boundariesEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('WhatsAppOnboardingPage.boundariesTitle')} />
            <p>{t('WhatsAppOnboardingPage.boundariesSubtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="ws-whatsapp-boundary-list">
          {boundaries.map((key, index) => (
            <AnimateStaggerChild key={key} index={index}>
              <div className="ws-whatsapp-boundary-item">
                <LuShieldCheck size={17} aria-hidden="true" />
                <span>{t(`WhatsAppOnboardingPage.${key}`)}</span>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <section className="ws-whatsapp-final">
        <div className="ws-container">
          <AnimateOnScroll>
            <p className="ws-page-hero__eyebrow">{t('WhatsAppOnboardingPage.finalEyebrow')}</p>
            <WebsiteHeadline
              as="h2"
              text={t('WhatsAppOnboardingPage.finalTitle')}
              highlightedText={t('WhatsAppOnboardingPage.finalHighlight')}
            />
            <p>{t('WhatsAppOnboardingPage.finalSubtitle')}</p>
            <div className="ws-whatsapp-final__actions">
              <WebsiteButton href="/create-menu">{t('WhatsAppOnboardingPage.finalCta')}</WebsiteButton>
              <Link href="/pricing">
                {t('WhatsAppOnboardingPage.finalLink')}
                <LuArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
