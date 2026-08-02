'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
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
import { buildCustomerFaqReplyPackReport } from '@/lib/public-truth-tools/customerFaqReplyPackReport';
import { PUBLIC_TRUTH_TOOL_INPUT_LIMITS } from '@/lib/public-truth-tools/publicTruthToolInputLimits';
import type {
  CustomerFaqReplyBlock,
  CustomerFaqReplyPackAction,
  CustomerFaqReplyPackInput,
  CustomerFaqReplyPackReport,
} from '@/lib/public-truth-tools/customerFaqReplyPackTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const ACTION_OPTIONS: CustomerFaqReplyPackAction[] = [
  'answer_question',
  'order',
  'book',
  'request_quote',
  'visit',
];

const CUSTOMER_FAQ_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH = 2400;

const INITIAL_FORM: CustomerFaqReplyPackInput = {
  actionLink: '',
  answerSource: '',
  availabilityNotes: '',
  businessName: '',
  cityOrArea: '',
  currentCustomerLink: '',
  customerQuestions: '',
  hours: '',
  locationContact: '',
  menuOrServices: '',
  mode: 'self_report',
  preferredAction: 'answer_question',
  prices: '',
};

const INITIAL_HANDOFF_FORM = {
  agreeToTerms: false,
  name: '',
  phoneNumber: '',
  website: '',
  workEmail: '',
};

type CustomerFaqReplyPackHandoffForm = typeof INITIAL_HANDOFF_FORM;
type ReportActionStatus =
  | 'idle'
  | 'copied'
  | 'copy_failed'
  | 'block_copied'
  | 'block_copy_failed'
  | 'downloaded'
  | 'download_failed'
  | 'share_copied'
  | 'share_copy_failed';

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('customer_faq_reply_pack_download_unavailable');
  }

  const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  try {
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

function getSafeReportFilename(report: CustomerFaqReplyPackReport): string {
  const baseName = report.businessName || 'customer-faq-reply-pack';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'customer-faq-reply-pack';
  return `${safeName}-customer-faq-reply-pack.txt`;
}

function buildCopyBlockText(block: CustomerFaqReplyBlock): string {
  return [
    block.title,
    '',
    block.body,
    '',
    `Evidence: ${block.evidenceText}`,
  ].join('\n');
}

function buildReportText(report: CustomerFaqReplyPackReport): string {
  return [
    'Customer FAQ Reply Pack report',
    `Business: ${report.businessName || 'Not provided'}`,
    `City or area: ${report.cityOrArea || 'Not provided'}`,
    `Status: ${report.status}`,
    `Generated at: ${report.generatedAt}`,
    '',
    'Summary',
    `Present: ${report.summary.present}`,
    `Missing: ${report.summary.missing}`,
    `Unclear: ${report.summary.unclear}`,
    `Not checked: ${report.summary.notChecked}`,
    '',
    'Checks',
    ...report.checks.map((check) => `- ${check.id}: ${check.result}. ${check.evidenceText}`),
    '',
    'FAQ answers',
    ...report.copyBlocks.flatMap((block) => [
      block.title,
      block.body,
      `Evidence: ${block.evidenceText}`,
      '',
    ]),
    'Boundary: checked entered facts only. Customer conversations were not read, no chatbot was created, no automation was configured, no message was sent, links were not fetched, reports were not stored, and AI/search providers were not called.',
  ].join('\n');
}

function CustomerFaqReplyPackReportCard({ report }: { report: CustomerFaqReplyPackReport }) {
  const t = useTranslations('Website.CustomerFaqReplyPackPage');
  const sharedReportT = useTranslations('Website.PublicTruthToolSharedReport');
  const [reportActionStatus, setReportActionStatus] = useState<ReportActionStatus>('idle');
  const [handoff, setHandoff] = useState<CustomerFaqReplyPackHandoffForm>(INITIAL_HANDOFF_FORM);
  const [handoffStatus, setHandoffStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const handoffSubmissionInFlightRef = useRef(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const captchaRequired = isTurnstileClientEnabled();
  const reportText = useMemo(() => buildReportText(report), [report]);
  const eventContext = useMemo(() => ({
    businessNamePresent: report.businessName.length > 0,
    cityOrAreaPresent: report.cityOrArea.length > 0,
    copyBlockCount: report.copyBlocks.length,
    missingCount: report.summary.missing,
    status: report.status,
  }), [report]);
  const shareableReportPayload = useMemo(() => buildShareablePublicTruthToolReportPayload({
    businessContext: report.cityOrArea,
    report,
    sharedT: sharedReportT,
    t,
    toolId: 'customer-faq-reply-pack',
  }), [report, sharedReportT, t]);
  const shareableReportUrl = useMemo(
    () => createShareableToolReportUrl(shareableReportPayload),
    [shareableReportPayload],
  );

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaResetSignal((value) => value + 1);
  }

  function updateHandoff<K extends keyof CustomerFaqReplyPackHandoffForm>(
    key: K,
    value: CustomerFaqReplyPackHandoffForm[K],
  ) {
    setHandoff((current) => ({
      ...current,
      [key]: value,
    }));
    setHandoffStatus((current) => (current === 'submitted' ? 'idle' : current));
    setHandoffError(null);
  }

  async function handleCopyBlock(block: CustomerFaqReplyBlock) {
    try {
      await copyRuntimeTextToClipboard(buildCopyBlockText(block));
      setReportActionStatus('block_copied');
      trackWebsiteMarketingEvent('customer_faq_reply_pack_block_copied', eventContext);
    } catch (error) {
      setReportActionStatus('block_copy_failed');
      logRuntimeFailure('customer_faq_reply_pack_copy_block_failed', error, eventContext);
    }
  }

  async function handleCopyReport() {
    trackWebsiteMarketingEvent('customer_faq_reply_pack_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setReportActionStatus('copied');
      trackWebsiteMarketingEvent('customer_faq_reply_pack_report_copied', eventContext);
    } catch (error) {
      setReportActionStatus('copy_failed');
      logRuntimeFailure('customer_faq_reply_pack_copy_report_failed', error, eventContext);
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent('customer_faq_reply_pack_share_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setReportActionStatus('share_copied');
      trackWebsiteMarketingEvent('customer_faq_reply_pack_share_link_copied', eventContext);
    } catch (error) {
      setReportActionStatus('share_copy_failed');
      logRuntimeFailure('customer_faq_reply_pack_share_link_copy_failed', error, eventContext);
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('customer_faq_reply_pack_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setReportActionStatus('downloaded');
      trackWebsiteMarketingEvent('customer_faq_reply_pack_report_downloaded', eventContext);
    } catch (error) {
      setReportActionStatus('download_failed');
      logRuntimeFailure('customer_faq_reply_pack_download_failed', error, eventContext);
    }
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

    const sourcePath = typeof window === 'undefined' ? '/tools/customer-faq-reply-pack' : window.location.pathname;
    const message = [
      'Customer FAQ Reply Pack follow-up request',
      '',
      reportText.length > CUSTOMER_FAQ_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, CUSTOMER_FAQ_REPLY_PACK_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
        : reportText,
    ].join('\n');
    const responseLogContext = {
      ...eventContext,
      ...getBoundedRuntimeStringContext('sourcePath', sourcePath),
      captchaRequired,
      captchaStatus,
      hasCaptchaToken: Boolean(captchaToken),
      hasPhoneNumber: Boolean(phoneNumber),
      messageLength: message.length,
    };

    if (handoffSubmissionInFlightRef.current) return;
    handoffSubmissionInFlightRef.current = true;
    setHandoffStatus('submitting');
    trackWebsiteMarketingEvent('customer_faq_reply_pack_handoff_submitted', eventContext);

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
        'customer_faq_reply_pack_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse(
            'customer_faq_reply_pack_contact_response_invalid',
            result,
            'general',
            {
              ...responseLogContext,
              responseStatus: response.status,
            },
          );
        }
        throw new Error('customer_faq_reply_pack_contact_failed');
      }

      setHandoff(INITIAL_HANDOFF_FORM);
      setHandoffStatus('submitted');
      trackWebsiteMarketingEvent('customer_faq_reply_pack_handoff_accepted', eventContext);
    } catch (error) {
      setHandoffStatus('error');
      setHandoffError(t('handoff.submitFailed'));
      logRuntimeFailure('customer_faq_reply_pack_contact_failed', error, responseLogContext);
      resetCaptcha();
    } finally {
      handoffSubmissionInFlightRef.current = false;
    }
  }

  return (
    <section className="ws-section ws-public-truth-check-results" aria-label={t('summaryLabel')}>
      <div className="ws-container">
        <div className="ws-public-truth-check-result-card">
          <p className="ws-page-hero__eyebrow">{t('reportEyebrow')}</p>
          <h2>{t(`statuses.${report.status}.title`)}</h2>
          <p>{t(`statuses.${report.status}.description`)}</p>

          <div className="ws-public-truth-check-summary" aria-label={t('summaryLabel')}>
            <span>{t('summary.present', { count: report.summary.present })}</span>
            <span>{t('summary.missing', { count: report.summary.missing })}</span>
            <span>{t('summary.unclear', { count: report.summary.unclear })}</span>
            <span>{t('summary.notChecked', { count: report.summary.notChecked })}</span>
          </div>

          <div className="ws-public-truth-check-actions">
            <button type="button" onClick={handleCopyReport}>{t('reportActions.copy')}</button>
            <button type="button" onClick={handleCopyShareLink}>{sharedReportT('reportActions.shareLink')}</button>
            <button type="button" onClick={handleDownloadReport}>{t('reportActions.download')}</button>
          </div>

          {reportActionStatus !== 'idle' ? (
            <p className={`ws-public-truth-check-inline-status ws-public-truth-check-inline-status--${reportActionStatus.includes('failed') ? 'error' : 'ok'}`}>
              {reportActionStatus === 'share_copied' || reportActionStatus === 'share_copy_failed'
                ? sharedReportT(`reportActions.statuses.${reportActionStatus}`)
                : reportActionStatus === 'block_copied'
                  ? t('copyBlockStatuses.copied')
                  : reportActionStatus === 'block_copy_failed'
                    ? t('copyBlockStatuses.copy_failed')
                    : t(`reportActions.statuses.${reportActionStatus}`)}
            </p>
          ) : null}
        </div>

        <div className="ws-public-truth-check-grid">
          {report.checks.map((check) => (
            <article key={check.id} className="ws-public-truth-check-card">
              <strong>{t(`checks.${check.id}.label`)}</strong>
              <span>{t(`results.${check.result}`)}</span>
              <p>{t(`checks.${check.id}.helper`)}</p>
              <small>{check.evidenceText}</small>
            </article>
          ))}
        </div>

        <div className="ws-public-truth-check-result-card">
          <h2>{t('copyBlocksTitle')}</h2>
          <p>{t('copyBlocksBody')}</p>
          <div className="ws-public-truth-check-grid">
            {report.copyBlocks.map((block) => (
              <article key={block.id} className="ws-public-truth-check-card">
                <h3>{t(`copyBlocks.${block.id}.title`)}</h3>
                <p>{t(`copyBlocks.${block.id}.helper`)}</p>
                <pre>{block.body}</pre>
                <small>{block.evidenceText}</small>
                <button type="button" onClick={() => handleCopyBlock(block)}>
                  {t('copyBlockAction')}
                </button>
              </article>
            ))}
          </div>
        </div>

        <form className="ws-public-truth-check-handoff" onSubmit={handleHandoffSubmit}>
          <h2>{t('handoff.title')}</h2>
          <p>{t('handoff.body')}</p>
          <label>
            {t('handoff.name')}
            <input
              maxLength={120}
              value={handoff.name}
              onChange={(event) => updateHandoff('name', event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            {t('handoff.email')}
            <input
              type="email"
              maxLength={180}
              value={handoff.workEmail}
              onChange={(event) => updateHandoff('workEmail', event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            {t('handoff.phone')}
            <input
              maxLength={40}
              value={handoff.phoneNumber}
              onChange={(event) => updateHandoff('phoneNumber', event.target.value)}
              autoComplete="tel"
            />
          </label>

          <div style={{ display: 'none' }} aria-hidden>
            <label htmlFor="customer-faq-reply-pack-website">{t('handoff.website')}</label>
            <input
              id="customer-faq-reply-pack-website"
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
            action="menulist_customer_faq_reply_pack"
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

          <button type="submit" disabled={handoffStatus === 'submitting'}>
            {handoffStatus === 'submitting' ? t('handoff.submitting') : t('handoff.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}

function EmptyReport() {
  const t = useTranslations('Website.CustomerFaqReplyPackPage');

  return (
    <section className="ws-section ws-public-truth-check-results">
      <div className="ws-container">
        <div className="ws-public-truth-check-result-card">
          <p className="ws-page-hero__eyebrow">{t('reportEyebrow')}</p>
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyBody')}</p>
        </div>
      </div>
    </section>
  );
}

export default function CustomerFaqReplyPackPage() {
  const t = useTranslations('Website.CustomerFaqReplyPackPage');
  const [form, setForm] = useState<CustomerFaqReplyPackInput>(INITIAL_FORM);
  const [hasChecked, setHasChecked] = useState(false);
  const report = useMemo(() => buildCustomerFaqReplyPackReport(form), [form]);

  function updateField<K extends keyof CustomerFaqReplyPackInput>(key: K, value: CustomerFaqReplyPackInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasChecked(true);
    trackWebsiteMarketingEvent('customer_faq_reply_pack_completed', {
      businessNamePresent: form.businessName.trim().length > 0,
      cityOrAreaPresent: form.cityOrArea.trim().length > 0,
      customerQuestionsLength: form.customerQuestions.length,
      answerSourceLength: form.answerSource.length,
      currentCustomerLinkPresent: form.currentCustomerLink.trim().length > 0,
      mode: 'self_report',
    });
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setHasChecked(false);
  }

  return (
    <main className="ws-public-truth-check ws-customer-faq-reply-pack">
      <section className="ws-page-hero ws-public-truth-check-hero">
        <div className="ws-container ws-page-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-page-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t('heroTitle')}
              highlightedText={t('heroHighlight')}
            />
            <p className="ws-page-hero__subtitle">{t('heroSubtitle')}</p>
            <div className="ws-page-hero__actions">
              <WebsiteButton href="/tools/customer-question-coverage-check">
                {t('learnMore')}
              </WebsiteButton>
              <WebsiteButton href="/create-menu" variant="ghost">
                {t('nextActions.create_customer_link.cta')}
              </WebsiteButton>
            </div>
            <div className="ws-public-truth-check-boundaries" aria-label={t('summaryLabel')}>
              {[t('trust0'), t('trust1'), t('trust2')].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-container">
          <AnimateOnScroll preset="card" className="ws-public-truth-check-form-card">
            <h2>{t('formTitle')}</h2>
            <p>{t('formSubtitle')}</p>
            <form onSubmit={handleSubmit} className="ws-public-truth-check-form">
              <div className="ws-public-truth-check-form-grid">
                <label>
                  {t('fields.businessName')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName} value={form.businessName} onChange={(event) => updateField('businessName', event.target.value)} />
                </label>
                <label>
                  {t('fields.cityOrArea')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea} value={form.cityOrArea} onChange={(event) => updateField('cityOrArea', event.target.value)} />
                </label>
                <label>
                  {t('fields.currentCustomerLink')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url} value={form.currentCustomerLink} onChange={(event) => updateField('currentCustomerLink', event.target.value)} />
                </label>
                <label>
                  {t('fields.preferredAction')}
                  <select
                    value={form.preferredAction}
                    onChange={(event) => updateField('preferredAction', event.target.value as CustomerFaqReplyPackAction)}
                  >
                    {ACTION_OPTIONS.map((action) => (
                      <option key={action} value={action}>{t(`actionOptions.${action}`)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('fields.menuOrServices')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText} value={form.menuOrServices} onChange={(event) => updateField('menuOrServices', event.target.value)} />
                </label>
                <label>
                  {t('fields.hours')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText} value={form.hours} onChange={(event) => updateField('hours', event.target.value)} />
                </label>
                <label>
                  {t('fields.prices')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText} value={form.prices} onChange={(event) => updateField('prices', event.target.value)} />
                </label>
                <label>
                  {t('fields.locationContact')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText} value={form.locationContact} onChange={(event) => updateField('locationContact', event.target.value)} />
                </label>
                <label>
                  {t('fields.actionLink')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url} value={form.actionLink} onChange={(event) => updateField('actionLink', event.target.value)} />
                </label>
                <label>
                  {t('fields.availabilityNotes')}
                  <input maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText} value={form.availabilityNotes} onChange={(event) => updateField('availabilityNotes', event.target.value)} />
                </label>
              </div>
              <label>
                {t('fields.customerQuestions')}
                <textarea maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText} value={form.customerQuestions} onChange={(event) => updateField('customerQuestions', event.target.value)} />
              </label>
              <label>
                {t('fields.answerSource')}
                <textarea maxLength={PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText} value={form.answerSource} onChange={(event) => updateField('answerSource', event.target.value)} />
              </label>
              <div className="ws-public-truth-check-actions">
                <button type="submit">{t('runCheck')}</button>
                <button type="button" onClick={handleReset}>{t('reset')}</button>
              </div>
            </form>
          </AnimateOnScroll>
        </div>
      </section>

      {hasChecked ? (
        <AnimateStaggerChild>
          <CustomerFaqReplyPackReportCard key={report.generatedAt} report={report} />
        </AnimateStaggerChild>
      ) : (
        <EmptyReport />
      )}
    </main>
  );
}
