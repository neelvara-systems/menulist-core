import type { AssetBrand, AssetManifestEntry, AssetOutputRole, AssetSlot } from '../../schemas/asset-schema';
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

function selectedSlots(brand?: AssetBrand): AssetSlot[] {
  return brand ? allAssetSlots().filter((slot) => slot.brand === brand) : allAssetSlots();
}

function auditSlotManifest(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const slots = selectedSlots(brand);
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

    if (blockingStatuses.has(entry.status)) {
      const declaredPaths = Object.values(entry.files).filter(Boolean);
      if (!declaredPaths.includes(slot.destination)) {
        addFinding(groups, 'Disconnected', {
          severity: 'error',
          slotId: slot.id,
          message: 'Manifest does not declare the slot destination.',
          evidence: slot.destination,
        });
      }

      for (const output of slot.outputs) {
        if (!entry.files[output.role]) {
          addFinding(groups, 'Missing', {
            severity: 'error',
            slotId: slot.id,
            message: `Manifest is missing required ${output.role} output.`,
            evidence: slot.destination,
          });
        }
      }
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
    if (brand && manifest.assets[manifestId]?.brand !== brand) continue;
    if (!slotIds.has(manifestId)) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        slotId: manifestId,
        message: 'Manifest entry has no slot declaration.',
        evidence: 'packages/asset-factory/slots',
      });
    }
  }
}

function auditFiles(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const manifest = loadManifest();
  const slotsById = new Map(selectedSlots(brand).map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;

    for (const [role, repoPath] of Object.entries(entry.files)) {
      if (!repoPath) continue;

      const outputContract = slot.outputs.find((output) => output.role === role);
      if (outputContract && !repoPath.toLowerCase().endsWith(`.${outputContract.format}`)) {
        addFinding(groups, 'Disconnected', {
          severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
          slotId,
          message: `Manifest ${role} file does not match required ${outputContract.format} format.`,
          evidence: repoPath,
        });
      }

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

function auditFingerprints(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const manifest = loadManifest();
  const slotsById = new Map(selectedSlots(brand).map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;
    if (entry.status === 'missing' || entry.status === 'retired') continue;

    const missingSources = slot.sources.filter((repoPath) => !fileExists(repoPath));
    if (missingSources.length > 0) {
      addFinding(groups, 'Missing', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: `${missingSources.length} declared source file(s) are missing.`,
        evidence: missingSources.join(', '),
      });
    }

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

    const driftedPaths = new Set([
      ...Object.entries(current)
        .filter(([repoPath, hash]) => expected[repoPath] !== hash)
        .map(([repoPath]) => repoPath),
      ...expectedPaths.filter((repoPath) => current[repoPath] === undefined),
    ]);
    if (driftedPaths.size > 0) {
      addFinding(groups, 'Stale', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: `${driftedPaths.size} watched source file(s) changed, appeared, or disappeared since manifest approval.`,
        evidence: Array.from(driftedPaths).join(', '),
      });
    }
  }
}

function auditBriefs(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const manifest = loadManifest();
  const slotsById = new Map(selectedSlots(brand).map((slot) => [slot.id, slot]));
  const briefOwners = new Map<string, string[]>();

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;

    if (!entry.brief) {
      addFinding(groups, 'Missing', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: 'Manifest entry has no brief path.',
        evidence: 'packages/asset-factory/briefs',
      });
      continue;
    }

    const expectedBriefPath = `packages/asset-factory/briefs/${slotId}.md`;
    if (entry.brief !== expectedBriefPath) {
      addFinding(groups, 'Disconnected', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: 'Manifest brief path does not match the slot ID.',
        evidence: entry.brief,
      });
    }

    briefOwners.set(entry.brief, [...(briefOwners.get(entry.brief) ?? []), slotId]);

    if (!fileExists(entry.brief)) {
      addFinding(groups, 'Missing', {
        severity: shouldBlockOnEntry(entry, slot) ? 'error' : 'warning',
        slotId,
        message: 'Brief has not been generated yet.',
        evidence: entry.brief,
      });
    }
  }

  briefOwners.forEach((owners, briefPath) => {
    if (owners.length > 1) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        message: `Asset brief is owned by multiple slots: ${owners.join(', ')}.`,
        evidence: briefPath,
      });
    }
  });
}

function auditApprovals(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const manifest = loadManifest();
  const slotsById = new Map(selectedSlots(brand).map((slot) => [slot.id, slot]));

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    const slot = slotsById.get(slotId);
    if (!slot) continue;

    const reviewScores = [entry.review.strategicFit, entry.review.brandFit, entry.review.narrativeClarity];
    const scoresAreValid = reviewScores.every((score) => Number.isFinite(score) && score >= 1 && score <= 10);
    const approvedReviewIsCoherent =
      entry.review.decision !== 'approved'
      || (entry.review.performance === 'pass' && scoresAreValid);

    if (entry.status === 'approved' && entry.review.decision !== 'approved') {
      addFinding(groups, 'Approval Required', {
        severity: 'error',
        slotId,
        message: 'Approved asset status does not have an approved review decision.',
        evidence: entry.brief || slot.destination,
      });
      continue;
    }

    if (!approvedReviewIsCoherent) {
      addFinding(groups, 'Approval Required', {
        severity: 'error',
        slotId,
        message: 'Approved review must have passing performance and 1-10 review scores.',
        evidence: entry.brief || slot.destination,
      });
      continue;
    }

    if (slot.approval === 'automatic') {
      if (blockingStatuses.has(entry.status) && entry.review.decision !== 'approved') {
        addFinding(groups, 'Approval Required', {
          severity: 'warning',
          slotId,
          message: 'Automatic-approval asset has not recorded an approved review decision.',
          evidence: entry.brief || slot.destination,
        });
      }
      continue;
    }
    if (entry.status === 'approved' && entry.review.decision === 'approved') continue;

    addFinding(groups, 'Approval Required', {
      severity: 'warning',
      slotId,
      message: `${slot.approval} slot is not approved.`,
      evidence: entry.brief || slot.destination,
    });
  }
}

function auditDisconnectedPublicFiles(groups: Record<AuditGroup, AuditFinding[]>, brand?: AssetBrand): void {
  const manifest = loadManifest();
  const selectedSlotIds = new Set(selectedSlots(brand).map((slot) => slot.id));
  const declaredFiles = new Set<string>();
  const fileOwners = new Map<string, string[]>();

  for (const [slotId, entry] of Object.entries(manifest.assets)) {
    if (!selectedSlotIds.has(slotId)) continue;
    for (const repoPath of Object.values(entry.files)) {
      if (!repoPath) continue;
      declaredFiles.add(repoPath);
      fileOwners.set(repoPath, [...(fileOwners.get(repoPath) ?? []), slotId]);
    }
  }

  fileOwners.forEach((owners, repoPath) => {
    if (owners.length > 1) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        message: `Asset file is owned by multiple slots: ${owners.join(', ')}.`,
        evidence: repoPath,
      });
    }
  });

  if (brand) return;

  for (const repoPath of findTrackedPublicAssetFiles()) {
    if (!declaredFiles.has(repoPath)) {
      addFinding(groups, 'Disconnected', {
        severity: 'error',
        message: 'Public asset is not connected to an asset slot.',
        evidence: repoPath,
      });
    }
  }
}

export function buildAuditReport(options: { brand?: AssetBrand } = {}): AssetAuditReport {
  const groups = emptyGroups();
  const { brand } = options;

  auditSlotManifest(groups, brand);
  auditFiles(groups, brand);
  auditFingerprints(groups, brand);
  auditBriefs(groups, brand);
  auditApprovals(groups, brand);
  auditDisconnectedPublicFiles(groups, brand);

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
