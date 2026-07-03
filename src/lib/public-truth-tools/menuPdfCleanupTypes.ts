export const MENU_PDF_CLEANUP_CHECK_IDS = [
  'pdf_source_present',
  'pdf_source_current',
  'mobile_readability',
  'text_copyability',
  'price_and_item_clarity',
  'action_path',
  'qr_or_print_dependency',
  'current_customer_link',
  'external_pdf_inspection',
] as const;

export type MenuPdfCleanupCheckId = (typeof MENU_PDF_CLEANUP_CHECK_IDS)[number];

export type MenuPdfCleanupMode = 'self_report';

export type MenuPdfCleanupResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type MenuPdfCleanupStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type MenuPdfCleanupSourceKind =
  | 'menu_pdf'
  | 'service_pdf'
  | 'catalog_pdf'
  | 'rate_card_pdf'
  | 'package_pdf'
  | 'unknown_pdf'
  | 'other';

export type MenuPdfCleanupPdfLocation =
  | 'website'
  | 'google_profile'
  | 'whatsapp'
  | 'instagram'
  | 'qr_code'
  | 'printed_material'
  | 'unknown'
  | 'other';

export type MenuPdfCleanupLastUpdated =
  | 'this_month'
  | 'last_3_months'
  | 'older_than_3_months'
  | 'unknown';

export type MenuPdfCleanupEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'recent_self_report'
  | 'stale_self_report'
  | 'unknown_self_report'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface MenuPdfCleanupInput {
  mode: MenuPdfCleanupMode;
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuPdfCleanupSourceKind;
  pdfLocation: MenuPdfCleanupPdfLocation;
  pdfReference: string;
  lastUpdated: MenuPdfCleanupLastUpdated;
  currentCustomerLink: string;
  mobileReadable: boolean;
  copyableText: boolean;
  pricesClear: boolean;
  actionClear: boolean;
  oldVersionsRemoved: boolean;
  qrOrPrintStillUsesPdf: boolean;
}

export interface MenuPdfCleanupItem {
  id: MenuPdfCleanupCheckId;
  result: MenuPdfCleanupResult;
  evidence: MenuPdfCleanupEvidence;
  evidenceText: string;
  required: boolean;
}

export interface MenuPdfCleanupReport {
  generatedAt: string;
  status: MenuPdfCleanupStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuPdfCleanupSourceKind;
  pdfLocation: MenuPdfCleanupPdfLocation;
  lastUpdated: MenuPdfCleanupLastUpdated;
  checks: MenuPdfCleanupItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'replace_pdf_source' | 'manual_review';
  };
  boundaries: {
    pdfUploaded: false;
    pdfParsed: false;
    ocrUsed: false;
    externalUrlFetched: false;
    fileStored: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
