import Image from 'next/image';
import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const workflowItems = [
  {
    key: 'capture',
    image: '/images/website/owner-workflow-intake-demo.webp',
    width: 960,
    height: 1200,
  },
  {
    key: 'review',
    image: '/images/website/product-proof/ai-menu-manager-approval-card.webp',
    width: 1280,
    height: 900,
  },
  {
    key: 'publish',
    image: '/images/website/menulist-obp-browser.webp',
    width: 1400,
    height: 900,
  },
] as const;

export default function OwnerWorkflowGallerySection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper className="ws-owner-workflow-section" id="owner-workflow">
      <AnimateOnScroll>
        <div className="ws-owner-workflow__heading">
          <SectionHeading
            title={t('OwnerWorkflowGallery.title')}
            highlightedText={t('OwnerWorkflowGallery.highlight')}
            subtitle={t('OwnerWorkflowGallery.subtitle')}
          />
          <p className="ws-owner-workflow__disclosure">{t('OwnerWorkflowGallery.disclosure')}</p>
        </div>
      </AnimateOnScroll>

      <div className="ws-owner-workflow__gallery" aria-label={t('OwnerWorkflowGallery.galleryLabel')}>
        {workflowItems.map((item, index) => (
          <AnimateStaggerChild
            className={`ws-owner-workflow__slot ws-owner-workflow__slot--${item.key}`}
            index={index}
            key={item.key}
            preset="media"
          >
            <article className={`ws-owner-workflow__item ws-owner-workflow__item--${item.key}`}>
              <div className="ws-owner-workflow__media">
                <Image
                  alt={t(`OwnerWorkflowGallery.${item.key}Alt`)}
                  height={item.height}
                  sizes={item.key === 'capture' ? '(max-width: 768px) 100vw, 38vw' : '(max-width: 768px) 100vw, 54vw'}
                  src={item.image}
                  width={item.width}
                />
              </div>
              <div className="ws-owner-workflow__caption">
                <h3>{t(`OwnerWorkflowGallery.${item.key}Title`)}</h3>
                <p>{t(`OwnerWorkflowGallery.${item.key}Body`)}</p>
              </div>
            </article>
          </AnimateStaggerChild>
        ))}
      </div>
    </SectionWrapper>
  );
}
