import { useTranslations } from 'next-intl';
import { LuBriefcase, LuCake, LuChefHat, LuCoffee, LuDumbbell, LuHeart, LuHotel, LuScissors, LuShoppingBag, LuTruck, LuUtensilsCrossed, LuWine } from 'react-icons/lu';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';

const industryMeta = [
  { icon: LuUtensilsCrossed, key: 'restaurant' },
  { icon: LuCoffee, key: 'cafe' },
  { icon: LuCake, key: 'bakery' },
  { icon: LuChefHat, key: 'cloudKitchen' },
  { icon: LuWine, key: 'barLounge' },
  { icon: LuTruck, key: 'foodTruck' },
  { icon: LuScissors, key: 'salon' },
  { icon: LuHeart, key: 'spaWellness' },
  { icon: LuShoppingBag, key: 'retailShop' },
  { icon: LuDumbbell, key: 'gymFitness' },
  { icon: LuHotel, key: 'hotel' },
  { icon: LuBriefcase, key: 'serviceBusiness' },
];

export default function IndustrySection() {
  const t = useTranslations('Website');
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <p
          className="ws-body"
          style={{
            textAlign: 'center',
            maxWidth: 'var(--ws-max-w-text)',
            margin: '0 auto',
            fontWeight: 500,
            color: 'var(--ws-text-primary)',
          }}
        >
          {t('Industry.heading')}
        </p>
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <div
          className="ws-industry-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: 'var(--ws-space-4)',
            marginTop: 'var(--ws-space-8)',
            maxWidth: '760px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {industryMeta.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ws-space-2)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--ws-bg-primary)',
                    border: '1px solid var(--ws-border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color="var(--ws-brand-secondary)" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ws-text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>
                  {t(`Industry.${item.key}`)}
                </span>
              </div>
            );
          })}
        </div>
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.15}>
        <p
          className="ws-caption"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ws-space-8)',
            maxWidth: 'var(--ws-max-w-text)',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {t('Industry.bottomCaption')}
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
