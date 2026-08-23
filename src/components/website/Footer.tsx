'use client';

import { useTranslations } from 'next-intl';
import { LuArrowRight, LuBadgeCheck, LuBookOpen, LuBuilding2, LuFileText, LuGlobe2, LuLayoutGrid, LuLink, LuMapPin } from 'react-icons/lu';
import { FEATURE_FLAGS } from '@config/features';
import { MENULIST_OPERATOR_DISCLOSURE } from '@constant/menulist/commercialIdentity';
import PublicAiSummaryLinks from '@/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks';
import BrandWordmark from './shared/BrandWordmark';
import Link from './shared/WebsiteLink';
import AnimateOnScroll, { AnimateStaggerChild } from './shared/AnimateOnScroll';
import WebsiteButton from './shared/WebsiteButton';
import WebsiteAnalyticsPreferencesButton from './shared/WebsiteAnalyticsPreferencesButton';
import WebsiteLanguageSwitcher from './shared/WebsiteLanguageSwitcher';
import WebsiteThemeSwitcher from './shared/WebsiteThemeSwitcher';

const productLinks = [
  { href: '/ai-menu-manager', key: 'aiMenuManager' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/features', key: 'features' },
  { href: '/multi-location', key: 'multiLocation' },
  { href: '/pricing', key: 'pricing' },
];

const sourceLinks = [
  { href: '/#included-with-link', key: 'publicProof' },
  { href: '/features/official-business-page', key: 'officialPage' },
  { href: '/tools', key: 'toolsHub' },
  { href: '/create-menu', key: 'getStarted' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
];

const resourceLinks = FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES
  ? [
    { href: '/developers', key: 'developers' },
    { href: '/resources/menu-engineering', key: 'menuEngineering' },
    { href: '/resources/qr-menu-for-restaurants', key: 'qrMenuForRestaurants' },
    { href: '/resources/digital-menu-vs-pdf-menu', key: 'digitalMenuVsPdf' },
    { href: '/resources/google-business-profile-menu', key: 'googleBusinessProfileMenu' },
    { href: '/resources/restaurant-menu-seo', key: 'restaurantMenuSeo' },
    { href: '/resources/ai-search-menu-discovery', key: 'aiSearchDiscovery' },
    { href: '/resources/official-menu-source', key: 'officialMenuSource' },
    { href: '/faq', key: 'faq' },
    { href: '/trust-security', key: 'trustSecurity' },
  ]
  : [
    { href: '/developers', key: 'developers' },
    { href: '/faq', key: 'faq' },
    { href: '/trust-security', key: 'trustSecurity' },
  ];

const legalLinks = [
  { href: '/privacy-policy', key: 'privacyPolicy' },
  { href: '/terms-of-service', key: 'termsOfService' },
  { href: '/refund-policy', key: 'refundPolicy' },
];

const proofIcons = [LuBadgeCheck, LuGlobe2, LuBuilding2];

const socialLinks = [
  { href: 'https://instagram.com/menulistai', label: 'Instagram' },
  { href: 'https://linkedin.com/company/menulistai', label: 'LinkedIn' },
];

const MENU_LIST_AI_SUMMARY_PROMPT = [
  'Please summarize what MenuList does, who it is for, and how it turns one owner-approved menu, service list, price list, or catalogue source into an official customer link, Official Business Page, QR links, print files, customer actions, and owner workflows.',
  'Use https://menulist.ai and https://menulist.ai/llms.txt as context.',
  'Do not invent ranking promises, AI citation guarantees, automatic external-platform updates, or unsupported POS/account posting claims.',
].join(' ');

export default function Footer() {
  const t = useTranslations('Website');
  const currentYear = new Date().getFullYear();
  const proofItems = proofIcons.map((Icon, index) => ({
    Icon,
    title: t(`Footer.proof${index}Title`),
    desc: t(`Footer.proof${index}Desc`),
  }));

  return (
    <footer id="site-footer" className="ws-footer-revenue">
      {/* <FooterVeilCanvas /> */}
      <div className="ws-container">
        <AnimateOnScroll preset="footer">
          <section className="ws-footer-cta" aria-labelledby="footer-cta-title">
            <div>
              <p className="ws-footer-eyebrow">{t('Footer.ctaEyebrow')}</p>
              <h2 id="footer-cta-title">{t('Footer.ctaTitle')}</h2>
              <p>{t('Footer.ctaBody')}</p>
            </div>
            <div className="ws-footer-cta__actions">
              <WebsiteButton href="/create-menu">
                {t('Footer.ctaPrimary')}
              </WebsiteButton>
              <Link href="/pricing" className="ws-footer-secondary-link">
                {t('Footer.ctaSecondary')} <LuArrowRight size={16} />
              </Link>
            </div>
          </section>
        </AnimateOnScroll>

        <section className="ws-footer-proof-grid" aria-label={t('Footer.proofLabel')}>
          {proofItems.map((item, index) => (
            <AnimateStaggerChild key={item.title} index={index} preset="footer" className="ws-footer-proof-card-reveal">
              <div className="ws-footer-proof-card">
                <item.Icon size={20} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            </AnimateStaggerChild>
          ))}
        </section>

        <AnimateOnScroll preset="footer" delay={0.08} className="ws-footer-main">
          <div className="ws-footer-brand">
            <Link href="/" className="ws-footer-logo" aria-label={t('Footer.homeAria')}>
              <BrandWordmark
                className="ws-brand-wordmark"
                iconHeight={26}
                textClassName="ws-brand-wordmark__text"
              />
            </Link>
            <p>{t('Footer.tagline')}</p>
            <p className="ws-footer-source-line">{t('Footer.sourceLine')}</p>
            <p className="ws-footer-source-line">{MENULIST_OPERATOR_DISCLOSURE}</p>
            <a href="mailto:hello@menulist.ai" className="ws-footer-email">
              hello@menulist.ai
            </a>
            <div className="ws-footer-social-links" aria-label={t('Footer.socialLabel')}>
              {socialLinks.map((social) => (
                <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer">
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          <nav className="ws-footer-link-grid" aria-label={t('Footer.navigationLabel')}>
            <div>
              <h3><LuLayoutGrid size={15} /> {t('Footer.productHeading')}</h3>
              <ul>
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{t(`Footer.${link.key}`)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3><LuLink size={15} /> {t('Footer.sourceHeading')}</h3>
              <ul>
                {sourceLinks.map((link) => (
                  <li key={`${link.href}-${link.key}`}>
                    <Link href={link.href}>{t(`Footer.${link.key}`)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3><LuBookOpen size={15} /> {t('Footer.resourcesHeading')}</h3>
              <ul>
                {resourceLinks.map((link) => (
                  <li key={`${link.href}-${link.key}`}>
                    <Link href={link.href}>{t(`Footer.${link.key}`)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3><LuFileText size={15} /> {t('Footer.legalHeading')}</h3>
              <ul>
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{t(`Footer.${link.key}`)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </AnimateOnScroll>

        <AnimateOnScroll preset="footer" delay={0.1}>
          <PublicAiSummaryLinks
            className="ws-footer-ai-summary"
            label={t('Footer.aiSummaryLabel')}
            product="menulist"
            prompt={MENU_LIST_AI_SUMMARY_PROMPT}
          />
        </AnimateOnScroll>

        <AnimateOnScroll preset="fade" delay={0.12} className="ws-footer-bottom">
          <p>{t('Footer.copyright', { year: currentYear })}</p>
          <span className="ws-footer-bottom__tagline"><LuMapPin size={14} /> {t('Footer.bottomTagline')}</span>
          <div className="ws-footer-bottom__controls" role="group" aria-label={t('Footer.preferencesLabel')}>
            <WebsiteAnalyticsPreferencesButton />
            <WebsiteLanguageSwitcher surface="footer" />
            <WebsiteThemeSwitcher />
          </div>
        </AnimateOnScroll>
      </div>
    </footer>
  );
}
