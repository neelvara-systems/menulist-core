'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  LuAlertTriangle,
  LuArrowRight,
  LuBadgeCheck,
  LuCircleDashed,
  LuCopy,
  LuDownload,
  LuFileText,
  LuLink,
  LuLoader,
  LuSend,
  LuShieldCheck,
} from 'react-icons/lu';
import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import {
  copyRuntimeTextToClipboard,
  logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import {
  isAcceptedMenulistPublicContactResponse,
  logInvalidMenulistPublicContactResponse,
  readMenulistPublicContactResponseJson,
} from '@lib/publicContact/contactClientResponse';
import { trackWebsiteMarketingEvent } from '@lib/website/plausible';
import {
  decodeShareableToolReportPayload,
  type ShareableToolReportPayload,
  type ShareableToolReportResult,
} from '@/lib/public-truth-tools/shareableToolReport';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

type ToolReportViewState = 'empty' | 'invalid' | 'loaded';
type ToolReportActionStatus = 'idle' | 'link_copied' | 'report_copied' | 'downloaded' | 'action_failed';
type ToolReportDeliveryStatus = 'idle' | 'submitting' | 'submitted' | 'error';

type ToolReportDeliveryForm = {
  name: string;
  workEmail: string;
  phoneNumber: string;
  website: string;
  agreeToTerms: boolean;
};

const INITIAL_REPORT_DELIVERY_FORM: ToolReportDeliveryForm = {
  name: '',
  workEmail: '',
  phoneNumber: '',
  website: '',
  agreeToTerms: false,
};

const TOOL_REPORT_CONTACT_MESSAGE_MAX_LENGTH = 1900;

function getResultTone(result: ShareableToolReportResult) {
  if (result === 'present') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function getResultIcon(result: ShareableToolReportResult) {
  if (result === 'present') return LuBadgeCheck;
  if (result === 'missing') return LuAlertTriangle;
  return LuCircleDashed;
}

function buildReportText(report: ShareableToolReportPayload): string {
  const lines = [
    report.reportTitle,
    '',
    `Tool: ${report.toolName}`,
    `Business: ${report.businessName || 'Not provided'}`,
    `Context: ${report.businessContext || 'Not provided'}`,
    `Status: ${report.statusTitle}`,
    `Generated at: ${report.generatedAt}`,
    '',
    `Checked: ${report.checkedSourceText}`,
    `Not checked: ${report.notCheckedText}`,
    '',
    'Checks',
    ...report.checks.map((check) => `- ${check.label}: ${check.result} - ${check.evidenceText}`),
    '',
    `Next step: ${report.nextAction.title}`,
    report.nextAction.description,
    '',
    'Boundaries',
    ...report.publicBoundary.map((boundary) => `- ${boundary}`),
  ];

  return lines.join('\n');
}

function getSafeReportFilename(report: ShareableToolReportPayload): string {
  const baseName = report.businessName || report.toolId || 'menulist-tool-report';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52) || 'menulist-tool-report';

  return `${safeName}-menulist-tool-report.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('shareable_tool_report_download_unavailable');
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

function ToolReportEmptyState({ state }: { state: Exclude<ToolReportViewState, 'loaded'> }) {
  const t = useTranslations('Website.ToolReportPage');
  const isInvalid = state === 'invalid';

  return (
    <section className="ws-section">
      <div className="ws-container ws-public-truth-check-layout">
        <AnimateOnScroll className={`ws-public-truth-check-report-card ws-public-truth-check-report-card--${isInvalid ? 'missing_basics' : 'not_checked'}`}>
          <div className="ws-public-truth-check-report-card__top">
            <span className="ws-public-truth-check-report-card__icon">
              {isInvalid ? <LuAlertTriangle size={22} aria-hidden="true" /> : <LuFileText size={22} aria-hidden="true" />}
            </span>
            <div>
              <p className="ws-page-hero__eyebrow">{t('empty.eyebrow')}</p>
              <h2>{isInvalid ? t('invalid.title') : t('empty.title')}</h2>
              <p>{isInvalid ? t('invalid.body') : t('empty.body')}</p>
            </div>
          </div>
          <div className="ws-public-truth-check-next">
            <div>
              <strong>{t('empty.nextTitle')}</strong>
              <p>{t('empty.nextBody')}</p>
            </div>
            <WebsiteButton href="/tools">
              {t('empty.cta')}
            </WebsiteButton>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

function ToolReportLoaded({ report }: { report: ShareableToolReportPayload }) {
  const t = useTranslations('Website.ToolReportPage');
  const [actionStatus, setActionStatus] = useState<ToolReportActionStatus>('idle');
  const [delivery, setDelivery] = useState<ToolReportDeliveryForm>(INITIAL_REPORT_DELIVERY_FORM);
  const [deliveryStatus, setDeliveryStatus] = useState<ToolReportDeliveryStatus>('idle');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const reportText = useMemo(() => buildReportText(report), [report]);
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuShieldCheck;
  const captchaRequired = isTurnstileClientEnabled();
  const eventContext = useMemo(() => ({
    tool_id: report.toolId,
    report_status: report.status,
    missing_count: report.summary.missing,
    unclear_count: report.summary.unclear,
    not_checked_count: report.summary.notChecked,
  }), [report]);

  function resetCaptcha() {
    if (!captchaRequired) return;
    setCaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  }

  function updateDelivery<Key extends keyof ToolReportDeliveryForm>(key: Key, value: ToolReportDeliveryForm[Key]) {
    setDelivery((current) => ({ ...current, [key]: value }));
    setDeliveryError(null);
    if (deliveryStatus !== 'idle') setDeliveryStatus('idle');
  }

  async function handleCopyLink() {
    trackWebsiteMarketingEvent('shareable_tool_report_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(window.location.href);
      setActionStatus('link_copied');
      trackWebsiteMarketingEvent('shareable_tool_report_link_copied', eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure('shareable_tool_report_link_copy_failed', error, eventContext);
    }
  }

  async function handleCopyReport() {
    trackWebsiteMarketingEvent('shareable_tool_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setActionStatus('report_copied');
      trackWebsiteMarketingEvent('shareable_tool_report_copied', eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure('shareable_tool_report_copy_failed', error, eventContext);
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('shareable_tool_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setActionStatus('downloaded');
      trackWebsiteMarketingEvent('shareable_tool_report_downloaded', eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure('shareable_tool_report_download_failed', error, eventContext);
    }
  }

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeliveryError(null);

    const name = delivery.name.trim();
    const workEmail = delivery.workEmail.trim().toLowerCase();
    const phoneNumber = delivery.phoneNumber.trim();
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail);

    if (name.length < 2) {
      setDeliveryError(t('delivery.nameRequired'));
      return;
    }

    if (!hasValidEmail) {
      setDeliveryError(t('delivery.emailRequired'));
      return;
    }

    if (!delivery.agreeToTerms) {
      setDeliveryError(t('delivery.consentRequired'));
      return;
    }

    if (captchaRequired && !captchaToken) {
      setDeliveryError(t('delivery.securityCheckRequired'));
      return;
    }

    const sourcePath = typeof window === 'undefined' ? '/tools/reports' : window.location.pathname;
    const reportLines = [
      'Shareable MenuList tool report follow-up request',
      '',
      `Tool: ${report.toolName}`,
      `Business: ${report.businessName || 'Not provided'}`,
      `Context: ${report.businessContext || 'Not provided'}`,
      `Status: ${report.statusTitle}`,
      '',
      reportText.length > TOOL_REPORT_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, TOOL_REPORT_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
        : reportText,
    ];
    const message = reportLines.join('\n').slice(0, 2000);
    const sourceContext = {
      sourceKind: 'shareable_tool_report',
      toolId: report.toolId,
      reportStatus: report.status,
      businessName: report.businessName || null,
      businessContext: report.businessContext || null,
      reportGeneratedAt: report.generatedAt,
      missingCount: report.summary.missing,
      unclearCount: report.summary.unclear,
      notCheckedCount: report.summary.notChecked,
      primaryNumber: report.summary.primaryNumber,
    };
    const responseLogContext = {
      ...eventContext,
      captchaRequired,
      captchaStatus,
      hasCaptchaToken: Boolean(captchaToken),
      hasPhoneNumber: Boolean(phoneNumber),
      messageLength: message.length,
      sourcePathLength: sourcePath.length,
    };

    setDeliveryStatus('submitting');
    trackWebsiteMarketingEvent('shareable_tool_report_delivery_submitted', eventContext);

    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreeToTerms: delivery.agreeToTerms,
          captchaToken: captchaToken || undefined,
          helpTopic: 'general',
          message,
          name,
          phoneNumber: phoneNumber || undefined,
          sourceContext,
          sourcePath,
          website: delivery.website,
          workEmail,
        }),
      });
      const result = await readMenulistPublicContactResponseJson(
        response,
        'shareable_tool_report_delivery_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('shareable_tool_report_delivery_response_invalid', result, 'general', {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error('shareable_tool_report_delivery_failed');
      }

      setDelivery(INITIAL_REPORT_DELIVERY_FORM);
      setDeliveryStatus('submitted');
      trackWebsiteMarketingEvent('shareable_tool_report_delivery_accepted', eventContext);
    } catch (error) {
      setDeliveryStatus('error');
      setDeliveryError(t('delivery.submitFailed'));
      logRuntimeFailure('shareable_tool_report_delivery_failed', error, responseLogContext);
      resetCaptcha();
    }
  }

  return (
    <section className="ws-section">
      <div className="ws-container ws-public-truth-check-layout">
        <AnimateOnScroll className={`ws-public-truth-check-report-card ws-public-truth-check-report-card--${report.status}`} aria-live="polite">
          <div className="ws-public-truth-check-report-card__top">
            <span className="ws-public-truth-check-report-card__icon">
              <StatusIcon size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="ws-page-hero__eyebrow">{report.toolName}</p>
              <h2>{report.statusTitle}</h2>
              <p>{report.statusDescription}</p>
            </div>
          </div>

          <div className="ws-public-truth-check-summary" aria-label={t('summaryLabel')}>
            <span>{t('summary.primary', { count: report.summary.primaryNumber, label: report.summary.primaryLabel })}</span>
            <span>{t('summary.present', { count: report.summary.present })}</span>
            <span>{t('summary.missing', { count: report.summary.missing })}</span>
            <span>{t('summary.unclear', { count: report.summary.unclear })}</span>
            <span>{t('summary.notChecked', { count: report.summary.notChecked })}</span>
          </div>

          <div className="ws-public-truth-check-preview" aria-label={t('sourcePreview.ariaLabel')}>
            <div>
              <p>{t('sourcePreview.label')}</p>
              <h3>{report.businessName || t('sourcePreview.defaultBusiness')}</h3>
              <span>{report.businessContext || t('sourcePreview.defaultContext')}</span>
            </div>
            <div>
              <strong>{t('sourcePreview.generated')}</strong>
              <small>{new Date(report.generatedAt).toLocaleString()}</small>
            </div>
          </div>

          <div className="ws-public-truth-check-boundaries">
            <span><LuBadgeCheck size={15} aria-hidden="true" />{report.checkedSourceText}</span>
            <span><LuShieldCheck size={15} aria-hidden="true" />{report.notCheckedText}</span>
          </div>

          <div className="ws-public-truth-check-rows">
            {report.checks.map((check, index) => {
              const tone = getResultTone(check.result);
              const ResultIcon = getResultIcon(check.result);

              return (
                <AnimateStaggerChild key={`${check.id}-${index}`} index={index} preset="card">
                  <article className={`ws-public-truth-check-row ws-public-truth-check-row--${tone}`}>
                    <span className="ws-public-truth-check-row__icon">
                      <ResultIcon size={18} aria-hidden="true" />
                    </span>
                    <div className="ws-public-truth-check-row__body">
                      <div>
                        <h3>{check.label}</h3>
                        <span className={`ws-public-truth-check-badge ws-public-truth-check-badge--${tone}`}>
                          {t(`results.${check.result}`)}
                        </span>
                      </div>
                      <p>{check.helperText}</p>
                      <small>{check.evidenceText}</small>
                    </div>
                  </article>
                </AnimateStaggerChild>
              );
            })}
          </div>

          <div className="ws-public-truth-check-next">
            <div>
              <strong>{report.nextAction.title}</strong>
              <p>{report.nextAction.description}</p>
            </div>
            <WebsiteButton
              href={report.nextAction.href}
              onClick={() => trackWebsiteMarketingEvent('shareable_tool_report_next_action_clicked', eventContext)}
            >
              {report.nextAction.cta}
            </WebsiteButton>
          </div>

          <div className="ws-public-truth-check-report-actions">
            <div>
              <strong>{t('reportActions.title')}</strong>
              <p>{t('reportActions.body')}</p>
            </div>
            <div className="ws-public-truth-check-report-actions__buttons">
              <button type="button" onClick={handleCopyLink}>
                <LuLink size={16} aria-hidden="true" />
                {t('reportActions.copyLink')}
              </button>
              <button type="button" onClick={handleCopyReport}>
                <LuCopy size={16} aria-hidden="true" />
                {t('reportActions.copyReport')}
              </button>
              <button type="button" onClick={handleDownloadReport}>
                <LuDownload size={16} aria-hidden="true" />
                {t('reportActions.download')}
              </button>
            </div>
            {actionStatus !== 'idle' ? (
              <p className={`ws-public-truth-check-inline-status ws-public-truth-check-inline-status--${actionStatus === 'action_failed' ? 'error' : 'ok'}`}>
                {t(`reportActions.statuses.${actionStatus}`)}
              </p>
            ) : null}
          </div>

          {report.publicBoundary.length > 0 ? (
            <div className="ws-public-truth-check-empty">
              <strong>{t('boundaryTitle')}</strong>
              <ul>
                {report.publicBoundary.map((boundary) => (
                  <li key={boundary}>{boundary}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <form className="ws-public-truth-check-handoff" onSubmit={handleDeliverySubmit}>
            <div className="ws-public-truth-check-handoff__intro">
              <LuSend size={18} aria-hidden="true" />
              <div>
                <h3>{t('delivery.title')}</h3>
                <p>{t('delivery.body')}</p>
              </div>
            </div>

            <div className="ws-public-truth-check-handoff__grid">
              <label>
                <span>{t('delivery.name')}</span>
                <input
                  value={delivery.name}
                  onChange={(event) => updateDelivery('name', event.target.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                <span>{t('delivery.email')}</span>
                <input
                  value={delivery.workEmail}
                  onChange={(event) => updateDelivery('workEmail', event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
            </div>

            <label>
              <span>{t('delivery.phone')}</span>
              <input
                value={delivery.phoneNumber}
                onChange={(event) => updateDelivery('phoneNumber', event.target.value)}
                autoComplete="tel"
                inputMode="tel"
              />
            </label>

            <div style={{ display: 'none' }} aria-hidden>
              <label htmlFor="shareable-tool-report-website">{t('delivery.website')}</label>
              <input
                id="shareable-tool-report-website"
                value={delivery.website}
                onChange={(event) => updateDelivery('website', event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <label className="ws-public-truth-check-handoff__consent">
              <input
                type="checkbox"
                checked={delivery.agreeToTerms}
                onChange={(event) => updateDelivery('agreeToTerms', event.target.checked)}
              />
              <span>
                {t('delivery.consentPrefix')}
                <WebsiteLink href="/privacy-policy">{t('delivery.privacy')}</WebsiteLink>
                {t('delivery.consentMiddle')}
                <WebsiteLink href="/terms-of-service">{t('delivery.terms')}</WebsiteLink>
                {t('delivery.consentSuffix')}
              </span>
            </label>

            <TurnstileWidget
              action="menulist_shareable_tool_report"
              onStatusChange={setCaptchaStatus}
              onTokenChange={setCaptchaToken}
              resetSignal={captchaResetSignal}
              theme="light"
            />

            {captchaRequired && captchaStatus === 'error' ? (
              <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error" role="alert">
                {t('delivery.securityCheckLoadFailed')}
              </p>
            ) : null}

            {deliveryError ? (
              <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error" role="alert">
                {deliveryError}
              </p>
            ) : null}

            {deliveryStatus === 'submitted' ? (
              <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--ok">
                {t('delivery.success')}
              </p>
            ) : null}

            <button
              type="submit"
              className="ws-public-truth-check-handoff__submit"
              disabled={deliveryStatus === 'submitting' || (captchaRequired && !captchaToken)}
            >
              {deliveryStatus === 'submitting' ? <LuLoader size={16} aria-hidden="true" /> : <LuSend size={16} aria-hidden="true" />}
              {deliveryStatus === 'submitting' ? t('delivery.submitting') : t('delivery.submit')}
            </button>
          </form>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

export default function ToolReportPage() {
  const t = useTranslations('Website.ToolReportPage');
  const [viewState, setViewState] = useState<ToolReportViewState>('empty');
  const [report, setReport] = useState<ShareableToolReportPayload | null>(null);

  useEffect(() => {
    function readReportHash() {
      if (!window.location.hash) {
        setReport(null);
        setViewState('empty');
        return;
      }

      const nextReport = decodeShareableToolReportPayload(window.location.hash);
      setReport(nextReport);
      setViewState(nextReport ? 'loaded' : 'invalid');

      if (nextReport) {
        trackWebsiteMarketingEvent('shareable_tool_report_loaded', {
          tool_id: nextReport.toolId,
          report_status: nextReport.status,
        });
      }
    }

    readReportHash();
    window.addEventListener('hashchange', readReportHash);
    return () => window.removeEventListener('hashchange', readReportHash);
  }, []);

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
              <WebsiteButton href="/tools">
                {t('heroPrimary')}
              </WebsiteButton>
              <WebsiteLink href="/create-menu">
                {t('heroSecondary')}
              </WebsiteLink>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll className="ws-public-truth-check-hero-card" delay={0.08}>
            <div className="ws-public-truth-check-hero-card__icon">
              <LuFileText size={28} aria-hidden="true" />
            </div>
            <h2>{t('heroCardTitle')}</h2>
            <p>{t('heroCardBody')}</p>
            <div className="ws-public-truth-check-boundaries">
              <span><LuBadgeCheck size={15} aria-hidden="true" />{t('trust0')}</span>
              <span><LuShieldCheck size={15} aria-hidden="true" />{t('trust1')}</span>
              <span><LuArrowRight size={15} aria-hidden="true" />{t('trust2')}</span>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {viewState === 'loaded' && report ? (
        <ToolReportLoaded report={report} />
      ) : viewState !== 'loaded' ? (
        <ToolReportEmptyState state={viewState} />
      ) : null}
    </main>
  );
}
