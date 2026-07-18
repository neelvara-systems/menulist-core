import {
  buildCreativeEditorQrElement,
  buildCreativeEditorRectElement,
  buildCreativeEditorTextElement,
  createCreativeEditorDocument,
} from '@/modules/creative-editor/templates';
import { CREATIVE_EDITOR_SCHEMA_VERSION } from '@/modules/creative-editor/types';
import type { CreativeEditorDocument, CreativeEditorElement } from '@/modules/creative-editor/types';
import { getPrintShareToolConfig, type PrintShareToolSlug } from './printShareToolConfig';
import { parsePublicHttpsUrl } from '../public-truth-tools/publicUrlValidation';
import type {
  PrintShareToolCheck,
  PrintShareToolCheckId,
  PrintShareToolEvidence,
  PrintShareToolInput,
  PrintShareToolReport,
  PrintShareToolResult,
  PrintShareToolStatus,
} from './printShareToolTypes';

const REQUIRED_CHECKS = new Set<PrintShareToolCheckId>([
  'business_identity',
  'customer_link',
  'asset_message',
  'template_render',
]);

const FALLBACK_ACCENT = '#24564d';

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function trimMultiline(value?: string): string {
  return (value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getDisplayLink(url: URL | null, rawValue: string): string {
  if (!url) return trimToSingleLine(rawValue).slice(0, 90);
  return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`.replace(/^www\./, '').slice(0, 90);
}

function normalizeHexColor(value: string): string {
  const color = trimToSingleLine(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : FALLBACK_ACCENT;
}

function getEvidenceText(evidence: PrintShareToolEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected readiness facts only.';
    case 'valid_link_format':
      return 'HTTPS public URL format was checked locally. The destination page was not opened or fetched.';
    case 'invalid_link_format':
      return 'The link must use a public HTTPS URL. Local, private, or insecure URLs are not ready for customer QR assets.';
    case 'template_rendered_locally':
      return 'Asset template was rendered in the browser from entered fields. No file was uploaded, saved, or added to the owner template registry.';
    case 'ethical_feedback_confirmed':
      return 'Owner confirmed this is for feedback or an owner-provided review link only. No review text was generated.';
    case 'ethical_feedback_missing':
      return 'Ethical feedback use was not confirmed. The tool does not support fake, pressured, or generated reviews.';
    case 'not_checked':
      return 'This V0 tool did not inspect external pages, profiles, QR placements, WhatsApp accounts, review pages, search results, or AI answers.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: PrintShareToolCheckId,
  result: PrintShareToolResult,
  evidence: PrintShareToolEvidence,
): PrintShareToolCheck {
  return {
    evidence,
    evidenceText: getEvidenceText(evidence),
    id,
    required: REQUIRED_CHECKS.has(id),
    result,
  };
}

function countSummary(checks: PrintShareToolCheck[]): PrintShareToolReport['summary'] {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present' || check.result === 'not_applicable') summary.present += 1;
      if (check.result === 'missing') summary.missing += 1;
      if (check.result === 'unclear') summary.unclear += 1;
      if (check.result === 'not_checked') summary.notChecked += 1;
      return summary;
    },
    { present: 0, missing: 0, unclear: 0, notChecked: 0 },
  );
}

function getStatus(slug: PrintShareToolSlug, checks: PrintShareToolCheck[]): PrintShareToolStatus {
  const hasMissingRequired = checks.some((check) => check.required && check.result === 'missing');
  if (hasMissingRequired) return 'missing_basics';
  if (slug === 'feedback-qr-card-maker' && checks.some((check) => check.evidence === 'ethical_feedback_missing')) {
    return 'manual_review_needed';
  }
  const hasUnclear = checks.some((check) => check.result === 'unclear');
  if (hasUnclear) return 'unclear';
  return 'ready';
}

function getNextActionType(status: PrintShareToolStatus): PrintShareToolReport['nextAction']['type'] {
  if (status === 'ready') return 'download_asset';
  if (status === 'manual_review_needed') return 'review_before_printing';
  return 'create_customer_link';
}

function buildSafeFilenameBase(toolSlug: PrintShareToolSlug, businessName: string): string {
  const safeBusiness = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${safeBusiness || 'menulist'}-${toolSlug}`;
}

function buildTemplateDocument(params: {
  accentColor: string;
  body: string;
  businessName: string;
  customerLink: string;
  headline: string;
  height: number;
  secondaryText: string;
  templateId: string;
  title: string;
  width: number;
}): CreativeEditorDocument {
  const doc = createCreativeEditorDocument({
    backgroundColor: '#fffdfa',
    brandName: params.businessName,
    height: params.height,
    primaryColor: params.accentColor,
    productContext: {
      productId: 'menulist',
      sourceSurface: 'public-print-share-tools',
    },
    title: params.title,
    width: params.width,
  });
  const elements: CreativeEditorElement[] = [
    {
      ...buildCreativeEditorRectElement(params.accentColor),
      height: Math.round(params.height * 0.26),
      name: 'Template accent panel',
      radius: 0,
      width: params.width,
      x: 0,
      y: 0,
    },
    {
      ...buildCreativeEditorTextElement(params.businessName || 'Business name'),
      color: '#16231f',
      fontSize: Math.round(params.width * 0.052),
      height: Math.round(params.height * 0.1),
      name: 'Business name',
      text: params.businessName || 'Business name',
      width: Math.round(params.width * 0.76),
      x: Math.round(params.width * 0.08),
      y: Math.round(params.height * 0.08),
    },
    {
      ...buildCreativeEditorTextElement(params.headline),
      color: '#16231f',
      fontSize: Math.round(params.width * 0.08),
      height: Math.round(params.height * 0.18),
      name: 'Headline',
      text: params.headline,
      width: Math.round(params.width * 0.78),
      x: Math.round(params.width * 0.08),
      y: Math.round(params.height * 0.25),
    },
    {
      ...buildCreativeEditorTextElement(params.body),
      color: '#42524b',
      fontSize: Math.round(params.width * 0.035),
      fontWeight: '600',
      height: Math.round(params.height * 0.12),
      name: 'Body',
      text: params.body,
      width: Math.round(params.width * 0.72),
      x: Math.round(params.width * 0.08),
      y: Math.round(params.height * 0.44),
    },
    {
      ...buildCreativeEditorQrElement(params.customerLink || 'https://menulist.ai/create-menu'),
      height: Math.round(Math.min(params.width, params.height) * 0.28),
      name: 'QR code',
      value: params.customerLink || 'https://menulist.ai/create-menu',
      width: Math.round(Math.min(params.width, params.height) * 0.28),
      x: Math.round(params.width * 0.58),
      y: Math.round(params.height * 0.58),
    },
  ];

  return {
    ...doc,
    elements,
    metadata: {
      ...doc.metadata,
      sourceRefs: [
        {
          label: 'Customer link',
          productId: 'menulist',
          sourceRef: 'owner_entered_customer_link',
          value: params.customerLink,
        },
      ],
      templateId: params.templateId,
      textPlaceholders: [
        { id: 'business-name', label: 'Business name', value: params.businessName },
        { id: 'headline', label: 'Headline', value: params.headline },
        { id: 'body', label: 'Body', value: params.body },
        { id: 'secondary-text', label: 'Secondary text', value: params.secondaryText },
      ],
      trustGate: 'browser-local-public-v0',
    },
  };
}

export function buildInitialPrintShareToolInput(slug: PrintShareToolSlug): PrintShareToolInput {
  const config = getPrintShareToolConfig(slug);
  return {
    accentColor: FALLBACK_ACCENT,
    body: config.defaultBody,
    businessName: '',
    cityOrArea: '',
    customerActionClear: false,
    customerLink: '',
    customerLinkCurrent: false,
    ethicalFeedbackOnly: slug !== 'feedback-qr-card-maker',
    headline: config.defaultHeadline,
    hoursText: '',
    readyToPrintOrShare: false,
    secondaryText: config.defaultSecondaryText,
    whatsappNumber: '',
  };
}

export function buildPrintShareToolReport(
  slug: PrintShareToolSlug,
  rawInput: PrintShareToolInput,
): PrintShareToolReport {
  const config = getPrintShareToolConfig(slug);
  const input: PrintShareToolInput = {
    ...rawInput,
    accentColor: normalizeHexColor(rawInput.accentColor),
    body: trimMultiline(rawInput.body).slice(0, 260),
    businessName: trimToSingleLine(rawInput.businessName).slice(0, 90),
    cityOrArea: trimToSingleLine(rawInput.cityOrArea).slice(0, 90),
    customerLink: trimToSingleLine(rawInput.customerLink).slice(0, 280),
    headline: trimToSingleLine(rawInput.headline).slice(0, 90),
    hoursText: trimMultiline(rawInput.hoursText).slice(0, 180),
    secondaryText: trimToSingleLine(rawInput.secondaryText).slice(0, 130),
    whatsappNumber: trimToSingleLine(rawInput.whatsappNumber).slice(0, 60),
  };
  const customerUrl = parsePublicHttpsUrl(input.customerLink, 'print_share_tool_customer_link');
  const hasCustomerLink = input.customerLink.length > 0;
  const hasValidCustomerLink = Boolean(customerUrl);
  const normalizedCustomerLink = customerUrl?.toString() || '';
  const hasBusinessIdentity = input.businessName.length > 1;
  const hasMessage = input.headline.length > 2 && (input.body.length > 4 || input.hoursText.length > 4);
  const hasAction = input.customerActionClear || slug === 'whatsapp-menu-status-maker' && (input.whatsappNumber.length > 4 || hasValidCustomerLink);
  const hasPrintContext = input.readyToPrintOrShare;
  const feedbackConfirmed = slug !== 'feedback-qr-card-maker' || input.ethicalFeedbackOnly;

  const checks: PrintShareToolCheck[] = [
    makeCheck(
      'business_identity',
      hasBusinessIdentity ? 'present' : 'missing',
      hasBusinessIdentity ? 'owner_entered' : 'not_checked',
    ),
    makeCheck(
      'customer_link',
      hasValidCustomerLink ? 'present' : hasCustomerLink ? 'missing' : 'missing',
      hasValidCustomerLink ? 'valid_link_format' : hasCustomerLink ? 'invalid_link_format' : 'not_checked',
    ),
    makeCheck(
      'asset_message',
      hasMessage ? 'present' : 'missing',
      hasMessage ? 'owner_entered' : 'not_checked',
    ),
    makeCheck(
      'customer_action',
      hasAction ? 'present' : hasValidCustomerLink ? 'unclear' : 'not_checked',
      hasAction || hasValidCustomerLink ? 'owner_selected' : 'not_checked',
    ),
    makeCheck(
      'print_share_context',
      hasPrintContext ? 'present' : hasValidCustomerLink ? 'unclear' : 'not_checked',
      hasPrintContext || hasValidCustomerLink ? 'owner_selected' : 'not_checked',
    ),
    makeCheck(
      'template_render',
      'present',
      'template_rendered_locally',
    ),
    makeCheck(
      'external_source_inspection',
      feedbackConfirmed ? 'not_checked' : 'missing',
      slug === 'feedback-qr-card-maker'
        ? feedbackConfirmed ? 'ethical_feedback_confirmed' : 'ethical_feedback_missing'
        : 'not_checked',
    ),
  ];
  const status = getStatus(slug, checks);
  const actionBody = input.hoursText || input.body || config.defaultBody;
  const templateDocument = buildTemplateDocument({
    accentColor: input.accentColor,
    body: actionBody,
    businessName: input.businessName,
    customerLink: normalizedCustomerLink,
    headline: input.headline || config.defaultHeadline,
    height: config.height,
    secondaryText: input.secondaryText,
    templateId: config.templateId,
    title: config.title,
    width: config.width,
  });

  return {
    accentColor: input.accentColor,
    asset: {
      creativeEditorSchemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
      displayLink: getDisplayLink(customerUrl, input.customerLink),
      filenameBase: buildSafeFilenameBase(slug, input.businessName),
      height: config.height,
      layout: config.layout,
      primaryActionLabel: config.primaryActionLabel,
      templateDocument,
      templateId: config.templateId,
      width: config.width,
    },
    boundaries: {
      aiOrSearchChecked: false,
      externalPlatformUpdated: false,
      externalSourcesFetched: false,
      fileStored: false,
      fullEditorExposed: false,
      reportStored: false,
      templateSaved: false,
    },
    businessName: input.businessName,
    checks,
    cityOrArea: input.cityOrArea,
    customerLink: normalizedCustomerLink,
    generatedAt: new Date().toISOString(),
    input,
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    status,
    summary: countSummary(checks),
    toolSlug: slug,
  };
}
