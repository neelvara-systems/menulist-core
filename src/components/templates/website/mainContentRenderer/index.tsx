import { resolveMenuDesignConfig } from "@template/main-app/projects/b2cView/designSystem"
import DeviceFrame from "@template/main-app/projects/b2cView/deviceFrame"
import MenuPageNew from "@template/main-app/projects/b2cView/menuPage/menuPageNew"
import OfficialPagePreview from "@template/main-app/projects/b2cView/officialPage/officialPagePreview"
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

  const brandAccentColor = projectData?.config?.design?.brand?.accentColor;
  const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);

  // G-02 (§11 PUBLIC-ROUTING-DOCTRINE): the retired intro screen
  // is no longer part of public runtime or the owner UI editor. Public menu
  // routes always render the menu; the owner editor uses OBP as the public
  // identity preview branch.
  const isPublicSurface = fromPage === 'main-website';
  const effectivePage = isPublicSurface ? PageType.MENU : activePage;

  return (
    <DeviceFrame fromPage={fromPage} activeDeviceType={activeDeviceType} backgroundColor="#fbfaf7" activePage={effectivePage}>
      {effectivePage === PageType.OBP ? (
        <OfficialPagePreview
          activeDeviceType={activeDeviceType}
          activeLanguage={activeLanguage}
          hasFeedbackTarget={Boolean(projectData?.projectId)}
          setActivePage={setActivePage}
          storeDetails={storeDetails}
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
