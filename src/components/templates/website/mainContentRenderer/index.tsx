import { resolveMenuDesignConfig } from "@template/main-app/projects/b2cView/designSystem"
import DeviceFrame from "@template/main-app/projects/b2cView/deviceFrame"
import MenuPageNew from "@template/main-app/projects/b2cView/menuPage/menuPageNew"
import OBPResolvedSurface from "@/app/client/obp/OBPResolvedSurface"
import PreviewNavigationGuard from "@/components/shared/PreviewNavigationGuard"
import { DeviceTypes, PageType } from "@template/main-app/projects/b2cView/types"
import { PrecomputedDecisionBlocks, Project } from "@template/main-app/projects/types"
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
  precomputedBlocks?: PrecomputedDecisionBlocks | null;
  restoreStoredLanguage?: boolean;
  previewMode?: boolean;
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
  restoreStoredLanguage,
  previewMode
}: MainContentRendererProps) {

  const brandAccentColor = projectData?.config?.design?.brand?.accentColor;
  const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);
  const previewProjectSlug = (projectData as any)?.slug || 'menu';
  const previewMenuInfo = {
    hasMenu: Boolean(projectData),
    defaultSlug: previewProjectSlug,
    projects: projectData ? [{
      isDefault: true,
      name: projectData.name || 'Menu',
      projectId: projectData.projectId || 'preview',
      projectImage: (projectData as any)?.projectImage || null,
      slug: previewProjectSlug,
    }] : [],
  };

  // G-02 (§11 PUBLIC-ROUTING-DOCTRINE): the retired intro screen
  // is no longer part of public runtime or the owner UI editor. Public menu
  // routes always render the menu; the owner editor uses OBP as the public
  // identity preview branch.
  const isPublicSurface = fromPage === 'main-website';
  const effectivePage = isPublicSurface ? PageType.MENU : activePage;
  const menuSurface = (
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
      previewMode={previewMode}
    />
  );

  return (
    <DeviceFrame fromPage={fromPage} activeDeviceType={activeDeviceType} backgroundColor="#fbfaf7" activePage={effectivePage}>
      {effectivePage === PageType.OBP ? (
        <PreviewNavigationGuard>
          <OBPResolvedSurface
            includeRuntime={false}
            menuInfo={previewMenuInfo}
            requestedLanguage={activeLanguage}
            store={storeDetails}
          />
        </PreviewNavigationGuard>
      ) : previewMode ? (
        <PreviewNavigationGuard>{menuSurface}</PreviewNavigationGuard>
      ) : menuSurface}
    </DeviceFrame>
  )
}

export default MainContentRenderer
