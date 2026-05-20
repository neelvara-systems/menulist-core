import { useTranslations } from 'next-intl';
import { LuCamera, LuFileText, LuImage, LuLanguages, LuPackage, LuPalette } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const capIcons = [LuCamera, LuImage, LuFileText, LuLanguages, LuPalette, LuPackage];

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {capabilities.map((cap, index) => {
          const Icon = cap.icon;
          return (
            <AnimateStaggerChild key={cap.title} index={index} style={{ height: '100%' }}>
              <div
                className="ws-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', height: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--ws-radius-md)',
                      backgroundColor: 'var(--ws-bg-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} color="var(--ws-brand-secondary)" />
                  </div>

                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <h3 className="ws-h3" style={{ fontSize: '1.0625rem', margin: 0 }}>
                      {cap.title}
                    </h3>
                    <p className="ws-body-sm" style={{ fontWeight: 500, color: 'var(--ws-brand-secondary)', marginTop: '2px' }}>
                      {cap.subtitle}
                    </p>
                  </div>
                </div>

                <p className="ws-caption" style={{ flex: 1 }}>
                  {cap.desc}
                </p>

                <p className="ws-caption" style={{
                  fontWeight: 600,
                  color: 'var(--ws-text-primary)',
                  borderTop: '1px solid var(--ws-border-subtle)',
                  paddingTop: 'var(--ws-space-3)',
                  marginTop: 'var(--ws-space-1)',
                }}>
                  {cap.relief}
                </p>
              </div>
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
