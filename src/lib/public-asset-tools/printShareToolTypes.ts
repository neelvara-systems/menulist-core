import type { CreativeEditorDocument } from '@/modules/creative-editor/types';
import type {
  PrintShareToolFactField,
  PrintShareToolInputField,
  PrintShareToolSlug,
} from './printShareToolConfig';

export const PRINT_SHARE_TOOL_CHECK_IDS = [
  'business_identity',
  'customer_link',
  'asset_message',
  'customer_action',
  'print_share_context',
  'template_render',
  'external_source_inspection',
] as const;

export type PrintShareToolCheckId = (typeof PRINT_SHARE_TOOL_CHECK_IDS)[number];

export type PrintShareToolResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type PrintShareToolStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type PrintShareToolEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'valid_link_format'
  | 'invalid_link_format'
  | 'template_rendered_locally'
  | 'ethical_feedback_confirmed'
  | 'ethical_feedback_missing'
  | 'not_checked';

export interface PrintShareToolInput {
  accentColor: string;
  body: string;
  businessName: string;
  cityOrArea: string;
  customerLink: string;
  customerLinkCurrent: boolean;
  customerActionClear: boolean;
  ethicalFeedbackOnly: boolean;
  headline: string;
  hoursText: string;
  readyToPrintOrShare: boolean;
  secondaryText: string;
  whatsappNumber: string;
}

export interface PrintShareToolFieldDefinition {
  field: PrintShareToolInputField;
  maxLength: number;
  multiline?: boolean;
}

export interface PrintShareToolFactDefinition {
  field: PrintShareToolFactField;
}

export interface PrintShareToolCheck {
  evidence: PrintShareToolEvidence;
  evidenceText: string;
  id: PrintShareToolCheckId;
  required: boolean;
  result: PrintShareToolResult;
}

export interface PrintShareToolReport {
  accentColor: string;
  asset: {
    creativeEditorSchemaVersion: string;
    displayLink: string;
    filenameBase: string;
    height: number;
    layout: string;
    primaryActionLabel: string;
    templateDocument: CreativeEditorDocument;
    templateId: string;
    width: number;
  };
  boundaries: {
    aiOrSearchChecked: false;
    externalPlatformUpdated: false;
    externalSourcesFetched: false;
    fileStored: false;
    fullEditorExposed: false;
    reportStored: false;
    templateSaved: false;
  };
  businessName: string;
  checks: PrintShareToolCheck[];
  cityOrArea: string;
  customerLink: string;
  generatedAt: string;
  input: PrintShareToolInput;
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'download_asset' | 'review_before_printing';
  };
  status: PrintShareToolStatus;
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  toolSlug: PrintShareToolSlug;
}
