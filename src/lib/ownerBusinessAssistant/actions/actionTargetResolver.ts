import type { OwnerBusinessAssistantActionRequest } from '../schemas';

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
