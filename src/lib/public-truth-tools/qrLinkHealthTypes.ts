export const QR_LINK_HEALTH_CHECK_IDS = [
  'qr_target',
  'url_format',
  'menulist_customer_link',
  'current_link',
  'customer_action',
  'printed_context',
  'target_page_inspection',
] as const;

export type QrLinkHealthCheckId = (typeof QR_LINK_HEALTH_CHECK_IDS)[number];

export type QrLinkHealthMode = 'self_report';

export type QrLinkHealthResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type QrLinkHealthStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type QrLinkExpectedDestination =
  | 'menulist_customer_link'
  | 'menu_or_services'
  | 'website'
  | 'whatsapp'
  | 'booking_or_order'
  | 'google_profile'
  | 'other';

export type QrLinkHealthEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'valid_target_url'
  | 'invalid_target_url'
  | 'menulist_host_hint'
  | 'external_host_reference'
  | 'url_action_hint'
  | 'not_provided'
  | 'not_checked';

export interface QrLinkHealthInput {
  mode: QrLinkHealthMode;
  businessName: string;
  cityOrArea: string;
  qrTargetUrl: string;
  expectedDestination: QrLinkExpectedDestination;
  targetLooksCurrent: boolean;
  customerActionVisible: boolean;
  printedContextClear: boolean;
  replacementNeeded: boolean;
}

export interface QrLinkHealthItem {
  id: QrLinkHealthCheckId;
  result: QrLinkHealthResult;
  evidence: QrLinkHealthEvidence;
  evidenceText: string;
  required: boolean;
}

export interface QrLinkHealthReport {
  generatedAt: string;
  status: QrLinkHealthStatus;
  businessName: string;
  cityOrArea: string;
  expectedDestination: QrLinkExpectedDestination;
  checks: QrLinkHealthItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'replace_qr_target' | 'manual_review';
  };
  boundaries: {
    qrImageDecoded: false;
    targetPageFetched: false;
    externalSourcesFetched: false;
    aiOrSearchChecked: false;
    externalPlatformUpdated: false;
    rankingPromise: false;
  };
}
