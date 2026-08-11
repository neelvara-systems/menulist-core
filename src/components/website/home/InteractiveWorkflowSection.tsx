import { useTranslations } from 'next-intl';
import { LuCamera, LuFileText, LuGlobe, LuLink, LuQrCode, LuZap } from 'react-icons/lu';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WorkflowGuidedFrame from './WorkflowGuidedFrame';

const stepNumbers = ['01', '02', '03', '04', '05', '06'];
const inputItems = [
  { key: 'pipelinePhoto', Icon: LuCamera },
  { key: 'pipelinePdf', Icon: LuFileText },
  { key: 'pipelineLink', Icon: LuLink },
  { key: 'pipelineServiceListLink', Icon: LuGlobe },
];
const outputItems = [
  { key: 'pipelineOfficialPage', Icon: LuGlobe, pulseClass: 'ws-map-card-output-arrival-0' },
  { key: 'pipelineMenuLink', Icon: LuLink, pulseClass: 'ws-map-card-output-arrival-1' },
  { key: 'pipelineQrCode', Icon: LuQrCode, pulseClass: 'ws-map-card-output-arrival-2' },
  { key: 'pipelinePrintPdf', Icon: LuFileText, pulseClass: 'ws-map-card-output-arrival-3' },
];

export default function InteractiveWorkflowSection() {
  const t = useTranslations('Website');
  const steps = stepNumbers.map((number, i) => ({
    number,
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

      <AnimateOnScroll delay={0.08} preset="media">
        <WorkflowGuidedFrame
          label={t('Workflow.storyLabel')}
          title={t('Workflow.storyTitle')}
          desc={t('Workflow.storyDesc')}
          steps={steps}
        >
          <div className="ws-workflow-map">
            <svg className="ws-workflow-map__paths ws-workflow-map__paths--desktop" viewBox="0 0 920 360" aria-hidden="true" focusable="false">
              <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 78 C260 78 260 176 420 176" />
              <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 145 C270 145 285 176 420 176" />
              <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 214 C270 214 285 176 420 176" />
              <path className="ws-workflow-map__path ws-workflow-map__path--input" d="M150 282 C260 282 260 176 420 176" />
              <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C620 176 618 63 713 63" />
              <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C612 176 624 141 713 141" />
              <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C612 176 624 219 713 219" />
              <path className="ws-workflow-map__path ws-workflow-map__path--output" d="M500 176 C620 176 618 297 713 297" />
              <path className="ws-map-pulse ws-map-pulse-delay-0" pathLength={1} d="M150 78 C260 78 260 176 420 176" />
              <path className="ws-map-pulse ws-map-pulse-delay-1" pathLength={1} d="M150 145 C270 145 285 176 420 176" />
              <path className="ws-map-pulse ws-map-pulse-delay-2" pathLength={1} d="M150 214 C270 214 285 176 420 176" />
              <path className="ws-map-pulse ws-map-pulse-delay-3" pathLength={1} d="M150 282 C260 282 260 176 420 176" />
              <path className="ws-map-pulse ws-map-pulse-output-0" pathLength={1} d="M500 176 C620 176 618 63 713 63" />
              <path className="ws-map-pulse ws-map-pulse-output-1" pathLength={1} d="M500 176 C612 176 624 141 713 141" />
              <path className="ws-map-pulse ws-map-pulse-output-2" pathLength={1} d="M500 176 C612 176 624 219 713 219" />
              <path className="ws-map-pulse ws-map-pulse-output-3" pathLength={1} d="M500 176 C620 176 618 297 713 297" />
            </svg>
            <svg className="ws-workflow-map__paths ws-workflow-map__paths--mobile" viewBox="0 0 350 383" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path className="ws-workflow-map__path" d="M42 102.5 C74 126 103 143 137 157" />
              <path className="ws-workflow-map__path" d="M131 102.5 C145 119 158 130 164 143.5" />
              <path className="ws-workflow-map__path" d="M219 102.5 C205 119 192 130 186 143.5" />
              <path className="ws-workflow-map__path" d="M308 102.5 C276 126 247 143 213 157" />
              <path className="ws-workflow-map__path" d="M103 235 C86 246 70 258 55 270.5" />
              <path className="ws-workflow-map__path" d="M145 246 C140 254 137 262 135 270.5" />
              <path className="ws-workflow-map__path" d="M205 246 C210 254 213 262 215 270.5" />
              <path className="ws-workflow-map__path" d="M247 235 C264 246 280 258 295 270.5" />
              <path className="ws-map-pulse ws-map-pulse-delay-0" pathLength={1} d="M42 102.5 C74 126 103 143 137 157" />
              <path className="ws-map-pulse ws-map-pulse-delay-1" pathLength={1} d="M131 102.5 C145 119 158 130 164 143.5" />
              <path className="ws-map-pulse ws-map-pulse-delay-2" pathLength={1} d="M219 102.5 C205 119 192 130 186 143.5" />
              <path className="ws-map-pulse ws-map-pulse-delay-3" pathLength={1} d="M308 102.5 C276 126 247 143 213 157" />
              <path className="ws-map-pulse ws-map-pulse-output-0" pathLength={1} d="M103 235 C86 246 70 258 55 270.5" />
              <path className="ws-map-pulse ws-map-pulse-output-1" pathLength={1} d="M145 246 C140 254 137 262 135 270.5" />
              <path className="ws-map-pulse ws-map-pulse-output-2" pathLength={1} d="M205 246 C210 254 213 262 215 270.5" />
              <path className="ws-map-pulse ws-map-pulse-output-3" pathLength={1} d="M247 235 C264 246 280 258 295 270.5" />
            </svg>

            <div className="ws-workflow-map__stack ws-workflow-map__stack--input">
              <span className="ws-workflow-map__column-label">
                {t('Workflow.pipelineInputLabel')}
              </span>
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
              <div className="ws-workflow-map__logo">
                <LogoMark height={42} />
              </div>
              <div className="ws-workflow-map__gate">
                <LuZap size={14} />
                <span>{t('Workflow.pipelinePrepares')}</span>
              </div>
            </div>

            <div className="ws-workflow-map__stack ws-workflow-map__stack--output">
              <span className="ws-workflow-map__column-label">
                {t('Workflow.pipelineOutputLabel')}
              </span>
              {outputItems.map(({ key, Icon, pulseClass }) => (
                <div className={`ws-workflow-map__item ws-map-destination-pulse ${pulseClass}`} key={key}>
                  <span className="ws-workflow-map__item-icon">
                    <Icon size={18} />
                  </span>
                  <span>{t(`Workflow.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </WorkflowGuidedFrame>
      </AnimateOnScroll>

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
