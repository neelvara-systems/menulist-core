'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  LuAlertTriangle,
  LuArrowRight,
  LuBadgeCheck,
  LuCheck,
  LuCircleDashed,
  LuClock,
  LuCopy,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuInfo,
  LuLink,
  LuLoader,
  LuMapPin,
  LuMessageCircle,
  LuPhone,
  LuReceipt,
  LuRefreshCw,
  LuSend,
  LuShieldCheck,
  LuStore,
  LuTags,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import {
  copyRuntimeTextToClipboard,
  getBoundedRuntimeStringContext,
  logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import {
  isAcceptedMenulistPublicContactResponse,
  logInvalidMenulistPublicContactResponse,
  readMenulistPublicContactResponseJson,
} from '@lib/publicContact/contactClientResponse';
import { trackWebsiteMarketingEvent } from '@lib/website/plausible';
import {
  buildShareablePublicTruthToolReportPayload,
  createShareableToolReportUrl,
} from '@/lib/public-truth-tools/shareableToolReport';
import { buildWhatsAppReplyPackReport } from '@/lib/public-truth-tools/whatsappReplyPackReport';
import { PUBLIC_TRUTH_TOOL_INPUT_LIMITS } from '@/lib/public-truth-tools/publicTruthToolInputLimits';
import type {
  WhatsAppReplyBlock,
  WhatsAppReplyPackAction,
  WhatsAppReplyPackBlockId,
  WhatsAppReplyPackCheckId,
  WhatsAppReplyPackInput,
  WhatsAppReplyPackReport,
  WhatsAppReplyPackResult,
} from '@/lib/public-truth-tools/whatsappReplyPackTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const ACTION_OPTIONS: WhatsAppReplyPackAction[] = [
  'ask_question',
  'order',
  'book',
  'request_quote',
  'visit',
];

const WHATSAPP_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH = 2400;

const CHECK_ICONS: Record<WhatsAppReplyPackCheckId, IconType> = {
  action_path: LuSend,
  business_identity: LuStore,
  current_customer_link: LuLink,
  delivery_pickup_context: LuMapPin,
  hours_expectation: LuClock,
  message_delivery: LuShieldCheck,
  offer_summary: LuReceipt,
  payment_context: LuTags,
  reply_pack: LuCopy,
  wa_me_preview: LuMessageCircle,
  whatsapp_number: LuPhone,
};

const COPY_BLOCK_ICONS: Record<WhatsAppReplyPackBlockId, IconType> = {
  customer_link_reply: LuLink,
  delivery_pickup_reply: LuMapPin,
  fallback_reply: LuRefreshCw,
  greeting_reply: LuMessageCircle,
  hours_reply: LuClock,
  menu_service_reply: LuReceipt,
  order_booking_reply: LuSend,
  price_payment_reply: LuTags,
};

const RESULT_ICONS: Record<WhatsAppReplyPackResult, IconType> = {
  present: LuCheck,
  missing: LuAlertTriangle,
  unclear: LuInfo,
  not_applicable: LuCircleDashed,
  not_checked: LuCircleDashed,
};

const INITIAL_FORM: WhatsAppReplyPackInput = {
  actionLink: '',
  businessName: '',
  cityOrArea: '',
  currentCustomerLink: '',
  deliveryOrPickup: '',
  hours: '',
  locationOrServiceArea: '',
  mode: 'self_report',
  offerSummary: '',
  paymentInfo: '',
  preferredAction: 'ask_question',
  responseTime: '',
  whatsappNumber: '',
};

const INITIAL_HANDOFF_FORM = {
  agreeToTerms: false,
  name: '',
  phoneNumber: '',
  website: '',
  workEmail: '',
};

type WhatsAppReplyPackHandoffForm = typeof INITIAL_HANDOFF_FORM;
type ReportActionStatus = 'idle' | 'copied' | 'downloaded' | 'share_copied' | 'copy_failed' | 'download_failed' | 'share_copy_failed';
type CopyBlockStatus = Record<string, 'idle' | 'copied' | 'copy_failed'>;
type HandoffStatus = 'idle' | 'submitting' | 'submitted' | 'error';

function getResultTone(result: WhatsAppReplyPackResult) {
  if (result === 'present' || result === 'not_applicable') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function buildReportEventContext(report: WhatsAppReplyPackReport) {
  return {
    copy_block_count: report.copyBlocks.length,
    has_preview_link: Boolean(report.previewLink),
    missing_count: report.summary.missing,
    not_checked_count: report.summary.notChecked,
    preferred_action: report.preferredAction,
    unclear_count: report.summary.unclear,
    whatsapp_reply_pack_status: report.status,
  };
}

function getSafeReportFilename(report: WhatsAppReplyPackReport): string {
  const baseName = report.businessName || 'whatsapp-reply-pack';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'whatsapp-reply-pack';
  return `${safeName}-whatsapp-reply-pack.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('whatsapp_reply_pack_download_unavailable');
  }

  const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}

function buildCopyBlockText(block: WhatsAppReplyBlock): string {
  return `${block.title}\n\n${block.body}\n\n${block.evidenceText}`;
}

function WhatsAppReplyPackReportCard({ report }: { report: WhatsAppReplyPackReport }) {
  const t = useTranslations('Website.WhatsAppReplyPackPage');
  const sharedReportT = useTranslations('Website.PublicTruthToolSharedReport');
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuInfo;
  const [reportActionStatus, setReportActionStatus] = useState<ReportActionStatus>('idle');
  const [copyBlockStatus, setCopyBlockStatus] = useState<CopyBlockStatus>({});
  const [handoff, setHandoff] = useState<WhatsAppReplyPackHandoffForm>(INITIAL_HANDOFF_FORM);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('idle');
  const handoffSubmissionInFlightRef = useRef(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const captchaRequired = isTurnstileClientEnabled();
  const eventContext = useMemo(() => buildReportEventContext(report), [report]);
  const shareableReportPayload = useMemo(() => buildShareablePublicTruthToolReportPayload({
    report,
    sharedT: sharedReportT,
    t,
    toolId: 'whatsapp-reply-pack',
  }), [report, sharedReportT, t]);
  const shareableReportUrl = useMemo(
    () => createShareableToolReportUrl(shareableReportPayload),
    [shareableReportPayload],
  );
  const reportText = useMemo(() => {
    const lines = [
      t('export.title'),
      '',
      `${t('export.business')}: ${report.businessName || t('export.notProvided')}`,
      `${t('export.city')}: ${report.cityOrArea || t('export.notProvided')}`,
      `${t('export.preferredAction')}: ${t(`actionOptions.${report.preferredAction}`)}`,
      `${t('export.status')}: ${t(`statuses.${report.status}.title`)}`,
      `${t('export.generatedAt')}: ${new Date(report.generatedAt).toLocaleString()}`,
      `${t('export.previewLink')}: ${report.previewLink || t('export.notGenerated')}`,
      '',
      `${t('export.summary')}: ${t('summary.present', { count: report.summary.present })}; ${t('summary.missing', { count: report.summary.missing })}; ${t('summary.unclear', { count: report.summary.unclear })}; ${t('summary.notChecked', { count: report.summary.notChecked })}`,
      '',
      t('export.copyBlocks'),
      ...report.copyBlocks.flatMap((block) => [
        '',
        `${t(`copyBlocks.${block.id}.title`)}`,
        block.body,
        block.evidenceText,
      ]),
      '',
      t('export.checks'),
      ...report.checks.map((check) => (
        `- ${t(`checks.${check.id}.label`)}: ${t(`results.${check.result}`)} - ${check.evidenceText}`
      )),
      '',
      t('export.nextStep'),
      `${t(`nextActions.${report.nextAction.type}.title`)} - ${t(`nextActions.${report.nextAction.type}.description`)}`,
      '',
      t('export.boundary'),
    ];

    return lines.join('\n');
  }, [report, t]);

  const resetCaptcha = () => {
    if (!captchaRequired) return;
    setCaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  };

  async function handleCopyBlock(block: WhatsAppReplyBlock) {
    trackWebsiteMarketingEvent('whatsapp_reply_pack_block_copy_clicked', {
      ...eventContext,
      block_id: block.id,
    });

    try {
      await copyRuntimeTextToClipboard(buildCopyBlockText(block));
      setCopyBlockStatus((current) => ({ ...current, [block.id]: 'copied' }));
      trackWebsiteMarketingEvent('whatsapp_reply_pack_block_copied', {
        ...eventContext,
        block_id: block.id,
      });
    } catch (error) {
      setCopyBlockStatus((current) => ({ ...current, [block.id]: 'copy_failed' }));
      logRuntimeFailure('whatsapp_reply_pack_block_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
        ...getBoundedRuntimeStringContext('blockId', block.id),
      });
    }
  }

  async function handleCopyReport() {
    trackWebsiteMarketingEvent('whatsapp_reply_pack_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setReportActionStatus('copied');
      trackWebsiteMarketingEvent('whatsapp_reply_pack_report_copied', eventContext);
    } catch (error) {
      setReportActionStatus('copy_failed');
      logRuntimeFailure('whatsapp_reply_pack_report_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent('whatsapp_reply_pack_share_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setReportActionStatus('share_copied');
      trackWebsiteMarketingEvent('whatsapp_reply_pack_share_link_copied', eventContext);
    } catch (error) {
      setReportActionStatus('share_copy_failed');
      logRuntimeFailure('whatsapp_reply_pack_share_link_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('whatsapp_reply_pack_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setReportActionStatus('downloaded');
      trackWebsiteMarketingEvent('whatsapp_reply_pack_report_downloaded', eventContext);
    } catch (error) {
      setReportActionStatus('download_failed');
      logRuntimeFailure('whatsapp_reply_pack_report_download_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function updateHandoff<K extends keyof WhatsAppReplyPackHandoffForm>(key: K, value: WhatsAppReplyPackHandoffForm[K]) {
    setHandoff((current) => ({ ...current, [key]: value }));
    setHandoffStatus((current) => (current === 'submitted' ? 'idle' : current));
    setHandoffError(null);
  }

  async function handleHandoffSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHandoffError(null);

    const name = handoff.name.trim();
    const workEmail = handoff.workEmail.trim().toLowerCase();
    const phoneNumber = handoff.phoneNumber.trim();
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail);

    if (name.length < 2) {
      setHandoffError(t('handoff.nameRequired'));
      return;
    }

    if (!hasValidEmail) {
      setHandoffError(t('handoff.emailRequired'));
      return;
    }

    if (!handoff.agreeToTerms) {
      setHandoffError(t('handoff.consentRequired'));
      return;
    }

    if (captchaRequired && !captchaToken) {
      setHandoffError(t('handoff.securityCheckRequired'));
      return;
    }

    const sourcePath = typeof window === 'undefined' ? '/tools/whatsapp-reply-pack' : window.location.pathname;
    const message = [
      'WhatsApp Reply Pack follow-up request',
      '',
      reportText.length > WHATSAPP_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, WHATSAPP_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
        : reportText,
    ].join('\n');
    const responseLogContext = {
      ...eventContext,
      captchaRequired,
      captchaStatus,
      hasCaptchaToken: Boolean(captchaToken),
      hasPhoneNumber: Boolean(phoneNumber),
      messageLength: message.length,
      sourcePathLength: sourcePath.length,
    };

    if (handoffSubmissionInFlightRef.current) return;
    handoffSubmissionInFlightRef.current = true;
    setHandoffStatus('submitting');
    trackWebsiteMarketingEvent('whatsapp_reply_pack_handoff_submitted', eventContext);

    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreeToTerms: handoff.agreeToTerms,
          captchaToken: captchaToken || undefined,
          helpTopic: 'general',
          message,
          name,
          phoneNumber: phoneNumber || undefined,
          sourcePath,
          website: handoff.website,
          workEmail,
        }),
      });
      const result = await readMenulistPublicContactResponseJson(
        response,
        'whatsapp_reply_pack_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('whatsapp_reply_pack_contact_response_invalid', result, 'general', {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error('whatsapp_reply_pack_contact_failed');
      }

      setHandoff(INITIAL_HANDOFF_FORM);
      setHandoffStatus('submitted');
      trackWebsiteMarketingEvent('whatsapp_reply_pack_handoff_accepted', eventContext);
    } catch (error) {
      setHandoffStatus('error');
      setHandoffError(t('handoff.submitFailed'));
      logRuntimeFailure('public_tool_contact_submit_failed', error, responseLogContext);
      resetCaptcha();
    } finally {
      handoffSubmissionInFlightRef.current = false;
    }
  }

  return (
    <div className={`ws-public-truth-check-report-card ws-public-truth-check-report-card--${report.status}`} aria-live="polite">
      <div className="ws-public-truth-check-report-card__top">
        <span className="ws-public-truth-check-report-card__icon">
          <StatusIcon size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="ws-page-hero__eyebrow">{t('reportEyebrow')}</p>
          <h2>{t(`statuses.${report.status}.title`)}</h2>
          <p>{t(`statuses.${report.status}.description`)}</p>
        </div>
      </div>

      <div className="ws-public-truth-check-summary" aria-label={t('summaryLabel')}>
        <span>{t('summary.present', { count: report.summary.present })}</span>
        <span>{t('summary.missing', { count: report.summary.missing })}</span>
        <span>{t('summary.unclear', { count: report.summary.unclear })}</span>
        <span>{t('summary.notChecked', { count: report.summary.notChecked })}</span>
      </div>

      <div className="ws-business-facts-copy-pack-blocks" aria-label={t('copyBlocksTitle')}>
        <div className="ws-business-facts-copy-pack-blocks__heading">
          <strong>{t('copyBlocksTitle')}</strong>
          <p>{t('copyBlocksBody')}</p>
        </div>
        {report.copyBlocks.map((block, index) => {
          const BlockIcon = COPY_BLOCK_ICONS[block.id];
          const status = copyBlockStatus[block.id] || 'idle';

          return (
            <AnimateStaggerChild key={block.id} index={index} preset="card">
              <article className="ws-business-facts-copy-pack-block">
                <div className="ws-business-facts-copy-pack-block__top">
                  <span>
                    <BlockIcon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{t(`copyBlocks.${block.id}.title`)}</h3>
                    <p>{t(`copyBlocks.${block.id}.helper`)}</p>
                  </div>
                  <button type="button" onClick={() => handleCopyBlock(block)}>
                    <LuCopy size={15} aria-hidden="true" />
                    {t('copyBlockAction')}
                  </button>
                </div>
                <pre>{block.body}</pre>
                <small>{block.evidenceText}</small>
                {status !== 'idle' ? (
                  <p className={`ws-public-truth-check-inline-status ws-public-truth-check-inline-status--${status === 'copy_failed' ? 'error' : 'ok'}`}>
                    {t(`copyBlockStatuses.${status}`)}
                  </p>
                ) : null}
              </article>
            </AnimateStaggerChild>
          );
        })}
      </div>

      {report.previewLink ? (
        <div className="ws-public-truth-check-report-actions">
          <div>
            <strong>{t('preview.title')}</strong>
            <p>{t('preview.body')}</p>
          </div>
          <code>{report.previewLink}</code>
        </div>
      ) : null}

      <div className="ws-public-truth-check-rows">
        {report.checks.map((check, index) => {
          const CheckIcon = CHECK_ICONS[check.id];
          const ResultIcon = RESULT_ICONS[check.result];
          const tone = getResultTone(check.result);

          return (
            <AnimateStaggerChild key={check.id} index={index} preset="card">
              <article className={`ws-public-truth-check-row ws-public-truth-check-row--${tone}`}>
                <span className="ws-public-truth-check-row__icon">
                  <CheckIcon size={18} aria-hidden="true" />
                </span>
                <div className="ws-public-truth-check-row__body">
                  <div>
                    <h3>{t(`checks.${check.id}.label`)}</h3>
                    <span className={`ws-public-truth-check-badge ws-public-truth-check-badge--${tone}`}>
                      <ResultIcon size={14} aria-hidden="true" />
                      {t(`results.${check.result}`)}
                    </span>
                  </div>
                  <p>{t(`checks.${check.id}.helper`)}</p>
                  <small>{check.evidenceText}</small>
                </div>
              </article>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <div className="ws-public-truth-check-next">
        <div>
          <strong>{t(`nextActions.${report.nextAction.type}.title`)}</strong>
          <p>{t(`nextActions.${report.nextAction.type}.description`)}</p>
        </div>
        <WebsiteButton
          href={report.nextAction.href}
          onClick={() => trackWebsiteMarketingEvent('whatsapp_reply_pack_create_link_clicked', eventContext)}
        >
          {t(`nextActions.${report.nextAction.type}.cta`)}
        </WebsiteButton>
      </div>

      <div className="ws-public-truth-check-report-actions">
        <div>
          <strong>{t('reportActions.title')}</strong>
          <p>{t('reportActions.body')}</p>
        </div>
        <div className="ws-public-truth-check-report-actions__buttons">
          <button type="button" onClick={handleCopyReport}>
            <LuCopy size={16} aria-hidden="true" />
            {t('reportActions.copy')}
          </button>
          <button type="button" onClick={handleCopyShareLink}>
            <LuLink size={16} aria-hidden="true" />
            {sharedReportT('reportActions.shareLink')}
          </button>
          <button type="button" onClick={handleDownloadReport}>
            <LuDownload size={16} aria-hidden="true" />
            {t('reportActions.download')}
          </button>
        </div>
        {reportActionStatus !== 'idle' ? (
          <p className={`ws-public-truth-check-inline-status ws-public-truth-check-inline-status--${reportActionStatus.includes('failed') ? 'error' : 'ok'}`}>
            {reportActionStatus === 'share_copied' || reportActionStatus === 'share_copy_failed'
              ? sharedReportT(`reportActions.statuses.${reportActionStatus}`)
              : t(`reportActions.statuses.${reportActionStatus}`)}
          </p>
        ) : null}
      </div>

      <form className="ws-public-truth-check-handoff" onSubmit={handleHandoffSubmit}>
        <div className="ws-public-truth-check-handoff__intro">
          <LuSend size={18} aria-hidden="true" />
          <div>
            <h3>{t('handoff.title')}</h3>
            <p>{t('handoff.body')}</p>
          </div>
        </div>

        <div className="ws-public-truth-check-handoff__grid">
          <label>
            <span>{t('handoff.name')}</span>
            <input
              maxLength={120}
              value={handoff.name}
              onChange={(event) => updateHandoff('name', event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('handoff.email')}</span>
            <input
              maxLength={180}
              value={handoff.workEmail}
              onChange={(event) => updateHandoff('workEmail', event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </label>
        </div>

        <label>
          <span>{t('handoff.phone')}</span>
          <input
            maxLength={40}
            value={handoff.phoneNumber}
            onChange={(event) => updateHandoff('phoneNumber', event.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </label>

        <div style={{ display: 'none' }} aria-hidden>
          <label htmlFor="whatsapp-reply-pack-website">{t('handoff.website')}</label>
          <input
            id="whatsapp-reply-pack-website"
            maxLength={500}
            value={handoff.website}
            onChange={(event) => updateHandoff('website', event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label className="ws-public-truth-check-handoff__consent">
          <input
            type="checkbox"
            checked={handoff.agreeToTerms}
            onChange={(event) => updateHandoff('agreeToTerms', event.target.checked)}
          />
          <span>
            {t('handoff.consentPrefix')}
            <WebsiteLink href="/privacy-policy">{t('handoff.privacy')}</WebsiteLink>
            {t('handoff.consentMiddle')}
            <WebsiteLink href="/terms-of-service">{t('handoff.terms')}</WebsiteLink>
            {t('handoff.consentSuffix')}
          </span>
        </label>

        <TurnstileWidget
          action="menulist_whatsapp_reply_pack"
          onStatusChange={setCaptchaStatus}
          onTokenChange={setCaptchaToken}
          resetSignal={captchaResetSignal}
          theme="light"
        />

        {captchaRequired && captchaStatus === 'error' ? (
          <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error" role="alert">
            {t('handoff.securityCheckLoadFailed')}
          </p>
        ) : null}

        {handoffError ? (
          <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error" role="alert">
            {handoffError}
          </p>
        ) : null}

        {handoffStatus === 'submitted' ? (
          <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--ok">
            {t('handoff.success')}
          </p>
        ) : null}

        <button
          type="submit"
          className="ws-public-truth-check-handoff__submit"
          disabled={handoffStatus === 'submitting' || (captchaRequired && !captchaToken)}
        >
          {handoffStatus === 'submitting' ? <LuLoader size={16} aria-hidden="true" /> : <LuSend size={16} aria-hidden="true" />}
          {handoffStatus === 'submitting' ? t('handoff.submitting') : t('handoff.submit')}
        </button>
      </form>
    </div>
  );
}

function EmptyReport() {
  const t = useTranslations('Website.WhatsAppReplyPackPage');

  return (
    <div className="ws-public-truth-check-empty">
      <LuShieldCheck size={28} aria-hidden="true" />
      <h2>{t('emptyTitle')}</h2>
      <p>{t('emptyBody')}</p>
      <div className="ws-public-truth-check-boundaries">
        {[0, 1, 2].map((index) => (
          <span key={index}>
            <LuCheck size={15} aria-hidden="true" />
            {t(`boundary${index}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function WhatsAppReplyPackPage() {
  const t = useTranslations('Website.WhatsAppReplyPackPage');
  const [form, setForm] = useState<WhatsAppReplyPackInput>(INITIAL_FORM);
  const [hasChecked, setHasChecked] = useState(false);
  const report = useMemo(() => buildWhatsAppReplyPackReport(form), [form]);

  function updateField<K extends keyof WhatsAppReplyPackInput>(key: K, value: WhatsAppReplyPackInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasChecked(true);
    trackWebsiteMarketingEvent('whatsapp_reply_pack_completed', {
      has_current_customer_link: Boolean(form.currentCustomerLink.trim()),
      has_offer_summary: Boolean(form.offerSummary.trim()),
      has_whatsapp_number: Boolean(form.whatsappNumber.trim()),
      preferred_action: form.preferredAction,
      whatsapp_reply_pack_status: report.status,
    });
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setHasChecked(false);
  }

  return (
    <main className="ws-public-truth-check ws-whatsapp-reply-pack">
      <section className="ws-public-truth-check-hero">
        <div className="ws-container ws-public-truth-check-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-public-truth-check-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t('heroTitle')}
              highlightedText={t('heroHighlight')}
            />
            <p className="ws-public-truth-check-hero__subtitle">{t('heroSubtitle')}</p>
            <div className="ws-public-truth-check-hero__trust">
              {[0, 1, 2].map((index) => (
                <span key={index}>
                  <LuShieldCheck size={15} aria-hidden="true" />
                  {t(`trust${index}`)}
                </span>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll preset="media" delay={0.08}>
            <form className="ws-public-truth-check-form" onSubmit={handleSubmit}>
              <div className="ws-public-truth-check-form__header">
                <LuMessageCircle size={22} aria-hidden="true" />
                <div>
                  <h2>{t('formTitle')}</h2>
                  <p>{t('formSubtitle')}</p>
                </div>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.businessName')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName}
                    value={form.businessName}
                    onChange={(event) => updateField('businessName', event.target.value)}
                    autoComplete="organization"
                  />
                </label>
                <label>
                  <span>{t('fields.cityOrArea')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea}
                    value={form.cityOrArea}
                    onChange={(event) => updateField('cityOrArea', event.target.value)}
                    autoComplete="address-level2"
                  />
                </label>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.whatsappNumber')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.phone}
                    value={form.whatsappNumber}
                    onChange={(event) => updateField('whatsappNumber', event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
                <label>
                  <span>{t('fields.preferredAction')}</span>
                  <select
                    value={form.preferredAction}
                    onChange={(event) => updateField('preferredAction', event.target.value as WhatsAppReplyPackAction)}
                  >
                    {ACTION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`actionOptions.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>{t('fields.offerSummary')}</span>
                <textarea
                  maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText}
                  value={form.offerSummary}
                  onChange={(event) => updateField('offerSummary', event.target.value)}
                  rows={4}
                />
              </label>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.currentCustomerLink')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url}
                    value={form.currentCustomerLink}
                    onChange={(event) => updateField('currentCustomerLink', event.target.value)}
                    autoComplete="url"
                    inputMode="url"
                  />
                </label>
                <label>
                  <span>{t('fields.actionLink')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url}
                    value={form.actionLink}
                    onChange={(event) => updateField('actionLink', event.target.value)}
                    autoComplete="url"
                    inputMode="url"
                  />
                </label>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.hours')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText}
                    value={form.hours}
                    onChange={(event) => updateField('hours', event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span>{t('fields.responseTime')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText}
                    value={form.responseTime}
                    onChange={(event) => updateField('responseTime', event.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.locationOrServiceArea')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText}
                    value={form.locationOrServiceArea}
                    onChange={(event) => updateField('locationOrServiceArea', event.target.value)}
                    autoComplete="street-address"
                  />
                </label>
                <label>
                  <span>{t('fields.deliveryOrPickup')}</span>
                  <input
                    maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText}
                    value={form.deliveryOrPickup}
                    onChange={(event) => updateField('deliveryOrPickup', event.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              <label>
                <span>{t('fields.paymentInfo')}</span>
                <textarea
                  maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText}
                  value={form.paymentInfo}
                  onChange={(event) => updateField('paymentInfo', event.target.value)}
                  rows={3}
                />
              </label>

              <div className="ws-public-truth-check-form__actions">
                <button type="submit" className="ws-btn ws-btn--primary">
                  {t('runCheck')}
                  <LuArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="ws-public-truth-check-reset" onClick={handleReset}>
                  {t('reset')}
                </button>
              </div>
            </form>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section ws-public-truth-check-results">
        <div className="ws-container ws-public-truth-check-results__inner">
          <AnimateOnScroll preset="card" className="ws-public-truth-check-results__copy">
            <p className="ws-page-hero__eyebrow">{t('resultsEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('resultsTitle')} highlightedText={t('resultsHighlight')} />
            <p>{t('resultsSubtitle')}</p>
            <WebsiteLink href="/tools/whatsapp-action-link-check" className="ws-public-truth-check-results__link">
              {t('learnMore')}
              <LuExternalLink size={15} aria-hidden="true" />
            </WebsiteLink>
          </AnimateOnScroll>

          <AnimateOnScroll preset="card">
            {hasChecked ? <WhatsAppReplyPackReportCard key={report.generatedAt} report={report} /> : <EmptyReport />}
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
