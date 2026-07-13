export type AnswerlatticeFirebaseBoundaryStage = 'local' | 'preview' | 'production';
export type AnswerlatticeFirebaseBoundaryMode = 'shared' | 'separate';

export const ANSWERLATTICE_FIREBASE_PROJECTS = {
    local: 'answerlattice-qa',
    preview: 'answerlattice-qa',
    production: 'answerlattice',
} as const satisfies Record<AnswerlatticeFirebaseBoundaryStage, string>;

const SHARED_MODE_ALIASES = new Set(['shared', 'same', 'default']);
const SEPARATE_MODE_ALIASES = new Set(['separate', 'isolated', 'dedicated']);

export function normalizeAnswerlatticeFirebaseBoundaryMode(
    value?: string | null,
): AnswerlatticeFirebaseBoundaryMode | null {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (SHARED_MODE_ALIASES.has(normalized)) return 'shared';
    if (SEPARATE_MODE_ALIASES.has(normalized)) return 'separate';
    return null;
}

export function getExpectedAnswerlatticeFirebaseProjectId(
    stage: AnswerlatticeFirebaseBoundaryStage,
): string {
    return ANSWERLATTICE_FIREBASE_PROJECTS[stage];
}

export function isExpectedAnswerlatticeFirebaseProjectId(
    projectId: unknown,
    stage: AnswerlatticeFirebaseBoundaryStage,
): boolean {
    return typeof projectId === 'string'
        && projectId.trim() === getExpectedAnswerlatticeFirebaseProjectId(stage);
}

export function isAnswerlatticeEmulatorProjectId(projectId: unknown): boolean {
    return typeof projectId === 'string'
        && /^demo-answerlattice(?:-[a-z0-9-]+)?$/i.test(projectId.trim());
}

export type AnswerlatticeFirebaseBoundaryResult = {
    errorCode: null | 'INVALID_MODE' | 'SHARED_MODE_NOT_ALLOWED' | 'PROJECT_ID_MISMATCH';
    expectedProjectId: string;
    mode: AnswerlatticeFirebaseBoundaryMode;
    valid: boolean;
};

export function resolveAnswerlatticeFirebaseBoundary(input: {
    allowShared: boolean;
    allowEmulatorProject?: boolean;
    configuredProjectId?: string | null;
    modeValue?: string | null;
    stage: AnswerlatticeFirebaseBoundaryStage;
}): AnswerlatticeFirebaseBoundaryResult {
    const hasModeValue = Boolean(input.modeValue?.trim());
    const normalizedMode = normalizeAnswerlatticeFirebaseBoundaryMode(input.modeValue);
    const mode = normalizedMode || 'separate';
    const expectedProjectId = getExpectedAnswerlatticeFirebaseProjectId(input.stage);

    if (hasModeValue && !normalizedMode) {
        return { errorCode: 'INVALID_MODE', expectedProjectId, mode, valid: false };
    }
    if (mode === 'shared' && !input.allowShared) {
        return { errorCode: 'SHARED_MODE_NOT_ALLOWED', expectedProjectId, mode, valid: false };
    }
    const projectMatches = isExpectedAnswerlatticeFirebaseProjectId(input.configuredProjectId, input.stage)
        || (input.allowEmulatorProject === true && isAnswerlatticeEmulatorProjectId(input.configuredProjectId));
    if (mode === 'separate' && !projectMatches) {
        return { errorCode: 'PROJECT_ID_MISMATCH', expectedProjectId, mode, valid: false };
    }

    return { errorCode: null, expectedProjectId, mode, valid: true };
}
