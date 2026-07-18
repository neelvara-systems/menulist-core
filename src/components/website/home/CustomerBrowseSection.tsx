import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuBrain, LuLanguages, LuList, LuSearch } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

export default function CustomerBrowseSection() {
  const t = useTranslations('Website');
  const proofItems = [
    { icon: LuBrain, title: t('CustomerBrowse.proof4Title'), desc: t('CustomerBrowse.proof4Desc') },
    { icon: LuSearch, title: t('CustomerBrowse.proof0Title'), desc: t('CustomerBrowse.proof0Desc') },
    { icon: LuList, title: t('CustomerBrowse.proof1Title'), desc: t('CustomerBrowse.proof1Desc') },
    { icon: LuLanguages, title: t('CustomerBrowse.proof2Title'), desc: t('CustomerBrowse.proof2Desc') },
    { icon: LuBadgeCheck, title: t('CustomerBrowse.proof3Title'), desc: t('CustomerBrowse.proof3Desc') },
  ];

  return (
    <SectionWrapper id="customer-demo">
      <AnimateOnScroll>
        <SectionHeading
          title={t('CustomerBrowse.title')}
          highlightedText={t('CustomerBrowse.highlight')}
          subtitle={t('CustomerBrowse.subtitle')}
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'var(--ws-space-8)',
          alignItems: 'center',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '1040px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
          {proofItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <AnimateStaggerChild key={item.title} index={index}>
                <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--ws-radius-md)',
                      backgroundColor: 'var(--ws-bg-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={21} color="var(--ws-brand-secondary)" />
                  </div>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <h3 className="ws-h3" style={{ fontSize: '1.0625rem', margin: 0 }}>
                      {item.title}
                    </h3>
                    <p className="ws-caption" style={{ marginTop: '4px' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </AnimateStaggerChild>
            );
          })}
        </div>

        <AnimateOnScroll delay={0.15}>
          <div className="ws-draft-visual-frame ws-draft-visual-frame--phone" aria-label={t('CustomerBrowse.previewLabel')}>
            <Image
              src="/images/website/menulist-public-menu-mobile.webp"
              alt={t('CustomerBrowse.previewLabel')}
              width={900}
              height={1400}
              sizes="(min-width: 1024px) 360px, 86vw"
              className="ws-draft-product-image"
            />
          </div>
        </AnimateOnScroll>
      </div>
    </SectionWrapper>
  );
}
