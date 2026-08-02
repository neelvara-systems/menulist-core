import {
  MENULIST_TENANT_BASE_DOMAINS,
  PLATFORM_DOMAIN,
  PLATFORM_DOMAIN_ALIASES,
  RESERVED_SUBDOMAINS,
} from '@constant/urls';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';
import { parsePublicHttpsUrl } from './publicUrlValidation';
import {
  boundPublicTruthToolInput,
  PUBLIC_TRUTH_TOOL_INPUT_LIMITS,
  type PublicTruthToolInputLimit,
} from './publicTruthToolInputLimits';
import type {
  QrLinkExpectedDestination,
  QrLinkHealthCheckId,
  QrLinkHealthEvidence,
  QrLinkHealthInput,
  QrLinkHealthItem,
  QrLinkHealthReport,
  QrLinkHealthResult,
} from './qrLinkHealthTypes';

const DEFAULT_EXPECTED_DESTINATION: QrLinkExpectedDestination = 'menulist_customer_link';
const REQUIRED_CHECKS = new Set<QrLinkHealthCheckId>([
  'qr_target',
  'url_format',
  'current_link',
  'customer_action',
]);

const KNOWN_MENULIST_PLATFORM_DOMAINS = Array.from(new Set([
  PLATFORM_DOMAIN,
  ...PLATFORM_DOMAIN_ALIASES,
  ...getProductDeploymentTarget('menulist', 'local').domains,
  ...getProductDeploymentTarget('menulist', 'preview').domains,
  ...getProductDeploymentTarget('menulist', 'production').domains,
]))
  .map((domain) => domain.toLowerCase().replace(/^www\./, '').trim())
  .filter(Boolean);
const KNOWN_MENULIST_TENANT_DOMAINS = Array.from(new Set([
  ...MENULIST_TENANT_BASE_DOMAINS,
  ...(getProductDeploymentTarget('menulist', 'preview').tenantDomains || []),
  ...(getProductDeploymentTarget('menulist', 'production').tenantDomains || []),
]))
  .map((domain) => domain.toLowerCase().replace(/^www\./, '').trim())
  .filter(Boolean);

function trimToSingleLine(
  value?: string,
  maxLength: PublicTruthToolInputLimit = PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText,
): string {
  return boundPublicTruthToolInput(value, maxLength).replace(/\s+/g, ' ').trim();
}

function getRootDomainMatch(hostname: string, domains: readonly string[]): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return domains.find((domain) => host === domain || host.endsWith(`.${domain}`)) || null;
}

function getSubdomain(hostname: string, rootDomain: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host === rootDomain) return '';
  return host.slice(0, -rootDomain.length - 1);
}

function appearsMenuListCustomerLink(url: URL | null): boolean {
  if (!url) return false;

  const normalizedPath = url.pathname.toLowerCase();
  const tenantRootDomain = getRootDomainMatch(url.hostname, KNOWN_MENULIST_TENANT_DOMAINS);
  const subdomain = tenantRootDomain
    ? getSubdomain(url.hostname, tenantRootDomain).split('.')[0] || ''
    : '';
  const hasTenantSubdomain = Boolean(subdomain) && !RESERVED_SUBDOMAINS.includes(subdomain);
  const platformRootDomain = getRootDomainMatch(url.hostname, KNOWN_MENULIST_PLATFORM_DOMAINS);
  const hasRootCustomerPath = normalizedPath === '/client' || normalizedPath.startsWith('/client/');

  return hasTenantSubdomain || (Boolean(platformRootDomain) && hasRootCustomerPath);
}

function hasActionHint(url: URL | null): boolean {
  if (!url) return false;
  const value = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
  return /(?:menu|order|book|booking|reserve|reservation|whatsapp|wa\.me|call|contact|direction|map|service|catalog)/i.test(value);
}

function makeCheck(
  id: QrLinkHealthCheckId,
  result: QrLinkHealthResult,
  evidence: QrLinkHealthEvidence,
): QrLinkHealthItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getQrLinkHealthEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function getQrLinkHealthEvidenceText(evidence: QrLinkHealthEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected QR facts only.';
    case 'valid_target_url':
      return 'Public HTTPS URL format was checked locally. The target page was not opened or fetched.';
    case 'invalid_target_url':
      return 'The QR target must use a public HTTPS URL. Local, private, or insecure targets were not opened or fetched.';
    case 'menulist_host_hint':
      return 'MenuList ownership was inferred from the URL host/path only. The target page was not opened.';
    case 'external_host_reference':
      return 'The URL host is external or unknown. The target page was not opened.';
    case 'url_action_hint':
      return 'Checked action words in the entered URL only. The target page was not opened.';
    case 'not_provided':
      return 'No QR target source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. QR images are not decoded and target pages are not opened.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function countSummary(checks: QrLinkHealthItem[]): QrLinkHealthReport['summary'] {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present' || check.result === 'not_applicable') {
        summary.present += 1;
      } else if (check.result === 'missing') {
        summary.missing += 1;
      } else if (check.result === 'unclear') {
        summary.unclear += 1;
      } else if (check.result === 'not_checked') {
        summary.notChecked += 1;
      }

      return summary;
    },
    { present: 0, missing: 0, unclear: 0, notChecked: 0 },
  );
}

function getStatus(
  url: URL | null,
  checks: QrLinkHealthItem[],
  replacementNeeded: boolean,
): QrLinkHealthReport['status'] {
  const hasMissingTarget = checks.some((check) =>
    (check.id === 'qr_target' || check.id === 'url_format') && check.result === 'missing'
  );

  if (hasMissingTarget) return 'missing_basics';
  if (!url) return 'not_checked';
  if (replacementNeeded) return 'manual_review_needed';

  const readyCheckIds: QrLinkHealthCheckId[] = [
    'menulist_customer_link',
    'current_link',
    'customer_action',
    'printed_context',
  ];
  const isReady = readyCheckIds.every((id) =>
    checks.find((check) => check.id === id)?.result === 'present'
  );

  return isReady ? 'ready' : 'unclear';
}

function getNextActionType(status: QrLinkHealthReport['status']): QrLinkHealthReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'replace_qr_target';
}

export function buildQrLinkHealthReport(input: QrLinkHealthInput): QrLinkHealthReport {
  const businessName = trimToSingleLine(input.businessName, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea);
  const qrTargetUrl = trimToSingleLine(input.qrTargetUrl, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const url = parsePublicHttpsUrl(qrTargetUrl, 'qr_link_health_target_url');
  const hasTarget = qrTargetUrl.length > 0;
  const hasValidTargetUrl = Boolean(url);
  const appearsMenuListOwned = appearsMenuListCustomerLink(url);
  const actionHintPresent = hasActionHint(url);

  const checks: QrLinkHealthItem[] = [
    makeCheck(
      'qr_target',
      hasTarget ? 'present' : 'missing',
      hasTarget ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'url_format',
      hasValidTargetUrl ? 'present' : 'missing',
      hasValidTargetUrl ? 'valid_target_url' : hasTarget ? 'invalid_target_url' : 'not_provided',
    ),
    makeCheck(
      'menulist_customer_link',
      !hasValidTargetUrl
        ? 'not_checked'
        : appearsMenuListOwned
          ? 'present'
          : 'unclear',
      !hasValidTargetUrl
        ? 'not_checked'
        : appearsMenuListOwned
          ? 'menulist_host_hint'
          : 'external_host_reference',
    ),
    makeCheck(
      'current_link',
      input.replacementNeeded
        ? 'missing'
        : input.targetLooksCurrent
          ? 'present'
          : hasValidTargetUrl
            ? 'unclear'
            : 'not_checked',
      input.replacementNeeded || input.targetLooksCurrent
        ? 'owner_selected'
        : hasValidTargetUrl
          ? 'owner_selected'
          : 'not_checked',
    ),
    makeCheck(
      'customer_action',
      input.customerActionVisible || actionHintPresent
        ? 'present'
        : hasValidTargetUrl
          ? 'unclear'
          : 'not_checked',
      input.customerActionVisible
        ? 'owner_selected'
        : actionHintPresent
          ? 'url_action_hint'
          : hasValidTargetUrl
            ? 'owner_selected'
            : 'not_checked',
    ),
    makeCheck(
      'printed_context',
      input.printedContextClear ? 'present' : hasValidTargetUrl ? 'unclear' : 'not_checked',
      input.printedContextClear || hasValidTargetUrl ? 'owner_selected' : 'not_checked',
    ),
    makeCheck('target_page_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(url, checks, input.replacementNeeded);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    expectedDestination: input.expectedDestination || DEFAULT_EXPECTED_DESTINATION,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      qrImageDecoded: false,
      targetPageFetched: false,
      externalSourcesFetched: false,
      aiOrSearchChecked: false,
      externalPlatformUpdated: false,
      rankingPromise: false,
    },
  };
}
