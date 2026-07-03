import { useTranslations } from 'next-intl';
import {
  LuActivity,
  LuBuilding2,
  LuMessageCircle,
  LuPrinter,
  LuQrCode,
  LuSmartphone,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const includedItems = [
  { key: 'officialPage', Icon: LuBuilding2 },
  { key: 'qrLink', Icon: LuQrCode },
  { key: 'printFiles', Icon: LuPrinter },
  { key: 'customerActions', Icon: LuMessageCircle },
  { key: 'phoneDashboard', Icon: LuSmartphone },
  { key: 'activityFeedback', Icon: LuActivity },
];

export default function CustomerLinkIncludesSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper id="included-with-link" variant="subtle" className="ws-link-includes-section">
      <AnimateOnScroll>
        <SectionHeading
          title={t('CustomerLinkIncludes.title')}
          highlightedText={t('CustomerLinkIncludes.highlight')}
          subtitle={t('CustomerLinkIncludes.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-link-includes__grid" aria-label={t('CustomerLinkIncludes.label')}>
        {includedItems.map(({ key, Icon }, index) => (
          <AnimateStaggerChild className="ws-link-includes__item" index={index} key={key}>
            <span className="ws-link-includes__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <h3>{t(`CustomerLinkIncludes.${key}Title`)}</h3>
              <p>{t(`CustomerLinkIncludes.${key}Desc`)}</p>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll className="ws-link-includes__caption" delay={0.12}>
        {t('CustomerLinkIncludes.caption')}
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
