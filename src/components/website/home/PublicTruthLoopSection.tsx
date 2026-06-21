import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuFileText,
  LuGlobe,
  LuMessageCircle,
  LuPrinter,
  LuQrCode,
  LuRefreshCw,
  LuShieldCheck,
  LuStore,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import LogoMark from '../shared/LogoMark';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const loopStepMeta = [
  { Icon: LuFileText },
  { Icon: LuShieldCheck },
  { Icon: LuGlobe },
  { Icon: LuMessageCircle },
  { Icon: LuRefreshCw },
];

const outputMeta = [
  { Icon: LuQrCode },
  { Icon: LuStore },
  { Icon: LuPrinter },
];

export default function PublicTruthLoopSection() {
  const t = useTranslations('Website');
  const steps = loopStepMeta.map((meta, index) => ({
    ...meta,
    title: t(`PublicTruthLoop.step${index}Title`),
    desc: t(`PublicTruthLoop.step${index}Desc`),
  }));
  const outputs = outputMeta.map((meta, index) => ({
    ...meta,
    title: t(`PublicTruthLoop.output${index}Title`),
    desc: t(`PublicTruthLoop.output${index}Desc`),
  }));

  return (
    <SectionWrapper className="ws-public-truth-loop-section">
      <AnimateOnScroll>
        <p className="ws-public-truth-loop__eyebrow">{t('PublicTruthLoop.eyebrow')}</p>
        <SectionHeading
          title={t('PublicTruthLoop.title')}
          highlightedText={t('PublicTruthLoop.highlight')}
          subtitle={t('PublicTruthLoop.subtitle')}
        />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1} preset="media">
        <div className="ws-public-truth-loop">
          <div className="ws-public-truth-loop__core" aria-label={t('PublicTruthLoop.coreLabel')}>
            <div className="ws-public-truth-loop__logo">
              <LogoMark height={44} />
            </div>
            <div>
              <p>{t('PublicTruthLoop.coreTitle')}</p>
              <span>{t('PublicTruthLoop.coreDesc')}</span>
            </div>
          </div>

          <div className="ws-public-truth-loop__steps">
            {steps.map(({ Icon, title, desc }, index) => (
              <AnimateStaggerChild key={title} index={index} preset="card" style={{ height: '100%' }}>
                <article className="ws-public-truth-loop__step">
                  <div className="ws-public-truth-loop__step-top">
                    <span className="ws-public-truth-loop__step-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="ws-public-truth-loop__step-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  {index < steps.length - 1 ? (
                    <LuArrowRight className="ws-public-truth-loop__step-arrow" size={18} aria-hidden="true" />
                  ) : null}
                </article>
              </AnimateStaggerChild>
            ))}
          </div>
        </div>
      </AnimateOnScroll>

      <div className="ws-public-truth-loop__outputs" aria-label={t('PublicTruthLoop.outputsLabel')}>
        {outputs.map(({ Icon, title, desc }, index) => (
          <AnimateStaggerChild key={title} index={index} preset="card" style={{ height: '100%' }}>
            <article className="ws-public-truth-loop__output">
              <span className="ws-public-truth-loop__output-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </article>
          </AnimateStaggerChild>
        ))}
      </div>

      <AnimateOnScroll delay={0.22}>
        <p className="ws-public-truth-loop__caption">{t('PublicTruthLoop.caption')}</p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
