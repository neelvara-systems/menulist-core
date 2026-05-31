import type { AssetManifestEntry, AssetOutputRole, AssetSlot } from '../../schemas/asset-schema';
import {
  allAssetSlots,
  fileExists,
  findTrackedPublicAssetFiles,
  formatKb,
  getFileSizeBytes,
  getOutputBudgetKb,
  getWatchedSourceHashes,
  loadManifest,
} from './asset-runtime';

export type AuditGroup =
  | 'Missing'
  | 'Stale'
  | 'Oversized'
  | 'Approval Required'
  | 'Disconnected'
  | 'Passed';

export type AuditSeverity = 'error' | 'warning' | 'info';

export type AuditFinding = {
  severity: AuditSeverity;
  slotId?: string;
  message: string;
  evidence?: string;
};

export type AssetAuditReport = {
  groups: Record<AuditGroup, AuditFinding[]>;
  errorCount: number;
  warningCount: number;
};

const blockingStatuses = new Set(['generated', 'approved']);

function emptyGroups(): Record<AuditGroup, AuditFinding[]> {
  return {
    Missing: [],
    Stale: [],
    Oversized: [],
    'Approval Required': [],
    Disconnected: [],
    Passed: [],
  };
}

function addFinding(
  groups: Record<AuditGroup, AuditFinding[]>,
  group: AuditGroup,
  finding: AuditFinding,
): void {
  groups[group].push(finding);
}

function shouldBlockOnEntry(entry: AssetManifestEntry, slot: AssetSlot): boolean {
  return slot.blocking || blockingStatuses.has(entry.status);
}

function auditSlotManifest(groups: Record<AuditGroup, AuditFinding[]>): void {
  const slots = allAssetSlots();
  const manifest = loadManifest();

  for (const slot of slots) {
    const entry = manifest.assets[slot.id];
    if (!entry) {
      addFinding(groups, 'Missing', {
        severity: slot.blocking ? 'error' : 'warning',
        slotId: slot.id,
        message: 'Slot has no manifest entry.',
        evidence: 'packages/asset-factory/manifest/assets.json',
      });
      continue;
    }

    if (entry.slot !== slot.id) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        slotId: slot.id,
        message: `Manifest slot field points to ${entry.slot}.`,
        evidence: 'packages/asset-factory/manifest/assets.json',
      });
    }

    if (entry.brand !== slot.brand) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        slotId: slot.id,
        message: `Manifest brand ${entry.brand} does not match slot brand ${slot.brand}.`,
        evidence: 'packages/asset-factory/manifest/assets.json',
      });
    }

    if (entry.status === 'missing') {
      addFinding(groups, 'Missing', {
        severity: slot.blocking ? 'error' : 'warning',
        slotId: slot.id,
        message: 'Planned slot is intentionally missing.',
        evidence: slot.destination,
      });
    }
  }

  const slotIds = new Set(slots.map((slot) => slot.id));
  for (const manifestId of Object.keys(manifest.assets)) {
    if (!slotIds.has(manifestId)) {
      addFinding(groups, 'Disconnected', {
        severity: 'warning',
        slotId: manifestId,
        message: 'Manifest entry has no slot declaration.',
        evidence: 'packages/asset-factory/slots',
      });
    }
  }
}

function auditFiles(groups: Record<AuditGroup, AuditFinding[]>): void {
  const manifest = loadManifest();
  const slotsById = new Map(allAssetSlots().map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;

    for (const [role, repoPath] of Object.entries(entry.files)) {
      if (!repoPath) continue;

      if (!fileExists(repoPath)) {
        addFinding(groups, 'Missing', {
          severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
          slotId,
          message: `Manifest ${role} file is missing.`,
          evidence: repoPath,
        });
        continue;
      }

      const budgetKb = getOutputBudgetKb(slot, role as AssetOutputRole) ?? Math.max(...slot.outputs.map((output) => output.maxKb));
      if (budgetKb) {
        const sizeBytes = getFileSizeBytes(repoPath);
        const actualKb = Math.ceil(sizeBytes / 1024);
        if (actualKb > budgetKb) {
          addFinding(groups, 'Oversized', {
            severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
            slotId,
            message: `${role} is ${formatKb(sizeBytes)} and exceeds ${budgetKb} KB.`,
            evidence: repoPath,
          });
        }
      }
    }

    const isVideo = slot.type === 'loop-video' || slot.type === 'product-demo-clip' || slot.type === 'abstract-motion-video';
    if (isVideo && blockingStatuses.has(entry.status)) {
      if (!entry.files.poster) {
        addFinding(groups, 'Missing', {
          severity: 'error',
          slotId,
          message: 'Generated video slot is missing a poster asset.',
          evidence: slot.destination,
        });
      }
      if (!entry.files.fallback) {
        addFinding(groups, 'Missing', {
          severity: 'error',
          slotId,
          message: 'Generated video slot is missing a fallback asset.',
          evidence: slot.destination,
        });
      }
    }
  }
}

function auditFingerprints(groups: Record<AuditGroup, AuditFinding[]>): void {
  const manifest = loadManifest();
  const slotsById = new Map(allAssetSlots().map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;
    if (entry.status === 'missing' || entry.status === 'retired') continue;

    const expected = entry.sourceFingerprint?.files ?? {};
    const current = getWatchedSourceHashes(slot);
    const expectedPaths = Object.keys(expected);

    if (expectedPaths.length === 0) {
      addFinding(groups, 'Stale', {
        severity: 'warning',
        slotId,
        message: 'No locked source fingerprint yet.',
        evidence: slot.sources.join(', '),
      });
      continue;
    }

    const changed = Object.entries(current).filter(([repoPath, hash]) => expected[repoPath] !== hash);
    if (changed.length > 0) {
      addFinding(groups, 'Stale', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: `${changed.length} watched source file(s) changed since manifest approval.`,
        evidence: changed.map(([repoPath]) => repoPath).join(', '),
      });
    }
  }
}

function auditBriefs(groups: Record<AuditGroup, AuditFinding[]>): void {
  const manifest = loadManifest();

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    if (!entry.brief) {
      addFinding(groups, 'Missing', {
        severity: 'warning',
        slotId,
        message: 'Manifest entry has no brief path.',
        evidence: 'packages/asset-factory/briefs',
      });
      continue;
    }

    if (!fileExists(entry.brief)) {
      addFinding(groups, 'Missing', {
        severity: 'warning',
        slotId,
        message: 'Brief has not been generated yet.',
        evidence: entry.brief,
      });
    }
  }
}

function auditApprovals(groups: Record<AuditGroup, AuditFinding[]>): void {
  const manifest = loadManifest();
  const slotsById = new Map(allAssetSlots().map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;

    if (slot.approval === 'automatic') continue;
    if (entry.status === 'approved' && entry.review.decision === 'approved') continue;

    addFinding(groups, 'Approval Required', {
      severity: 'warning',
      slotId,
      message: `${slot.approval} slot is not approved.`,
      evidence: entry.brief || slot.destination,
    });
  }
}

function auditDisconnectedPublicFiles(groups: Record<AuditGroup, AuditFinding[]>): void {
  const manifest = loadManifest();
  const declaredFiles = new Set<string>();

  for (const entry of Object.values(manifest.assets)) {
    for (const repoPath of Object.values(entry.files)) {
      if (repoPath) declaredFiles.add(repoPath);
    }
  }

  for (const repoPath of findTrackedPublicAssetFiles()) {
    if (!declaredFiles.has(repoPath)) {
      addFinding(groups, 'Disconnected', {
        severity: 'info',
        message: 'Public asset is not connected to an asset slot.',
        evidence: repoPath,
      });
    }
  }
}

export function buildAuditReport(): AssetAuditReport {
  const groups = emptyGroups();

  auditSlotManifest(groups);
  auditFiles(groups);
  auditFingerprints(groups);
  auditBriefs(groups);
  auditApprovals(groups);
  auditDisconnectedPublicFiles(groups);

  const findings = Object.values(groups).flat();
  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  if (errorCount === 0) {
    groups.Passed.push({
      severity: 'info',
      message: 'No blocking generated or approved asset problems were found.',
    });
  }

  return { groups, errorCount, warningCount };
}

export function printAuditReport(report: AssetAuditReport): void {
  console.log('Website Asset Operating System Audit');
  console.log('Boundary: internal separate-product architecture, public runtime disabled');
  console.log(`Summary: ${report.errorCount} error(s), ${report.warningCount} warning(s)`);

  for (const [group, findings] of Object.entries(report.groups)) {
    console.log(`\n## ${group}`);
    if (findings.length === 0) {
      console.log('- none');
      continue;
    }

    for (const finding of findings) {
      const slot = finding.slotId ? ` [${finding.slotId}]` : '';
      const evidence = finding.evidence ? ` (${finding.evidence})` : '';
      console.log(`- ${finding.severity.toUpperCase()}${slot}: ${finding.message}${evidence}`);
    }
  }
}
