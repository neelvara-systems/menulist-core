import { useTranslations } from 'next-intl';
import SectionWrapper from '../shared/SectionWrapper';

export default function AboutPage() {
  const t = useTranslations('Website');
  return (
    <main>
      <SectionWrapper>
        <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
          <h1 className="ws-h1">{t('About.title')}<span className="ws-highlight">{t('About.titleHighlight')}</span></h1>

          <p className="ws-body" style={{ marginTop: 'var(--ws-space-8)' }}>
            {t('About.body1')}
          </p>

          <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)' }}>
            {t('About.body2')}
          </p>
        </div>
      </SectionWrapper>

      <SectionWrapper variant="subtle">
        <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
          <h2 className="ws-h2">{t('About.whoTitle')}</h2>

          <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)' }}>
            {t('About.whoBody')}
          </p>

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
          <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--ws-text-muted)' }}>
            {t('About.footerText')}
          </p>
        </div>
      </SectionWrapper>
    </main>
  );
}
