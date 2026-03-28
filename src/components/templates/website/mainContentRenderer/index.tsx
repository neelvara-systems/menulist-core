import { DEFAULTS, getHomeStyleWithBrandColor } from "@template/main-app/projects/b2cView/designSystem"
import DeviceFrame from "@template/main-app/projects/b2cView/deviceFrame"
import HomePageNew from "@template/main-app/projects/b2cView/homePage/homePageNew"
import MenuPageNew from "@template/main-app/projects/b2cView/menuPage/menuPageNew"
import { DeviceTypes, PageType } from "@template/main-app/projects/b2cView/types"
import { Project } from "@template/main-app/projects/types"

interface MainContentRendererProps {
  activeDeviceType: DeviceTypes;
  projectData: Project;
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

  return (
    <DeviceFrame fromPage={fromPage} activeDeviceType={activeDeviceType} backgroundColor={homeStyleConfig.background} activePage={activePage}>
      {activePage === PageType.HOME ? (
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
          showCategoryTabs={projectData?.config?.design?.menu?.showCategoryTabs ?? false}
          activeLanguage={activeLanguage}
          projectData={projectData}
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