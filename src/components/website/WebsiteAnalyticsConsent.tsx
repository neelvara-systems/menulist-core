'use client';

import { useTranslations } from 'next-intl';
import PublicCookieConsentBanner, { type PublicCookieConsentChoice } from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';
import ClarityAnalytics from './ClarityAnalytics';
import GoogleAnalytics from './GoogleAnalytics';
import { useWebsitePath } from './shared/WebsiteProductPathProvider';
import { WEBSITE_ANALYTICS_CONSENT_STORAGE_KEY, WEBSITE_ANALYTICS_PREFERENCES_EVENT } from './shared/websiteAnalyticsConsentConfig';

type AnalyticsConsent = PublicCookieConsentChoice;

type ConsentWindow = Window & {
  clarity?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

function deleteCookie(name: string) {
  const hostname = window.location.hostname;
  const hostnameParts = hostname.split('.').filter(Boolean);
  const parentDomain = hostnameParts.length > 2 ? hostnameParts.slice(-2).join('.') : hostname;
  const domainCandidates = ['', hostname, `.${hostname}`, parentDomain, `.${parentDomain}`];

  Array.from(new Set(domainCandidates)).forEach((domain) => {
    document.cookie = [
      `${name}=`,
      'Max-Age=0',
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'path=/',
      domain ? `domain=${domain}` : '',
      'SameSite=Lax',
    ].filter(Boolean).join('; ');
  });
}

function clearKnownAnalyticsCookies() {
  const currentNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter(Boolean) as string[];

  const knownNames = [
    '_ga',
    '_gid',
    '_gat',
    '_clck',
    '_clsk',
    'ANONCHK',
    'CLID',
    'MUID',
    'SM',
  ];

  const dynamicNames = currentNames.filter((name) => (
    name.startsWith('_ga_') ||
    name.startsWith('_gat_') ||
    name.startsWith('_clck') ||
    name.startsWith('_clsk')
  ));

  Array.from(new Set([...knownNames, ...dynamicNames])).forEach(deleteCookie);
}

function applyConsentToLoadedVendors(consent: AnalyticsConsent) {
  const consentWindow = window as ConsentWindow;
  const analyticsStorage = consent === 'accepted' ? 'granted' : 'denied';

  if (typeof consentWindow.gtag === 'function') {
    consentWindow.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: analyticsStorage,
    });
  }

  if (typeof consentWindow.clarity === 'function') {
    consentWindow.clarity('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: analyticsStorage,
    });

    if (consent === 'declined') {
      consentWindow.clarity('consent', false);
    }
  }

  if (consent === 'declined') {
    clearKnownAnalyticsCookies();
  }
}

export default function WebsiteAnalyticsConsent() {
  const t = useTranslations('Website.AnalyticsConsent');
  const privacyHref = useWebsitePath('/privacy-policy');

  return (
    <PublicCookieConsentBanner
      acceptLabel={t('accept')}
      closeLabel={t('close')}
      declineLabel={t('decline')}
      message={t('body')}
      onConsentChange={applyConsentToLoadedVendors}
      panelLabel={t('panelAria')}
      preferenceEventName={WEBSITE_ANALYTICS_PREFERENCES_EVENT}
      privacyHref={privacyHref}
      privacyLabel={t('learnMore')}
      product="menulist"
      statusAccepted={t('currentAccepted')}
      statusDeclined={t('currentDeclined')}
      storageKey={WEBSITE_ANALYTICS_CONSENT_STORAGE_KEY}
    >
      <GoogleAnalytics />
      <ClarityAnalytics />
    </PublicCookieConsentBanner>
  );
}
