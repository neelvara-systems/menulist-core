'use client';

import Script from 'next/script';

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || 'sc0tsmzg6b';

export default function ClarityAnalytics() {
  if (process.env.NODE_ENV === 'development') return null;
  if (!CLARITY_ID) return null;

  return (
    <Script id="clarity-analytics" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        c[a]("consentv2",{ad_Storage:"denied",analytics_Storage:"granted"});
      })(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  );
}
