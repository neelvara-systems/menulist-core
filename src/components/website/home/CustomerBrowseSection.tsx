import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuLanguages, LuList, LuSearch } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const proofIcons = [LuSearch, LuList, LuLanguages, LuBadgeCheck];

export default function CustomerBrowseSection() {
  const t = useTranslations('Website');
  const proofItems = proofIcons.map((icon, i) => ({
    icon,
    title: t(`CustomerBrowse.proof${i}Title`),
    desc: t(`CustomerBrowse.proof${i}Desc`),
  }));

  return (
    <SectionWrapper>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
                <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
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
                  <div>
                    <h3 className="ws-h3" style={{ fontSize: '1.0625rem' }}>
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
          <div
            aria-label={t('CustomerBrowse.previewLabel')}
            style={{
              border: '1px solid var(--ws-border-default)',
              borderRadius: 'var(--ws-radius-xl)',
              backgroundColor: '#fff',
              boxShadow: 'var(--ws-shadow-lg)',
              padding: 'var(--ws-space-5)',
              maxWidth: 460,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'var(--ws-bg-accent)',
                  border: '1px solid var(--ws-border-default)',
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p className="ws-body-sm" style={{ fontWeight: 700, color: 'var(--ws-text-primary)' }}>
                  {t('CustomerBrowse.previewBusiness')}
                </p>
                <p className="ws-caption">{t('CustomerBrowse.previewMeta')}</p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--ws-space-2)',
                alignItems: 'center',
                marginTop: 'var(--ws-space-4)',
                color: 'var(--ws-success)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: 'var(--ws-success)',
                  display: 'inline-block',
                }}
              />
              {t('CustomerBrowse.previewFreshness')}
            </div>

            <div
              style={{
                marginTop: 'var(--ws-space-4)',
                border: '1px solid var(--ws-border-default)',
                borderRadius: 'var(--ws-radius-lg)',
                padding: '12px 14px',
                color: 'var(--ws-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <LuSearch size={18} />
              <span className="ws-body-sm">{t('CustomerBrowse.previewSearch')}</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--ws-space-2)',
                marginTop: 'var(--ws-space-4)',
                overflow: 'hidden',
              }}
            >
              <span
                className="ws-body-sm"
                style={{
                  backgroundColor: 'var(--ws-brand-secondary)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('CustomerBrowse.previewSectionActive')}
              </span>
              <span
                className="ws-body-sm"
                style={{
                  border: '1px solid var(--ws-border-default)',
                  borderRadius: 999,
                  padding: '8px 14px',
                  color: 'var(--ws-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('CustomerBrowse.previewSectionNext')}
              </span>
            </div>

            <div style={{ marginTop: 'var(--ws-space-5)' }}>
              <p
                className="ws-caption"
                style={{
                  color: 'var(--ws-brand-secondary)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                }}
              >
                {t('CustomerBrowse.previewCategory')}
              </p>
              {[0, 1].map((itemIndex) => (
                <div
                  key={itemIndex}
                  style={{
                    border: '1px solid var(--ws-border-default)',
                    borderRadius: 'var(--ws-radius-lg)',
                    padding: '14px',
                    marginTop: 'var(--ws-space-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--ws-space-4)',
                  }}
                >
                  <div>
                    <p className="ws-body-sm" style={{ fontWeight: 700, color: 'var(--ws-text-primary)' }}>
                      {t(`CustomerBrowse.previewItem${itemIndex}Name`)}
                    </p>
                    <p className="ws-caption" style={{ marginTop: 2 }}>
                      {t(`CustomerBrowse.previewItem${itemIndex}Desc`)}
                    </p>
                  </div>
                  <p className="ws-body-sm" style={{ fontWeight: 700, color: 'var(--ws-brand-secondary)', whiteSpace: 'nowrap' }}>
                    {t(`CustomerBrowse.previewItem${itemIndex}Price`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </SectionWrapper>
  );
}
