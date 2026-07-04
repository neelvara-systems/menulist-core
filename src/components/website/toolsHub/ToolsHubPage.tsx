'use client';

import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuCalendarClock,
  LuCamera,
  LuClipboardCheck,
  LuFileQuestion,
  LuFileText,
  LuHelpCircle,
  LuImage,
  LuLink,
  LuMapPin,
  LuMessageCircle,
  LuQrCode,
  LuReceipt,
  LuShieldCheck,
  LuSparkles,
  LuStore,
  LuTags,
  LuWrench,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

type ToolsHubTool = {
  href: string;
  key: string;
  icon: IconType;
  ownerPathKey: 'create' | 'fix' | 'review';
};

type ToolsHubGroup = {
  key: string;
  icon: IconType;
  tools: ToolsHubTool[];
};

const TOOLS_HUB_GROUPS: ToolsHubGroup[] = [
  {
    key: 'publicTruth',
    icon: LuShieldCheck,
    tools: [
      {
        href: '/tools/public-truth-check',
        key: 'publicTruthCheck',
        icon: LuBadgeCheck,
        ownerPathKey: 'create',
      },
      {
        href: '/tools/business-facts-copy-pack',
        key: 'businessFactsCopyPack',
        icon: LuFileText,
        ownerPathKey: 'create',
      },
      {
        href: '/tools/customer-question-coverage-check',
        key: 'customerQuestionCoverageCheck',
        icon: LuHelpCircle,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/customer-faq-reply-pack',
        key: 'customerFaqReplyPack',
        icon: LuFileQuestion,
        ownerPathKey: 'create',
      },
      {
        href: '/tools/customer-link-preview',
        key: 'customerLinkPreview',
        icon: LuLink,
        ownerPathKey: 'review',
      },
      {
        href: '/tools/social-bio-link-check',
        key: 'socialBioLinkCheck',
        icon: LuLink,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/google-profile-basics-checklist',
        key: 'googleProfileBasicsChecklist',
        icon: LuMapPin,
        ownerPathKey: 'fix',
      },
    ],
  },
  {
    key: 'menuServiceClarity',
    icon: LuReceipt,
    tools: [
      {
        href: '/tools/menu-readability-check',
        key: 'menuReadabilityCheck',
        icon: LuReceipt,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/price-availability-gap-check',
        key: 'priceAvailabilityGapCheck',
        icon: LuTags,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/menu-pdf-cleanup-check',
        key: 'menuPdfCleanupCheck',
        icon: LuFileText,
        ownerPathKey: 'create',
      },
    ],
  },
  {
    key: 'customerActionReadiness',
    icon: LuWrench,
    tools: [
      {
        href: '/tools/qr-link-health-check',
        key: 'qrLinkHealthCheck',
        icon: LuQrCode,
        ownerPathKey: 'review',
      },
      {
        href: '/tools/booking-inquiry-readiness-check',
        key: 'bookingInquiryReadinessCheck',
        icon: LuClipboardCheck,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/whatsapp-action-link-check',
        key: 'whatsappActionLinkCheck',
        icon: LuMessageCircle,
        ownerPathKey: 'fix',
      },
      {
        href: '/tools/whatsapp-reply-pack',
        key: 'whatsappReplyPack',
        icon: LuMessageCircle,
        ownerPathKey: 'create',
      },
      {
        href: '/tools/hours-check',
        key: 'hoursCheck',
        icon: LuCalendarClock,
        ownerPathKey: 'fix',
      },
    ],
  },
  {
    key: 'trustSetup',
    icon: LuStore,
    tools: [
      {
        href: '/tools/photo-gap-check',
        key: 'photoGapCheck',
        icon: LuCamera,
        ownerPathKey: 'fix',
      },
    ],
  },
];

const STATS = ['toolCount', 'browserLocal', 'fixPath'] as const;
const BOUNDARIES = ['checked', 'notChecked', 'nextAction'] as const;

export default function ToolsHubPage() {
  const t = useTranslations('Website.ToolsHubPage');
  const toolCount = TOOLS_HUB_GROUPS.reduce((total, group) => total + group.tools.length, 0);

  return (
    <main className="ws-tools-hub">
      <section className="ws-tools-hub-hero">
        <div className="ws-container ws-tools-hub-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-tools-hub-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t('heroTitle')}
              highlightedText={t('heroHighlight')}
            />
            <p className="ws-tools-hub-hero__subtitle">{t('heroSubtitle')}</p>
            <div className="ws-tools-hub-hero__actions">
              <WebsiteButton href="/tools/public-truth-check">
                {t('heroPrimary')}
              </WebsiteButton>
              <WebsiteButton href="/create-menu" variant="ghost">
                {t('heroSecondary')}
              </WebsiteButton>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll preset="card" delay={0.08} className="ws-tools-hub-panel">
            <div className="ws-tools-hub-panel__header">
              <span>
                <LuSparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>{t('panel.title')}</h2>
                <p>{t('panel.body')}</p>
              </div>
            </div>
            <div className="ws-tools-hub-stats" aria-label={t('statsLabel')}>
              {STATS.map((stat) => (
                <div key={stat} className="ws-tools-hub-stat">
                  <strong>{stat === 'toolCount' ? toolCount : t(`stats.${stat}.value`)}</strong>
                  <span>{t(`stats.${stat}.label`)}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section ws-tools-hub-groups" aria-label={t('groupsTitle')}>
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-tools-hub-section-heading">
            <p className="ws-page-hero__eyebrow">{t('groupsEyebrow')}</p>
            <WebsiteHeadline
              as="h2"
              text={t('groupsTitle')}
              highlightedText={t('groupsHighlight')}
            />
            <p>{t('groupsSubtitle')}</p>
          </AnimateOnScroll>

          <div className="ws-tools-hub-group-list">
            {TOOLS_HUB_GROUPS.map((group, groupIndex) => {
              const GroupIcon = group.icon;

              return (
                <AnimateStaggerChild key={group.key} index={groupIndex} preset="card">
                  <section className="ws-tools-hub-group" aria-labelledby={`tools-hub-${group.key}`}>
                    <div className="ws-tools-hub-group__heading">
                      <span className="ws-tools-hub-group__icon">
                        <GroupIcon size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 id={`tools-hub-${group.key}`}>{t(`groups.${group.key}.title`)}</h3>
                        <p>{t(`groups.${group.key}.description`)}</p>
                      </div>
                      <span className="ws-tools-hub-group__count">
                        {t('toolCount', { count: group.tools.length })}
                      </span>
                    </div>

                    <div className="ws-tools-hub-tool-grid">
                      {group.tools.map((tool, toolIndex) => {
                        const ToolIcon = tool.icon;

                        return (
                          <AnimateStaggerChild key={tool.href} index={toolIndex} preset="card">
                            <WebsiteLink href={tool.href} className="ws-tools-hub-tool-card">
                              <span className="ws-tools-hub-tool-card__icon">
                                <ToolIcon size={20} aria-hidden="true" />
                              </span>
                              <span className="ws-tools-hub-tool-card__copy">
                                <span className="ws-tools-hub-tool-card__meta">{t(`tools.${tool.key}.meta`)}</span>
                                <strong>{t(`tools.${tool.key}.title`)}</strong>
                                <span>{t(`tools.${tool.key}.description`)}</span>
                              </span>
                              <span className="ws-tools-hub-tool-card__footer">
                                <span>{t(`ownerPaths.${tool.ownerPathKey}`)}</span>
                                <LuArrowRight size={16} aria-hidden="true" />
                              </span>
                            </WebsiteLink>
                          </AnimateStaggerChild>
                        );
                      })}
                    </div>
                  </section>
                </AnimateStaggerChild>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ws-section ws-section--subtle ws-tools-hub-boundary" aria-label={t('boundaryTitle')}>
        <div className="ws-container ws-tools-hub-boundary__inner">
          <AnimateOnScroll preset="card" className="ws-tools-hub-boundary__copy">
            <p className="ws-page-hero__eyebrow">{t('boundaryEyebrow')}</p>
            <WebsiteHeadline
              as="h2"
              text={t('boundaryTitle')}
              highlightedText={t('boundaryHighlight')}
            />
            <p>{t('boundarySubtitle')}</p>
          </AnimateOnScroll>
          <div className="ws-tools-hub-boundary__list">
            {BOUNDARIES.map((boundary, index) => (
              <AnimateStaggerChild key={boundary} index={index} preset="card">
                <article className="ws-tools-hub-boundary-card">
                  <span>
                    <LuShieldCheck size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{t(`boundaries.${boundary}.title`)}</h3>
                    <p>{t(`boundaries.${boundary}.body`)}</p>
                  </div>
                </article>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-container ws-tools-hub-final">
          <AnimateOnScroll preset="card">
            <span>
              <LuImage size={20} aria-hidden="true" />
            </span>
            <p className="ws-page-hero__eyebrow">{t('finalEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('finalTitle')} />
            <p>{t('finalBody')}</p>
            <div className="ws-tools-hub-final__actions">
              <WebsiteButton href="/create-menu">
                {t('finalPrimary')}
              </WebsiteButton>
              <WebsiteLink href="/features/business-health" className="ws-tools-hub-final__link">
                {t('finalSecondary')} <LuArrowRight size={16} aria-hidden="true" />
              </WebsiteLink>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
