export type WebsiteEnquiryKind = 'general' | 'report';
export type WebsiteEnquiryKindFilter = WebsiteEnquiryKind | 'all';
export type WebsiteEnquiryTopic =
  | 'general'
  | 'demo'
  | 'multi-location'
  | 'pricing'
  | 'other';
export type WebsiteEnquiryTopicFilter = WebsiteEnquiryTopic | 'all';

export interface WebsiteEnquiryRow {
  id: string;
  kind: WebsiteEnquiryKind;
  status: string;
  contactName: string | null;
  workEmail: string | null;
  phoneNumber: string | null;
  helpTopic: WebsiteEnquiryTopic;
  sourcePath: string | null;
  sourceToolId: string | null;
  message: string;
  createdAt: string | null;
  modifiedAt: string | null;
}

export interface WebsiteEnquiryOpsCost {
  authReads: 1;
  enquiryReads: number;
  writes: 0;
  scanLimit: number;
  note: string;
}

export interface WebsiteEnquiryOpsSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: true;
    accessModel: 'platform_role';
    realtimeListeners: false;
    scanMayBeIncomplete: boolean;
  };
  filters: {
    kind: WebsiteEnquiryKindFilter;
    topic: WebsiteEnquiryTopicFilter;
    limit: number;
    scanLimit: number;
  };
  counts: {
    scannedEnquiries: number;
    menuListEnquiriesInScan: number;
    shown: number;
    new: number;
    general: number;
    report: number;
  };
  enquiries: WebsiteEnquiryRow[];
  cost: WebsiteEnquiryOpsCost;
}
