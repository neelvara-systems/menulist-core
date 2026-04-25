import { DEFAULTS, getHomeStyleWithBrandColor } from "@template/main-app/projects/b2cView/designSystem"
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
  precomputedBlocks
}: MainContentRendererProps) {

  const homeStyle = projectData?.config?.design?.home?.style || DEFAULTS.home.style;
  const brandAccentColor = projectData?.config?.design?.brand?.accentColor;

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
          mood={projectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood}
          layout={projectData?.config?.design?.menu?.layout || DEFAULTS.menu.layout}
          brandAccentColor={brandAccentColor}
          backgroundImage={projectData?.config?.design?.menu?.backgroundImage}
          showImages={projectData?.config?.design?.menu?.showImages ?? true}
          showCategoryIcons={projectData?.config?.design?.menu?.showCategoryIcons ?? true}
          showCategoryTabs={projectData?.config?.design?.menu?.showCategoryTabs ?? false}
          activeLanguage={activeLanguage}
          projectData={projectData}
          storeDetails={storeDetails}
          setActiveLanguage={setActiveLanguage}
          from={fromPage}
          businessType={businessType}
          precomputedBlocks={precomputedBlocks}
        />
      )}
    </DeviceFrame>
  )
}

export default MainContentRenderer
