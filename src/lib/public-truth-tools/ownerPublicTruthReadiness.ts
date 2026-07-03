import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage, isLocalizedText } from '@lib/localization/text';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { evaluatePublicTruthIndexability, type PublicTruthIndexDecision } from '@lib/seo/publicTruthIndexing';
import { generateProjectUrl } from '@lib/utils/slugify';
import type { Project, ProjectSummaryData } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import type {
  PublicTruthCheckEvidence,
  PublicTruthCheckFactId,
  PublicTruthCheckItem,
  PublicTruthCheckReport,
  PublicTruthCheckResult,
  PublicTruthCheckSourceKind,
} from './publicTruthCheckTypes';

export type OwnerPublicTruthProjectSummary = Partial<ProjectSummaryData> & {
  active?: boolean;
  deleted?: boolean;
  isDefault?: boolean;
  isSpecialMenu?: boolean;
  lastPublishedAt?: unknown;
  name?: string | Record<string, string>;
  projectId?: string;
  slug?: string;
};

export type OwnerPublicTruthReadinessReport = PublicTruthCheckReport & {
  mode: 'menulist_owner';
  modules: OwnerPublicTruthReadinessModule[];
  selectedProjectId?: string;
  primaryProjectId?: string;
  sourceSummary: {
    activeProjectCount: number;
    checkedProjectName?: string;
    domainState: 'custom_domain_live' | 'custom_domain_pending' | 'subdomain_live' | 'missing';
    externalSourcesFetched: false;
    projectDataChecked: boolean;
  };
  publicLinks: {
    officialPageUrl?: string;
    menuUrl?: string;
  };
  indexDecisions: {
    menu: PublicTruthIndexDecision;
    officialPage: PublicTruthIndexDecision;
  };
};

export type OwnerPublicTruthReadinessModuleId =
  | 'public_truth_basics'
  | 'qr_link_health'
  | 'menu_service_readability'
  | 'price_availability_gap'
  | 'menu_pdf_cleanup'
  | 'whatsapp_action_link'
  | 'hours_readiness'
  | 'photo_visual_identity'
  | 'customer_question_coverage'
  | 'booking_inquiry_readiness'
  | 'google_profile_handoff'
  | 'menu_freshness';

export type OwnerPublicTruthReadinessModuleStatus =
  | 'ready'
  | 'needs_attention'
  | 'check'
  | 'not_checked';

export type OwnerPublicTruthReadinessMobileFixTarget =
  | 'basic_settings'
  | 'domain_settings'
  | 'hours_edit'
  | 'menu_tab'
  | 'official_page'
  | 'presence_monitor'
  | 'share_tab';

export type OwnerPublicTruthReadinessModule = {
  id: OwnerPublicTruthReadinessModuleId;
  status: OwnerPublicTruthReadinessModuleStatus;
  title: string;
  description: string;
  evidenceText: string;
  fixHref: string;
  mobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget;
  actionLabel: string;
  relatedCheckIds: PublicTruthCheckFactId[];
};

type BuildOwnerPublicTruthReadinessInput = {
  generatedAt?: string;
  projectData?: Partial<Project> | Record<string, any> | null;
  projectSummaries?: OwnerPublicTruthProjectSummary[];
  selectedProjectId?: string | null;
  store: Partial<StoreDataType> | Record<string, any> | null | undefined;
};

const OWNER_REQUIRED_FACTS = new Set<PublicTruthCheckFactId>([
  'business_identity',
  'menu_or_service_source',
  'hours',
  'location',
  'contact',
  'customer_actions',
  'public_link',
]);

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasLocalizedText(value: unknown): boolean {
  if (hasText(value)) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some(hasText);
}

function resolveLocalizedText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim() || fallback;
  if (!isLocalizedText(value)) return fallback;
  return getLocalizedText(value, undefined, getPrimaryLocalizedLanguage(value, 'en'), fallback);
}

function hasAnyWorkingHours(workingHours: unknown): boolean {
  if (!workingHours || typeof workingHours !== 'object') return false;
  return Object.values(workingHours as Record<string, unknown>).some(hasText);
}

function readTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  if (typeof value === 'object') {
    const maybeTimestamp = value as {
      _seconds?: number;
      seconds?: number;
      toDate?: () => Date;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      const date = maybeTimestamp.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
    }

    if (typeof maybeTimestamp.seconds === 'number') return maybeTimestamp.seconds * 1000;
    if (typeof maybeTimestamp._seconds === 'number') return maybeTimestamp._seconds * 1000;
  }

  return null;
}

function getMostRecentTimestampMs(values: unknown[]): number | null {
  const timestamps = values
    .map(readTimestampMs)
    .filter((value): value is number => typeof value === 'number');
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function getProjectFileTimestampCandidates(projectData?: Record<string, any> | null): unknown[] {
  const files = Array.isArray(projectData?.files) ? projectData.files : [];
  return files.flatMap((file: Record<string, any>) => [
    file?.lastPublishedAt,
    file?.modifiedOn,
    file?.updatedAt,
    file?.createdOn,
  ]);
}

function getDaysSince(timestampMs: number | null, generatedAt?: string): number | null {
  if (!timestampMs) return null;
  const nowMs = readTimestampMs(generatedAt) || Date.now();
  return Math.max(0, Math.floor((nowMs - timestampMs) / (24 * 60 * 60 * 1000)));
}

function getMenuFreshnessEvidenceText(daysSince: number | null): string {
  if (daysSince === null) return 'No clear menu update date was found in the current MenuList data. No external sites were scanned.';
  if (daysSince === 0) return 'The selected/default menu was updated today. No external sites were scanned.';
  if (daysSince === 1) return 'The selected/default menu was updated 1 day ago. No external sites were scanned.';
  return `The selected/default menu was updated ${daysSince} days ago. No external sites were scanned.`;
}

function buildBusinessSettingsFixHref(section: string, focus: string): string {
  return `/business-settings?section=${encodeURIComponent(section)}&focus=${encodeURIComponent(focus)}`;
}

function buildProjectFixHref(projectId?: string, qualityAction = 'editor'): string {
  const params = new URLSearchParams({
    focus: 'menu-readiness',
    qualityAction,
    view: 'editor',
  });
  if (projectId) {
    params.set('projectId', projectId);
  }
  return `/projects?${params.toString()}`;
}

function hasLocationFact(store: Record<string, any>): boolean {
  return hasText(store.addressLine)
    || hasText(store.area)
    || hasText(store.city)
    || hasText(store.state)
    || Boolean(store.geo?.latitude && store.geo?.longitude);
}

function hasContactFact(store: Record<string, any>): boolean {
  return hasText(store.phoneNumber)
    || hasText(store.alternatePhoneNumber)
    || hasText(store.publicPresence?.whatsappNumber)
    || hasText(store.email);
}

function hasCustomerActionFact(store: Record<string, any>): boolean {
  const publicPresence = store.publicPresence || {};
  return hasContactFact(store)
    || hasText(publicPresence.googleMapsUrl)
    || hasText(publicPresence.reservationUrl)
    || hasText(publicPresence.orderUrl)
    || hasText(store.reviewUrl)
    || hasText(publicPresence.googleReviewUrl);
}

function hasPhotoFact(store: Record<string, any>, projectData?: Record<string, any> | null, projectSummary?: OwnerPublicTruthProjectSummary | null): boolean {
  const publicPresence = store.publicPresence || {};
  if (hasText(store.logo) || hasText(publicPresence.businessCover) || (Array.isArray(publicPresence.photos) && publicPresence.photos.some(hasText))) {
    return true;
  }
  if (hasText(projectSummary?.projectImage)) return true;
  if (hasText(projectData?.projectImage)) return true;

  const files = Array.isArray(projectData?.files) ? projectData?.files : [];
  return files.some((file: any) => {
    const items = Array.isArray(file?.extractedData?.data?.items) ? file.extractedData.data.items : [];
    return items.some((item: any) => Array.isArray(item?.images) && item.images.length > 0);
  });
}

function getPhotoStats(store: Record<string, any>, projectData?: Record<string, any> | null, projectSummary?: OwnerPublicTruthProjectSummary | null) {
  const publicPresence = store.publicPresence || {};
  const galleryPhotoCount = Array.isArray(publicPresence.photos)
    ? publicPresence.photos.filter(hasText).length
    : 0;
  let itemImageCount = 0;

  const files = Array.isArray(projectData?.files) ? projectData?.files : [];
  for (const file of files) {
    const items = Array.isArray(file?.extractedData?.data?.items) ? file.extractedData.data.items : [];
    for (const item of items) {
      if (Array.isArray(item?.images) && item.images.length > 0) {
        itemImageCount += 1;
      }
    }
  }

  const logoPresent = hasText(store.logo);
  const coverPresent = hasText(publicPresence.businessCover);
  const projectImagePresent = hasText(projectSummary?.projectImage) || hasText(projectData?.projectImage);

  return {
    coverPresent,
    galleryPhotoCount,
    itemImageCount,
    logoPresent,
    projectImagePresent,
    visualSlotCount: [
      logoPresent,
      coverPresent,
      galleryPhotoCount > 0,
      projectImagePresent,
      itemImageCount > 0,
    ].filter(Boolean).length,
  };
}

function isActiveProjectSummary(project?: OwnerPublicTruthProjectSummary | null): boolean {
  if (!project) return false;
  return Boolean(project.projectId)
    && project.active !== false
    && project.deleted !== true
    && project.isSpecialMenu !== true;
}

function pickPrimaryProject(
  projectSummaries: OwnerPublicTruthProjectSummary[],
  selectedProjectId?: string | null,
): OwnerPublicTruthProjectSummary | null {
  const activeProjects = projectSummaries.filter(isActiveProjectSummary);
  if (selectedProjectId) {
    const selected = activeProjects.find((project) => project.projectId === selectedProjectId);
    if (selected) return selected;
  }
  return activeProjects.find((project) => project.isDefault) || activeProjects[0] || null;
}

function getProjectStats(projectData?: Record<string, any> | null) {
  let categoryCount = 0;
  let describedItemCount = 0;
  let explicitAvailabilityCount = 0;
  let itemCount = 0;
  let itemImageCount = 0;
  let pricedItemCount = 0;
  let pricedVariantOrAttributeCount = 0;
  let unavailableItemCount = 0;
  let variantOrAttributeCount = 0;

  const files = Array.isArray(projectData?.files) ? projectData.files : [];
  for (const file of files) {
    if (file?.active === false || file?.deleted === true) continue;
    const data = file?.extractedData?.data;
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const items = Array.isArray(data?.items) ? data.items : [];

    categoryCount += categories.filter((category: any) => category?.active !== false && hasLocalizedText(category?.name)).length;
    for (const item of items) {
      if (item?.active === false || !hasLocalizedText(item?.name)) continue;
      itemCount += 1;
      const activeAttributes = Array.isArray(item?.attributes)
        ? item.attributes.filter((attribute: any) => attribute?.active !== false)
        : [];
      const hasDirectPrice = hasText(item?.price);
      const hasAttributePrice = activeAttributes.some((attribute: any) => hasText(attribute?.price));
      if (hasDirectPrice || hasAttributePrice) {
        pricedItemCount += 1;
      }
      if (activeAttributes.length > 0) {
        variantOrAttributeCount += activeAttributes.length;
        pricedVariantOrAttributeCount += activeAttributes.filter((attribute: any) => hasText(attribute?.price)).length;
      }
      if (typeof item?.available === 'boolean') {
        explicitAvailabilityCount += 1;
      }
      if (item?.available === false) {
        unavailableItemCount += 1;
      }
      if (hasLocalizedText(item?.description)) {
        describedItemCount += 1;
      }
      if (Array.isArray(item?.images) && item.images.length > 0) {
        itemImageCount += 1;
      }
    }
  }

  return {
    categoryCount,
    describedItemCount,
    explicitAvailabilityCount,
    itemCount,
    itemImageCount,
    pricedItemCount,
    pricedVariantOrAttributeCount,
    unavailableItemCount,
    variantOrAttributeCount,
  };
}

function makeCheck(
  id: PublicTruthCheckFactId,
  result: PublicTruthCheckResult,
  evidence: PublicTruthCheckEvidence,
): PublicTruthCheckItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getOwnerEvidenceText(id, evidence, result),
    required: OWNER_REQUIRED_FACTS.has(id),
  };
}

function getOwnerEvidenceText(
  id: PublicTruthCheckFactId,
  evidence: PublicTruthCheckEvidence,
  result: PublicTruthCheckResult,
): string {
  if (result === 'not_checked') {
    return id === 'prices'
      ? 'A MenuList menu exists, but the selected menu data was not loaded for price checking.'
      : 'This fact was not safely checked from the current MenuList data.';
  }

  switch (evidence) {
    case 'menulist_store':
      return 'Checked MenuList business settings. No external sites were scanned.';
    case 'menulist_project':
      return 'Checked the selected or default MenuList menu. No external sites were scanned.';
    case 'menulist_summary':
      return 'Checked MenuList menu summary data. No external sites were scanned.';
    case 'menulist_public_route':
      return 'Checked MenuList public link settings. No external sites were scanned.';
    case 'menulist_index_gate':
      return 'Checked MenuList public indexing rules. No external sites were scanned.';
    case 'not_provided':
      return 'This MenuList fact is missing from the current store or menu data.';
    default:
      return 'Checked current MenuList data only. No external sites were scanned.';
  }
}

function countSummary(checks: PublicTruthCheckItem[]): PublicTruthCheckReport['summary'] {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present' || check.result === 'not_applicable') {
        summary.present += 1;
      } else if (check.result === 'missing') {
        summary.missing += 1;
      } else if (check.result === 'unclear') {
        summary.unclear += 1;
      } else if (check.result === 'not_checked') {
        summary.notChecked += 1;
      }
      return summary;
    },
    { present: 0, missing: 0, unclear: 0, notChecked: 0 },
  );
}

function getDomainState(store: Record<string, any>): OwnerPublicTruthReadinessReport['sourceSummary']['domainState'] {
  if (hasText(store.customDomain)) return store.domainVerified === false ? 'custom_domain_pending' : 'custom_domain_live';
  if (hasText(store.subdomain)) return 'subdomain_live';
  return 'missing';
}

function getCityOrArea(store: Record<string, any>): string {
  return [store.area, store.city, store.state].filter(hasText).join(', ') || store.city || store.area || '';
}

function getSourceKind(store: Record<string, any>): PublicTruthCheckSourceKind {
  const category = String(store.businessCategory || '').toLowerCase();
  const type = String(store.businessType || '').toLowerCase();
  if (category.includes('retail') || type.includes('retail')) return 'catalog';
  if (category.includes('service') || category.includes('health') || type.includes('service')) return 'service_list';
  return 'menu';
}

function getMenuUrl(
  store: Record<string, any>,
  projectSummary?: OwnerPublicTruthProjectSummary | null,
): string | undefined {
  if (!hasText(store.subdomain) && !hasText(store.customDomain)) return undefined;
  if (!projectSummary) return undefined;
  try {
    return generateProjectUrl(store.subdomain, store.customDomain, projectSummary.slug || projectSummary.name, projectSummary.isDefault);
  } catch {
    return undefined;
  }
}

function makeModule(module: OwnerPublicTruthReadinessModule): OwnerPublicTruthReadinessModule {
  return module;
}

function getModuleStatusFromChecks(
  checks: PublicTruthCheckItem[],
  ids: PublicTruthCheckFactId[],
): OwnerPublicTruthReadinessModuleStatus {
  const related = checks.filter((check) => ids.includes(check.id));
  if (!related.length) return 'not_checked';
  if (related.some((check) => check.result === 'missing')) return 'needs_attention';
  if (related.some((check) => check.result === 'unclear' || check.result === 'not_checked')) return 'check';
  return 'ready';
}

export function buildOwnerPublicTruthReadinessReport(input: BuildOwnerPublicTruthReadinessInput): OwnerPublicTruthReadinessReport {
  const store = (input.store || {}) as Record<string, any>;
  const projectSummaries = (input.projectSummaries || []).filter((project) => project?.deleted !== true);
  const activeProjects = projectSummaries.filter(isActiveProjectSummary);
  const primaryProject = pickPrimaryProject(projectSummaries, input.selectedProjectId);
  const projectData = (input.projectData || null) as Record<string, any> | null;
  const projectStats = getProjectStats(projectData);
  const projectDataChecked = Boolean(projectData && primaryProject?.projectId);
  const domainState = getDomainState(store);
  const hasPublicDomain = domainState !== 'missing';
  const hasPublicIdentity = hasLocalizedText(store.name)
    || hasLocalizedText(store.tenantName)
    || hasLocalizedText(store.publicPresence?.descriptor);
  const hasMenuSummary = Boolean(primaryProject && isActiveProjectSummary(primaryProject));
  const hasMenuContent = projectStats.itemCount > 0 || projectStats.categoryCount > 0;
  const hasMenuSource = hasMenuContent || hasMenuSummary;
  const pricesResult: PublicTruthCheckResult = projectDataChecked
    ? projectStats.itemCount === 0
      ? 'missing'
      : projectStats.pricedItemCount > 0
        ? 'present'
        : 'missing'
    : hasMenuSummary
      ? 'not_checked'
      : 'missing';
  const officialPageUrl = hasPublicDomain ? generateOBPUrl(store.subdomain, store.customDomain) : undefined;
  const menuUrl = getMenuUrl(store, primaryProject);
  const checkedProjectName = resolveLocalizedText(primaryProject?.name, '');
  const hasPublishedMenu = Boolean(
    store.lastPublishedAt
    || store.primaryProjectId
    || primaryProject?.lastPublishedAt
    || projectData?.lastPublishedAt
    || projectData?.menuVersion
    || hasMenuContent
  );
  const latestMenuTimestampMs = getMostRecentTimestampMs([
    projectData?.lastPublishedAt,
    projectData?.modifiedOn,
    projectData?.updatedAt,
    projectData?.createdOn,
    ...(getProjectFileTimestampCandidates(projectData)),
    primaryProject?.lastPublishedAt,
    (primaryProject as Record<string, any> | null)?.modifiedOn,
    (primaryProject as Record<string, any> | null)?.updatedAt,
    (primaryProject as Record<string, any> | null)?.createdOn,
    store.lastPublishedAt,
  ]);
  const menuDaysSinceUpdate = getDaysSince(latestMenuTimestampMs, input.generatedAt);
  const menuIndexDecision = evaluatePublicTruthIndexability(store, {
    surface: 'menu',
    hasPublishedMenu,
    projectData,
    projectSummary: primaryProject || null,
  });
  const officialPageIndexDecision = evaluatePublicTruthIndexability(store, {
    surface: 'obp',
    hasPublishedMenu,
    projectData,
    projectSummary: primaryProject || null,
  });
  const publicLinkResult: PublicTruthCheckResult = !hasPublicDomain
    ? 'missing'
    : domainState === 'custom_domain_pending'
      ? 'unclear'
      : 'present';
  const hasWorkingHours = hasAnyWorkingHours(store.workingHours);
  const hasLocation = hasLocationFact(store);
  const hasContact = hasContactFact(store);
  const hasCustomerAction = hasCustomerActionFact(store);
  const hasPhotos = hasPhotoFact(store, projectData, primaryProject);
  const photoStats = getPhotoStats(store, projectData, primaryProject);
  const publicPresence = store.publicPresence || {};
  const whatsAppVisible = publicPresence.showWhatsApp !== false;
  const hasWhatsAppNumber = whatsAppVisible && hasText(publicPresence.whatsappNumber);
  const machineReadableResult: PublicTruthCheckResult = menuIndexDecision.index || officialPageIndexDecision.index
    ? 'present'
    : hasPublicDomain
      ? 'unclear'
      : 'missing';

  const checks: PublicTruthCheckItem[] = [
    makeCheck('business_identity', hasPublicIdentity ? 'present' : 'missing', hasPublicIdentity ? 'menulist_store' : 'not_provided'),
    makeCheck('menu_or_service_source', hasMenuSource ? 'present' : 'missing', hasMenuSource ? 'menulist_project' : 'not_provided'),
    makeCheck('prices', pricesResult, pricesResult === 'present' ? 'menulist_project' : projectDataChecked ? 'not_provided' : 'not_checked'),
    makeCheck('hours', hasWorkingHours ? 'present' : 'missing', hasWorkingHours ? 'menulist_store' : 'not_provided'),
    makeCheck('location', hasLocation ? 'present' : 'missing', hasLocation ? 'menulist_store' : 'not_provided'),
    makeCheck('contact', hasContact ? 'present' : 'missing', hasContact ? 'menulist_store' : 'not_provided'),
    makeCheck('customer_actions', hasCustomerAction ? 'present' : 'missing', hasCustomerAction ? 'menulist_store' : 'not_provided'),
    makeCheck('public_link', publicLinkResult, publicLinkResult === 'missing' ? 'not_provided' : 'menulist_public_route'),
    makeCheck('photos', hasPhotos ? 'present' : 'missing', hasPhotos ? 'menulist_store' : 'not_provided'),
    makeCheck('machine_readable_source', machineReadableResult, machineReadableResult === 'present' ? 'menulist_index_gate' : 'not_checked'),
  ];
  const menuReadabilityStatus: OwnerPublicTruthReadinessModuleStatus = !hasMenuSource
    ? 'needs_attention'
    : !projectDataChecked
      ? 'check'
      : projectStats.itemCount > 0 && projectStats.categoryCount > 0 && pricesResult === 'present'
        ? 'ready'
        : projectStats.itemCount > 0
          ? 'check'
          : 'needs_attention';
  const priceAvailabilityStatus: OwnerPublicTruthReadinessModuleStatus = !hasMenuSource
    ? 'needs_attention'
    : !projectDataChecked
      ? 'check'
      : projectStats.itemCount === 0 || projectStats.pricedItemCount === 0
        ? 'needs_attention'
        : projectStats.pricedItemCount < projectStats.itemCount
          ? 'check'
          : projectStats.variantOrAttributeCount > 0 && projectStats.pricedVariantOrAttributeCount < projectStats.variantOrAttributeCount
            ? 'check'
            : projectStats.explicitAvailabilityCount === 0
              ? 'check'
              : 'ready';
  const menuPdfCleanupStatus: OwnerPublicTruthReadinessModuleStatus = !hasMenuSource
    || publicLinkResult === 'missing'
    ? 'needs_attention'
    : !projectDataChecked
      ? 'check'
      : projectStats.itemCount > 0 && publicLinkResult === 'present'
        ? 'ready'
        : 'check';
  const qrStatus: OwnerPublicTruthReadinessModuleStatus = !hasPublicDomain
    ? 'needs_attention'
    : domainState === 'custom_domain_pending'
      ? 'check'
      : officialPageUrl || menuUrl
        ? 'ready'
        : 'check';
  const whatsAppStatus: OwnerPublicTruthReadinessModuleStatus = hasWhatsAppNumber
    ? 'ready'
    : hasCustomerAction || hasContact
      ? 'check'
      : 'needs_attention';
  const photoStatus: OwnerPublicTruthReadinessModuleStatus = photoStats.logoPresent && (photoStats.coverPresent || photoStats.galleryPhotoCount > 0 || photoStats.projectImagePresent || photoStats.itemImageCount > 0)
    ? 'ready'
    : photoStats.visualSlotCount > 0
      ? 'check'
      : 'needs_attention';
  const customerQuestionCoverageStatus: OwnerPublicTruthReadinessModuleStatus = !hasMenuSource
    || !hasWorkingHours
    || !hasContact
    || !hasCustomerAction
    || publicLinkResult === 'missing'
    ? 'needs_attention'
    : pricesResult === 'present' && publicLinkResult === 'present'
      ? 'ready'
      : 'check';
  const bookingInquiryReadinessStatus: OwnerPublicTruthReadinessModuleStatus = !hasCustomerAction
    || !hasContact
    || !hasWorkingHours
    || publicLinkResult === 'missing'
    ? 'needs_attention'
    : hasLocation && publicLinkResult === 'present'
      ? 'ready'
      : 'check';
  const hasLiveOfficialPage = Boolean(officialPageUrl && publicLinkResult === 'present');
  const googleLinkUpdated = publicPresence.googleLinkUpdated === true;
  const googleProfileStatus: OwnerPublicTruthReadinessModuleStatus = googleLinkUpdated
    ? 'ready'
    : hasLiveOfficialPage
      ? 'check'
      : 'needs_attention';
  const menuFreshnessStatus: OwnerPublicTruthReadinessModuleStatus = !hasMenuSource
    ? 'needs_attention'
    : menuDaysSinceUpdate === null
      ? 'check'
      : menuDaysSinceUpdate <= 30
        ? 'ready'
        : menuDaysSinceUpdate <= 90
          ? 'check'
          : 'needs_attention';
  const basicsNeedsDomain = publicLinkResult !== 'present';
  const basicsNeedsMenu = !hasMenuSource;
  const basicsFixHref = basicsNeedsDomain
    ? buildBusinessSettingsFixHref('search-discovery', 'customer-link')
    : basicsNeedsMenu
      ? buildProjectFixHref(primaryProject?.projectId, 'editor')
      : buildBusinessSettingsFixHref('business-profile', 'identity');
  const basicsMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = basicsNeedsDomain
    ? 'domain_settings'
    : basicsNeedsMenu
      ? 'menu_tab'
      : 'basic_settings';
  const qrFixHref = qrStatus === 'ready'
    ? '/qr-code?focus=qr'
    : buildBusinessSettingsFixHref('search-discovery', 'customer-link');
  const menuQualityAction = pricesResult !== 'present'
    ? 'prices'
    : projectStats.describedItemCount < projectStats.itemCount
      ? 'descriptions'
      : 'editor';
  const menuFixHref = buildProjectFixHref(primaryProject?.projectId, menuQualityAction);
  const priceAvailabilityFixHref = buildProjectFixHref(
    primaryProject?.projectId,
    pricesResult !== 'present' ? 'prices' : 'availability',
  );
  const menuPdfCleanupFixHref = !hasMenuSource
    ? menuFixHref
    : publicLinkResult !== 'present'
      ? buildBusinessSettingsFixHref('search-discovery', 'customer-link')
      : menuFixHref;
  const menuPdfCleanupMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = !hasMenuSource
    ? 'menu_tab'
    : publicLinkResult !== 'present'
      ? 'domain_settings'
      : 'menu_tab';
  const photoFixHref = photoStats.logoPresent
    ? buildBusinessSettingsFixHref('business-profile', 'official-page-photos')
    : buildBusinessSettingsFixHref('business-profile', 'logo');
  const photoMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = photoStats.logoPresent
    ? 'official_page'
    : 'basic_settings';
  const customerQuestionCoverageFixHref = !hasMenuSource
    ? menuFixHref
    : !hasWorkingHours
      ? buildBusinessSettingsFixHref('hours', 'working-hours')
      : (!hasContact || !hasCustomerAction)
        ? buildBusinessSettingsFixHref('business-profile', 'official-page-actions')
        : publicLinkResult !== 'present'
          ? buildBusinessSettingsFixHref('search-discovery', 'customer-link')
          : menuFixHref;
  const customerQuestionCoverageMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = !hasMenuSource
    ? 'menu_tab'
    : !hasWorkingHours
      ? 'hours_edit'
      : (!hasContact || !hasCustomerAction)
        ? 'official_page'
        : publicLinkResult !== 'present'
        ? 'domain_settings'
        : 'menu_tab';
  const bookingInquiryFixHref = (!hasCustomerAction || !hasContact)
    ? buildBusinessSettingsFixHref('business-profile', 'official-page-actions')
    : !hasWorkingHours
      ? buildBusinessSettingsFixHref('hours', 'working-hours')
      : !hasLocation
        ? buildBusinessSettingsFixHref('business-profile', 'location')
        : publicLinkResult !== 'present'
          ? buildBusinessSettingsFixHref('search-discovery', 'customer-link')
          : buildBusinessSettingsFixHref('business-profile', 'official-page-actions');
  const bookingInquiryMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = (!hasCustomerAction || !hasContact)
    ? 'official_page'
    : !hasWorkingHours
      ? 'hours_edit'
      : !hasLocation
        ? 'basic_settings'
        : publicLinkResult !== 'present'
          ? 'domain_settings'
          : 'official_page';
  const googleFixHref = hasLiveOfficialPage
    ? buildBusinessSettingsFixHref('search-discovery', 'presence-monitor')
    : buildBusinessSettingsFixHref('search-discovery', 'customer-link');
  const googleMobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget = hasLiveOfficialPage
    ? 'presence_monitor'
    : 'domain_settings';
  const modules: OwnerPublicTruthReadinessModule[] = [
    makeModule({
      id: 'public_truth_basics',
      status: getModuleStatusFromChecks(checks, ['business_identity', 'menu_or_service_source', 'public_link', 'contact', 'customer_actions']),
      title: 'Public truth basics',
      description: 'Business name, current source, contact, action, and customer link.',
      evidenceText: 'Checked current MenuList store and selected/default menu data only.',
      fixHref: basicsFixHref,
      mobileFixTarget: basicsMobileFixTarget,
      actionLabel: 'Review business facts',
      relatedCheckIds: ['business_identity', 'menu_or_service_source', 'public_link', 'contact', 'customer_actions'],
    }),
    makeModule({
      id: 'qr_link_health',
      status: qrStatus,
      title: 'QR link health',
      description: qrStatus === 'ready'
        ? 'A MenuList customer link is ready for QR and sharing.'
        : 'Set a live customer link before relying on QR or printed materials.',
      evidenceText: 'Checked MenuList public link settings only. QR scans or external pages were not tracked.',
      fixHref: qrFixHref,
      mobileFixTarget: qrStatus === 'ready' ? 'share_tab' : 'domain_settings',
      actionLabel: qrStatus === 'ready' ? 'Open QR tools' : 'Set customer link',
      relatedCheckIds: ['public_link', 'menu_or_service_source'],
    }),
    makeModule({
      id: 'menu_service_readability',
      status: menuReadabilityStatus,
      title: 'Menu or service clarity',
      description: menuReadabilityStatus === 'ready'
        ? 'The selected/default menu has categories, items, and prices.'
        : 'Review categories, items, and prices in the selected/default menu.',
      evidenceText: projectDataChecked
        ? 'Checked selected/default MenuList menu content. No uploaded file or external page was parsed.'
        : 'Checked MenuList menu summary. Open the menu once for deeper item and price checks.',
      fixHref: menuFixHref,
      mobileFixTarget: 'menu_tab',
      actionLabel: 'Review menu',
      relatedCheckIds: ['menu_or_service_source', 'prices'],
    }),
    makeModule({
      id: 'price_availability_gap',
      status: priceAvailabilityStatus,
      title: 'Price and availability clarity',
      description: priceAvailabilityStatus === 'ready'
        ? 'Prices, variant prices, and item availability are clear in the selected/default MenuList menu.'
        : 'Review missing prices, variant prices, sold-out state, or quote path before customers rely on this source.',
      evidenceText: 'Checked selected/default MenuList item prices, variant prices, and item availability flags only. POS, live inventory, ordering providers, external menus, and AI/search were not checked.',
      fixHref: priceAvailabilityFixHref,
      mobileFixTarget: 'menu_tab',
      actionLabel: priceAvailabilityStatus === 'ready' ? 'Review prices' : 'Fix prices',
      relatedCheckIds: ['menu_or_service_source', 'prices'],
    }),
    makeModule({
      id: 'menu_pdf_cleanup',
      status: menuPdfCleanupStatus,
      title: 'PDF cleanup readiness',
      description: menuPdfCleanupStatus === 'ready'
        ? 'A MenuList menu and customer link are ready to replace old PDFs.'
        : 'Prepare a current MenuList source and customer link before replacing old PDFs, QR targets, or printed PDF references.',
      evidenceText: 'Checked selected/default MenuList menu content and customer link readiness only. External PDFs, file uploads, QR scans, print materials, Google, websites, social links, OCR, and AI/search were not checked.',
      fixHref: menuPdfCleanupFixHref,
      mobileFixTarget: menuPdfCleanupMobileFixTarget,
      actionLabel: menuPdfCleanupStatus === 'ready' ? 'Review replacement link' : 'Prepare customer link',
      relatedCheckIds: ['menu_or_service_source', 'public_link', 'prices'],
    }),
    makeModule({
      id: 'whatsapp_action_link',
      status: whatsAppStatus,
      title: 'WhatsApp action link',
      description: hasWhatsAppNumber
        ? 'WhatsApp is available as a customer action.'
        : 'Add a WhatsApp number or keep another clear customer action available.',
      evidenceText: 'Checked MenuList Official Business Page action settings only. WhatsApp was not opened.',
      fixHref: buildBusinessSettingsFixHref('business-profile', 'official-page-actions'),
      mobileFixTarget: 'official_page',
      actionLabel: 'Review actions',
      relatedCheckIds: ['contact', 'customer_actions'],
    }),
    makeModule({
      id: 'hours_readiness',
      status: hasWorkingHours ? 'ready' : 'needs_attention',
      title: 'Hours readiness',
      description: hasWorkingHours
        ? 'Regular hours are present in MenuList.'
        : 'Add regular hours so customers know when to visit or contact you.',
      evidenceText: 'Checked MenuList store working hours only. Google, maps, websites, and holiday calendars were not inspected.',
      fixHref: buildBusinessSettingsFixHref('hours', 'working-hours'),
      mobileFixTarget: 'hours_edit',
      actionLabel: 'Review hours',
      relatedCheckIds: ['hours'],
    }),
    makeModule({
      id: 'photo_visual_identity',
      status: photoStatus,
      title: 'Photo and visual identity',
      description: photoStatus === 'ready'
        ? 'Logo plus at least one customer-facing visual is present.'
        : 'Add a logo, cover, business photo, or item/service photo.',
      evidenceText: 'Checked MenuList logo, Official Business Page photos, project image, and loaded item images only.',
      fixHref: photoFixHref,
      mobileFixTarget: photoMobileFixTarget,
      actionLabel: 'Review photos',
      relatedCheckIds: ['photos'],
    }),
    makeModule({
      id: 'customer_question_coverage',
      status: customerQuestionCoverageStatus,
      title: 'Customer question coverage',
      description: customerQuestionCoverageStatus === 'ready'
        ? 'Core customer questions have clear MenuList facts behind them.'
        : 'Review the facts customers ask for most: offer, hours, price, location, contact, and action.',
      evidenceText: 'Checked MenuList business settings and selected/default menu only. Customer chats, external search, and AI answers were not checked.',
      fixHref: customerQuestionCoverageFixHref,
      mobileFixTarget: customerQuestionCoverageMobileFixTarget,
      actionLabel: customerQuestionCoverageStatus === 'ready' ? 'Review customer source' : 'Review answers',
      relatedCheckIds: ['menu_or_service_source', 'hours', 'prices', 'location', 'contact', 'customer_actions', 'public_link'],
    }),
    makeModule({
      id: 'booking_inquiry_readiness',
      status: bookingInquiryReadinessStatus,
      title: 'Booking and inquiry readiness',
      description: bookingInquiryReadinessStatus === 'ready'
        ? 'Customers have a clear action path with contact, hours, location, and customer link behind it.'
        : 'Review the action path customers use to order, book, reserve, call, message, request a quote, or visit.',
      evidenceText: 'Checked MenuList Official Business Page action settings, contact, hours, location, and customer link only. Booking providers, calendars, messages, and payment systems were not checked.',
      fixHref: bookingInquiryFixHref,
      mobileFixTarget: bookingInquiryMobileFixTarget,
      actionLabel: bookingInquiryReadinessStatus === 'ready' ? 'Review actions' : 'Fix action path',
      relatedCheckIds: ['customer_actions', 'contact', 'hours', 'location', 'public_link'],
    }),
    makeModule({
      id: 'google_profile_handoff',
      status: googleProfileStatus,
      title: 'Google profile handoff',
      description: googleLinkUpdated
        ? 'Owner confirmed the official link was added to Google Business Profile.'
        : hasLiveOfficialPage
          ? 'Copy the official customer link into Google Business Profile when profile access is available.'
          : 'Create a live customer link before using Google Business Profile handoff.',
      evidenceText: googleLinkUpdated
        ? 'Checked the owner-confirmed Google link status in MenuList. Google was not scanned.'
        : hasLiveOfficialPage
          ? 'Official page link is ready in MenuList. Google was not scanned or changed.'
          : 'No live official page link is ready from current MenuList data. Google was not scanned.',
      fixHref: googleFixHref,
      mobileFixTarget: googleMobileFixTarget,
      actionLabel: googleLinkUpdated ? 'Review Google link' : 'Copy Google link',
      relatedCheckIds: ['public_link', 'customer_actions'],
    }),
    makeModule({
      id: 'menu_freshness',
      status: menuFreshnessStatus,
      title: 'Menu freshness',
      description: menuFreshnessStatus === 'ready'
        ? 'The selected/default menu has a recent MenuList update.'
        : 'Review the menu if prices, items, or availability changed recently.',
      evidenceText: getMenuFreshnessEvidenceText(menuDaysSinceUpdate),
      fixHref: buildProjectFixHref(primaryProject?.projectId, 'editor'),
      mobileFixTarget: 'menu_tab',
      actionLabel: 'Review menu',
      relatedCheckIds: ['menu_or_service_source', 'prices'],
    }),
  ];

  const missingRequiredChecks = checks.filter((check) =>
    check.required && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );
  const status = missingRequiredChecks.length === 0
    ? 'ready'
    : missingRequiredChecks.length >= 3 || checks.some((check) => check.id === 'business_identity' && check.result !== 'present')
      ? 'missing_basics'
      : 'unclear';

  return {
    mode: 'menulist_owner',
    generatedAt: input.generatedAt || new Date().toISOString(),
    status,
    businessName: getStoreContextName(store, 'Business'),
    cityOrArea: getCityOrArea(store),
    sourceKind: getSourceKind(store),
    checks,
    modules,
    summary: countSummary(checks),
    selectedProjectId: input.selectedProjectId || undefined,
    primaryProjectId: primaryProject?.projectId,
    sourceSummary: {
      activeProjectCount: activeProjects.length,
      checkedProjectName,
      domainState,
      externalSourcesFetched: false,
      projectDataChecked,
    },
    publicLinks: {
      officialPageUrl,
      menuUrl,
    },
    indexDecisions: {
      menu: menuIndexDecision,
      officialPage: officialPageIndexDecision,
    },
    nextAction: {
      href: status === 'ready'
        ? (officialPageUrl || menuUrl || '/use-menulist')
        : '/business-settings',
      type: status === 'ready' ? 'create_customer_link' : 'complete_business_facts',
    },
    boundaries: {
      externalSourcesFetched: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
