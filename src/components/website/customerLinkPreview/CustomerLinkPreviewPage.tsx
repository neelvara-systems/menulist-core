'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  LuAlertTriangle,
  LuArrowRight,
  LuBadgeCheck,
  LuCheck,
  LuCircleDashed,
  LuCopy,
  LuDownload,
  LuEye,
  LuImage,
  LuInfo,
  LuLink,
  LuLoader,
  LuMapPin,
  LuMenu,
  LuPhone,
  LuSend,
  LuShieldCheck,
  LuSmartphone,
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
import { buildCustomerLinkPreviewReport } from '@/lib/public-truth-tools/customerLinkPreviewReport';
import type {
  CustomerLinkPreviewBusinessKind,
  CustomerLinkPreviewCheckId,
  CustomerLinkPreviewInput,
  CustomerLinkPreviewItem,
  CustomerLinkPreviewReport,
  CustomerLinkPreviewResult,
} from '@/lib/public-truth-tools/customerLinkPreviewTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const CUSTOMER_LINK_PREVIEW_CONTACT_MESSAGE_MAX_LENGTH = 1900;

type ChecklistField =
  | 'businessNameVisible'
  | 'menuOrServiceVisible'
  | 'pricesOrRatesVisible'
  | 'hoursVisible'
  | 'locationVisible'
  | 'contactVisible'
  | 'customerActionVisible'
  | 'photosOrIdentityVisible'
  | 'mobileFriendly';

const BUSINESS_KIND_OPTIONS: CustomerLinkPreviewBusinessKind[] = [
  'restaurant',
  'service',
  'retail',
  'clinic',
  'salon',
  'other',
];

const CHECKLIST_FIELDS: Array<{
  key: ChecklistField;
  icon: typeof LuCheck;
}> = [
  { key: 'businessNameVisible', icon: LuInfo },
  { key: 'menuOrServiceVisible', icon: LuMenu },
  { key: 'pricesOrRatesVisible', icon: LuBadgeCheck },
  { key: 'hoursVisible', icon: LuCheck },
  { key: 'locationVisible', icon: LuMapPin },
  { key: 'contactVisible', icon: LuPhone },
  { key: 'customerActionVisible', icon: LuArrowRight },
  { key: 'photosOrIdentityVisible', icon: LuImage },
  { key: 'mobileFriendly', icon: LuSmartphone },
];

const CHECK_ICONS: Record<CustomerLinkPreviewCheckId, typeof LuCheck> = {
  customer_link_present: LuLink,
  business_identity: LuInfo,
  menu_or_service_summary: LuMenu,
  prices_or_rates: LuBadgeCheck,
  hours: LuCheck,
  location: LuMapPin,
  contact: LuPhone,
  customer_action: LuArrowRight,
  visual_identity: LuImage,
  mobile_readiness: LuSmartphone,
  external_link_inspection: LuShieldCheck,
};

const RESULT_ICONS: Record<CustomerLinkPreviewResult, typeof LuCheck> = {
  present: LuCheck,
  missing: LuAlertTriangle,
  unclear: LuInfo,
  not_applicable: LuCircleDashed,
  not_checked: LuCircleDashed,
};

const INITIAL_FORM: CustomerLinkPreviewInput = {
  mode: 'self_report',
  businessName: '',
  cityOrArea: '',
  businessKind: 'restaurant',
  currentCustomerLink: '',
  businessNameVisible: false,
  menuOrServiceVisible: false,
  pricesOrRatesVisible: false,
  hoursVisible: false,
  locationVisible: false,
  contactVisible: false,
  customerActionVisible: false,
  photosOrIdentityVisible: false,
  mobileFriendly: false,
};

const INITIAL_HANDOFF_FORM = {
  agreeToTerms: false,
  name: '',
  phoneNumber: '',
  website: '',
  workEmail: '',
};

type CustomerLinkPreviewHandoffForm = typeof INITIAL_HANDOFF_FORM;
type ReportActionStatus = 'idle' | 'copied' | 'downloaded' | 'share_copied' | 'copy_failed' | 'download_failed' | 'share_copy_failed';
type HandoffStatus = 'idle' | 'submitting' | 'submitted' | 'error';

function getResultTone(result: CustomerLinkPreviewResult) {
  if (result === 'present' || result === 'not_applicable') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function buildReportEventContext(report: CustomerLinkPreviewReport) {
  return {
    customer_link_preview_status: report.status,
    missing_count: report.summary.missing,
    not_checked_count: report.summary.notChecked,
    unclear_count: report.summary.unclear,
    visible_fact_count: report.previewFacts.visibleFactCount,
  };
}

function getSafeReportFilename(report: CustomerLinkPreviewReport): string {
  const baseName = report.businessName || 'customer-link-preview';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'customer-link-preview';
  return `${safeName}-customer-link-preview.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('customer_link_preview_download_unavailable');
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

function CustomerLinkPreviewReportCard({ report }: { report: CustomerLinkPreviewReport }) {
  const t = useTranslations('Website.CustomerLinkPreviewPage');
  const sharedReportT = useTranslations('Website.PublicTruthToolSharedReport');
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuInfo;
  const [reportActionStatus, setReportActionStatus] = useState<ReportActionStatus>('idle');
  const [handoff, setHandoff] = useState<CustomerLinkPreviewHandoffForm>(INITIAL_HANDOFF_FORM);
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
    toolId: 'customer-link-preview',
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
      `${t('export.businessKind')}: ${t(`businessKinds.${report.businessKind}`)}`,
      `${t('export.status')}: ${t(`statuses.${report.status}.title`)}`,
      `${t('export.generatedAt')}: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      `${t('export.summary')}: ${t('summary.present', { count: report.summary.present })}; ${t('summary.missing', { count: report.summary.missing })}; ${t('summary.unclear', { count: report.summary.unclear })}; ${t('summary.notChecked', { count: report.summary.notChecked })}`,
      '',
      t('export.preview'),
      `${report.previewFacts.headline} - ${report.previewFacts.subline}`,
      `${t('export.visibleFacts')}: ${report.previewFacts.visibleFactCount}`,
      `${t('export.customerLink')}: ${report.previewFacts.customerLinkLabel}`,
      '',
      t('export.checks'),
      ...report.checks.map((check: CustomerLinkPreviewItem) => (
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
    trackWebsiteMarketingEvent('customer_link_preview_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setReportActionStatus('copied');
      trackWebsiteMarketingEvent('customer_link_preview_report_copied', eventContext);
    } catch (error) {
      setReportActionStatus('copy_failed');
      logRuntimeFailure('customer_link_preview_report_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent('customer_link_preview_share_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setReportActionStatus('share_copied');
      trackWebsiteMarketingEvent('customer_link_preview_share_link_copied', eventContext);
    } catch (error) {
      setReportActionStatus('share_copy_failed');
      logRuntimeFailure('customer_link_preview_share_link_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('customer_link_preview_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setReportActionStatus('downloaded');
      trackWebsiteMarketingEvent('customer_link_preview_report_downloaded', eventContext);
    } catch (error) {
      setReportActionStatus('download_failed');
      logRuntimeFailure('customer_link_preview_report_download_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function updateHandoff<K extends keyof CustomerLinkPreviewHandoffForm>(key: K, value: CustomerLinkPreviewHandoffForm[K]) {
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

    const sourcePath = typeof window === 'undefined' ? '/tools/customer-link-preview' : window.location.pathname;
    const message = [
      'One Customer Link Preview follow-up request',
      '',
      reportText.length > CUSTOMER_LINK_PREVIEW_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, CUSTOMER_LINK_PREVIEW_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
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
    trackWebsiteMarketingEvent('customer_link_preview_handoff_submitted', eventContext);

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
        'customer_link_preview_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('customer_link_preview_contact_response_invalid', result, 'general', {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error('customer_link_preview_contact_failed');
      }

      setHandoff(INITIAL_HANDOFF_FORM);
      setHandoffStatus('submitted');
      trackWebsiteMarketingEvent('customer_link_preview_handoff_accepted', eventContext);
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

      <div className="ws-public-truth-check-preview" aria-label={t('preview.ariaLabel')}>
        <div>
          <p>{t('preview.label')}</p>
          <h3>{report.previewFacts.headline}</h3>
          <span>{report.previewFacts.subline}</span>
        </div>
        <div>
          <strong>{t('preview.visibleFacts', { count: report.previewFacts.visibleFactCount })}</strong>
          <small>{report.previewFacts.customerLinkLabel}</small>
        </div>
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
          onClick={() => trackWebsiteMarketingEvent('customer_link_preview_create_link_clicked', eventContext)}
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
        <div>
          <strong>{t('handoff.title')}</strong>
          <p>{t('handoff.body')}</p>
        </div>
        <div className="ws-public-truth-check-handoff__grid">
          <label>
            <span>{t('handoff.name')}</span>
            <input
              type="text"
              value={handoff.name}
              onChange={(event) => updateHandoff('name', event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('handoff.email')}</span>
            <input
              type="email"
              value={handoff.workEmail}
              onChange={(event) => updateHandoff('workEmail', event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            <span>{t('handoff.phone')}</span>
            <input
              type="tel"
              value={handoff.phoneNumber}
              onChange={(event) => updateHandoff('phoneNumber', event.target.value)}
              autoComplete="tel"
            />
          </label>
          <label>
            <span>{t('handoff.website')}</span>
            <input
              type="text"
              value={handoff.website}
              onChange={(event) => updateHandoff('website', event.target.value)}
              autoComplete="url"
            />
          </label>
        </div>
        <label className="ws-public-truth-check-checkbox">
          <input
            type="checkbox"
            checked={handoff.agreeToTerms}
            onChange={(event) => updateHandoff('agreeToTerms', event.target.checked)}
          />
          <span>{t('handoff.consent')}</span>
        </label>
        <TurnstileWidget
          action="public_contact"
          className="ws-public-truth-check-turnstile"
          onStatusChange={setCaptchaStatus}
          onTokenChange={setCaptchaToken}
          resetSignal={captchaResetSignal}
        />
        {handoffError ? <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error">{handoffError}</p> : null}
        {handoffStatus === 'submitted' ? <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--ok">{t('handoff.submitted')}</p> : null}
        <button type="submit" disabled={handoffStatus === 'submitting'}>
          {handoffStatus === 'submitting' ? <LuLoader size={16} aria-hidden="true" /> : <LuSend size={16} aria-hidden="true" />}
          {handoffStatus === 'submitting' ? t('handoff.submitting') : t('handoff.submit')}
        </button>
      </form>
    </div>
  );
}

export default function CustomerLinkPreviewPage() {
  const t = useTranslations('Website.CustomerLinkPreviewPage');
  const [form, setForm] = useState<CustomerLinkPreviewInput>(INITIAL_FORM);
  const [report, setReport] = useState<CustomerLinkPreviewReport | null>(null);

  function updateForm<K extends keyof CustomerLinkPreviewInput>(key: K, value: CustomerLinkPreviewInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextReport = buildCustomerLinkPreviewReport(form);
    setReport(nextReport);
    trackWebsiteMarketingEvent('customer_link_preview_completed', {
      customer_link_preview_status: nextReport.status,
      missing_count: nextReport.summary.missing,
      unclear_count: nextReport.summary.unclear,
      not_checked_count: nextReport.summary.notChecked,
      visible_fact_count: nextReport.previewFacts.visibleFactCount,
      mode: 'self_report',
    });
  }

  return (
    <main className="ws-public-truth-check-page">
      <section className="ws-page-hero ws-page-hero--split">
        <div className="ws-container ws-page-hero__inner">
          <AnimateOnScroll className="ws-page-hero__content">
            <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
            <WebsiteHeadline as="h1" className="ws-page-hero__title">
              {t('heroTitle')}
            </WebsiteHeadline>
            <p className="ws-page-hero__subtitle">{t('heroSubtitle')}</p>
            <div className="ws-page-hero__actions">
              <WebsiteButton href="#customer-link-preview-form">
                {t('heroPrimary')}
              </WebsiteButton>
              <WebsiteLink href="/create-menu">
                {t('heroSecondary')}
              </WebsiteLink>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll className="ws-public-truth-check-hero-card" delay={0.08}>
            <div className="ws-public-truth-check-hero-card__icon">
              <LuEye size={28} aria-hidden="true" />
            </div>
            <h2>{t('heroCardTitle')}</h2>
            <p>{t('heroCardBody')}</p>
            <div className="ws-public-truth-check-boundaries">
              <span><LuCheck size={15} aria-hidden="true" />{t('trust0')}</span>
              <span><LuCheck size={15} aria-hidden="true" />{t('trust1')}</span>
              <span><LuCheck size={15} aria-hidden="true" />{t('trust2')}</span>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-container ws-public-truth-check-layout">
          <AnimateOnScroll>
            <form id="customer-link-preview-form" className="ws-public-truth-check-form" onSubmit={handleSubmit}>
              <div className="ws-public-truth-check-form__top">
                <p className="ws-page-hero__eyebrow">{t('formEyebrow')}</p>
                <h2>{t('formTitle')}</h2>
                <p>{t('formSubtitle')}</p>
              </div>

              <div className="ws-public-truth-check-form__grid">
                <label>
                  <span>{t('fields.businessName')}</span>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(event) => updateForm('businessName', event.target.value)}
                    placeholder={t('fields.businessNamePlaceholder')}
                  />
                </label>
                <label>
                  <span>{t('fields.cityOrArea')}</span>
                  <input
                    type="text"
                    value={form.cityOrArea}
                    onChange={(event) => updateForm('cityOrArea', event.target.value)}
                    placeholder={t('fields.cityOrAreaPlaceholder')}
                  />
                </label>
                <label>
                  <span>{t('fields.businessKind')}</span>
                  <select
                    value={form.businessKind}
                    onChange={(event) => updateForm('businessKind', event.target.value as CustomerLinkPreviewBusinessKind)}
                  >
                    {BUSINESS_KIND_OPTIONS.map((option) => (
                      <option key={option} value={option}>{t(`businessKinds.${option}`)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t('fields.currentCustomerLink')}</span>
                  <input
                    type="text"
                    value={form.currentCustomerLink}
                    onChange={(event) => updateForm('currentCustomerLink', event.target.value)}
                    placeholder={t('fields.currentCustomerLinkPlaceholder')}
                  />
                </label>
              </div>

              <fieldset className="ws-public-truth-check-fieldset">
                <legend>{t('factsLegend')}</legend>
                <div className="ws-public-truth-check-checkbox-grid">
                  {CHECKLIST_FIELDS.map(({ key, icon: Icon }) => (
                    <label key={key} className="ws-public-truth-check-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(event) => updateForm(key, event.target.checked)}
                      />
                      <span>
                        <Icon size={16} aria-hidden="true" />
                        {t(`facts.${key}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="ws-public-truth-check-submit">
                <LuEye size={18} aria-hidden="true" />
                {t('submit')}
              </button>
            </form>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.08}>
            {report ? (
              <CustomerLinkPreviewReportCard report={report} />
            ) : (
              <div className="ws-public-truth-check-empty">
                <LuShieldCheck size={28} aria-hidden="true" />
                <h2>{t('empty.title')}</h2>
                <p>{t('empty.body')}</p>
                <div className="ws-public-truth-check-boundaries">
                  <span><LuCheck size={15} aria-hidden="true" />{t('empty.boundary0')}</span>
                  <span><LuCheck size={15} aria-hidden="true" />{t('empty.boundary1')}</span>
                  <span><LuCheck size={15} aria-hidden="true" />{t('empty.boundary2')}</span>
                </div>
              </div>
            )}
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
