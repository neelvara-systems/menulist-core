import assert from 'node:assert/strict';
import {
    getMenuLinkImportArtifactCleanupDecision,
    getMenuLinkImportArtifactJobLookupId,
} from '../../functions/src/schedulers/menuLinkImportArtifactRetention';

const artifact = {
    artifactId: 'artifact-1',
    jobId: 'job-1',
    projectId: '14-default-22',
    sId: '22',
    storagePath: 'menuLinkImports/14/22/14-default-22/job-1/source.txt',
    tId: '14',
    uId: 'owner-1',
};

const terminalJob = {
    projectId: artifact.projectId,
    sId: artifact.sId,
    source: 'menu_link_import',
    status: 'completed',
    tId: artifact.tId,
    uId: artifact.uId,
};

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact,
    job: terminalJob,
}), {
    eligible: true,
    storagePath: artifact.storagePath,
});

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact,
    job: { ...terminalJob, status: 'processing' },
}), { eligible: false, reason: 'active_job' });

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact,
    job: { ...terminalJob, tId: 'another-tenant' },
}), { eligible: false, reason: 'job_binding_invalid' });

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact: {
        ...artifact,
        storagePath: 'menuLinkImports/14/22/14-default-22/job-1/../../another-object',
    },
    job: terminalJob,
}), { eligible: false, reason: 'storage_path_invalid' });

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact: { ...artifact, artifactId: 'another-artifact' },
    job: terminalJob,
}), { eligible: false, reason: 'artifact_binding_invalid' });

assert.equal(getMenuLinkImportArtifactJobLookupId('job-1'), 'job-1');
assert.equal(getMenuLinkImportArtifactJobLookupId('other/job'), null);
assert.equal(getMenuLinkImportArtifactJobLookupId(' job-1 '), null);

assert.deepEqual(getMenuLinkImportArtifactCleanupDecision({
    artifactId: artifact.artifactId,
    artifact: { ...artifact, storagePath: artifact.storagePath.replace('source.txt', 'source.pdf') },
    job: null,
}), {
    eligible: true,
    storagePath: artifact.storagePath.replace('source.txt', 'source.pdf'),
});

process.stdout.write('Menu-link import artifact retention tests passed.\n');
