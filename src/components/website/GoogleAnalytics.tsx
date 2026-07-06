'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || '';
const IS_CONFIGURED_GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);

export default function GoogleAnalytics() {
  if (!IS_CONFIGURED_GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gaId = '${GA_MEASUREMENT_ID}';
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('set', 'ads_data_redaction', true);
          gtag('js', new Date());
          function getMenulistAnalyticsPageLocation() {
            try {
              var url = new URL(window.location.href);
              url.search = '';
              url.hash = '';
              return url.toString();
            } catch (error) {
              return window.location.origin + window.location.pathname;
            }
          }
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: getMenulistAnalyticsPageLocation(),
          });
        `}
      </Script>
    </>
  );
}
