'use client';

import { useTranslations } from 'next-intl';
import { LuShieldCheck } from 'react-icons/lu';
import { WEBSITE_ANALYTICS_PREFERENCES_EVENT } from './websiteAnalyticsConsentConfig';

export default function WebsiteAnalyticsPreferencesButton() {
  const t = useTranslations('Website.AnalyticsConsent');

  return (
    <button
      type="button"
      className="ws-theme-switcher__trigger ws-analytics-preferences-button"
      aria-label={t('preferenceButtonAria')}
      onClick={() => window.dispatchEvent(new Event(WEBSITE_ANALYTICS_PREFERENCES_EVENT))}
    >
      <LuShieldCheck size={14} />
      <span>{t('preferenceButton')}</span>
    </button>
  );
}
