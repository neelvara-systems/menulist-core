'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { LuCheck, LuCheckCircle, LuLoader, LuSend } from 'react-icons/lu';
import * as z from 'zod';
import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import {
  isAcceptedMenulistPublicContactResponse,
  logInvalidMenulistPublicContactResponse,
  readMenulistPublicContactResponseJson,
  type MenulistPublicContactTopic,
} from '@lib/publicContact/contactClientResponse';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteLink from '../shared/WebsiteLink';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';

type FormValues = {
  name: string;
  workEmail: string;
  phoneNumber?: string;
  helpTopic?: 'general' | 'demo' | 'multi-location' | 'pricing' | 'other';
  message: string;
  agreeToTerms: boolean;
  website?: string;
};

const WHY_COUNT = 3;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '0.9375rem',
  border: '1px solid var(--ws-border-default)',
  borderRadius: 'var(--ws-radius-md)',
  backgroundColor: 'var(--ws-bg-primary)',
  color: 'var(--ws-text-primary)',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--ws-text-primary)',
  marginBottom: 'var(--ws-space-2)',
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--ws-error, #e53e3e)',
  marginTop: '4px',
};

export default function ContactPage() {
  const t = useTranslations('Website');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<TurnstileStatus>(isTurnstileClientEnabled() ? 'loading' : 'disabled');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);
  const submissionInFlightRef = useRef(false);
  const captchaRequired = isTurnstileClientEnabled();
  const whyPoints = Array.from({ length: WHY_COUNT }, (_, i) => t(`Contact.why${i}`));
  const proofItems = Array.from({ length: 3 }, (_, i) => t(`Contact.proof${i}`));
  const submitFailedMessage = t('Contact.submitFailed');
  const securityCheckMessage = t('Contact.securityCheckRequired');
  const contactSchema = z.object({
    name: z.string().trim().min(2, t('Contact.formNameError')).max(120),
    workEmail: z.string().trim().email(t('Contact.formEmailError')).max(180),
    phoneNumber: z.string().max(40).optional(),
    helpTopic: z.enum(['general', 'demo', 'multi-location', 'pricing', 'other']).optional(),
    message: z.string().trim().min(10, t('Contact.formMessageError')).max(2000),
    agreeToTerms: z.boolean().refine(v => v === true, { message: t('Contact.formAgreeError') }),
    website: z.string().max(200).optional(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(contactSchema) as Resolver<FormValues>,
    defaultValues: { agreeToTerms: false, website: '' },
  });

  const resetCaptcha = useCallback(() => {
    if (!captchaRequired) return;
    setCaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  }, [captchaRequired]);

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const onSubmit = async (values: FormValues) => {
    if (submissionInFlightRef.current) return;
    setSubmitError(null);
    const sourcePath = typeof window === 'undefined' ? '/contact' : window.location.pathname;
    const expectedHelpTopic = (values.helpTopic || 'general') as MenulistPublicContactTopic;
    const responseLogContext = {
      captchaRequired,
      captchaStatus,
      hasCaptchaToken: Boolean(captchaToken),
      hasPhoneNumber: Boolean(values.phoneNumber),
      messageLength: values.message.length,
      helpTopic: expectedHelpTopic,
      sourcePathLength: sourcePath.length,
    };

    if (captchaRequired && !captchaToken) {
      setSubmitError(securityCheckMessage);
      return;
    }

    submissionInFlightRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          sourcePath,
          captchaToken: captchaToken || undefined,
        }),
      });
      const result = await readMenulistPublicContactResponseJson(
        response,
        'website_contact_response_parse_failed',
        responseLogContext,
      );
      resetCaptcha();

      if (!response.ok || !isAcceptedMenulistPublicContactResponse(result, expectedHelpTopic)) {
        if (response.ok) {
          logInvalidMenulistPublicContactResponse('website_contact_response_invalid', result, expectedHelpTopic, {
            ...responseLogContext,
            responseStatus: response.status,
          });
        }
        throw new Error(submitFailedMessage);
      }

      reset();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(submitFailedMessage);
      logRuntimeFailure('website_contact_submit_failed', error, responseLogContext);
      resetCaptcha();
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main>
      <WebsitePageHero
        eyebrow={t('Contact.heroEyebrow')}
        parts={[
          { text: t('Contact.heroTitle') },
          { text: t('Contact.heroHighlight'), highlight: true },
        ]}
        subtitle={t('Contact.heroSubtitle')}
      >
        <WebsiteProofStrip items={proofItems} />
      </WebsitePageHero>

      {/* Two-column layout */}
      <SectionWrapper variant="subtle">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-12)', maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>

          {/* Left: Why */}
          <AnimateOnScroll>
            <div style={{ paddingTop: 'var(--ws-space-2)' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--ws-text-primary)', lineHeight: 1.3 }}>
                {t('Contact.leftTitle')}
              </h2>
              <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
                {t('Contact.leftSubtitle')}
              </p>

                <div style={{ marginTop: 'var(--ws-space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                    {whyPoints.map((pt) => (
                  <div key={pt} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <LuCheck size={12} color="var(--ws-brand-secondary)" strokeWidth={3} />
                    </div>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', lineHeight: 1.6 }}>{pt}</p>
                  </div>
                ))}
              </div>

              {/* Founder quote */}
              <div style={{ marginTop: 'var(--ws-space-10)', padding: 'var(--ws-space-5) var(--ws-space-6)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', borderLeft: '3px solid var(--ws-brand-secondary)' }}>
                <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>
                  &ldquo;{t('Contact.quote')}&rdquo;
                </p>
                <p style={{ marginTop: 'var(--ws-space-3)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                  {t('Contact.quoteAuthor')}
                </p>
              </div>

              {/* Direct email */}
              <div style={{ marginTop: 'var(--ws-space-8)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--ws-text-muted)' }}>
                  {t('Contact.preferEmail')}{' '}
                  <a href="mailto:hello@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', fontWeight: 500, textDecoration: 'none' }}>
                    hello@menulist.ai
                  </a>
                </p>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right: Form */}
          <AnimateOnScroll delay={0.15}>
            <div style={{ backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-xl)', border: '1px solid var(--ws-border-default)', padding: 'var(--ws-space-8)' }}>
              {submitted ? (
                <div
                  ref={successRef}
                  role="status"
                  aria-live="polite"
                  tabIndex={-1}
                  style={{ textAlign: 'center', padding: 'var(--ws-space-12) var(--ws-space-6)', outline: 'none' }}
                >
                  <LuCheckCircle size={48} color="var(--ws-success, #38a169)" style={{ margin: '0 auto var(--ws-space-4)' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-text-primary)' }}>{t('Contact.successTitle')}</h3>
                  <p className="ws-caption" style={{ marginTop: 'var(--ws-space-3)' }}>
                    {t('Contact.successBody')}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    style={{ marginTop: 'var(--ws-space-6)', padding: '10px 24px', border: '1px solid var(--ws-border-default)', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'transparent', color: 'var(--ws-text-primary)', fontSize: '0.9375rem', cursor: 'pointer' }}
                  >
                    {t('Contact.successAnother')}
                  </button>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
                  {/* Name */}
                  <div>
                    <label htmlFor="contact-name" style={labelStyle}>{t('Contact.formName')}</label>
                    <input
                      id="contact-name"
                      maxLength={120}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                      {...register('name')}
                      placeholder={t('Contact.formNamePlaceholder')}
                      style={inputStyle}
                    />
                    {errors.name && <p id="contact-name-error" role="alert" style={errorStyle}>{errors.name.message}</p>}
                  </div>

                  {/* Email + Phone row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
                    <div>
                      <label htmlFor="contact-email" style={labelStyle}>{t('Contact.formEmail')}</label>
                      <input
                        id="contact-email"
                        maxLength={180}
                        type="email"
                        autoComplete="email"
                        aria-invalid={Boolean(errors.workEmail)}
                        aria-describedby={errors.workEmail ? 'contact-email-error' : undefined}
                        {...register('workEmail')}
                        placeholder={t('Contact.formEmailPlaceholder')}
                        style={inputStyle}
                      />
                      {errors.workEmail && <p id="contact-email-error" role="alert" style={errorStyle}>{errors.workEmail.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="contact-phone" style={labelStyle}>{t('Contact.formPhone')}</label>
                      <input
                        id="contact-phone"
                        maxLength={40}
                        type="tel"
                        autoComplete="tel"
                        {...register('phoneNumber')}
                        placeholder={t('Contact.formPhonePlaceholder')}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label htmlFor="contact-topic" style={labelStyle}>{t('Contact.formTopic')}</label>
                    <select id="contact-topic" {...register('helpTopic')} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                      <option value="">{t('Contact.formTopicDefault')}</option>
                      <option value="general">{t('Contact.formTopicGeneral')}</option>
                      <option value="demo">{t('Contact.formTopicDemo')}</option>
                      <option value="multi-location">{t('Contact.formTopicMultiLocation')}</option>
                      <option value="pricing">{t('Contact.formTopicPricing')}</option>
                      <option value="other">{t('Contact.formTopicOther')}</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="contact-message" style={labelStyle}>{t('Contact.formMessage')}</label>
                    <textarea
                      id="contact-message"
                      maxLength={2000}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? 'contact-message-error' : undefined}
                      {...register('message')}
                      placeholder={t('Contact.formMessagePlaceholder')}
                      rows={5}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    {errors.message && <p id="contact-message-error" role="alert" style={errorStyle}>{errors.message.message}</p>}
                  </div>

                  <div style={{ display: 'none' }} aria-hidden>
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      maxLength={200}
                      tabIndex={-1}
                      autoComplete="off"
                      {...register('website')}
                    />
                  </div>

                  {/* Terms checkbox */}
                  <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      aria-invalid={Boolean(errors.agreeToTerms)}
                      aria-describedby={errors.agreeToTerms ? 'contact-terms-error' : undefined}
                      {...register('agreeToTerms')}
                      style={{ flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-muted)', lineHeight: 1.5 }}>
                      <label htmlFor="agreeToTerms" style={{ cursor: 'pointer' }}>
                        {t('Contact.formAgree')}
                      </label>
                      <WebsiteLink
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none' }}
                      >
                        {t('Contact.formPrivacyPolicy')}
                      </WebsiteLink>
                      {t('Contact.formAnd')}
                      <WebsiteLink
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none' }}
                      >
                        {t('Contact.formTerms')}
                      </WebsiteLink>{t('Contact.formAgreeEnd')}
                    </span>
                  </div>
                  {errors.agreeToTerms && <p id="contact-terms-error" role="alert" style={{ ...errorStyle, marginTop: '-12px' }}>{errors.agreeToTerms.message}</p>}

                  <TurnstileWidget
                    action="menulist_contact"
                    onStatusChange={setCaptchaStatus}
                    onTokenChange={setCaptchaToken}
                    resetSignal={captchaResetSignal}
                    theme="light"
                  />

                  {captchaRequired && captchaStatus === 'error' ? (
                    <p style={errorStyle} role="alert">
                      {t('Contact.securityCheckLoadFailed')}
                    </p>
                  ) : null}

                  {submitError ? (
                    <p style={errorStyle} role="alert">
                      {submitError}
                    </p>
                  ) : null}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || (captchaRequired && !captchaToken)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 24px', backgroundColor: 'var(--ws-brand-primary)', color: '#fff', border: 'none', borderRadius: 'var(--ws-radius-md)', fontSize: '0.9375rem', fontWeight: 600, cursor: submitting || (captchaRequired && !captchaToken) ? 'not-allowed' : 'pointer', opacity: submitting || (captchaRequired && !captchaToken) ? 0.7 : 1, transition: 'opacity 0.2s' }}
                  >
                    {submitting ? <LuLoader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LuSend size={16} />}
                    {submitting ? t('Contact.formSubmitting') : t('Contact.formSubmit')}
                  </button>
                </form>
              )}
            </div>
          </AnimateOnScroll>
        </div>
      </SectionWrapper>
    </main>
  );
}
