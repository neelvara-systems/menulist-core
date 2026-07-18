export type ReportLeadReportStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type ReportLeadReportStatusFilter = ReportLeadReportStatus | 'all';

export interface ReportLeadSetupJob {
  id: string;
  label: string;
  reason: string;
}

export interface ReportLeadRow {
  id: string;
  status: string;
  sourceToolId: string;
  sourceReportStatus: ReportLeadReportStatus;
  sourcePrimaryNumber: number | null;
  businessName: string | null;
  businessContext: string | null;
  reportGeneratedAt: string | null;
  missingCount: number;
  unclearCount: number;
  notCheckedCount: number;
  setupJobList: ReportLeadSetupJob[];
  contactName: string | null;
  workEmail: string | null;
  phoneNumber: string | null;
  helpTopic: string | null;
  sourcePath: string | null;
  messagePreview: string;
  suggestedReply: string;
  createdAt: string | null;
  modifiedAt: string | null;
}

export interface ReportLeadOpsCost {
  authReads: 1;
  enquiryReads: number;
  writes: 0;
  scanLimit: number;
  note: string;
}

export interface ReportLeadOpsSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: boolean;
    accessModel: 'platform_role';
    realtimeListeners: false;
    scanMayBeIncomplete: boolean;
  };
  filters: {
    reportStatus: ReportLeadReportStatusFilter;
    toolId: string;
    limit: number;
    scanLimit: number;
  };
  counts: {
    scannedEnquiries: number;
    reportLeadsInScan: number;
    shown: number;
    ready: number;
    missingBasics: number;
    unclear: number;
    notChecked: number;
    manualReviewNeeded: number;
  };
  leads: ReportLeadRow[];
  cost: ReportLeadOpsCost;
}
