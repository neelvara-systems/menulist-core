import { useTranslations } from 'next-intl';
import { LuListChecks, LuMessageCircle, LuMonitor, LuPackage, LuQrCode } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';

const capIcons = [LuQrCode, LuMessageCircle, LuPackage, LuMonitor, LuListChecks];

export default function PreparedForYouSection() {
  const t = useTranslations('Website');
  const capabilities = capIcons.map((icon, i) => ({
    icon,
    title: t(`Prepared.cap${i}Title`),
    subtitle: t(`Prepared.cap${i}Subtitle`),
    desc: t(`Prepared.cap${i}Desc`),
    relief: t(`Prepared.cap${i}Relief`),
  }));
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Prepared.title')}
          highlightedText={t('Prepared.highlight')}
          subtitle={t('Prepared.subtitle')}
        />
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
          {t('Prepared.bottomCaption')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
