import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    resolveAnswerlatticeFirebaseBoundary,
} from '../../src/data/shared/answerlatticeFirebaseBoundary';

const root = path.resolve(__dirname, '../..');

assert.deepEqual(resolveAnswerlatticeFirebaseBoundary({
    allowShared: true,
    configuredProjectId: 'neelvara-answerlattice-qa',
    stage: 'local',
}), {
    errorCode: null,
    expectedProjectId: 'neelvara-answerlattice-qa',
    mode: 'separate',
    valid: true,
});

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: true,
    configuredProjectId: 'menulist-qa',
    stage: 'local',
}).errorCode, 'PROJECT_ID_MISMATCH');

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: true,
    configuredProjectId: 'menulist-qa',
    modeValue: 'shared',
    stage: 'local',
}).valid, true);

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: false,
    configuredProjectId: 'menulist-qa',
    modeValue: 'shared',
    stage: 'preview',
}).errorCode, 'SHARED_MODE_NOT_ALLOWED');

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: false,
    configuredProjectId: 'neelvara-answerlattice-qa',
    modeValue: 'wrong-mode',
    stage: 'preview',
}).errorCode, 'INVALID_MODE');

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: false,
    configuredProjectId: 'neelvara-answerlattice-prod',
    stage: 'production',
}).valid, true);

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowShared: false,
    configuredProjectId: 'neelvara-answerlattice-qa',
    stage: 'production',
}).errorCode, 'PROJECT_ID_MISMATCH');

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowEmulatorProject: true,
    allowShared: true,
    configuredProjectId: 'demo-answerlattice-rules',
    stage: 'local',
}).valid, true);

assert.equal(resolveAnswerlatticeFirebaseBoundary({
    allowEmulatorProject: false,
    allowShared: true,
    configuredProjectId: 'demo-answerlattice-rules',
    stage: 'local',
}).errorCode, 'PROJECT_ID_MISMATCH');

const sourceBoundary = fs.readFileSync(path.join(root, 'src/data/shared/answerlatticeFirebaseBoundary.ts'), 'utf8');
const functionsBoundary = fs.readFileSync(path.join(root, 'functions-answerlattice/src/sharedData/answerlatticeFirebaseBoundary.ts'), 'utf8');
assert.equal(functionsBoundary, sourceBoundary, 'Answerlattice Firebase project boundary mirrors must remain byte-identical');

const configSource = fs.readFileSync(path.join(root, 'src/lib/firebase/answerlatticeConfig.ts'), 'utf8');
assert(!configSource.includes('isSameFirebaseProject'), 'Answerlattice shared mode must never be inferred from matching project IDs');
assert(configSource.includes("allowShared: answerlatticeDeploymentStage === 'local'"));

const adminSource = fs.readFileSync(path.join(root, 'src/lib/firebase/answerlatticeFirebaseAdmin.ts'), 'utf8');
assert(adminSource.includes('answerlattice_admin_env_project_mismatch'));
assert(adminSource.includes('answerlatticeFirebaseBoundary.expectedProjectId'));
assert(adminSource.includes('isAnswerlatticeEmulatorProjectId'));
assert(adminSource.includes('FIRESTORE_EMULATOR_HOST'));

const functionsAdminSource = fs.readFileSync(path.join(root, 'functions-answerlattice/src/firebaseAdmin.ts'), 'utf8');
assert(functionsAdminSource.includes('answerlatticeFunctionsBoundary.valid'));
assert(functionsAdminSource.includes('answerlattice_functions_admin_env_project_mismatch'));
assert(functionsAdminSource.includes('normalizeAnswerlatticeFirebaseBoundaryMode(process.env.ANSWERLATTICE_FIREBASE_MODE) === \'shared\''));
assert(!functionsAdminSource.includes('FIREBASE_PROJECT_ID === process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID'), 'Answerlattice Functions shared mode must not be inferred from matching project IDs');
assert(!functionsAdminSource.includes('process.env.FIREBASE_PROJECT_ID === process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID'), 'Answerlattice Functions shared mode must be explicit');

console.log('Answerlattice Firebase project-boundary tests passed.');
