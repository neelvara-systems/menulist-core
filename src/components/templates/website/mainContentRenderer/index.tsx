import { DEFAULTS, getHomeStyleWithBrandColor, resolveMenuDesignConfig } from "@template/main-app/projects/b2cView/designSystem"
import DeviceFrame from "@template/main-app/projects/b2cView/deviceFrame"
import HomePageNew from "@template/main-app/projects/b2cView/homePage/homePageNew"
import MenuPageNew from "@template/main-app/projects/b2cView/menuPage/menuPageNew"
import { DeviceTypes, PageType } from "@template/main-app/projects/b2cView/types"
import { Project } from "@template/main-app/projects/types"
import { StoreDataType } from "@type/platform/store"

interface MainContentRendererProps {
  activeDeviceType: DeviceTypes;
  projectData: Project;
  /**
   * Store details passed explicitly so public menu rendering does not
   * depend on PlatformGlobalDataContext (a dashboard-scoped provider).
   * Dashboard preview passes storeDetails from its own context read;
   * public client menu passes the server-fetched store data.
   */
  storeDetails: StoreDataType;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  activeLanguage: string;
  setActiveLanguage: (language: string) => void;
  fromPage: string;
  businessType?: string;
  precomputedBlocks?: any | null;  // Precomputed Decision Blocks from Cloud Function
  restoreStoredLanguage?: boolean;
}

function MainContentRenderer({
  activeDeviceType,
  projectData,
  storeDetails,
  activePage,
  setActivePage,
  activeLanguage,
  setActiveLanguage,
  fromPage,
  businessType,
  precomputedBlocks,
  restoreStoredLanguage
}: MainContentRendererProps) {

  const homeStyle = projectData?.config?.design?.home?.style || DEFAULTS.home.style;
  const brandAccentColor = projectData?.config?.design?.brand?.accentColor;
  const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);

  // Get style configs with brand color applied
  const homeStyleConfig = getHomeStyleWithBrandColor(homeStyle, brandAccentColor);

  // G-02 (§11 PUBLIC-ROUTING-DOCTRINE): HomePageNew must not render in the public
  // path (fromPage === 'main-website'). Editor preview retains HOME mode for
  // legacy authored designs — the editor sidebar controls activePage there.
  const isPublicSurface = fromPage === 'main-website';
  const effectivePage = isPublicSurface ? PageType.MENU : activePage;

  return (
    <DeviceFrame fromPage={fromPage} activeDeviceType={activeDeviceType} backgroundColor={homeStyleConfig.background} activePage={effectivePage}>
      {effectivePage === PageType.HOME ? (
        <HomePageNew
          activeDeviceType={activeDeviceType}
          setActivePage={setActivePage}
          homeStyle={homeStyle}
          brandAccentColor={brandAccentColor}
          backgroundImage={projectData?.config?.design?.home?.backgroundImage}
          from={fromPage}
        />
      ) : (
        <MenuPageNew
          activeDeviceType={activeDeviceType}
          setActivePage={setActivePage}
          mood={menuDesign.mood}
          layout={menuDesign.layout}
          brandAccentColor={brandAccentColor}
          backgroundImage={menuDesign.backgroundImage}
          showItemPrices={menuDesign.showItemPrices ?? true}
          showImages={menuDesign.showImages ?? true}
          showCategoryIcons={menuDesign.showCategoryIcons ?? true}
          showCategoryTabs={menuDesign.showCategoryTabs ?? false}
          activeLanguage={activeLanguage}
          projectData={projectData}
          storeDetails={storeDetails}
          setActiveLanguage={setActiveLanguage}
          from={fromPage}
          businessType={businessType}
          precomputedBlocks={precomputedBlocks}
          restoreStoredLanguage={restoreStoredLanguage}
        />
      )}
    </DeviceFrame>
  )
}

export default MainContentRenderer
