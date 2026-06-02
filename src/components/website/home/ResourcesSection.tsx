import { useTranslations } from 'next-intl';
import {
  LuBadgeCheck,
  LuBot,
  LuBookOpen,
  LuBuilding2,
  LuFileText,
  LuMapPin,
  LuQrCode,
  LuSearch,
} from 'react-icons/lu';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import ResourceTrackedLink from '../resources/ResourceTrackedLink';

const resourceCards = [
  { href: '/resources/menu-engineering', icon: LuBookOpen, key: 'card0' },
  { href: '/resources/qr-menu-for-restaurants', icon: LuQrCode, key: 'card1' },
  { href: '/resources/digital-menu-vs-pdf-menu', icon: LuFileText, key: 'card2' },
  { href: '/resources/google-business-profile-menu', icon: LuMapPin, key: 'card3' },
  { href: '/resources/restaurant-menu-seo', icon: LuSearch, key: 'card4' },
  { href: '/resources/ai-search-menu-discovery', icon: LuBot, key: 'card5' },
  { href: '/resources/official-menu-source', icon: LuBadgeCheck, key: 'card6' },
  { href: '/resources/multi-location-menu-management', icon: LuBuilding2, key: 'card7' },
];

export default function ResourcesSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper variant="subtle" className="ws-home-resources">
      <SectionHeading
        title={t('ResourcesHome.title')}
        highlightedText={t('ResourcesHome.highlight')}
        subtitle={t('ResourcesHome.subtitle')}
      />
      <div className="ws-home-resources__grid">
        {resourceCards.map((card) => {
          const Icon = card.icon;
          return (
            <ResourceTrackedLink
              key={card.href}
              href={card.href}
              eventName="homepage_resource_card_click"
              eventProps={{ destination: card.href, source_page: 'homepage' }}
              className="ws-home-resource-card"
            >
              <span className="ws-home-resource-card__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <strong>{t(`ResourcesHome.${card.key}Title`)}</strong>
              <span>{t(`ResourcesHome.${card.key}Desc`)}</span>
            </ResourceTrackedLink>
          );
        })}
      </div>
      <div className="ws-home-resources__cta">
        <ResourceTrackedLink
          href="/resources"
          eventName="homepage_resource_card_click"
          eventProps={{ destination: '/resources', source_page: 'homepage' }}
          className="ws-btn ws-btn--ghost"
        >
          {t('ResourcesHome.cta')}
        </ResourceTrackedLink>
      </div>
    </SectionWrapper>
  );
}
