# Google Search Console Implementation

This document outlines the implementation of Google Search Console verification in the MenuListAI menu website.

## Overview

Google Search Console is a free service that helps you monitor, maintain, and troubleshoot your site's presence in Google Search results. The verification process proves that you own or have control over the website.

## Setup Process

1. **Get Verification Meta Tag**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add your property (website)
   - Choose "HTML tag" verification method
   - Copy the provided meta tag content (looks like: `<meta name="google-site-verification" content="VERIFICATION_CODE">`)

2. **Configure in Dashboard**:
   - Go to Business Settings > Analytics tab
   - Find "Google Search Console" field
   - Paste only the verification code (the content attribute value)

## Component Structure

### Location
```
src/components/templates/website/clientWebsite/GoogleSearchConsole.tsx
```

### Integration
The component is integrated into the menu website's root component:
```tsx
import GoogleSearchConsole from './GoogleSearchConsole';

function ClientMenuRenderer({ projectData }) {
    const storeDetails = projectData?.storeDetails;
    return (
        <>
            <GoogleSearchConsole storeDetails={storeDetails} />
            {/* Rest of the application */}
        </>
    );
}
```

## Features

1. **Automatic Verification**:
   - Adds verification meta tag to page `<head>`
   - Only renders when verification code is present
   - Works with Next.js head management

2. **Benefits After Verification**:
   - View search performance data
   - Submit and monitor sitemaps
   - Request indexing of new/updated pages
   - Receive notifications about search issues
   - Access mobile usability reports
   - View links to your site

## Verification Process

1. Add the verification code in the dashboard
2. Deploy your menu website
3. Return to Google Search Console
4. Click "Verify"

## Troubleshooting

If verification fails:
1. Check if the verification code is correctly entered in the dashboard
2. Ensure the menu website is deployed with the latest changes
3. View page source to confirm the meta tag is present
4. Wait a few minutes and try verification again

## Related Components

- `AnalyticsTab.tsx`: Business settings component for configuring verification code
- `ClientMenuRenderer`: Root component that integrates the verification component
