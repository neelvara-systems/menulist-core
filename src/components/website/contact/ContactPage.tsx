'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LuCheck, LuCheckCircle, LuLoader, LuSend } from 'react-icons/lu';
import * as z from 'zod';
import TurnstileWidget, { isTurnstileClientEnabled, type TurnstileStatus } from '@/components/security/TurnstileWidget';
import {
  isAcceptedMenulistPublicContactResponse,
  logInvalidMenulistPublicContactResponse,
  readMenulistPublicContactResponseJson,
  type MenulistPublicContactTopic,
} from '@lib/publicContact/contactClientResponse';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteLink from '../shared/WebsiteLink';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';

const schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  workEmail: z.string().email('Enter a valid email address'),
  phoneNumber: z.string().optional(),
  helpTopic: z.enum(['general', 'demo', 'multi-location', 'pricing', 'other']).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  agreeToTerms: z.boolean().refine(v => v === true, { message: 'Please agree to continue' }),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const WHY_COUNT = 3;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '0.9375rem',
  border: '1px solid var(--ws-border-default)',
  borderRadius: 'var(--ws-radius-md)',
  backgroundColor: 'var(--ws-bg-primary)',
  color: 'var(--ws-text-primary)',
  outline: 'none',
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
  const captchaRequired = isTurnstileClientEnabled();
  const whyPoints = Array.from({ length: WHY_COUNT }, (_, i) => t(`Contact.why${i}`));
  const proofItems = Array.from({ length: 3 }, (_, i) => t(`Contact.proof${i}`));
  const submitFailedMessage = t('Contact.submitFailed');
  const securityCheckMessage = t('Contact.securityCheckRequired');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { agreeToTerms: false, website: '' },
  });

  const resetCaptcha = useCallback(() => {
    if (!captchaRequired) return;
    setCaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  }, [captchaRequired]);

  const onSubmit = async (values: FormValues) => {
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
    } catch {
      setSubmitError(submitFailedMessage);
      resetCaptcha();
    } finally {
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
                <div style={{ textAlign: 'center', padding: 'var(--ws-space-12) var(--ws-space-6)' }}>
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
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
                  {/* Name */}
                  <div>
                    <label style={labelStyle}>{t('Contact.formName')}</label>
                    <input {...register('name')} placeholder={t('Contact.formNamePlaceholder')} style={inputStyle} />
                    {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
                  </div>

                  {/* Email + Phone row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
                    <div>
                      <label style={labelStyle}>{t('Contact.formEmail')}</label>
                      <input {...register('workEmail')} placeholder={t('Contact.formEmailPlaceholder')} style={inputStyle} />
                      {errors.workEmail && <p style={errorStyle}>{errors.workEmail.message}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>{t('Contact.formPhone')}</label>
                      <input {...register('phoneNumber')} placeholder={t('Contact.formPhonePlaceholder')} style={inputStyle} />
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label style={labelStyle}>{t('Contact.formTopic')}</label>
                    <select {...register('helpTopic')} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
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
                    <label style={labelStyle}>{t('Contact.formMessage')}</label>
                    <textarea
                      {...register('message')}
                      placeholder={t('Contact.formMessagePlaceholder')}
                      rows={5}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    {errors.message && <p style={errorStyle}>{errors.message.message}</p>}
                  </div>

                  <div style={{ display: 'none' }} aria-hidden>
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
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
                      {...register('agreeToTerms')}
                      style={{ flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="agreeToTerms" style={{ fontSize: '0.875rem', color: 'var(--ws-text-muted)', cursor: 'pointer', lineHeight: 1.5 }}>
                      {t('Contact.formAgree')}
                      <WebsiteLink href="/privacy-policy" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none' }}>{t('Contact.formPrivacyPolicy')}</WebsiteLink>
                      {t('Contact.formAnd')}
                      <WebsiteLink href="/terms-of-service" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none' }}>{t('Contact.formTerms')}</WebsiteLink>{t('Contact.formAgreeEnd')}
                    </label>
                  </div>
                  {errors.agreeToTerms && <p style={{ ...errorStyle, marginTop: '-12px' }}>{errors.agreeToTerms.message}</p>}

                  <TurnstileWidget
                    action="menulist_contact"
                    onStatusChange={setCaptchaStatus}
                    onTokenChange={setCaptchaToken}
                    resetSignal={captchaResetSignal}
                    theme="light"
                  />

                  {captchaRequired && captchaStatus === 'error' ? (
                    <p style={errorStyle} role="alert">
                      Security check did not load. Refresh the page and try again.
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
