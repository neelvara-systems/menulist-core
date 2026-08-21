import assert from "node:assert/strict";
import {
  isAllowedSignalDeskFunctionsProjectId,
  resolveSignalDeskFunctionsProjectId,
} from "../../functions-signaldesk/src/projectBoundary";

const expectCode = (code: string, callback: () => unknown) => {
  assert.throws(callback, (error: unknown) => (
    error instanceof Error && error.message === code
  ));
};

assert.equal(isAllowedSignalDeskFunctionsProjectId("menulist-signaldesk-qa"), true);
assert.equal(isAllowedSignalDeskFunctionsProjectId("menulist-signaldesk"), true);
assert.equal(isAllowedSignalDeskFunctionsProjectId("demo-signaldesk"), true);
assert.equal(isAllowedSignalDeskFunctionsProjectId("demo-signaldesk-project-boundary"), true);
assert.equal(isAllowedSignalDeskFunctionsProjectId("menulist"), false);
assert.equal(isAllowedSignalDeskFunctionsProjectId("menulist-prod"), false);
assert.equal(isAllowedSignalDeskFunctionsProjectId("neelvara-answerlattice-prod"), false);
assert.equal(isAllowedSignalDeskFunctionsProjectId("demo-menulist"), false);
assert.equal(isAllowedSignalDeskFunctionsProjectId("demo-signaldesk-"), false);

assert.equal(resolveSignalDeskFunctionsProjectId({
  firebaseConfig: JSON.stringify({ projectId: "menulist-signaldesk-qa" }),
  gcloudProject: "menulist-signaldesk-qa",
  googleCloudProject: "menulist-signaldesk-qa",
}), "menulist-signaldesk-qa");
assert.equal(resolveSignalDeskFunctionsProjectId({
  gcloudProject: " demo-signaldesk-functions-project ",
}), "demo-signaldesk-functions-project");
assert.equal(resolveSignalDeskFunctionsProjectId({
  firebaseConfig: JSON.stringify({ projectId: "menulist-signaldesk" }),
}), "menulist-signaldesk");

expectCode("SIGNALDESK_FUNCTIONS_PROJECT_ID_MISSING", () => (
  resolveSignalDeskFunctionsProjectId({})
));
expectCode("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_INVALID", () => (
  resolveSignalDeskFunctionsProjectId({ firebaseConfig: "{" })
));
expectCode("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_PROJECT_MISSING", () => (
  resolveSignalDeskFunctionsProjectId({ firebaseConfig: "{}" })
));
expectCode("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_PROJECT_INVALID", () => (
  resolveSignalDeskFunctionsProjectId({ firebaseConfig: JSON.stringify({ projectId: 123 }) })
));
expectCode("SIGNALDESK_FUNCTIONS_PROJECT_ID_CONFLICT", () => (
  resolveSignalDeskFunctionsProjectId({
    firebaseConfig: JSON.stringify({ projectId: "menulist-signaldesk-qa" }),
    gcloudProject: "menulist-signaldesk",
  })
));
for (const projectId of ["menulist", "menulist-prod", "menulist-qa", "neelvara-answerlattice-prod", "campaigncue", "demo-menulist"]) {
  expectCode("SIGNALDESK_FUNCTIONS_PROJECT_ID_NOT_ALLOWED", () => (
    resolveSignalDeskFunctionsProjectId({ gcloudProject: projectId })
  ));
}

console.log("SignalDesk Functions project-boundary tests passed.");
