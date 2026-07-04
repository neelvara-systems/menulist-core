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
  LuExternalLink,
  LuFacebook,
  LuGlobe,
  LuInstagram,
  LuLink,
  LuLoader,
  LuMapPin,
  LuMessageCircle,
  LuQrCode,
  LuSend,
  LuShieldCheck,
  LuSmartphone,
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
  buildShareableToolReportSetupJobs,
  createShareableToolReportUrl,
  type ShareableToolReportPayload,
} from '@/lib/public-truth-tools/shareableToolReport';
import { buildSocialBioLinkCheckReport } from '@/lib/public-truth-tools/socialBioLinkCheckReport';
import type {
  SocialBioLinkCheckId,
  SocialBioLinkCheckInput,
  SocialBioLinkCheckItem,
  SocialBioLinkCheckReport,
  SocialBioLinkCheckResult,
} from '@/lib/public-truth-tools/socialBioLinkCheckTypes';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteLink from '../shared/WebsiteLink';

const SOCIAL_BIO_LINK_CHECK_CONTACT_MESSAGE_MAX_LENGTH = 1900;

type PlacementField =
  | 'instagramBioUsesCustomerLink'
  | 'facebookPageUsesCustomerLink'
  | 'whatsappProfileUsesCustomerLink'
  | 'googleProfileUsesCustomerLink'
  | 'websiteUsesCustomerLink'
  | 'qrOrPrintUsesCustomerLink';

const PLACEMENT_FIELDS: Array<{
  key: PlacementField;
  icon: IconType;
}> = [
  { key: 'instagramBioUsesCustomerLink', icon: LuInstagram },
  { key: 'facebookPageUsesCustomerLink', icon: LuFacebook },
  { key: 'whatsappProfileUsesCustomerLink', icon: LuMessageCircle },
  { key: 'googleProfileUsesCustomerLink', icon: LuMapPin },
  { key: 'websiteUsesCustomerLink', icon: LuGlobe },
  { key: 'qrOrPrintUsesCustomerLink', icon: LuQrCode },
];

const CHECK_ICONS: Record<SocialBioLinkCheckId, IconType> = {
  customer_link_present: LuLink,
  instagram_bio_link: LuInstagram,
  facebook_page_link: LuFacebook,
  whatsapp_profile_link: LuMessageCircle,
  google_profile_link: LuMapPin,
  website_link: LuGlobe,
  qr_print_link: LuQrCode,
  old_link_cleanup: LuShieldCheck,
  customer_action: LuArrowRight,
  external_social_inspection: LuExternalLink,
};

const RESULT_ICONS: Record<SocialBioLinkCheckResult, IconType> = {
  present: LuCheck,
  missing: LuAlertTriangle,
  unclear: LuCircleDashed,
  not_checked: LuCircleDashed,
};

const INITIAL_FORM: SocialBioLinkCheckInput = {
  mode: 'self_report',
  businessName: '',
  cityOrArea: '',
  currentCustomerLink: '',
  instagramBioUsesCustomerLink: false,
  facebookPageUsesCustomerLink: false,
  whatsappProfileUsesCustomerLink: false,
  googleProfileUsesCustomerLink: false,
  websiteUsesCustomerLink: false,
  qrOrPrintUsesCustomerLink: false,
  oldLinksRemoved: false,
  actionClear: false,
};

const INITIAL_HANDOFF_FORM = {
  agreeToTerms: false,
  name: '',
  phoneNumber: '',
  website: '',
  workEmail: '',
};

type SocialBioLinkCheckHandoffForm = typeof INITIAL_HANDOFF_FORM;
type ReportActionStatus = 'idle' | 'copied' | 'downloaded' | 'share_copied' | 'copy_failed' | 'download_failed' | 'share_copy_failed';
type HandoffStatus = 'idle' | 'submitting' | 'submitted' | 'error';

function getResultTone(result: SocialBioLinkCheckResult) {
  if (result === 'present') return 'good';
  if (result === 'missing') return 'bad';
  if (result === 'unclear') return 'warn';
  return 'quiet';
}

function buildReportEventContext(report: SocialBioLinkCheckReport) {
  return {
    social_bio_link_check_status: report.status,
    missing_count: report.summary.missing,
    not_checked_count: report.summary.notChecked,
    unclear_count: report.summary.unclear,
    placement_count: report.placementFacts.placementCount,
  };
}

function getSafeReportFilename(report: SocialBioLinkCheckReport): string {
  const baseName = report.businessName || 'social-bio-link-check';
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'social-bio-link-check';
  return `${safeName}-social-bio-link-check.txt`;
}

function downloadTextFile(filename: string, value: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('social_bio_link_check_download_unavailable');
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

function SocialBioLinkCheckReportCard({ report }: { report: SocialBioLinkCheckReport }) {
  const t = useTranslations('Website.SocialBioLinkCheckPage');
  const StatusIcon = report.status === 'ready' ? LuBadgeCheck : report.status === 'missing_basics' ? LuAlertTriangle : LuShieldCheck;
  const [reportActionStatus, setReportActionStatus] = useState<ReportActionStatus>('idle');
  const [handoff, setHandoff] = useState<SocialBioLinkCheckHandoffForm>(INITIAL_HANDOFF_FORM);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('idle');
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const captchaRequired = isTurnstileClientEnabled();
  const eventContext = useMemo(() => buildReportEventContext(report), [report]);
  const shareableReportPayload = useMemo<ShareableToolReportPayload>(() => {
    const issueCount = report.summary.missing + report.summary.unclear;
    const checks = report.checks.map((check) => ({
      id: check.id,
      label: t(`checks.${check.id}.label`),
      result: check.result,
      helperText: t(`checks.${check.id}.helper`),
      evidenceText: check.evidenceText,
    }));
    const nextAction = {
      title: t(`nextActions.${report.nextAction.type}.title`),
      description: t(`nextActions.${report.nextAction.type}.description`),
      cta: t(`nextActions.${report.nextAction.type}.cta`),
      href: report.nextAction.href,
    };

    return {
      schemaVersion: 1,
      toolId: 'social-bio-link-check',
      toolName: t('heroTitle'),
      reportTitle: t('export.title'),
      generatedAt: report.generatedAt,
      status: report.status,
      statusTitle: t(`statuses.${report.status}.title`),
      statusDescription: t(`statuses.${report.status}.description`),
      businessName: report.businessName || undefined,
      businessContext: report.cityOrArea || undefined,
      checkedSourceText: t('shareReport.checkedSourceText'),
      notCheckedText: t('shareReport.notCheckedText'),
      summary: {
        present: report.summary.present,
        missing: report.summary.missing,
        unclear: report.summary.unclear,
        notChecked: report.summary.notChecked,
        primaryNumber: issueCount,
        primaryLabel: t('shareReport.primaryLabel'),
      },
      checks,
      setupJobList: buildShareableToolReportSetupJobs(checks, nextAction),
      nextAction,
      publicBoundary: [
        t('shareReport.boundary0'),
        t('shareReport.boundary1'),
        t('shareReport.boundary2'),
        t('shareReport.boundary3'),
      ],
    };
  }, [report, t]);
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
      `${t('export.status')}: ${t(`statuses.${report.status}.title`)}`,
      `${t('export.generatedAt')}: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      `${t('export.summary')}: ${t('summary.present', { count: report.summary.present })}; ${t('summary.missing', { count: report.summary.missing })}; ${t('summary.unclear', { count: report.summary.unclear })}; ${t('summary.notChecked', { count: report.summary.notChecked })}`,
      '',
      t('export.placements'),
      `${t('export.placementCount')}: ${report.placementFacts.placementCount}`,
      `${t('export.customerLink')}: ${report.placementFacts.customerLinkLabel}`,
      `${t('export.highestPriorityPlacement')}: ${t(`placements.${report.placementFacts.highestPriorityPlacement}`)}`,
      '',
      t('export.checks'),
      ...report.checks.map((check: SocialBioLinkCheckItem) => (
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
    trackWebsiteMarketingEvent('social_bio_link_check_report_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(reportText);
      setReportActionStatus('copied');
      trackWebsiteMarketingEvent('social_bio_link_check_report_copied', eventContext);
    } catch (error) {
      setReportActionStatus('copy_failed');
      logRuntimeFailure('social_bio_link_check_report_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  async function handleCopyShareLink() {
    trackWebsiteMarketingEvent('social_bio_link_check_share_link_copy_clicked', eventContext);

    try {
      await copyRuntimeTextToClipboard(shareableReportUrl);
      setReportActionStatus('share_copied');
      trackWebsiteMarketingEvent('social_bio_link_check_share_link_copied', eventContext);
    } catch (error) {
      setReportActionStatus('share_copy_failed');
      logRuntimeFailure('social_bio_link_check_share_link_copy_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function handleDownloadReport() {
    trackWebsiteMarketingEvent('social_bio_link_check_report_download_clicked', eventContext);

    try {
      downloadTextFile(getSafeReportFilename(report), reportText);
      setReportActionStatus('downloaded');
      trackWebsiteMarketingEvent('social_bio_link_check_report_downloaded', eventContext);
    } catch (error) {
      setReportActionStatus('download_failed');
      logRuntimeFailure('social_bio_link_check_report_download_failed', error, {
        ...eventContext,
        ...getBoundedRuntimeStringContext('businessName', report.businessName),
      });
    }
  }

  function updateHandoff<K extends keyof SocialBioLinkCheckHandoffForm>(key: K, value: SocialBioLinkCheckHandoffForm[K]) {
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

    const sourcePath = typeof window === 'undefined' ? '/tools/social-bio-link-check' : window.location.pathname;
    const message = [
      'Social Bio Link Consistency Check follow-up request',
      '',
      reportText.length > SOCIAL_BIO_LINK_CHECK_CONTACT_MESSAGE_MAX_LENGTH
        ? `${reportText.slice(0, SOCIAL_BIO_LINK_CHECK_CONTACT_MESSAGE_MAX_LENGTH)}\n[Report trimmed for contact message]`
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
    trackWebsiteMarketingEvent('social_bio_link_check_handoff_submitted', eventContext);

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
        'social_bio_link_check_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, 'general')) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('social_bio_link_check_contact_response_invalid', result, 'general', {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error('social_bio_link_check_contact_failed');
      }

      setHandoff(INITIAL_HANDOFF_FORM);
      setHandoffStatus('submitted');
      trackWebsiteMarketingEvent('social_bio_link_check_handoff_accepted', eventContext);
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

      <div className="ws-public-truth-check-preview" aria-label={t('placementPreview.ariaLabel')}>
        <div>
          <p>{t('placementPreview.label')}</p>
          <h3>{report.businessName || t('placementPreview.defaultBusiness')}</h3>
          <span>{report.cityOrArea || t('placementPreview.defaultArea')}</span>
        </div>
        <div>
          <strong>{t('placementPreview.placementCount', { count: report.placementFacts.placementCount })}</strong>
          <small>{report.placementFacts.customerLinkLabel}</small>
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
          onClick={() => trackWebsiteMarketingEvent('social_bio_link_check_create_link_clicked', eventContext)}
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
            {t('reportActions.shareLink')}
          </button>
          <button type="button" onClick={handleDownloadReport}>
            <LuDownload size={16} aria-hidden="true" />
            {t('reportActions.download')}
          </button>
        </div>
        {reportActionStatus !== 'idle' ? (
          <p className={`ws-public-truth-check-inline-status ws-public-truth-check-inline-status--${reportActionStatus.includes('failed') ? 'error' : 'ok'}`}>
            {t(`reportActions.statuses.${reportActionStatus}`)}
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

export default function SocialBioLinkCheckPage() {
  const t = useTranslations('Website.SocialBioLinkCheckPage');
  const [form, setForm] = useState<SocialBioLinkCheckInput>(INITIAL_FORM);
  const [report, setReport] = useState<SocialBioLinkCheckReport | null>(null);

  function updateForm<K extends keyof SocialBioLinkCheckInput>(key: K, value: SocialBioLinkCheckInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextReport = buildSocialBioLinkCheckReport(form);
    setReport(nextReport);
    trackWebsiteMarketingEvent('social_bio_link_check_completed', {
      social_bio_link_check_status: nextReport.status,
      missing_count: nextReport.summary.missing,
      unclear_count: nextReport.summary.unclear,
      not_checked_count: nextReport.summary.notChecked,
      placement_count: nextReport.placementFacts.placementCount,
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
              <WebsiteButton href="#social-bio-link-check-form">
                {t('heroPrimary')}
              </WebsiteButton>
              <WebsiteLink href="/create-menu">
                {t('heroSecondary')}
              </WebsiteLink>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll className="ws-public-truth-check-hero-card" delay={0.08}>
            <div className="ws-public-truth-check-hero-card__icon">
              <LuSmartphone size={28} aria-hidden="true" />
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
            <form id="social-bio-link-check-form" className="ws-public-truth-check-form" onSubmit={handleSubmit}>
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
                <legend>{t('placementsLegend')}</legend>
                <div className="ws-public-truth-check-checkbox-grid">
                  {PLACEMENT_FIELDS.map(({ key, icon: Icon }) => (
                    <label key={key} className="ws-public-truth-check-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(event) => updateForm(key, event.target.checked)}
                      />
                      <span>
                        <Icon size={16} aria-hidden="true" />
                        {t(`placementsForm.${key}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ws-public-truth-check-fieldset">
                <legend>{t('cleanupLegend')}</legend>
                <div className="ws-public-truth-check-checkbox-grid">
                  <label className="ws-public-truth-check-checkbox">
                    <input
                      type="checkbox"
                      checked={form.oldLinksRemoved}
                      onChange={(event) => updateForm('oldLinksRemoved', event.target.checked)}
                    />
                    <span>
                      <LuShieldCheck size={16} aria-hidden="true" />
                      {t('cleanup.oldLinksRemoved')}
                    </span>
                  </label>
                  <label className="ws-public-truth-check-checkbox">
                    <input
                      type="checkbox"
                      checked={form.actionClear}
                      onChange={(event) => updateForm('actionClear', event.target.checked)}
                    />
                    <span>
                      <LuArrowRight size={16} aria-hidden="true" />
                      {t('cleanup.actionClear')}
                    </span>
                  </label>
                </div>
              </fieldset>

              <button type="submit" className="ws-public-truth-check-submit">
                <LuSmartphone size={18} aria-hidden="true" />
                {t('submit')}
              </button>
            </form>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.08}>
            {report ? (
              <SocialBioLinkCheckReportCard report={report} />
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
