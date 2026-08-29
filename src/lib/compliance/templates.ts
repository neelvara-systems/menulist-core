/**
 * Compliance Pages — Template Generation
 *
 * Pure function: deterministic string template substitution.
 * Zero AI, zero external calls, zero cost.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §4
 */

import { getBrandName } from '@lib/businessIdentity/names';

export interface ComplianceInputs {
    businessName: string;
    address: string;
    country: string;
    contactEmail: string | null;
    contactPhone: string | null;
    lastUpdated: string;
}

const COMPLIANCE_TEMPLATE_EFFECTIVE_DATE = 'July 16, 2026';

function formatComplianceDate(value: unknown): string | null {
    try {
        let date: Date | null = null;
        if (value instanceof Date) {
            date = value;
        } else if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
            date = (value as { toDate: () => Date }).toDate();
        } else if (value && typeof value === 'object') {
            const seconds = Reflect.get(value, 'seconds') ?? Reflect.get(value, '_seconds');
            if (typeof seconds === 'number' && Number.isFinite(seconds)) {
                date = new Date(seconds * 1000);
            }
        } else if (typeof value === 'string' || typeof value === 'number') {
            date = new Date(value);
        }
        if (!date || !Number.isFinite(date.getTime())) return null;
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
            year: 'numeric',
        });
    } catch {
        return null;
    }
}

/**
 * Generate compliance page content from store data.
 * Returns plain text content (no HTML).
 */
export type CompliancePageType = 'privacy' | 'terms' | 'refund';

export function composeComplianceContent(
    systemContent: string,
    customContent?: string | null,
): string {
    const trimmedCustom = customContent?.trim();
    if (!trimmedCustom) return systemContent;

    return `${trimmedCustom}

----------------------------------------

MenuList baseline policy content and platform disclosures

${systemContent}`;
}

export function generateComplianceContent(
    type: CompliancePageType,
    inputs: ComplianceInputs,
): string {
    const { businessName, address, country, contactEmail, contactPhone, lastUpdated } = inputs;

    const contact = contactEmail
        ? `Email: ${contactEmail}`
        : contactPhone
            ? `Phone: ${contactPhone}`
            : '';

    const governingLaw = country?.toLowerCase() === 'india'
        ? 'the laws of India'
        : `the applicable laws of ${country || 'the jurisdiction in which the business operates'}`;

    if (type === 'privacy') {
        return generatePrivacyPolicy(businessName, address, contact, governingLaw, lastUpdated);
    }

    if (type === 'refund') {
        return generateRefundPolicy(businessName, address, contact, governingLaw, lastUpdated);
    }

    return generateTerms(businessName, address, contact, governingLaw, lastUpdated);
}

function generatePrivacyPolicy(
    businessName: string,
    address: string,
    contact: string,
    governingLaw: string,
    lastUpdated: string,
): string {
    return `Privacy Policy

Effective Date: ${lastUpdated}
Last Updated: ${lastUpdated}

1. Introduction

This Privacy Policy describes how ${businessName} ("we," "us," or "our") handles information in connection with this business page. This page is operated by ${businessName}. MenuList provides the underlying technology platform.

2. Information We Collect

This page is primarily informational. We do not require you to create an account or submit personal information to view our business details.

Basic technical information such as device type and browser may be collected automatically through standard web technologies to maintain and improve the page experience.

3. How Information Is Used

Any information associated with this page is used to:
- Display accurate business information
- Maintain and improve the platform experience
- Respond to inquiries when contact information is provided

4. Data Sharing

We do not sell personal information. Information may be processed by service providers who assist with hosting and infrastructure operations. Such providers are bound by their own privacy obligations.

5. Third-Party Services

This page may contain links to third-party services such as WhatsApp, Google Maps, or social media platforms. We are not responsible for the privacy practices of these external services. We encourage you to review their respective privacy policies.

6. Data Retention

Information is retained for as long as necessary for the operation of this business page and in accordance with applicable legal requirements.

7. Security

We take reasonable measures to protect information associated with this page. However, no method of transmission over the internet is completely secure.

8. Your Rights

If you have questions about information associated with this page, you may contact us using the details provided below.

9. Contact Information

${businessName}
${address ? `${address}\n` : ''}${contact}

10. Platform Disclosure

This page is powered by MenuList, a technology platform that provides business page infrastructure. MenuList does not control the business information displayed on this page. The business is solely responsible for the accuracy of its own content.

11. Disclaimer

This privacy policy is provided for general informational purposes and may not cover all legal requirements applicable to your jurisdiction. For specific legal advice, consult a qualified professional.`;
}

function generateTerms(
    businessName: string,
    address: string,
    contact: string,
    governingLaw: string,
    lastUpdated: string,
): string {
    return `Terms & Conditions

Effective Date: ${lastUpdated}
Last Updated: ${lastUpdated}

1. Acceptance of Terms

By accessing this page, you agree to these terms and conditions. If you do not agree, please do not use this page.

2. Nature of Service

This page provides publicly available information about ${businessName}, including but not limited to menu items, business hours, location, and contact details. This is an informational page and does not constitute a transactional platform.

3. Accuracy of Information

While we strive to keep information on this page accurate and up to date, menu items, prices, availability, and other details may change without prior notice. ${businessName} is responsible for the accuracy of its own business information.

4. Availability

Products, services, and menu items displayed on this page may not always be available. Availability is subject to change at the discretion of the business.

5. Third-Party Links

This page may contain links to external websites and services such as WhatsApp, Google Maps, or social media platforms. We are not responsible for the content, privacy practices, or availability of these third-party services.

6. Limitation of Liability

${businessName} and MenuList shall not be liable for any inaccuracies in the information displayed, any interruptions in service, or any actions taken based on the information provided on this page.

7. Changes

Information on this page, including these terms, may be updated at any time without prior notice.

8. Governing Law

These terms are governed by ${governingLaw}.

9. Contact Information

${businessName}
${address ? `${address}\n` : ''}${contact}

10. Platform Disclosure

This page is powered by MenuList, a technology platform that provides business page infrastructure. MenuList does not control the business information displayed on this page. The business is solely responsible for the accuracy of its own content.

11. Disclaimer

These terms are provided for general informational purposes and may not cover all legal requirements applicable to your jurisdiction. For specific legal advice, consult a qualified professional.`;
}

function generateRefundPolicy(
    businessName: string,
    address: string,
    contact: string,
    governingLaw: string,
    lastUpdated: string,
): string {
    return `Refund & Cancellation Policy

Effective Date: ${lastUpdated}
Last Updated: ${lastUpdated}

1. Overview

This policy outlines the refund and cancellation terms for services associated with ${businessName}. This page is operated by ${businessName}. MenuList provides the underlying technology platform.

2. Nature of Service

This page provides publicly available business information including menu items, hours, and contact details. It is an informational service, not a direct ordering or transactional platform.

3. Purchases and Cancellations

This public page does not accept orders or payments. Any purchase, booking, cancellation, or payment made directly with ${businessName} is governed by the terms confirmed by the business at the time of that transaction.

4. Refund Eligibility

Contact ${businessName} using the details below to ask whether a purchase or booking is eligible for a refund or cancellation. Eligibility, required evidence, and any applicable time limit depend on the terms agreed directly with the business and applicable law.

5. Refund Process

To request a refund, contact us using the details below. Please include:
- Your business name
- Transaction date and amount
- Reason for the refund request

${businessName} is responsible for reviewing the request and, when approved, processing it through the payment method used for the original transaction. MenuList cannot approve or process customer refunds on behalf of the business.

6. Non-Refundable Items

Any exclusions or non-refundable items must be confirmed by ${businessName}. This baseline does not create a refund entitlement or a non-refundable category.

7. Contact Information

${businessName}
${address ? `${address}\n` : ''}${contact}

8. Platform Disclosure

This page is powered by MenuList, a technology platform that provides business page infrastructure. MenuList does not control the business information displayed on this page. The business is solely responsible for the accuracy of its own content.

9. Governing Law

This policy is governed by ${governingLaw}.

10. Disclaimer

This refund policy is provided for general informational purposes and may not cover all legal requirements applicable to your jurisdiction. For specific legal advice, consult a qualified professional.`;
}

/**
 * Extract compliance generation inputs from store data.
 * Returns null if minimum required data is missing.
 */
export function extractComplianceInputs(store: unknown): ComplianceInputs | null {
    const businessName = getBrandName(store, '');
    if (!businessName) return null;

    if (!store || typeof store !== 'object' || Array.isArray(store)) return null;
    const readText = (key: string): string => {
        try {
            if (!Object.prototype.hasOwnProperty.call(store, key)) return '';
            const value = Reflect.get(store, key);
            return typeof value === 'string' ? value.trim().slice(0, 500) : '';
        } catch {
            return '';
        }
    };
    const readUnknown = (key: string): unknown => {
        try {
            return Object.prototype.hasOwnProperty.call(store, key)
                ? Reflect.get(store, key)
                : undefined;
        } catch {
            return undefined;
        }
    };

    const contactEmail = readText('email') || readText('contactEmail') || null;
    const contactPhone = readText('phoneNumber') || readText('phone') || null;

    // At least one contact method required
    if (!contactEmail && !contactPhone) return null;

    const addressParts = [
        readText('addressLine'),
        readText('area'),
        readText('city'),
        readText('state'),
    ].filter(Boolean);

    const modifiedOn = readUnknown('modifiedOn');
    const updatedAt = readUnknown('updatedAt');
    const createdOn = readUnknown('createdOn');
    const createdAt = readUnknown('createdAt');

    return {
        businessName,
        address: addressParts.join(', '),
        country: readText('country') || 'India',
        contactEmail,
        contactPhone,
        lastUpdated: formatComplianceDate(
            modifiedOn
            ?? updatedAt
            ?? createdOn
            ?? createdAt,
        ) || COMPLIANCE_TEMPLATE_EFFECTIVE_DATE,
    };
}
