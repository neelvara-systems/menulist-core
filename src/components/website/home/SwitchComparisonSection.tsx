import { useTranslations } from 'next-intl';
import type { IconType } from 'react-icons';
import { LuArrowRight, LuCheckCircle, LuFileText, LuGlobe, LuLink, LuQrCode } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const comparisonMeta: Array<{ Icon: IconType }> = [
  { Icon: LuFileText },
  { Icon: LuQrCode },
  { Icon: LuGlobe },
  { Icon: LuLink },
];

export default function SwitchComparisonSection() {
  const t = useTranslations('Website');
  const rows = comparisonMeta.map(({ Icon }, index) => ({
    Icon,
    optionTitle: t(`SwitchComparison.row${index}Option`),
    optionDesc: t(`SwitchComparison.row${index}OptionDesc`),
    menulistTitle: t(`SwitchComparison.row${index}Menulist`),
    menulistDesc: t(`SwitchComparison.row${index}MenulistDesc`),
  }));

  return (
    <SectionWrapper className="ws-switch-comparison-section">
      <AnimateOnScroll>
        <p className="ws-switch-comparison__eyebrow">{t('SwitchComparison.eyebrow')}</p>
        <SectionHeading
          title={t('SwitchComparison.title')}
          highlightedText={t('SwitchComparison.highlight')}
          subtitle={t('SwitchComparison.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-switch-comparison" aria-label={t('SwitchComparison.label')}>
        <div className="ws-switch-comparison__header" aria-hidden="true">
          <span>{t('SwitchComparison.commonLabel')}</span>
          <span>{t('SwitchComparison.menulistLabel')}</span>
        </div>

        {rows.map(({ Icon, optionTitle, optionDesc, menulistTitle, menulistDesc }, index) => (
          <AnimateStaggerChild key={optionTitle} index={index} preset="card" style={{ height: '100%' }}>
            <article className="ws-switch-comparison__row">
              <div className="ws-switch-comparison__option">
                <span className="ws-switch-comparison__option-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <div>
                  <h3>{optionTitle}</h3>
                  <p>{optionDesc}</p>
                </div>
              </div>

              <span className="ws-switch-comparison__arrow" aria-hidden="true">
                <LuArrowRight size={18} />
              </span>

              <div className="ws-switch-comparison__menulist">
                <span className="ws-switch-comparison__menulist-icon" aria-hidden="true">
                  <LuCheckCircle size={19} />
                </span>
                <div>
                  <h3>{menulistTitle}</h3>
                  <p>{menulistDesc}</p>
                </div>
              </div>
            </article>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll delay={0.2}>
        <p className="ws-switch-comparison__caption">{t('SwitchComparison.caption')}</p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
