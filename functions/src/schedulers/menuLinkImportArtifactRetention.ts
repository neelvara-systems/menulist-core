const TERMINAL_MENU_JOB_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const MENU_LINK_IMPORT_SOURCE_FILENAMES = new Set([
    'source.jpg',
    'source.pdf',
    'source.png',
    'source.txt',
    'source.webp',
]);

export type MenuLinkImportArtifactCleanupDecision =
    | { eligible: true; storagePath: string }
    | {
        eligible: false;
        reason:
        | 'active_job'
        | 'artifact_binding_invalid'
        | 'job_binding_invalid'
        | 'storage_path_invalid';
    };

interface MenuLinkImportArtifactData {
    artifactId?: unknown;
    jobId?: unknown;
    projectId?: unknown;
    sId?: unknown;
    storagePath?: unknown;
    tId?: unknown;
    uId?: unknown;
}

interface MenuLinkImportJobData {
    projectId?: unknown;
    sId?: unknown;
    source?: unknown;
    status?: unknown;
    tId?: unknown;
    uId?: unknown;
}

function getStorageSegment(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (
        !normalized
        || normalized !== value
        || normalized === '.'
        || normalized === '..'
        || normalized.length > 256
        || normalized.includes('/')
    ) return null;
    return normalized;
}

export function getMenuLinkImportArtifactJobLookupId(value: unknown): string | null {
    return getStorageSegment(value);
}

export function getMenuLinkImportArtifactCleanupDecision(params: {
    artifactId: string;
    artifact: MenuLinkImportArtifactData;
    job: MenuLinkImportJobData | null;
}): MenuLinkImportArtifactCleanupDecision {
    const artifactId = getStorageSegment(params.artifactId);
    const storedArtifactId = getStorageSegment(params.artifact.artifactId);
    const jobId = getStorageSegment(params.artifact.jobId);
    const projectId = getStorageSegment(params.artifact.projectId);
    const sId = getStorageSegment(params.artifact.sId);
    const tId = getStorageSegment(params.artifact.tId);
    const uId = getStorageSegment(params.artifact.uId);

    if (!artifactId || storedArtifactId !== artifactId || !jobId || !projectId || !sId || !tId || !uId) {
        return { eligible: false, reason: 'artifact_binding_invalid' };
    }

    if (typeof params.artifact.storagePath !== 'string') {
        return { eligible: false, reason: 'storage_path_invalid' };
    }

    const expectedPrefix = `menuLinkImports/${tId}/${sId}/${projectId}/${jobId}/`;
    const storagePath = params.artifact.storagePath;
    const sourceFilename = storagePath.slice(expectedPrefix.length);
    if (!storagePath.startsWith(expectedPrefix) || !MENU_LINK_IMPORT_SOURCE_FILENAMES.has(sourceFilename)) {
        return { eligible: false, reason: 'storage_path_invalid' };
    }

    if (!params.job) {
        return { eligible: true, storagePath };
    }

    if (
        params.job.source !== 'menu_link_import'
        || params.job.tId !== tId
        || params.job.sId !== sId
        || params.job.projectId !== projectId
        || params.job.uId !== uId
    ) {
        return { eligible: false, reason: 'job_binding_invalid' };
    }

    if (typeof params.job.status !== 'string' || !TERMINAL_MENU_JOB_STATUSES.has(params.job.status)) {
        return { eligible: false, reason: 'active_job' };
    }

    return { eligible: true, storagePath };
}
