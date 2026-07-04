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
  LuFileText,
  LuInfo,
  LuLoader,
  LuPalette,
  LuPrinter,
  LuQrCode,
  LuRefreshCw,
  LuShare2,
  LuShieldCheck,
  LuSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  copyRuntimeTextToClipboard,
  getBoundedRuntimeStringContext,
  logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { trackWebsiteMarketingEvent } from '@lib/website/plausible';
import {
  SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
  buildShareableToolReportSetupJobs,
  createShareableToolReportUrl,
  type ShareableToolReportCheck,
  type ShareableToolReportNextAction,
  type ShareableToolReportPayload,
} from '@/lib/public-truth-tools/shareableToolReport';
import {
  PRINT_SHARE_TOOL_CONFIGS,
  getPrintShareToolConfig,
  type PrintShareToolFactField,
  type PrintShareToolInputField,
  type PrintShareToolSlug,
} from '@/lib/public-asset-tools/printShareToolConfig';
import {
  buildInitialPrintShareToolInput,
  buildPrintShareToolReport,
} from '@/lib/public-asset-tools/printShareToolReport';
import {
  downloadBlob,
  printSvgAsset,
  renderPrintShareToolAsset,
  svgToPdfBlob,
  svgToPngBlob,
  type PrintShareToolRenderedAsset,
} from '@/lib/public-asset-tools/printShareToolRender';
import type {
  PrintShareToolCheckId,
  PrintShareToolInput,
  PrintShareToolReport,
  PrintShareToolResult,
} from '@/lib/public-asset-tools/printShareToolTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const FIELD_DEFINITIONS: Record<PrintShareToolInputField, {
  maxLength: number;
  multiline?: boolean;
}> = {
  body: { maxLength: 260, multiline: true },
  headline: { maxLength: 90 },
  hoursText: { maxLength: 180, multiline: true },
  secondaryText: { maxLength: 130 },
  whatsappNumber: { maxLength: 60 },
};

const FACT_ICONS: Record<PrintShareToolFactField, IconType> = {
  customerActionClear: LuSparkles,
  customerLinkCurrent: LuRefreshCw,
  ethicalFeedbackOnly: LuShieldCheck,
  readyToPrintOrShare: LuPrinter,
};

const CHECK_ICONS: Record<PrintShareToolCheckId, IconType> = {
  asset_message: LuFileText,
  business_identity: LuBadgeCheck,
  customer_action: LuSparkles,
  customer_link: LuQrCode,
  external_source_inspection: LuShieldCheck,
  print_share_context: LuPrinter,
  template_render: LuPalette,
};

const RESULT_ICONS: Record<PrintShareToolResult, IconType> = {
  missing: LuAlertTriangle,
  not_applicable: LuCircleDashed,
  not_checked: LuCircleDashed,
  present: LuCheck,
  unclear: LuInfo,
};

type ReportActionStatus =
  | 'idle'
  | 'asset_ready'
  | 'copied'
  | 'downloaded_png'
  | 'downloaded_pdf'
  | 'downloaded_report'
  | 'printed'
  | 'share_copied'
  | 'action_failed'
  | 'render_failed';

function getResultTone(result: PrintShareToolResult) {
  if (result === 'present' || result === 'not_applicable') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function getSafeReportFilename(report: PrintShareToolReport): string {
  return `${report.asset.filenameBase}-report.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

function buildEventContext(report: PrintShareToolReport) {
  return {
    missing_count: report.summary.missing,
    print_share_tool_status: report.status,
    print_share_tool_slug: report.toolSlug,
    template_id: report.asset.templateId,
    unclear_count: report.summary.unclear,
  };
}

function buildReportText(
  report: PrintShareToolReport,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const lines = [
    t('export.title', { tool: t(`tools.${report.toolSlug}.title`) }),
    '',
    `${t('export.business')}: ${report.businessName || t('export.notProvided')}`,
    `${t('export.city')}: ${report.cityOrArea || t('export.notProvided')}`,
    `${t('export.customerLink')}: ${report.customerLink || t('export.notProvided')}`,
    `${t('export.template')}: ${report.asset.templateId}`,
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
}

function buildShareablePayload(
  report: PrintShareToolReport,
  t: (key: string, values?: Record<string, string | number>) => string,
  sharedT: (key: string, values?: Record<string, string | number>) => string,
): ShareableToolReportPayload {
  const checks: ShareableToolReportCheck[] = report.checks.map((check) => ({
    evidenceText: check.evidenceText,
    helperText: t(`checks.${check.id}.helper`),
    id: check.id,
    label: t(`checks.${check.id}.label`),
    result: check.result,
  }));
  const nextAction: ShareableToolReportNextAction = {
    cta: t(`nextActions.${report.nextAction.type}.cta`),
    description: t(`nextActions.${report.nextAction.type}.description`),
    href: report.nextAction.href,
    title: t(`nextActions.${report.nextAction.type}.title`),
  };

  return {
    businessContext: report.cityOrArea || undefined,
    businessName: report.businessName || undefined,
    checkedSourceText: t('shareReport.checkedSourceText'),
    checks,
    generatedAt: report.generatedAt,
    nextAction,
    notCheckedText: t('shareReport.notCheckedText'),
    publicBoundary: [
      t('shareReport.boundary0'),
      t('shareReport.boundary1'),
      t('shareReport.boundary2'),
      t('shareReport.boundary3'),
    ],
    reportTitle: t('shareReport.reportTitle', { tool: t(`tools.${report.toolSlug}.title`) }),
    schemaVersion: SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
    setupJobList: buildShareableToolReportSetupJobs(checks, nextAction),
    status: report.status,
    statusDescription: t(`statuses.${report.status}.description`),
    statusTitle: t(`statuses.${report.status}.title`),
    summary: {
      ...report.summary,
      primaryLabel: sharedT('primaryLabel'),
      primaryNumber: report.summary.missing + report.summary.unclear + report.summary.notChecked,
    },
    toolId: report.toolSlug,
    toolName: t(`tools.${report.toolSlug}.title`),
  };
}

function PrintShareReportCard({
  renderedAsset,
  report,
}: {
  renderedAsset: PrintShareToolRenderedAsset;
  report: PrintShareToolReport;
}) {
  const t = useTranslations('Website.PrintShareToolPage');
  const sharedT = useTranslations('Website.PublicTruthToolSharedReport');
  const config = getPrintShareToolConfig(report.toolSlug);
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuInfo;
  const [actionStatus, setActionStatus] = useState<ReportActionStatus>('asset_ready');
  const eventContext = useMemo(() => buildEventContext(report), [report]);
  const reportText = useMemo(() => buildReportText(report, t), [report, t]);
  const shareableReportPayload = useMemo(
    () => buildShareablePayload(report, t, sharedT),
    [report, sharedT, t],
  );
  const shareableReportUrl = useMemo(
    () => createShareableToolReportUrl(shareableReportPayload),
    [shareableReportPayload],
  );

  async function handleCopyReport() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_report_copy_clicked`, eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setActionStatus('copied');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_report_copied`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_report_copy_failed`, error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_share_link_copy_clicked`, eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setActionStatus('share_copied');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_share_link_copied`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_share_link_copy_failed`, error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleDownloadPng() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_png_download_clicked`, eventContext);

    try {
      const blob = await svgToPngBlob(renderedAsset.svg, report.asset.width, report.asset.height);
      downloadBlob(blob, `${report.asset.filenameBase}.png`);
      setActionStatus('downloaded_png');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_png_downloaded`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_png_download_failed`, error, eventContext);
    }
  }

  async function handleDownloadPdf() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_pdf_download_clicked`, eventContext);

    try {
      const blob = await svgToPdfBlob(renderedAsset.svg, report.asset.width, report.asset.height);
      downloadBlob(blob, `${report.asset.filenameBase}.pdf`);
      setActionStatus('downloaded_pdf');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_pdf_downloaded`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_pdf_download_failed`, error, eventContext);
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_report_download_clicked`, eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setActionStatus('downloaded_report');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_report_downloaded`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_report_download_failed`, error, eventContext);
    }
  }

  function handlePrint() {
    trackWebsiteMarketingEvent(`${config.eventPrefix}_print_clicked`, eventContext);

    try {
      printSvgAsset(renderedAsset.svg, t(`tools.${report.toolSlug}.title`));
      setActionStatus('printed');
      trackWebsiteMarketingEvent(`${config.eventPrefix}_print_opened`, eventContext);
    } catch (error) {
      setActionStatus('action_failed');
      logRuntimeFailure(`${config.eventPrefix}_print_failed`, error, eventContext);
    }
  }

  return (
    <article className={`ws-public-truth-check-report-card ws-public-truth-check-report-card--${report.status}`}>
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

      <div className="ws-print-share-tool-preview" aria-label={t('assetPreview.ariaLabel')}>
        <img src={renderedAsset.dataUrl} alt={t('assetPreview.alt', { tool: t(`tools.${report.toolSlug}.title`) })} />
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
        <WebsiteButton href={report.nextAction.href}>
          {t(`nextActions.${report.nextAction.type}.cta`)}
        </WebsiteButton>
      </div>

      <div className="ws-public-truth-check-report-actions">
        <div>
          <strong>{t('reportActions.title')}</strong>
          <p>{t('reportActions.body')}</p>
        </div>
        <div className="ws-public-truth-check-report-actions__buttons">
          <button type="button" onClick={handleDownloadPng}>
            <LuDownload size={16} aria-hidden="true" />
            {t('reportActions.downloadPng')}
          </button>
          <button type="button" onClick={handleDownloadPdf}>
            <LuDownload size={16} aria-hidden="true" />
            {t('reportActions.downloadPdf')}
          </button>
          <button type="button" onClick={handlePrint}>
            <LuPrinter size={16} aria-hidden="true" />
            {t('reportActions.print')}
          </button>
          <button type="button" onClick={handleCopyShareLink}>
            <LuShare2 size={16} aria-hidden="true" />
            {sharedT('reportActions.shareLink')}
          </button>
          <button type="button" onClick={handleCopyReport}>
            <LuCopy size={16} aria-hidden="true" />
            {t('reportActions.copyReport')}
          </button>
          <button type="button" onClick={handleDownloadReport}>
            <LuFileText size={16} aria-hidden="true" />
            {t('reportActions.downloadReport')}
          </button>
        </div>
        <div className="ws-print-share-tool-report-link-box">
          <label>
            <span>{t('reportActions.shareUrlLabel')}</span>
            <input
              readOnly
              value={shareableReportUrl}
              aria-label={t('reportActions.shareUrlLabel')}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <WebsiteLink href={shareableReportUrl} className="ws-print-share-tool-report-link">
            {t('reportActions.openPublicReport')} <LuArrowRight size={15} aria-hidden="true" />
          </WebsiteLink>
        </div>
        {actionStatus !== 'idle' ? (
          <p className={`ws-public-truth-check-inline-status ${actionStatus === 'action_failed' || actionStatus === 'render_failed' ? 'ws-public-truth-check-inline-status--error' : 'ws-public-truth-check-inline-status--ok'}`}>
            {actionStatus === 'share_copied'
              ? sharedT('reportActions.statuses.share_copied')
              : t(`reportActions.statuses.${actionStatus}`)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EmptyReportCard() {
  const t = useTranslations('Website.PrintShareToolPage');

  return (
    <div className="ws-public-truth-check-empty">
      <LuQrCode size={42} aria-hidden="true" />
      <div>
        <h2>{t('empty.title')}</h2>
        <p>{t('empty.body')}</p>
      </div>
      <div className="ws-public-truth-check-boundaries" aria-label={t('empty.boundaryLabel')}>
        <span><LuShieldCheck size={15} aria-hidden="true" /> {t('empty.boundary0')}</span>
        <span><LuShieldCheck size={15} aria-hidden="true" /> {t('empty.boundary1')}</span>
        <span><LuShieldCheck size={15} aria-hidden="true" /> {t('empty.boundary2')}</span>
      </div>
    </div>
  );
}

export default function PrintShareToolPage({ toolSlug }: { toolSlug: PrintShareToolSlug }) {
  const t = useTranslations('Website.PrintShareToolPage');
  const config = getPrintShareToolConfig(toolSlug);
  const [form, setForm] = useState<PrintShareToolInput>(() => buildInitialPrintShareToolInput(toolSlug));
  const [report, setReport] = useState<PrintShareToolReport | null>(null);
  const [renderedAsset, setRenderedAsset] = useState<PrintShareToolRenderedAsset | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const toolOptions = Object.values(PRINT_SHARE_TOOL_CONFIGS);

  function updateForm<K extends keyof PrintShareToolInput>(key: K, value: PrintShareToolInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setRenderError(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRendering(true);
    setRenderError(false);

    try {
      const nextReport = buildPrintShareToolReport(toolSlug, form);
      const nextAsset = await renderPrintShareToolAsset(nextReport);
      setReport(nextReport);
      setRenderedAsset(nextAsset);
      trackWebsiteMarketingEvent(`${config.eventPrefix}_completed`, buildEventContext(nextReport));
    } catch (error) {
      setRenderError(true);
      logRuntimeFailure(`${config.eventPrefix}_render_failed`, error, {
        toolSlug,
        ...getBoundedRuntimeStringContext('businessName', form.businessName),
      });
    } finally {
      setIsRendering(false);
    }
  }

  function handleReset() {
    setForm(buildInitialPrintShareToolInput(toolSlug));
    setReport(null);
    setRenderedAsset(null);
    setRenderError(false);
  }

  return (
    <main className="ws-public-truth-check">
      <section className="ws-public-truth-check-hero">
        <div className="ws-container ws-public-truth-check-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-public-truth-check-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t(`tools.${toolSlug}.heroTitle`)}
              highlightedText={t(`tools.${toolSlug}.heroHighlight`)}
            />
            <p className="ws-public-truth-check-hero__subtitle">{t(`tools.${toolSlug}.heroSubtitle`)}</p>
            <div className="ws-public-truth-check-hero__trust" aria-label={t('trustLabel')}>
              <span><LuShieldCheck size={15} aria-hidden="true" /> {t('trust0')}</span>
              <span><LuShieldCheck size={15} aria-hidden="true" /> {t('trust1')}</span>
              <span><LuShieldCheck size={15} aria-hidden="true" /> {t('trust2')}</span>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll preset="card" delay={0.08} className="ws-public-truth-check-hero-card">
            <span className="ws-public-truth-check-hero-card__icon">
              <LuPrinter size={26} aria-hidden="true" />
            </span>
            <div>
              <h2>{t(`tools.${toolSlug}.heroCardTitle`)}</h2>
              <p>{t(`tools.${toolSlug}.heroCardBody`)}</p>
            </div>
            <div className="ws-print-share-tool-mini-grid">
              {toolOptions.map((tool) => (
                <WebsiteLink
                  key={tool.slug}
                  href={tool.route}
                  className={tool.slug === toolSlug ? 'is-active' : ''}
                >
                  {t(`tools.${tool.slug}.shortTitle`)}
                </WebsiteLink>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-container ws-public-truth-check-layout">
          <AnimateOnScroll preset="card" className="ws-public-truth-check-form">
            <div className="ws-public-truth-check-form__header">
              <LuQrCode size={24} aria-hidden="true" />
              <div>
                <h2>{t('formTitle')}</h2>
                <p>{t(`tools.${toolSlug}.formSubtitle`)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="ws-public-truth-check-form__top">
              <div className="ws-public-truth-check-form-grid">
                <label>
                  <span>{t('fields.businessName')}</span>
                  <input
                    value={form.businessName}
                    maxLength={90}
                    onChange={(event) => updateForm('businessName', event.target.value)}
                    placeholder={t('fields.businessNamePlaceholder')}
                  />
                </label>
                <label>
                  <span>{t('fields.cityOrArea')}</span>
                  <input
                    value={form.cityOrArea}
                    maxLength={90}
                    onChange={(event) => updateForm('cityOrArea', event.target.value)}
                    placeholder={t('fields.cityOrAreaPlaceholder')}
                  />
                </label>
                <label>
                  <span>{t('fields.customerLink')}</span>
                  <input
                    value={form.customerLink}
                    maxLength={280}
                    onChange={(event) => updateForm('customerLink', event.target.value)}
                    placeholder={t('fields.customerLinkPlaceholder')}
                  />
                </label>
                <label>
                  <span>{t('fields.accentColor')}</span>
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(event) => updateForm('accentColor', event.target.value)}
                    aria-label={t('fields.accentColor')}
                  />
                </label>
              </div>

              {config.fields.map((field) => {
                const definition = FIELD_DEFINITIONS[field];
                const value = String(form[field] || '');

                return (
                  <label key={field}>
                    <span>{t(`fields.${field}`)}</span>
                    {definition.multiline ? (
                      <textarea
                        value={value}
                        maxLength={definition.maxLength}
                        onChange={(event) => updateForm(field, event.target.value)}
                        placeholder={t(`fields.${field}Placeholder`)}
                      />
                    ) : (
                      <input
                        value={value}
                        maxLength={definition.maxLength}
                        onChange={(event) => updateForm(field, event.target.value)}
                        placeholder={t(`fields.${field}Placeholder`)}
                      />
                    )}
                  </label>
                );
              })}

              <fieldset className="ws-public-truth-check-facts">
                <legend>{t('factsLegend')}</legend>
                <div>
                  {config.facts.map((fact) => {
                    const FactIcon = FACT_ICONS[fact];

                    return (
                      <label key={fact}>
                        <input
                          type="checkbox"
                          checked={Boolean(form[fact])}
                          onChange={(event) => updateForm(fact, event.target.checked)}
                        />
                        <span>
                          <FactIcon size={16} aria-hidden="true" />
                          {t(`facts.${fact}`)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="ws-public-truth-check-actions">
                <button type="submit" className="ws-public-truth-check-submit" disabled={isRendering}>
                  {isRendering ? <LuLoader size={16} aria-hidden="true" /> : <LuSparkles size={16} aria-hidden="true" />}
                  {isRendering ? t('rendering') : t('generateAsset')}
                </button>
                <button type="button" className="ws-public-truth-check-reset" onClick={handleReset}>
                  {t('reset')}
                </button>
              </div>

              {renderError ? (
                <p className="ws-public-truth-check-inline-status ws-public-truth-check-inline-status--error">
                  {t('renderFailed')}
                </p>
              ) : null}
            </form>
          </AnimateOnScroll>

          <AnimateOnScroll preset="card" delay={0.08}>
            {report && renderedAsset ? (
              <PrintShareReportCard report={report} renderedAsset={renderedAsset} />
            ) : (
              <EmptyReportCard />
            )}
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section ws-section--subtle">
        <div className="ws-container ws-tools-hub-final">
          <AnimateOnScroll preset="card">
            <span>
              <LuArrowRight size={20} aria-hidden="true" />
            </span>
            <p className="ws-page-hero__eyebrow">{t('finalEyebrow')}</p>
            <WebsiteHeadline as="h2" text={t('finalTitle')} />
            <p>{t('finalBody')}</p>
            <div className="ws-tools-hub-final__actions">
              <WebsiteButton href="/create-menu">
                {t('finalPrimary')}
              </WebsiteButton>
              <WebsiteLink href="/tools" className="ws-tools-hub-final__link">
                {t('finalSecondary')} <LuArrowRight size={16} aria-hidden="true" />
              </WebsiteLink>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </main>
  );
}
