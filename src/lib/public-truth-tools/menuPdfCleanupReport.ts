import type {
  MenuPdfCleanupCheckId,
  MenuPdfCleanupEvidence,
  MenuPdfCleanupInput,
  MenuPdfCleanupItem,
  MenuPdfCleanupReport,
  MenuPdfCleanupResult,
} from './menuPdfCleanupTypes';

const REQUIRED_CHECKS = new Set<MenuPdfCleanupCheckId>([
  'pdf_source_present',
  'pdf_source_current',
  'mobile_readability',
  'price_and_item_clarity',
  'action_path',
  'current_customer_link',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getUrlWithProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;

  try {
    const url = new URL(getUrlWithProtocol(value));
    const hostLooksUsable = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.includes('.');
    return (url.protocol === 'http:' || url.protocol === 'https:') && hostLooksUsable;
  } catch {
    return false;
  }
}

function hasPdfReference(input: MenuPdfCleanupInput, pdfReference: string): boolean {
  return pdfReference.length >= 3
    || input.pdfLocation !== 'unknown'
    || input.sourceKind !== 'unknown_pdf';
}

function getMenuPdfCleanupEvidenceText(evidence: MenuPdfCleanupEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered PDF reference and selected fields only. The PDF was not uploaded, opened, fetched, parsed, OCRed, or stored.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only. The PDF file itself was not inspected.';
    case 'recent_self_report':
      return 'Owner marked the PDF as recently updated. MenuList did not verify the file date externally.';
    case 'stale_self_report':
      return 'Owner marked the PDF as older than 3 months. MenuList did not verify the file date externally.';
    case 'unknown_self_report':
      return 'Owner did not know when the PDF was last updated. MenuList did not verify the file date externally.';
    case 'valid_public_url':
      return 'Customer-link format was checked locally. The link was not opened or fetched.';
    case 'invalid_public_url':
      return 'Customer-link format was checked locally. The link was not opened or fetched.';
    case 'not_provided':
      return 'This fact was not provided by the owner.';
    case 'not_checked':
      return 'This fact was not checked in V0. PDF files, external URLs, QR scans, print materials, search results, and AI answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: MenuPdfCleanupCheckId,
  result: MenuPdfCleanupResult,
  evidence: MenuPdfCleanupEvidence,
): MenuPdfCleanupItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getMenuPdfCleanupEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: MenuPdfCleanupItem[]): MenuPdfCleanupReport['summary'] {
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

function getStatus(checks: MenuPdfCleanupItem[]): MenuPdfCleanupReport['status'] {
  const sourcePresent = checks.find((check) => check.id === 'pdf_source_present');
  const priceClarity = checks.find((check) => check.id === 'price_and_item_clarity');
  const actionPath = checks.find((check) => check.id === 'action_path');

  if (sourcePresent?.result !== 'present') return 'missing_basics';
  if (priceClarity?.result === 'missing' || actionPath?.result === 'missing') {
    return 'missing_basics';
  }

  const blockingChecks: MenuPdfCleanupCheckId[] = [
    'pdf_source_current',
    'mobile_readability',
    'price_and_item_clarity',
    'action_path',
    'qr_or_print_dependency',
    'current_customer_link',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: MenuPdfCleanupReport['status']): MenuPdfCleanupReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'replace_pdf_source';
}

export function buildMenuPdfCleanupReport(input: MenuPdfCleanupInput): MenuPdfCleanupReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const pdfReference = trimToSingleLine(input.pdfReference);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const sourcePresent = hasPdfReference(input, pdfReference);
  const hasCustomerLink = currentCustomerLink.length > 0;
  const validCustomerLink = isValidHttpUrl(currentCustomerLink);
  const replacementDependencyClear = input.oldVersionsRemoved && !input.qrOrPrintStillUsesPdf;

  const checks: MenuPdfCleanupItem[] = [
    makeCheck(
      'pdf_source_present',
      sourcePresent ? 'present' : 'missing',
      sourcePresent ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'pdf_source_current',
      input.lastUpdated === 'this_month' || input.lastUpdated === 'last_3_months'
        ? 'present'
        : input.lastUpdated === 'older_than_3_months'
          ? 'unclear'
          : sourcePresent
            ? 'unclear'
            : 'not_checked',
      input.lastUpdated === 'this_month' || input.lastUpdated === 'last_3_months'
        ? 'recent_self_report'
        : input.lastUpdated === 'older_than_3_months'
          ? 'stale_self_report'
          : sourcePresent
            ? 'unknown_self_report'
            : 'not_checked',
    ),
    makeCheck(
      'mobile_readability',
      input.mobileReadable ? 'present' : sourcePresent ? 'unclear' : 'not_checked',
      input.mobileReadable ? 'owner_selected' : sourcePresent ? 'not_provided' : 'not_checked',
    ),
    makeCheck(
      'text_copyability',
      input.copyableText ? 'present' : sourcePresent ? 'unclear' : 'not_checked',
      input.copyableText ? 'owner_selected' : sourcePresent ? 'not_provided' : 'not_checked',
    ),
    makeCheck(
      'price_and_item_clarity',
      input.pricesClear ? 'present' : sourcePresent ? 'missing' : 'not_checked',
      input.pricesClear ? 'owner_selected' : sourcePresent ? 'not_provided' : 'not_checked',
    ),
    makeCheck(
      'action_path',
      input.actionClear ? 'present' : sourcePresent ? 'missing' : 'not_checked',
      input.actionClear ? 'owner_selected' : sourcePresent ? 'not_provided' : 'not_checked',
    ),
    makeCheck(
      'qr_or_print_dependency',
      input.qrOrPrintStillUsesPdf
        ? 'unclear'
        : replacementDependencyClear
          ? 'present'
          : sourcePresent
            ? 'unclear'
          : 'not_checked',
      sourcePresent ? 'owner_selected' : 'not_checked',
    ),
    makeCheck(
      'current_customer_link',
      validCustomerLink ? 'present' : hasCustomerLink ? 'unclear' : 'missing',
      validCustomerLink ? 'valid_public_url' : hasCustomerLink ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck('external_pdf_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind: input.sourceKind || 'unknown_pdf',
    pdfLocation: input.pdfLocation || 'unknown',
    lastUpdated: input.lastUpdated || 'unknown',
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      pdfUploaded: false,
      pdfParsed: false,
      ocrUsed: false,
      externalUrlFetched: false,
      fileStored: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
