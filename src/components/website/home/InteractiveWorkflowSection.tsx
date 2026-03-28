import { useTranslations } from 'next-intl';
import { LuArrowDown, LuArrowRight, LuCamera, LuGlobe, LuRefreshCw, LuZap } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const stepIcons = [LuCamera, LuZap, LuGlobe, LuRefreshCw];
const stepNumbers = ['01', '02', '03', '04'];

export default function InteractiveWorkflowSection() {
  const t = useTranslations('Website');
  const steps = stepIcons.map((Icon, i) => ({
    number: stepNumbers[i],
    Icon,
    title: t(`Workflow.step${i}Title`),
    desc: t(`Workflow.step${i}Desc`),
  }));
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ws-text-muted)',
            marginBottom: 'var(--ws-space-4)',
          }}
        >
          {t('Workflow.eyebrow')}
        </p>
        <SectionHeading
          title={t('Workflow.title')}
          highlightedText={t('Workflow.highlight')}
          centered
        />
      </AnimateOnScroll>

      {/* Pipeline flow diagram — visual overview of the full process */}
      <div
        className="ws-pipeline-wrap"
        style={{
          maxWidth: '920px',
          margin: 'var(--ws-space-10) auto',
          padding: 'var(--ws-space-5) var(--ws-space-6)',
          background: 'var(--ws-bg-primary)',
          border: '1px solid var(--ws-border-default)',
          borderRadius: 'var(--ws-radius-xl)',
          overflowX: 'auto',
        }}
      >
        <div className="ws-pipeline-inner">
          {/* Input badges */}
          <div className="ws-pipeline-badge-group">
            {['pipelinePhoto', 'pipelinePdf', 'pipelineText'].map((key) => (
              <span
                key={key}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: 'var(--ws-text-secondary)',
                  background: 'var(--ws-bg-subtle)',
                  border: '1px solid var(--ws-border-default)',
                  borderRadius: 'var(--ws-radius-sm)',
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(`Workflow.${key}`)}
              </span>
            ))}
          </div>

          <span className="ws-pipeline-arrow-h" style={{ display: 'flex', flexShrink: 0 }}><LuArrowRight size={14} color="var(--ws-text-muted)" /></span>
          <span className="ws-pipeline-arrow-v"><LuArrowDown size={14} color="var(--ws-text-muted)" /></span>

          {/* AI step node */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'var(--ws-bg-accent)',
              border: '1px solid var(--ws-brand-light)',
              borderRadius: 'var(--ws-radius-md)',
              flexShrink: 0,
            }}
          >
            <LuZap size={13} color="var(--ws-brand-secondary)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ws-text-primary)', whiteSpace: 'nowrap' }}>
              {t('Workflow.pipelinePrepares')}
            </span>
          </div>

          <span className="ws-pipeline-arrow-h" style={{ display: 'flex', flexShrink: 0 }}><LuArrowRight size={14} color="var(--ws-text-muted)" /></span>
          <span className="ws-pipeline-arrow-v"><LuArrowDown size={14} color="var(--ws-text-muted)" /></span>

          {/* Published badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--ws-brand-secondary)',
              borderRadius: 'var(--ws-radius-md)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
              {t('Workflow.pipelinePublished')}
            </span>
          </div>

          <span className="ws-pipeline-arrow-h" style={{ display: 'flex', flexShrink: 0 }}><LuArrowRight size={14} color="var(--ws-text-muted)" /></span>
          <span className="ws-pipeline-arrow-v"><LuArrowDown size={14} color="var(--ws-text-muted)" /></span>

          {/* Output badges */}
          <div className="ws-pipeline-badge-group">
            {['pipelineQrCode', 'pipelineWebPage', 'pipelineScreens', 'pipelinePrintPdf'].map((key) => (
              <span
                key={key}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: 'var(--ws-text-secondary)',
                  background: 'var(--ws-bg-subtle)',
                  border: '1px solid var(--ws-border-default)',
                  borderRadius: 'var(--ws-radius-sm)',
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(`Workflow.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--ws-space-6)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {steps.map((step, i) => (
          <AnimateStaggerChild key={step.number} index={i}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: 'var(--ws-space-6)',
                backgroundColor: 'var(--ws-bg-primary)',
                border: '1px solid var(--ws-border-default)',
                borderRadius: 'var(--ws-radius-lg)',
                height: '100%',
              }}
            >
              {/* Large faded step number — background watermark */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-4px',
                  fontSize: '6rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: 'var(--ws-brand-primary)',
                  opacity: 0.055,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  letterSpacing: '-0.02em',
                }}
              >
                {step.number}
              </span>

              {/* Card content */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--ws-radius-md)',
                    backgroundColor: 'var(--ws-bg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--ws-space-4)',
                  }}
                >
                  <step.Icon size={18} color="var(--ws-brand-primary)" />
                </div>
                <h3
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--ws-text-primary)',
                    marginBottom: 'var(--ws-space-2)',
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll delay={0.2}>
        <div style={{ textAlign: 'center', marginTop: 'var(--ws-space-14)' }}>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--ws-text-muted)',
              marginBottom: 'var(--ws-space-5)',
            }}
          >
            {t('Workflow.noTechnicalKnowledge')}
          </p>
          <WebsiteButton href="/get-started">{t('Workflow.cta')}</WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
