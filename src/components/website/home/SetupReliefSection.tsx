import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LuFileText, LuPackage, LuPalette } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';

const capIcons = [LuFileText, LuPalette, LuPackage];

export default function SetupReliefSection() {
  const t = useTranslations('Website');
  const capabilities = capIcons.map((icon, i) => ({
    icon,
    title: t(`SetupRelief.cap${i}Title`),
    subtitle: t(`SetupRelief.cap${i}Subtitle`),
    desc: t(`SetupRelief.cap${i}Desc`),
    relief: t(`SetupRelief.cap${i}Relief`),
  }));

  return (
    <SectionWrapper id="setup">
      <AnimateOnScroll>
        <SectionHeading
          title={t('SetupRelief.title')}
          highlightedText={t('SetupRelief.highlight')}
          subtitle={t('SetupRelief.subtitle')}
        />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <div className="ws-draft-visual-frame ws-draft-visual-frame--wide">
          <Image
            src="/images/website/menulist-setup-relief-workflow.webp"
            alt={t('SetupRelief.title')}
            width={1600}
            height={900}
            loading="eager"
            unoptimized
            sizes="(min-width: 1024px) 960px, 100vw"
            className="ws-draft-product-image"
          />
        </div>
      </AnimateOnScroll>

      <div className="ws-feature-card-grid">
        {capabilities.map((cap, index) => {
          const Icon = cap.icon;
          return (
            <AnimateStaggerChild key={cap.title} index={index} style={{ height: '100%' }}>
              <WebsiteFeatureCard
                icon={Icon}
                title={cap.title}
                subtitle={cap.subtitle}
                description={cap.desc}
                footer={cap.relief}
              />
            </AnimateStaggerChild>
          );
        })}
      </div>

      <AnimateOnScroll delay={0.15}>
        <p
          className="ws-caption"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ws-space-8)',
            maxWidth: 'var(--ws-max-w-text)',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {t('SetupRelief.bottomCaption')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
