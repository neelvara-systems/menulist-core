#!/usr/bin/env node
/**
 * Read-only verifier for public routing summary readiness.
 *
 * Purpose:
 *   Prove whether legacy OBP/sitemap collection fallbacks can be removed
 *   safely. This script does not write to Firestore.
 *
 * Usage:
 *   FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs
 *   FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs --tenant-id 123
 *   FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs --store-id 456
 *   FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs --skip-projects
 *
 * Read cost:
 *   - 1 storesSummary doc read
 *   - 1 stores query/doc read set
 *   - 1 projects_{storeId} summary doc read per active, public-visible store
 *   - 1 canonical projects collection query only when the summary document is
 *     missing/empty, to distinguish a true backfill gap from a store that has
 *     not created a menu yet
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);

function hasFlag(name) {
  return args.includes(name);
}

function getArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function printHelp() {
  console.log(`
verify-public-routing-summary-backfill

Read-only readiness check for removing public routing collection fallbacks.

Options:
  --tenant-id <id>   Limit the check to one tenant.
  --store-id <id>    Limit the check to one store.
  --limit <n>        Limit live store docs read from the stores query.
  --skip-projects   Skip projects_{storeId} summary checks.
  --json            Print machine-readable JSON.
  --help            Show this help.

Environment:
  FIREBASE_PROJECT_ID is recommended when ADC does not infer the project.
`);
}

if (hasFlag('--help')) {
  printHelp();
  process.exit(0);
}

const tenantIdArg = getArg('--tenant-id');
const storeIdArg = getArg('--store-id');
const limitArg = getArg('--limit');
const skipProjects = hasFlag('--skip-projects');
const jsonOutput = hasFlag('--json');

const tenantId = tenantIdArg == null ? null : Number(tenantIdArg);
if (tenantIdArg != null && !Number.isFinite(tenantId)) {
  console.error('--tenant-id must be a number');
  process.exit(1);
}

const queryLimit = limitArg == null ? null : Number(limitArg);
if (limitArg != null && (!Number.isInteger(queryLimit) || queryLimit <= 0)) {
  console.error('--limit must be a positive integer');
  process.exit(1);
}

if (storeIdArg && tenantIdArg) {
  console.error('Use either --store-id or --tenant-id, not both.');
  process.exit(1);
}

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  initializeApp(projectId ? { projectId } : undefined);
}

const db = getFirestore();

function parseSummaryStores(data) {
  if (!data || typeof data !== 'object') return {};
  const result = {};

  if (data.stores && typeof data.stores === 'object' && !Array.isArray(data.stores)) {
    for (const [storeId, storeData] of Object.entries(data.stores)) {
      if (storeData && typeof storeData === 'object') {
        result[storeId] = { ...storeData };
      }
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('stores.')) continue;
    const rest = key.slice('stores.'.length);
    if (!rest) continue;
    const [storeId, ...fieldPath] = rest.split('.');
    if (!storeId) continue;
    if (!result[storeId]) result[storeId] = {};

    if (fieldPath.length === 0) {
      if (value && typeof value === 'object') {
        result[storeId] = { ...result[storeId], ...value };
      }
      continue;
    }

    let target = result[storeId];
    for (let i = 0; i < fieldPath.length - 1; i += 1) {
      const segment = fieldPath[i];
      if (!target[segment] || typeof target[segment] !== 'object') {
        target[segment] = {};
      }
      target = target[segment];
    }
    target[fieldPath[fieldPath.length - 1]] = value;
  }

  return result;
}

function parseSummaryProjects(data) {
  if (!data || typeof data !== 'object') return {};
  const result = {};

  if (data.projects && typeof data.projects === 'object' && !Array.isArray(data.projects)) {
    for (const [projectId, projectData] of Object.entries(data.projects)) {
      if (projectData && typeof projectData === 'object') {
        result[projectId] = { ...projectData };
      }
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('projects.')) continue;
    const rest = key.slice('projects.'.length);
    if (!rest) continue;

    const [projectId, ...fieldPath] = rest.split('.');
    if (!projectId) continue;
    if (!result[projectId]) result[projectId] = {};

    if (fieldPath.length === 0) {
      if (value && typeof value === 'object') {
        result[projectId] = { ...result[projectId], ...value };
      }
      continue;
    }

    let target = result[projectId];
    for (let i = 0; i < fieldPath.length - 1; i += 1) {
      const segment = fieldPath[i];
      if (!target[segment] || typeof target[segment] !== 'object') {
        target[segment] = {};
      }
      target = target[segment];
    }
    target[fieldPath[fieldPath.length - 1]] = value;
  }

  return result;
}

function normalizeStore(doc) {
  const data = doc.data() || {};
  const storeId = String(data.storeId ?? doc.id);
  return {
    docId: doc.id,
    storeId,
    tenantId: data.tenantId,
    name: data.name || '',
    active: data.active,
    blocked: data.blocked,
    tenantBlocked: data.tenantBlocked,
    isMaster: data.isMaster,
    outletSlug: typeof data.outletSlug === 'string' ? data.outletSlug.trim() : '',
  };
}

async function loadCanonicalProjectEntries(store) {
  if (store.tenantId == null || store.storeId == null) return [];
  const snapshot = await db
    .collection('projects')
    .doc(String(store.tenantId))
    .collection(String(store.storeId))
    .get();
  return snapshot.docs.map((doc) => ({
    projectId: doc.id,
    ...(doc.data() || {}),
  }));
}

function getActiveProjectEntries(projects) {
  return projects.filter((data) => data?.active !== false && data?.deleted !== true);
}

function isBlocked(value) {
  return value?.blocked === true || value?.tenantBlocked === true || value?.blockDetails?.blocked === true;
}

function issue(severity, code, message, context = {}) {
  return { severity, code, message, ...context };
}

async function loadLiveStores() {
  if (storeIdArg) {
    const doc = await db.collection('stores').doc(String(storeIdArg)).get();
    return doc.exists ? [normalizeStore(doc)] : [];
  }

  let query = db.collection('stores');
  if (tenantId != null) {
    query = query.where('tenantId', '==', tenantId);
  }
  if (queryLimit != null) {
    query = query.limit(queryLimit);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(normalizeStore);
}

async function verifyProjectSummary(store) {
  const findings = [];
  const docId = `projects_${store.storeId}`;
  const snap = await db.collection('platformSummary').doc(docId).get();
  if (!snap.exists) {
    const canonicalProjects = await loadCanonicalProjectEntries(store);
    const activeCanonicalProjects = getActiveProjectEntries(canonicalProjects);
    if (activeCanonicalProjects.length === 0) {
      findings.push(issue(
        'warning',
        'projects-summary-absent-no-projects',
        `Missing platformSummary/${docId}, but no active canonical projects exist for this store.`,
        { storeId: store.storeId, tenantId: store.tenantId },
      ));
      return findings;
    }

    findings.push(issue(
      'error',
      'projects-summary-missing',
      `Missing platformSummary/${docId}; public project routing cannot rely on summary-only lookup.`,
      { storeId: store.storeId, tenantId: store.tenantId, canonicalActiveProjects: activeCanonicalProjects.length },
    ));
    return findings;
  }

  const projects = parseSummaryProjects(snap.data());
  const activeProjects = Object.entries(projects)
    .filter(([, data]) => data?.active !== false && data?.deleted !== true);

  if (activeProjects.length === 0) {
    const canonicalProjects = await loadCanonicalProjectEntries(store);
    const activeCanonicalProjects = getActiveProjectEntries(canonicalProjects);
    if (activeCanonicalProjects.length === 0) {
      findings.push(issue(
        'warning',
        'projects-summary-empty-no-projects',
        `platformSummary/${docId} has no active projects, and no active canonical projects exist for this store.`,
        { storeId: store.storeId, tenantId: store.tenantId },
      ));
      return findings;
    }

    findings.push(issue(
      'error',
      'projects-summary-empty',
      `platformSummary/${docId} has no active projects.`,
      { storeId: store.storeId, tenantId: store.tenantId, canonicalActiveProjects: activeCanonicalProjects.length },
    ));
    return findings;
  }

  const hasDefault = activeProjects.some(([, data]) => data?.isDefault === true);
  if (!hasDefault) {
    findings.push(issue(
      'warning',
      'projects-summary-default-missing',
      `platformSummary/${docId} has active projects but no default project marker.`,
      { storeId: store.storeId, tenantId: store.tenantId },
    ));
  }

  for (const [projectId, data] of activeProjects) {
    const slug = typeof data?.slug === 'string' ? data.slug.trim() : '';
    if (!slug) {
      findings.push(issue(
        'error',
        'project-slug-missing',
        `Active project ${projectId} in platformSummary/${docId} is missing slug.`,
        { storeId: store.storeId, tenantId: store.tenantId, projectId },
      ));
    }
  }

  return findings;
}

async function main() {
  const findings = [];
  const summarySnap = await db.collection('platformSummary').doc('storesSummary').get();
  const summaryStores = summarySnap.exists ? parseSummaryStores(summarySnap.data()) : {};
  if (!summarySnap.exists) {
    findings.push(issue(
      'error',
      'stores-summary-missing',
      'Missing platformSummary/storesSummary; OBP and sitemap outlet fallbacks cannot be removed.',
    ));
  }

  const liveStores = await loadLiveStores();
  if (storeIdArg && liveStores.length === 0) {
    findings.push(issue(
      'error',
      'store-missing',
      `stores/${storeIdArg} does not exist.`,
      { storeId: String(storeIdArg) },
    ));
  }

  const activeVisibleStores = [];
  const liveByTenant = new Map();

  for (const store of liveStores) {
    const summary = summaryStores[store.storeId];
    const liveActive = store.active !== false;
    const liveBlocked = isBlocked(store);

    if (!liveByTenant.has(store.tenantId)) liveByTenant.set(store.tenantId, []);
    liveByTenant.get(store.tenantId).push(store);

    if (!liveActive) {
      if (summary && summary.active !== false) {
        findings.push(issue(
          'error',
          'inactive-store-summary-active',
          `Inactive stores/${store.storeId} is not inactive in storesSummary.`,
          { storeId: store.storeId, tenantId: store.tenantId },
        ));
      }
      continue;
    }

    if (!summary) {
      findings.push(issue(
        liveBlocked ? 'warning' : 'error',
        'store-summary-missing',
        `Active stores/${store.storeId} is missing from storesSummary.`,
        { storeId: store.storeId, tenantId: store.tenantId },
      ));
      continue;
    }

    if (summary.tId !== store.tenantId) {
      findings.push(issue(
        'error',
        'store-summary-tenant-mismatch',
        `storesSummary tenant mismatch for store ${store.storeId}.`,
        { storeId: store.storeId, tenantId: store.tenantId, summaryTenantId: summary.tId },
      ));
    }

    if (summary.active === false) {
      findings.push(issue(
        'error',
        'active-store-summary-inactive',
        `Active stores/${store.storeId} is inactive in storesSummary.`,
        { storeId: store.storeId, tenantId: store.tenantId },
      ));
    }

    if (liveBlocked !== isBlocked(summary)) {
      findings.push(issue(
        'error',
        'store-summary-block-mismatch',
        `Block state mismatch for stores/${store.storeId}.`,
        { storeId: store.storeId, tenantId: store.tenantId, liveBlocked, summaryBlocked: isBlocked(summary) },
      ));
    }

    if (store.isMaster !== undefined && summary.isMaster !== undefined && summary.isMaster !== store.isMaster) {
      findings.push(issue(
        'warning',
        'store-summary-master-mismatch',
        `isMaster mismatch for stores/${store.storeId}.`,
        { storeId: store.storeId, tenantId: store.tenantId, liveIsMaster: store.isMaster, summaryIsMaster: summary.isMaster },
      ));
    }

    if (store.isMaster === false) {
      const summarySlug = typeof summary.outletSlug === 'string' ? summary.outletSlug.trim() : '';
      if (!store.outletSlug) {
        findings.push(issue(
          'error',
          'outlet-slug-missing-live',
          `Active outlet stores/${store.storeId} has no outletSlug; run the outlet slug backfill before removing fallbacks.`,
          { storeId: store.storeId, tenantId: store.tenantId },
        ));
      } else if (summarySlug !== store.outletSlug) {
        findings.push(issue(
          'error',
          'outlet-slug-summary-mismatch',
          `Outlet slug mismatch for stores/${store.storeId}.`,
          { storeId: store.storeId, tenantId: store.tenantId, liveOutletSlug: store.outletSlug, summaryOutletSlug: summarySlug },
        ));
      }
    }

    if (!liveBlocked) activeVisibleStores.push(store);
  }

  for (const [tenant, stores] of liveByTenant.entries()) {
    if (tenant == null) continue;
    const liveRoutableOutlets = stores.filter((store) => (
      store.active !== false
      && !isBlocked(store)
      && store.isMaster === false
      && store.outletSlug
    ));
    if (liveRoutableOutlets.length === 0) continue;

    const summaryRoutableOutlets = liveRoutableOutlets.filter((store) => {
      const summary = summaryStores[store.storeId];
      return summary
        && summary.tId === tenant
        && summary.active !== false
        && !isBlocked(summary)
        && typeof summary.outletSlug === 'string'
        && summary.outletSlug.trim() === store.outletSlug;
    });

    if (summaryRoutableOutlets.length !== liveRoutableOutlets.length) {
      findings.push(issue(
        'error',
        'tenant-summary-outlet-coverage-incomplete',
        `Tenant ${tenant} has routable live outlets that are not fully covered by storesSummary.`,
        {
          tenantId: tenant,
          liveRoutableOutlets: liveRoutableOutlets.length,
          summaryRoutableOutlets: summaryRoutableOutlets.length,
        },
      ));
    }
  }

  if (!skipProjects) {
    for (const store of activeVisibleStores) {
      findings.push(...await verifyProjectSummary(store));
    }
  }

  const errors = findings.filter((entry) => entry.severity === 'error');
  const warnings = findings.filter((entry) => entry.severity === 'warning');
  const result = {
    ok: errors.length === 0,
    checkedStores: liveStores.length,
    checkedActiveVisibleStores: activeVisibleStores.length,
    projectSummaryChecksSkipped: skipProjects,
    errors: errors.length,
    warnings: warnings.length,
    findings,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n=== Public Routing Summary Backfill Verification ===');
    console.log(`Live stores checked:           ${result.checkedStores}`);
    console.log(`Active visible stores checked: ${result.checkedActiveVisibleStores}`);
    console.log(`Project summaries checked:     ${skipProjects ? 'no' : 'yes'}`);
    console.log(`Errors:                        ${result.errors}`);
    console.log(`Warnings:                      ${result.warnings}`);

    if (findings.length > 0) {
      console.log('\nFindings:');
      for (const entry of findings) {
        const prefix = entry.severity === 'error' ? 'ERROR' : 'WARN ';
        const location = entry.storeId ? ` store=${entry.storeId}` : '';
        const tenant = entry.tenantId != null ? ` tenant=${entry.tenantId}` : '';
        console.log(`- ${prefix} ${entry.code}${location}${tenant}: ${entry.message}`);
      }
    }

    console.log(errors.length === 0
      ? '\nResult: summary-backed routing is ready for the checked scope.'
      : '\nResult: keep legacy public routing fallbacks for the checked scope.');
  }

  process.exitCode = errors.length === 0 ? 0 : 2;
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
