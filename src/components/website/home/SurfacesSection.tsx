import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  LuActivity,
  LuLayoutGrid,
  LuLink,
  LuMessageCircle,
  LuMousePointerClick,
  LuQrCode,
  LuSearch,
  LuSmartphone,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const surfaceMeta = [
  { icon: LuQrCode },
  { icon: LuLink },
  { icon: LuLayoutGrid },
  { icon: LuMousePointerClick },
  { icon: LuSmartphone },
  { icon: LuSearch },
  { icon: LuActivity },
  { icon: LuMessageCircle },
];

export default function SurfacesSection() {
  const t = useTranslations('Website');
  const surfaces = surfaceMeta.map((meta, i) => ({
    ...meta,
    title: t(`Surfaces.surface${i}Title`),
    subtitle: t(`Surfaces.surface${i}Subtitle`),
    desc: t(`Surfaces.surface${i}Desc`),
  }));
  return (
    <SectionWrapper id="public-proof" variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Surfaces.title')}
          highlightedText={t('Surfaces.highlight')}
          subtitle={t('Surfaces.subtitle')}
        />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <div className="ws-draft-visual-frame ws-draft-visual-frame--wide">
          <Image
            src="/images/website/menulist-public-surfaces-matrix.webp"
            alt={t('Surfaces.title')}
            width={1600}
            height={1000}
            loading="eager"
            unoptimized
            sizes="(min-width: 1024px) 960px, 100vw"
            className="ws-draft-product-image"
          />
        </div>
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--ws-space-4)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {surfaces.map((surface, index) => {
          const Icon = surface.icon;
          return (
            <AnimateStaggerChild key={surface.title} index={index} style={{ height: '100%' }}>
              <div
                className="ws-card"
                style={{
                  display: 'flex',
                  gap: 'var(--ws-space-4)',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--ws-radius-md)',
                    backgroundColor: 'var(--ws-bg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color="var(--ws-brand-secondary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                    <h3 className="ws-h3" style={{ fontSize: '1rem', margin: 0 }}>
                      {surface.title}
                    </h3>
                  </div>
                  <p className="ws-body-sm" style={{ marginTop: '2px' }}>
                    {surface.subtitle}
                  </p>
                  <p className="ws-caption" style={{ marginTop: '4px' }}>
                    {surface.desc}
                  </p>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <AnimateOnScroll delay={0.2}>
        <p
          className="ws-body-sm"
          style={{
            textAlign: 'center',
            color: 'var(--ws-text-muted)',
            marginTop: 'var(--ws-space-10)',
            maxWidth: '520px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          {t('Surfaces.bottomCaption')}
        </p>
      </AnimateOnScroll>

    </SectionWrapper>
  );
}
