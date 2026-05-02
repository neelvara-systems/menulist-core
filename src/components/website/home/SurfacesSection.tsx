import { useTranslations } from 'next-intl';
import { LuFileText, LuLayoutGrid, LuLink, LuMapPin, LuMonitor, LuQrCode, LuSmartphone } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const surfaceMeta = [
  { icon: LuQrCode },
  { icon: LuLink },
  { icon: LuMonitor },
  { icon: LuFileText },
  { icon: LuLayoutGrid },
  { icon: LuSmartphone },
  { icon: LuMapPin, comingSoon: true },
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
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Surfaces.title')}
          highlightedText={t('Surfaces.highlight')}
          subtitle={t('Surfaces.subtitle')}
        />
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
                  alignItems: 'flex-start',
                  opacity: surface.comingSoon ? 0.7 : 1,
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--ws-radius-md)',
                    backgroundColor: surface.comingSoon ? 'var(--ws-bg-subtle)' : 'var(--ws-bg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={surface.comingSoon ? 'var(--ws-text-muted)' : 'var(--ws-brand-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                    <h3 className="ws-h3" style={{ fontSize: '1rem' }}>
                      {surface.title}
                    </h3>
                    {surface.comingSoon && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ws-text-muted)', backgroundColor: 'var(--ws-border-subtle)', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        {t('Surfaces.soon')}
                      </span>
                    )}
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
