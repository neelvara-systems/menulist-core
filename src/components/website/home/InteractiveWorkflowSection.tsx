import { useTranslations } from 'next-intl';
import { LuCamera, LuFileText, LuGlobe, LuLink, LuQrCode, LuRefreshCw, LuType, LuZap } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const stepIcons = [LuCamera, LuZap, LuGlobe, LuRefreshCw];
const stepNumbers = ['01', '02', '03', '04'];
const inputItems = [
  { key: 'pipelinePhoto', Icon: LuCamera },
  { key: 'pipelinePdf', Icon: LuFileText },
  { key: 'pipelineText', Icon: LuType },
];
const outputItems = [
  { key: 'pipelineOfficialPage', Icon: LuGlobe },
  { key: 'pipelineMenuLink', Icon: LuLink },
  { key: 'pipelineQrCode', Icon: LuQrCode },
  { key: 'pipelinePrintPdf', Icon: LuFileText },
];

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
            letterSpacing: 0,
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

      <AnimateOnScroll delay={0.08}>
        <div className="ws-workflow-map">
          <svg className="ws-workflow-map__paths" viewBox="0 0 920 360" aria-hidden="true" focusable="false">
            <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 78 C260 78 260 176 420 176" />
            <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 176 C270 176 285 176 420 176" />
            <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 274 C260 274 260 176 420 176" />
            <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C650 176 655 78 770 78" />
            <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C635 176 650 144 770 144" />
            <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C635 176 650 208 770 208" />
            <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C650 176 655 274 770 274" />
          </svg>

          <div className="ws-workflow-map__stack ws-workflow-map__stack--input">
            {inputItems.map(({ key, Icon }) => (
              <div className="ws-workflow-map__item" key={key}>
                <span className="ws-workflow-map__item-icon">
                  <Icon size={18} />
                </span>
                <span>{t(`Workflow.${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="ws-workflow-map__core" aria-label="MenuList">
            <span className="ws-workflow-map__ring ws-workflow-map__ring--outer" />
            <span className="ws-workflow-map__ring ws-workflow-map__ring--inner" />
            <div className="ws-workflow-map__logo">
              <LogoMark height={42} />
            </div>
            <div className="ws-workflow-map__gate">
              <LuZap size={14} />
              <span>{t('Workflow.pipelinePrepares')}</span>
            </div>
          </div>

          <div className="ws-workflow-map__stack ws-workflow-map__stack--output">
            {outputItems.map(({ key, Icon }) => (
              <div className="ws-workflow-map__item" key={key}>
                <span className="ws-workflow-map__item-icon">
                  <Icon size={18} />
                </span>
                <span>{t(`Workflow.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </AnimateOnScroll>

      <div
        className="ws-workflow-step-grid"
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
              className="ws-workflow-step-card"
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
                  letterSpacing: 0,
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
                <h3 className="ws-h3" style={{ fontSize: '0.9375rem', marginBottom: 'var(--ws-space-2)' }}>
                  {step.title}
                </h3>
                <p className="ws-caption" style={{ lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll delay={0.2}>
        <div className="ws-workflow-cta" style={{ textAlign: 'center', marginTop: 'var(--ws-space-14)' }}>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--ws-text-muted)',
              marginBottom: 'var(--ws-space-5)',
            }}
          >
            {t('Workflow.noTechnicalKnowledge')}
          </p>
          <WebsiteButton href="/create-menu">{t('Workflow.cta')}</WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
