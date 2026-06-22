'use client';

import { useTranslations } from 'next-intl';
import { LuCheck, LuLink, LuQrCode, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll from './AnimateOnScroll';
import SectionWrapper from './SectionWrapper';
import WebsiteHeadline from './WebsiteHeadline';

const proofIcons = [LuShieldCheck, LuLink, LuQrCode, LuCheck];

type WebsiteReplacementBlockProps = {
  variant?: 'default' | 'subtle';
  className?: string;
  id?: string;
};

export default function WebsiteReplacementBlock({
  variant = 'default',
  className = '',
  id,
}: WebsiteReplacementBlockProps) {
  const t = useTranslations('Website.WebsiteReplacement');

  return (
    <SectionWrapper
      id={id}
      variant={variant}
      className={`ws-website-replacement ${className}`.trim()}
    >
      <AnimateOnScroll preset="card" className="ws-website-replacement__layout">
        <div className="ws-website-replacement__copy">
          <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
          <WebsiteHeadline
            as="h2"
            text={t('title')}
            highlightedText={t('highlight')}
          />
          <p>{t('body')}</p>
          <div className="ws-website-replacement__proof">
            {proofIcons.map((Icon, index) => (
              <span key={index}>
                <Icon size={16} aria-hidden="true" />
                {t(`proof${index}`)}
              </span>
            ))}
          </div>
        </div>

        <aside
          className="ws-website-replacement__boundary"
          aria-label={t('boundaryLabel')}
        >
          <span className="ws-website-replacement__boundary-icon" aria-hidden="true">
            <LuShieldCheck size={20} />
          </span>
          <h3>{t('boundaryTitle')}</h3>
          <p>{t('boundaryBody')}</p>
        </aside>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
