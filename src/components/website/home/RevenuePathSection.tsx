import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuClock3,
  LuClipboardCheck,
  LuGlobe2,
  LuMapPin,
  LuPhoneCall,
  LuQrCode,
  LuSearch,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import Link from '../shared/WebsiteLink';

const pathIcons = [LuClipboardCheck, LuGlobe2, LuQrCode, LuPhoneCall];
const assuranceIcons = [LuSearch, LuClock3, LuBadgeCheck, LuMapPin];

const navLinks = [
  { href: '#public-proof', key: 'link0' },
  { href: '#setup', key: 'link1' },
  { href: '#industries', key: 'link2' },
  { href: '/pricing', key: 'link3' },
];

export default function RevenuePathSection() {
  const t = useTranslations('Website');
  const revenueTitle = t('RevenuePath.title');
  const revenueHighlight = t('RevenuePath.highlight');
  const pathSteps = pathIcons.map((Icon, index) => ({
    Icon,
    label: t(`RevenuePath.step${index}Label`),
    title: t(`RevenuePath.step${index}Title`),
    desc: t(`RevenuePath.step${index}Desc`),
  }));
  const assurances = assuranceIcons.map((Icon, index) => ({
    Icon,
    title: t(`RevenuePath.assurance${index}Title`),
    desc: t(`RevenuePath.assurance${index}Desc`),
  }));

  return (
    <SectionWrapper className="ws-revenue-path-section">
      <AnimateOnScroll>
        <div className="ws-revenue-path-shell">
          <div className="ws-revenue-path-copy">
            <div>
              <p className="ws-revenue-path-eyebrow">{t('RevenuePath.eyebrow')}</p>
              <WebsiteHeadline
                as="h2"
                parts={[
                  { text: revenueTitle },
                  { text: ' ' },
                  { text: revenueHighlight, highlight: true },
                ]}
                ariaLabel={`${revenueTitle} ${revenueHighlight}`}
              />
            </div>
            <p className="ws-revenue-path-subtitle">{t('RevenuePath.subtitle')}</p>
          </div>

          <div className="ws-revenue-path-grid">
            <div className="ws-revenue-path-steps" aria-label={t('RevenuePath.pathLabel')}>
              {pathSteps.map((step, index) => {
                const Icon = step.Icon;
                return (
                  <AnimateStaggerChild key={step.title} index={index}>
                    <div className="ws-revenue-path-step">
                      <div className="ws-revenue-path-step__top">
                        <div className="ws-revenue-path-step__icon">
                          <Icon size={19} />
                        </div>
                        <span className="ws-revenue-path-step__number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="ws-revenue-path-step__body">
                        <p>{step.label}</p>
                        <h3>{step.title}</h3>
                        <span className="ws-revenue-path-step__desc">{step.desc}</span>
                      </div>
                      {index < pathSteps.length - 1 && <LuArrowRight className="ws-revenue-path-step__arrow" size={17} />}
                    </div>
                  </AnimateStaggerChild>
                );
              })}
            </div>

            <div className="ws-revenue-assurance-panel">
              <p className="ws-revenue-assurance-panel__label">{t('RevenuePath.assuranceLabel')}</p>
              <div>
                {assurances.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <div key={item.title} className="ws-revenue-assurance-item">
                      <Icon size={17} />
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <nav className="ws-revenue-link-row" aria-label={t('RevenuePath.navLabel')}>
            {navLinks.map((link) => (
              <Link key={link.key} href={link.href}>
                {t(`RevenuePath.${link.key}`)}
                <LuArrowRight size={15} />
              </Link>
            ))}
          </nav>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
