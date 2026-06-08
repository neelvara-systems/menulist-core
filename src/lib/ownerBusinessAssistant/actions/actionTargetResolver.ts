import type { OwnerBusinessAssistantActionRequest } from '../schemas';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';

const extractProjectsSummaryMap = (
  summaryDocData?: Record<string, any> | null,
): Record<string, Record<string, any>> => {
  if (!summaryDocData) return {};

  const nestedProjects = summaryDocData.projects;
  if (nestedProjects && typeof nestedProjects === 'object' && !Array.isArray(nestedProjects)) {
    return nestedProjects as Record<string, Record<string, any>>;
  }

  return Object.fromEntries(
    Object.entries(summaryDocData)
      .filter(([key]) => key.startsWith('projects.'))
      .map(([key, value]) => [key.replace('projects.', ''), value as Record<string, any>]),
  );
};

const isActiveProjectRecord = (project: Record<string, any> | null | undefined) =>
  Boolean(project && project.deleted !== true && project.active !== false);

export async function validateOwnerBusinessAssistantProjectScope(params: {
  tId: string | number;
  sId: string | number;
  projectId?: string | null;
}) {
  const projectId = params.projectId ? String(params.projectId) : '';
  if (!projectId) {
    return { valid: false, reason: 'missing_project' as const, readCount: 0 };
  }

  const summarySnap = await firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`projects_${params.sId}`)
    .get();
  const summaryProjects = summarySnap.exists ? extractProjectsSummaryMap(summarySnap.data() as Record<string, any>) : {};
  if (summaryProjects[projectId]) {
    return isActiveProjectRecord(summaryProjects[projectId])
      ? { valid: true as const, readCount: 1 }
      : { valid: false as const, reason: 'inactive_project' as const, readCount: 1 };
  }

  const projectSnap = await firestoreAdmin
    .collection(DB_COLLECTIONS.PROJECTS)
    .doc(String(params.tId))
    .collection(String(params.sId))
    .doc(projectId)
    .get();

  if (!projectSnap.exists) {
    return { valid: false as const, reason: 'not_found' as const, readCount: 2 };
  }

  return isActiveProjectRecord(projectSnap.data())
    ? { valid: true as const, readCount: 2 }
    : { valid: false as const, reason: 'inactive_project' as const, readCount: 2 };
}

export function resolveOwnerBusinessAssistantTarget(params: {
  tId: string | number;
  sId: string | number;
  request: OwnerBusinessAssistantActionRequest;
}) {
  const targetKind = params.request.targetKind || 'store';
  const targetId = params.request.targetId || params.request.projectId || String(params.sId);
  return {
    tId: String(params.tId),
    sId: String(params.sId),
    projectId: params.request.projectId || null,
    targetKind,
    targetId,
  };
}

export function resolveOwnerBusinessAssistantHref(params: {
  actionType: string;
  projectId?: string;
  targetId?: string;
}) {
  switch (params.actionType) {
    case 'navigate_business_health':
    case 'open_business_health_detail':
      return '/business-health';
    case 'navigate_analytics':
    case 'open_dashboard_analytics':
      return '/dashboard';
    case 'navigate_menu':
    case 'open_menu_editor_target':
    case 'open_publish_screen':
      return params.projectId ? `/projects/${encodeURIComponent(params.projectId)}` : '/projects';
    case 'open_feedback_reviews':
      return '/feedback';
    case 'open_business_settings':
    case 'open_hours_settings':
    case 'open_public_info_settings':
    case 'open_customer_app_settings':
    case 'open_domain_settings':
    case 'open_pos_sync_settings':
    case 'open_compliance_pages':
      return '/business-settings';
    case 'open_qr_share':
      return '/qr-code';
    case 'open_digital_screen_settings':
      return '/use-menulist';
    case 'open_locations':
      return '/locations';
    case 'open_billing':
      return '/billing';
    case 'open_users_permissions':
      return '/users/permissions';
    default:
      return undefined;
  }
}
