'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCheck, LuShieldCheck, LuX } from 'react-icons/lu';
import ClarityAnalytics from './ClarityAnalytics';
import GoogleAnalytics from './GoogleAnalytics';
import Link from './shared/WebsiteLink';
import { WEBSITE_ANALYTICS_CONSENT_STORAGE_KEY, WEBSITE_ANALYTICS_PREFERENCES_EVENT } from './shared/websiteAnalyticsConsentConfig';

type AnalyticsConsent = 'accepted' | 'declined';

type ConsentWindow = Window & {
  clarity?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

function readStoredConsent(): AnalyticsConsent | null {
  try {
    const stored = window.localStorage.getItem(WEBSITE_ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === 'accepted' || stored === 'declined' ? stored : null;
  } catch {
    return null;
  }
}

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
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();

    setMounted(true);
    setConsent(stored);
    setShowPanel(stored === null);

    if (stored) {
      applyConsentToLoadedVendors(stored);
    }

    function handleOpenPreferences() {
      setShowPanel(true);
    }

    window.addEventListener(WEBSITE_ANALYTICS_PREFERENCES_EVENT, handleOpenPreferences);
    return () => window.removeEventListener(WEBSITE_ANALYTICS_PREFERENCES_EVENT, handleOpenPreferences);
  }, []);

  function saveConsent(nextConsent: AnalyticsConsent) {
    try {
      window.localStorage.setItem(WEBSITE_ANALYTICS_CONSENT_STORAGE_KEY, nextConsent);
    } catch {
      // If localStorage is unavailable, keep the runtime choice for this page.
    }

    setConsent(nextConsent);
    setShowPanel(false);
    applyConsentToLoadedVendors(nextConsent);
  }

  if (!mounted) return null;

  return (
    <>
      {consent === 'accepted' ? (
        <>
          <GoogleAnalytics />
          <ClarityAnalytics />
        </>
      ) : null}

      {showPanel ? (
        <div
          className="ws-analytics-consent"
          role="dialog"
          aria-label={t('panelAria')}
          aria-modal="false"
        >
          <div className="ws-analytics-consent__icon" aria-hidden="true">
            <LuShieldCheck size={18} />
          </div>
          <div className="ws-analytics-consent__content">
            <div className="ws-analytics-consent__header">
              <h2>{t('title')}</h2>
              {consent ? (
                <button
                  type="button"
                  className="ws-analytics-consent__close"
                  aria-label={t('close')}
                  onClick={() => setShowPanel(false)}
                >
                  <LuX size={16} />
                </button>
              ) : null}
            </div>
            <p>{t('body')}</p>
            {consent ? (
              <p className="ws-analytics-consent__status">
                {consent === 'accepted' ? t('currentAccepted') : t('currentDeclined')}
              </p>
            ) : null}
            <div className="ws-analytics-consent__actions">
              <button
                type="button"
                className="ws-analytics-consent__button ws-analytics-consent__button--primary"
                onClick={() => saveConsent('accepted')}
              >
                <LuCheck size={15} />
                {t('accept')}
              </button>
              <button
                type="button"
                className="ws-analytics-consent__button"
                onClick={() => saveConsent('declined')}
              >
                <LuX size={15} />
                {t('decline')}
              </button>
              <Link href="/privacy-policy" className="ws-analytics-consent__link">
                {t('learnMore')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
