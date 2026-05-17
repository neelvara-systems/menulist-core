import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menulist.ai';

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MenuList",
  "url": SITE_URL,
  "logo": `${SITE_URL}/logo.png`,
  "description": "MenuList is a system that manages official menus and public business information across all customer-facing surfaces.",
  "foundingDate": "2024",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "hello@menulist.ai"
  }
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "MenuList",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Manage your official menu and business information from one place. Update once — stays correct across QR, screens, web, print, official pages, and customer apps.",
  "url": SITE_URL,
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "4990",
    "highPrice": "39990",
    "priceCurrency": "INR",
    "offerCount": "3"
  }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MenuList",
  "url": SITE_URL,
  "description": "Official website for MenuList — public menu infrastructure system."
};

export default function SchemaMarkup() {
  return (
    <>
      <Script
        id="schema-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="schema-software"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <Script
        id="schema-website"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
