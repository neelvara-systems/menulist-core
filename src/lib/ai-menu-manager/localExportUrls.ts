import { POS_DOCS_URL, getPublicBaseUrl, getTenantBaseUrl, normalizeBaseUrl } from '@constant/urls';
import { withAnalyticsSource, type AnalyticsEntrySource } from '@lib/analytics/sourceAttribution';
import { generateProjectUrl } from '@lib/utils/slugify';
import { isValidScreenToken } from '@lib/screen/utils';

export type AiMenuManagerFeedbackSource = 'direct_link' | 'feedback_qr';

export function buildAiMenuManagerFeedbackUrl(
    projectId: string,
    source: AiMenuManagerFeedbackSource,
    baseUrlOverride?: string,
) {
    const baseUrl = normalizeBaseUrl(baseUrlOverride) || getPublicBaseUrl();
    return `${baseUrl}/feedback/${encodeURIComponent(projectId)}?source=${source}`;
}

export function buildAiMenuManagerTenantBaseUrl(params: {
    customDomain?: string;
    subdomain?: string;
}) {
    return getTenantBaseUrl(params.subdomain, params.customDomain);
}

export function buildAiMenuManagerCustomerAppInstallUrl(params: {
    customDomain?: string;
    subdomain?: string;
}) {
    const baseUrl = buildAiMenuManagerTenantBaseUrl(params);
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}/?pwa=install` : '';
}

export function buildAiMenuManagerProjectMenuUrl(params: {
    customDomain?: string;
    projectName?: string;
    subdomain?: string;
}) {
    if (!params.customDomain && !params.subdomain) return '';
    try {
        return generateProjectUrl(params.subdomain, params.customDomain, params.projectName || undefined, false);
    } catch {
        return '';
    }
}

export function withAiMenuManagerShareSource(url: string, source: AnalyticsEntrySource) {
    return withAnalyticsSource(url, source);
}

export function buildAiMenuManagerDigitalScreenUrl(params: {
    publicBaseUrl?: string;
    screenToken?: string;
}) {
    const token = String(params.screenToken || '').trim();
    if (!isValidScreenToken(token)) return '';
    const baseUrl = normalizeBaseUrl(params.publicBaseUrl) || getPublicBaseUrl();
    return `${baseUrl}/screen/${encodeURIComponent(token)}`;
}

export function buildAiMenuManagerPosSetupInfo() {
    return [
        'MenuList External Menu Sync - Setup Info',
        '',
        'Payload: Full menu snapshot (JSON)',
        'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
        'Headers: X-MenuList-Signature, X-MenuList-Event, X-MenuList-Version, X-MenuList-Timestamp, X-MenuList-Delivery-Id',
        'Response: HTTP 200 within 5 seconds',
        '',
        `Documentation: ${POS_DOCS_URL}`,
    ].join('\n');
}
