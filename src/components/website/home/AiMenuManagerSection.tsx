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
  LuSend,
  LuShieldCheck,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const commandKeys = [
  { icon: LuMessageSquare, key: 'command0' },
  { icon: LuBadgeCheck, key: 'command1' },
  { icon: LuShieldCheck, key: 'command2' },
  { icon: LuImage, key: 'command3' },
];

export default function AiMenuManagerSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper className="ws-ai-menu-manager">
      <AnimateOnScroll>
        <SectionHeading
          title={t('AiMenuManagerHome.title')}
          highlightedText={t('AiMenuManagerHome.highlight')}
          subtitle={t('AiMenuManagerHome.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-ai-menu-manager__layout">
        <AnimateOnScroll className="ws-ai-menu-manager__demo" delay={0.08}>
          <div className="ws-ai-menu-manager__chat" role="group" aria-label={t('AiMenuManagerHome.demoLabel')}>
            <div className="ws-ai-menu-manager__chat-head">
              <span>
                <LuBot size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{t('AiMenuManagerHome.demoTitle')}</strong>
                <small>{t('AiMenuManagerHome.demoSubtitle')}</small>
              </div>
            </div>

            <div className="ws-ai-menu-manager__bubble ws-ai-menu-manager__bubble--owner">
              <span>{t('AiMenuManagerHome.ownerLabel')}</span>
              <p>{t('AiMenuManagerHome.ownerCommand')}</p>
            </div>

            <div className="ws-ai-menu-manager__proposal">
              <div className="ws-ai-menu-manager__proposal-head">
                <span>
                  <LuCheckCircle2 size={16} aria-hidden="true" />
                  {t('AiMenuManagerHome.proposalLabel')}
                </span>
                <small>{t('AiMenuManagerHome.approvalLabel')}</small>
              </div>
              <h3>{t('AiMenuManagerHome.proposalTitle')}</h3>
              <p>{t('AiMenuManagerHome.proposalBody')}</p>
              <div className="ws-ai-menu-manager__price-row">
                <span>{t('AiMenuManagerHome.currentPrice')}</span>
                <strong>{t('AiMenuManagerHome.nextPrice')}</strong>
              </div>
              <div className="ws-ai-menu-manager__proposal-actions">
                <button type="button">{t('AiMenuManagerHome.approve')}</button>
                <button type="button">{t('AiMenuManagerHome.edit')}</button>
              </div>
            </div>

            <div className="ws-ai-menu-manager__receipt">
              <LuSend size={16} aria-hidden="true" />
              <span>{t('AiMenuManagerHome.receipt')}</span>
            </div>
          </div>
        </AnimateOnScroll>

        <div className="ws-ai-menu-manager__commands">
          {commandKeys.map(({ icon: Icon, key }, index) => (
            <AnimateStaggerChild key={key} index={index} style={{ height: '100%' }}>
              <div className="ws-ai-menu-manager__command-card">
                <Icon size={20} aria-hidden="true" />
                <span>{t(`AiMenuManagerHome.${key}Input`)}</span>
                <strong>{t(`AiMenuManagerHome.${key}Output`)}</strong>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </div>

      <AnimateOnScroll delay={0.16}>
        <div className="ws-ai-menu-manager__actions">
          <WebsiteButton href="/ai-menu-manager">{t('AiMenuManagerHome.primaryCta')}</WebsiteButton>
          <Link href="/features" className="ws-ai-menu-manager__link">
            {t('AiMenuManagerHome.secondaryCta')}
            <LuArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
