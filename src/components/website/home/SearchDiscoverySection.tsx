import { useTranslations } from 'next-intl';
import { LuBot, LuFileJson, LuGlobe2, LuLanguages, LuSearchCheck, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const signalMeta = [
  { icon: LuGlobe2 },
  { icon: LuFileJson },
  { icon: LuLanguages },
  { icon: LuSearchCheck },
];

const SEARCH_DISCOVERY_SIGNAL_COUNT = 4;
const SEARCH_DISCOVERY_PROOF_COUNT = 4;
const SEARCH_DISCOVERY_FLOW_COUNT = 3;

export default function SearchDiscoverySection() {
  const t = useTranslations('Website');
  const signals = Array.from({ length: SEARCH_DISCOVERY_SIGNAL_COUNT }, (_, index) => ({
    ...signalMeta[index],
    title: t(`SearchDiscovery.signal${index}Title`),
    desc: t(`SearchDiscovery.signal${index}Desc`),
  }));
  const proofItems = Array.from({ length: SEARCH_DISCOVERY_PROOF_COUNT }, (_, index) => (
    t(`SearchDiscovery.proof${index}`)
  ));
  const flowItems = Array.from({ length: SEARCH_DISCOVERY_FLOW_COUNT }, (_, index) => (
    t(`SearchDiscovery.flow${index}`)
  ));

  return (
    <SectionWrapper className="ws-search-discovery" id="search-discovery" variant="default">
      <AnimateOnScroll>
        <SectionHeading
          title={t('SearchDiscovery.title')}
          highlightedText={t('SearchDiscovery.highlight')}
          subtitle={t('SearchDiscovery.subtitle')}
        />
      </AnimateOnScroll>

      <div className="ws-search-discovery__layout">
        <AnimateOnScroll className="ws-search-discovery__source" delay={0.1}>
          <div className="ws-search-discovery__badge">
            <LuBot size={16} />
            <span>{t('SearchDiscovery.panelEyebrow')}</span>
          </div>
          <h3 className="ws-h3">{t('SearchDiscovery.panelTitle')}</h3>
          <p className="ws-body-sm">{t('SearchDiscovery.panelDesc')}</p>
          <div className="ws-search-discovery__flow">
            {flowItems.map((item, index) => (
              <div className="ws-search-discovery__flow-item" key={item}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <div className="ws-search-discovery__signals">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <AnimateStaggerChild key={signal.title} index={index}>
                <div className="ws-search-discovery__signal">
                  <div className="ws-search-discovery__icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="ws-h3">{signal.title}</h3>
                    <p className="ws-caption">{signal.desc}</p>
                  </div>
                </div>
              </AnimateStaggerChild>
            );
          })}
        </div>
      </div>

      <AnimateOnScroll delay={0.15}>
        <div className="ws-search-discovery__proof">
          {proofItems.map((item) => (
            <div className="ws-search-discovery__proof-item" key={item}>
              <LuShieldCheck size={16} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="ws-search-discovery__caption">
          {t('SearchDiscovery.caption')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
