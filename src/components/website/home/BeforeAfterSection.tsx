import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuFileText,
  LuLink,
  LuQrCode,
  LuShieldCheck,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import Link from '../shared/WebsiteLink';

const beforeIcons = [LuFileText, LuQrCode, LuLink];
const afterIcons = [LuShieldCheck, LuBadgeCheck, LuQrCode];

export default function BeforeAfterSection() {
  const t = useTranslations('Website');

  const beforeItems = beforeIcons.map((Icon, index) => ({
    Icon,
    title: t(`BeforeAfter.before${index}Title`),
    desc: t(`BeforeAfter.before${index}Desc`),
  }));

  const afterItems = afterIcons.map((Icon, index) => ({
    Icon,
    title: t(`BeforeAfter.after${index}Title`),
    desc: t(`BeforeAfter.after${index}Desc`),
  }));

  return (
    <SectionWrapper id="why-menulist" variant="subtle" className="ws-before-after-section">
      <AnimateOnScroll>
        <SectionHeading
          title={t('BeforeAfter.title')}
          highlightedText={t('BeforeAfter.highlight')}
          subtitle={t('BeforeAfter.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-before-after__grid">
        <AnimateStaggerChild index={0} className="ws-before-after__card ws-before-after__card--before">
          <p className="ws-before-after__label">{t('BeforeAfter.beforeLabel')}</p>
          <div className="ws-before-after__list">
            {beforeItems.map((item) => (
              <div key={item.title} className="ws-before-after__item">
                <span className="ws-before-after__icon" aria-hidden="true">
                  <item.Icon size={19} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimateStaggerChild>

        <AnimateStaggerChild index={1} className="ws-before-after__card ws-before-after__card--after">
          <p className="ws-before-after__label">{t('BeforeAfter.afterLabel')}</p>
          <div className="ws-before-after__list">
            {afterItems.map((item) => (
              <div key={item.title} className="ws-before-after__item">
                <span className="ws-before-after__icon" aria-hidden="true">
                  <item.Icon size={19} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimateStaggerChild>
      </div>

      <AnimateOnScroll className="ws-before-after__caption" delay={0.12}>
        <p>{t('BeforeAfter.caption')}</p>
        <Link href="/how-it-works">
          {t('BeforeAfter.cta')} <LuArrowRight size={16} />
        </Link>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
