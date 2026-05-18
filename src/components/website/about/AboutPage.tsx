import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuGlobe2, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

const principleIcons = [LuShieldCheck, LuGlobe2, LuBadgeCheck];

export default function AboutPage() {
  const t = useTranslations('Website');
  const proofItems = Array.from({ length: 3 }, (_, i) => t(`About.proof${i}`));
  const principles = principleIcons.map((icon, i) => ({
    icon,
    title: t(`About.principle${i}Title`),
    desc: t(`About.principle${i}Desc`),
  }));

  return (
    <main>
      <WebsitePageHero
        eyebrow={t('About.eyebrow')}
        parts={[
          { text: t('About.title') },
          { text: t('About.titleHighlight'), highlight: true },
        ]}
        subtitle={t('About.heroSubtitle')}
        primaryCta={t('About.primaryCta')}
        primaryHref="/create-menu"
        secondaryCta={t('About.secondaryCta')}
        secondaryHref="/features"
      >
        <WebsiteProofStrip items={proofItems} />
        <WebsiteMobileSupportHint />
        <WebsiteOwnerApprovalHint />
      </WebsitePageHero>

      <SectionWrapper variant="subtle">
        <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
          <AnimateOnScroll>
            <WebsiteHeadline as="h2" text={t('About.missionTitle')} />
          </AnimateOnScroll>
          <p className="ws-body" style={{ marginTop: 'var(--ws-space-8)' }}>
            {t('About.body1')}
          </p>
          <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)' }}>
            {t('About.body2')}
          </p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <WebsiteHeadline as="h2" text={t('About.principlesTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('About.principlesSubtitle')}
            </p>
          </div>
        </AnimateOnScroll>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--ws-space-5)', marginTop: 'var(--ws-space-10)' }}>
          {principles.map(({ icon: Icon, title, desc }, index) => (
            <AnimateStaggerChild key={title} index={index}>
              <div className="ws-card" style={{ height: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--ws-radius-md)', background: 'var(--ws-bg-accent)', color: 'var(--ws-brand-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--ws-space-4)' }}>
                  <Icon size={22} />
                </div>
                <h3 className="ws-h3">{title}</h3>
                <p className="ws-caption" style={{ marginTop: 'var(--ws-space-3)' }}>{desc}</p>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper variant="subtle">
        <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
          <AnimateOnScroll>
            <WebsiteHeadline as="h2" text={t('About.whoTitle')} />
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)' }}>
              {t('About.whoBody')}
            </p>
          </AnimateOnScroll>
          <div style={{ marginTop: 'var(--ws-space-8)' }}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)' }}>
              <strong style={{ color: 'var(--ws-text-primary)' }}>{t('About.emailLabel')}</strong>{' '}
              <a href="mailto:hello@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none' }}>
                hello@menulist.ai
              </a>
            </p>
            <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-2)' }}>
              <strong style={{ color: 'var(--ws-text-primary)' }}>{t('About.supportLabel')}</strong> {t('About.supportValue')}
            </p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div style={{ textAlign: 'center' }}>
          <WebsiteHeadline as="h2" text={t('About.ctaTitle')} />
          <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)', maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
            {t('About.footerText')}
          </p>
          <div style={{ marginTop: 'var(--ws-space-8)' }}>
            <WebsiteButton href="/create-menu">{t('About.primaryCta')}</WebsiteButton>
          </div>
        </div>
      </SectionWrapper>
    </main>
  );
}
