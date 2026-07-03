'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  LuAlertTriangle,
  LuArrowRight,
  LuBadgeCheck,
  LuCalendarClock,
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
  LuRefreshCw,
  LuSend,
  LuShieldCheck,
} from 'react-icons/lu';
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
import { buildBookingInquiryReadinessReport } from '@/lib/public-truth-tools/bookingInquiryReadinessReport';
import type {
  BookingInquiryPrimaryAction,
  BookingInquiryReadinessCheckId,
  BookingInquiryReadinessInput,
  BookingInquiryReadinessReport,
  BookingInquiryReadinessResult,
  BookingInquirySourceKind,
} from '@/lib/public-truth-tools/bookingInquiryReadinessTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const SOURCE_KIND_OPTIONS: BookingInquirySourceKind[] = [
  'menu',
  'service_list',
  'catalog',
  'rate_card',
  'package_list',
  'price_list',
  'other',
];

const PRIMARY_ACTION_OPTIONS: BookingInquiryPrimaryAction[] = [
  'order',
  'book',
  'reserve',
  'call',
  'whatsapp',
  'visit',
  'quote',
  'message',
  'other',
];

const BOOKING_INQUIRY_CONTACT_MESSAGE_MAX_LENGTH = 1900;

type ReadinessField =
  | 'actionVisible'
  | 'responseTimeShown'
  | 'hoursShown'
  | 'fallbackContactShown'
  | 'confirmationExpectationShown'
  | 'serviceAreaOrLocationShown';

const READINESS_FIELDS: Array<{
  key: ReadinessField;
  icon: typeof LuCheck;
}> = [
  { key: 'actionVisible', icon: LuMessageCircle },
  { key: 'responseTimeShown', icon: LuClock },
  { key: 'hoursShown', icon: LuCalendarClock },
  { key: 'fallbackContactShown', icon: LuRefreshCw },
  { key: 'confirmationExpectationShown', icon: LuBadgeCheck },
  { key: 'serviceAreaOrLocationShown', icon: LuMapPin },
];

const CHECK_ICONS: Record<BookingInquiryReadinessCheckId, typeof LuCheck> = {
  primary_action: LuMessageCircle,
  action_destination: LuLink,
  response_expectation: LuClock,
  hours_context: LuCalendarClock,
  fallback_contact: LuRefreshCw,
  confirmation_expectation: LuBadgeCheck,
  location_or_service_area: LuMapPin,
  current_customer_link: LuLink,
  external_booking_inspection: LuShieldCheck,
};

const RESULT_ICONS: Record<BookingInquiryReadinessResult, typeof LuCheck> = {
  present: LuCheck,
  missing: LuAlertTriangle,
  unclear: LuInfo,
  not_applicable: LuCircleDashed,
  not_checked: LuCircleDashed,
};

const INITIAL_FORM: BookingInquiryReadinessInput = {
  mode: 'self_report',
  businessName: '',
  cityOrArea: '',
  sourceKind: 'menu',
  publicUrl: '',
  actionText: '',
  primaryAction: 'book',
  actionLinkOrNumber: '',
  actionVisible: false,
  responseTimeShown: false,
  hoursShown: false,
  fallbackContactShown: false,
  confirmationExpectationShown: false,
  serviceAreaOrLocationShown: false,
};

const INITIAL_HANDOFF_FORM = {
  agreeToTerms: false,
  name: '',
  phoneNumber: '',
  website: '',
  workEmail: '',
};

type BookingInquiryHandoffForm = typeof INITIAL_HANDOFF_FORM;
type ReportActionStatus = 'idle' | 'copied' | 'downloaded' | 'share_copied' | 'copy_failed' | 'download_failed' | 'share_copy_failed';
type HandoffStatus = 'idle' | 'submitting' | 'submitted' | 'error';

function getResultTone(result: BookingInquiryReadinessResult) {
  if (result === 'present' || result === 'not_applicable') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function buildReportEventContext(report: BookingInquiryReadinessReport) {
  return {
    booking_inquiry_readiness_status: report.status,
    missing_count: report.summary.missing,
    not_checked_count: report.summary.notChecked,
    primary_action: report.primaryAction,
    source_kind: report.sourceKind,
    unclear_count: report.summary.unclear,
  };
}

function getSafeReportFilename(report: BookingInquiryReadinessReport): string {
  const baseName = report.businessName || 'booking-inquiry-readiness-check';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'booking-inquiry-readiness-check';
  return `${safeName}-booking-inquiry-readiness-check.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('booking_inquiry_readiness_check_download_unavailable');
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

function BookingInquiryReadinessReportCard({ report }: { report: BookingInquiryReadinessReport }) {
  const t = useTranslations('Website.BookingInquiryReadinessCheckPage');
  const sharedReportT = useTranslations('Website.PublicTruthToolSharedReport');
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuInfo;
  const [reportActionStatus, setReportActionStatus] = useState<ReportActionStatus>('idle');
  const [handoff, setHandoff] = useState<BookingInquiryHandoffForm>(INITIAL_HANDOFF_FORM);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('idle');
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
    toolId: 'booking-inquiry-readiness-check',
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
      `${t('export.sourceKind')}: ${t(`sourceKinds.${report.sourceKind}`)}`,
      `${t('export.primaryAction')}: ${t(`primaryActions.${report.primaryAction}`)}`,
      `${t('export.status')}: ${t(`statuses.${report.status}.title`)}`,
      `${t('export.generatedAt')}: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      `${t('export.summary')}: ${t('summary.present', { count: report.summary.present })}; ${t('summary.missing', { count: report.summary.missing })}; ${t('summary.unclear', { count: report.summary.unclear })}; ${t('summary.notChecked', { count: report.summary.notChecked })}`,
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

  async function handleCopyReport() {
    trackWebsiteMarketingEvent('booking_inquiry_readiness_check_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setReportActionStatus('copied');
      trackWebsiteMarketingEvent('booking_inquiry_readiness_check_report_copied', eventContext);
    } catch (error) {
      setReportActionStatus('copy_failed');
      logRuntimeFailure('booking_inquiry_readiness_check_report_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent('booking_inquiry_readiness_check_share_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setReportActionStatus('share_copied');
      trackWebsiteMarketingEvent('booking_inquiry_readiness_check_share_link_copied', eventContext);
    } catch (error) {
      setReportActionStatus('share_copy_failed');
      logRuntimeFailure('booking_inquiry_readiness_check_share_link_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('booking_inquiry_readiness_check_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setReportActionStatus('downloaded');
      trackWebsiteMarketingEvent('booking_inquiry_readiness_check_report_downloaded', eventContext);
    } catch (error) {
      setReportActionStatus('download_failed');
      logRuntimeFailure('booking_inquiry_readiness_check_report_download_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function updateHandoff<K extends keyof BookingInquiryHandoffForm>(key: K, value: BookingInquiryHandoffForm[K]) {
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

    const sourcePath = typeof window === 'undefined' ? '/tools/booking-inquiry-readiness-check' : window.location.pathname;
    const message = [
      'Booking / Inquiry Readiness Check follow-up request',
      '',
      reportText.length > BOOKING_INQUIRY_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, BOOKING_INQUIRY_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
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

    setHandoffStatus('submitting');
    trackWebsiteMarketingEvent('booking_inquiry_readiness_check_handoff_submitted', eventContext);

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
        'booking_inquiry_readiness_check_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('booking_inquiry_readiness_check_contact_response_invalid', result, 'general', {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error('booking_inquiry_readiness_check_contact_failed');
      }

      setHandoff(INITIAL_HANDOFF_FORM);
      setHandoffStatus('submitted');
      trackWebsiteMarketingEvent('booking_inquiry_readiness_check_handoff_accepted', eventContext);
    } catch {
      setHandoffStatus('error');
      setHandoffError(t('handoff.submitFailed'));
      resetCaptcha();
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
          onClick={() => trackWebsiteMarketingEvent('booking_inquiry_readiness_check_create_link_clicked', eventContext)}
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
              value={handoff.name}
              onChange={(event) => updateHandoff('name', event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('handoff.email')}</span>
            <input
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
            value={handoff.phoneNumber}
            onChange={(event) => updateHandoff('phoneNumber', event.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </label>

        <div style={{ display: 'none' }} aria-hidden>
          <label htmlFor="booking-inquiry-readiness-check-website">{t('handoff.website')}</label>
          <input
            id="booking-inquiry-readiness-check-website"
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
          action="menulist_booking_inquiry_readiness_check"
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
  const t = useTranslations('Website.BookingInquiryReadinessCheckPage');

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

export default function BookingInquiryReadinessCheckPage() {
  const t = useTranslations('Website.BookingInquiryReadinessCheckPage');
  const [form, setForm] = useState<BookingInquiryReadinessInput>(INITIAL_FORM);
  const [hasChecked, setHasChecked] = useState(false);
  const report = useMemo(() => buildBookingInquiryReadinessReport(form), [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasChecked(true);
    trackWebsiteMarketingEvent('booking_inquiry_readiness_check_completed', {
      booking_inquiry_readiness_status: report.status,
      has_action_destination: Boolean(form.actionLinkOrNumber.trim()),
      has_action_text: Boolean(form.actionText.trim()),
      has_current_customer_link: Boolean(form.publicUrl.trim()),
      primary_action: form.primaryAction,
      source_kind: form.sourceKind,
    });
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setHasChecked(false);
  }

  return (
    <main className="ws-public-truth-check">
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
                    value={form.businessName}
                    onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))}
                    autoComplete="organization"
                  />
                </label>
                <label>
                  <span>{t('fields.cityOrArea')}</span>
                  <input
                    value={form.cityOrArea}
                    onChange={(event) => setForm((current) => ({ ...current, cityOrArea: event.target.value }))}
                    autoComplete="address-level2"
                  />
                </label>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.sourceKind')}</span>
                  <select
                    value={form.sourceKind}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      sourceKind: event.target.value as BookingInquirySourceKind,
                    }))}
                  >
                    {SOURCE_KIND_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`sourceKinds.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t('fields.primaryAction')}</span>
                  <select
                    value={form.primaryAction}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      primaryAction: event.target.value as BookingInquiryPrimaryAction,
                    }))}
                  >
                    {PRIMARY_ACTION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`primaryActions.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>{t('fields.actionText')}</span>
                <textarea
                  value={form.actionText}
                  onChange={(event) => setForm((current) => ({ ...current, actionText: event.target.value }))}
                  rows={4}
                />
              </label>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.actionLinkOrNumber')}</span>
                  <input
                    value={form.actionLinkOrNumber}
                    onChange={(event) => setForm((current) => ({ ...current, actionLinkOrNumber: event.target.value }))}
                    autoComplete="url"
                  />
                </label>
                <label>
                  <span>{t('fields.publicUrl')}</span>
                  <input
                    value={form.publicUrl}
                    onChange={(event) => setForm((current) => ({ ...current, publicUrl: event.target.value }))}
                    inputMode="url"
                    autoComplete="url"
                  />
                </label>
              </div>

              <fieldset className="ws-public-truth-check-facts">
                <legend>{t('factsLegend')}</legend>
                <div>
                  {READINESS_FIELDS.map(({ key, icon: Icon }) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                      />
                      <span>
                        <Icon size={16} aria-hidden="true" />
                        {t(`facts.${key}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

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
            <WebsiteLink href="/features/public-discovery" className="ws-public-truth-check-results__link">
              {t('learnMore')}
              <LuExternalLink size={15} aria-hidden="true" />
            </WebsiteLink>
          </AnimateOnScroll>

          <AnimateOnScroll preset="card">
            {hasChecked ? <BookingInquiryReadinessReportCard report={report} /> : <EmptyReport />}
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
