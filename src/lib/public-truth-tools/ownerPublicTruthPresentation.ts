import type {
  OwnerPublicTruthReadinessMobileFixTarget,
  OwnerPublicTruthReadinessModule,
  OwnerPublicTruthReadinessModuleStatus,
  OwnerPublicTruthReadinessReport,
  OwnerPublicTruthSetupJob,
} from './ownerPublicTruthReadiness';
import type {
  PublicTruthCheckItem,
  PublicTruthCheckResult,
} from './publicTruthCheckTypes';
import type { DashboardTranslator } from '@lib/analytics/ownerDashboardPresentation';

const FACT_FIX_HREFS: Record<PublicTruthCheckItem['id'], string> = {
  business_identity: '/business-settings?section=business-profile&focus=identity',
  menu_or_service_source: '/projects?view=editor&focus=menu-readiness&qualityAction=editor',
  prices: '/projects?view=editor&focus=menu-readiness&qualityAction=prices',
  hours: '/business-settings?section=hours&focus=working-hours',
  location: '/business-settings?section=business-profile&focus=location',
  contact: '/business-settings?section=business-profile&focus=contact',
  customer_actions: '/business-settings?section=business-profile&focus=official-page-actions',
  public_link: '/business-settings?section=search-discovery&focus=customer-link',
  photos: '/business-settings?section=business-profile&focus=official-page-photos',
  machine_readable_source: '/business-settings?section=search-discovery&focus=customer-link',
};

export type OwnerPublicTruthTone = 'default' | 'error' | 'success' | 'warning';

export interface OwnerPublicTruthStatusPresentation {
  label: string;
  message: string;
  tone: OwnerPublicTruthTone;
}

export function getOwnerPublicTruthStatusPresentation(
  status: OwnerPublicTruthReadinessReport['status'],
  t: DashboardTranslator,
): OwnerPublicTruthStatusPresentation {
  return {
    label: t(`businessHealth.publicTruth.status.${status}.label`),
    message: t(`businessHealth.publicTruth.status.${status}.message`),
    tone: status === 'ready' ? 'success' : status === 'missing_basics' ? 'error' : 'warning',
  };
}

export function getOwnerPublicTruthResultLabel(
  result: PublicTruthCheckResult,
  t: DashboardTranslator,
): string {
  return t(`businessHealth.publicTruth.results.${result}`);
}

export function getOwnerPublicTruthModuleStatusLabel(
  status: OwnerPublicTruthReadinessModuleStatus,
  t: DashboardTranslator,
): string {
  return t(`businessHealth.publicTruth.moduleStatus.${status}`);
}

export function getOwnerPublicTruthFactPresentation(
  check: PublicTruthCheckItem,
  t: DashboardTranslator,
) {
  const evidenceKey = check.result === 'not_checked' && check.id === 'prices'
    ? 'priceNotLoaded'
    : check.evidence;
  return {
    evidence: t(`businessHealth.publicTruth.evidence.${evidenceKey}`),
    label: t(`businessHealth.publicTruth.facts.${check.id}`),
    resultLabel: getOwnerPublicTruthResultLabel(check.result, t),
  };
}

export function getOwnerPublicTruthTargetActionLabel(
  target: OwnerPublicTruthReadinessMobileFixTarget,
  t: DashboardTranslator,
): string {
  return t(`businessHealth.publicTruth.targetActions.${target}`);
}

export function getOwnerPublicTruthModulePresentation(
  readinessModule: Pick<OwnerPublicTruthReadinessModule, 'id' | 'mobileFixTarget' | 'status'>,
  t: DashboardTranslator,
) {
  return {
    actionLabel: getOwnerPublicTruthTargetActionLabel(readinessModule.mobileFixTarget, t),
    description: t(`businessHealth.publicTruth.modules.${readinessModule.id}.description`),
    evidence: t(`businessHealth.publicTruth.moduleEvidence.${readinessModule.status}`),
    statusLabel: getOwnerPublicTruthModuleStatusLabel(readinessModule.status, t),
    title: t(`businessHealth.publicTruth.modules.${readinessModule.id}.title`),
  };
}

export function getOwnerPublicTruthSetupJobPresentation(
  job: OwnerPublicTruthSetupJob,
  t: DashboardTranslator,
) {
  const modulePresentation = getOwnerPublicTruthModulePresentation(job, t);
  return {
    ...modulePresentation,
    reason: t(`businessHealth.publicTruth.setupReason.${job.status}`),
  };
}

export function getOwnerPublicTruthPrimaryAction(
  report: OwnerPublicTruthReadinessReport,
  t: DashboardTranslator,
) {
  if (report.status === 'ready') {
    const publicUrl = report.publicLinks.officialPageUrl || report.publicLinks.menuUrl;
    return {
      external: Boolean(publicUrl),
      href: publicUrl || '/use-menulist',
      label: t(publicUrl
        ? 'businessHealth.publicTruth.actions.openCustomerSource'
        : 'businessHealth.publicTruth.actions.openShareTools'),
    };
  }

  const moduleAction = report.modules.find((module) => module.status !== 'ready');
  if (moduleAction) {
    return {
      external: false,
      href: moduleAction.fixHref,
      label: getOwnerPublicTruthTargetActionLabel(moduleAction.mobileFixTarget, t),
    };
  }

  const check = report.checks.find((item) => item.result !== 'present' && item.result !== 'not_applicable')
    || report.checks[0];
  const fact = check?.id || 'business_identity';
  return {
    external: false,
    href: FACT_FIX_HREFS[fact],
    label: t('businessHealth.publicTruth.actions.fixFact', {
      fact: t(`businessHealth.publicTruth.facts.${fact}`),
    }),
  };
}
