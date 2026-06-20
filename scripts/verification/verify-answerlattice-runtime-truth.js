const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function verifyDedicatedAnswerlatticeFirebase() {
  const admin = read('src/lib/firebase/answerlatticeFirebaseAdmin.ts');
  const client = read('src/lib/firebase/answerlatticeFirebaseClient.ts');
  const config = read('src/lib/firebase/answerlatticeConfig.ts');

  assertIncludes(admin, "ANSWERLATTICE_APP_NAME = 'answerlattice-admin'", 'Answerlattice Admin Firebase app name');
  assertIncludes(admin, "getAdminCredential('ANSWERLATTICE_FIREBASE')", 'Answerlattice Admin Firebase credential');
  assertIncludes(admin, 'answerlatticeFirestoreDatabaseId', 'Answerlattice Admin Firestore database selection');
  assertIncludes(client, 'answerlatticeFirebaseClient', 'Answerlattice client Firebase app name');
  assertIncludes(config, 'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID', 'Answerlattice client Firebase project');
  assertIncludes(config, 'answerlatticeFirebaseModeOverride', 'Answerlattice Firebase shared-mode override');
}

function verifyPublicApiAndWidgetIsolation() {
  const publicAnswers = read('src/app/api/answerlattice/public/v1/answers/route.ts');
  const publicEntities = read('src/app/api/answerlattice/public/v1/entities/route.ts');
  const publicSignals = read('src/app/api/answerlattice/public/v1/signals/route.ts');
  const widgetSearch = read('src/app/api/widget/search/route.ts');
  const widgetConfig = read('src/app/api/widget/config/route.ts');
  const widgetFeedback = read('src/app/api/widget/feedback/route.ts');
  const predictiveHelp = read('src/app/api/answerlattice/predictive-help/route.ts');
  const mcpSession = read('src/app/api/answerlattice/mcp/session/route.ts');
  const publicAuth = read('src/lib/answerlattice/publicApi.ts');
  const sharedAuth = read('src/lib/publicApi/auth.ts');

  assertIncludes(publicAnswers, 'authenticateAnswerlatticePublicApi', 'Answerlattice public answers API');
  assertIncludes(publicEntities, 'authenticateAnswerlatticePublicApi', 'Answerlattice public entities API');
  assertIncludes(publicSignals, "'POST /api/answerlattice/public/v1/signals', 'signals:write'", 'Answerlattice public signals API');
  assertIncludes(publicAuth, "publicApi.productId !== PRODUCT_IDS.ANSWERLATTICE", 'Answerlattice public API product guard');
  assertIncludes(publicAuth, "publicApi.purpose !== 'answerlattice_public_api'", 'Answerlattice public API purpose guard');
  assertIncludes(publicAuth, "result.credentialSource !== 'publicApi'", 'Answerlattice public API key-source guard');
  assertIncludes(sharedAuth, 'answerlatticeFirestoreAdmin', 'Shared public API auth Answerlattice DB selection');
  assertIncludes(sharedAuth, 'Answerlattice API key validation failed closed because Answerlattice Firestore Admin is not configured', 'Shared public API auth fail-closed behavior');

  assertIncludes(widgetSearch, "hasPublicApiCredentialScope(credential, 'widget:search')", 'Answerlattice widget search scope');
  assertIncludes(widgetConfig, "hasPublicApiCredentialScope(credential, 'widget:config')", 'Answerlattice widget config scope');
  assertIncludes(widgetFeedback, "hasPublicApiCredentialScope(credential, 'widget:feedback')", 'Answerlattice widget feedback scope');
  assertIncludes(predictiveHelp, "hasPublicApiCredentialScope(credential, 'widget:predictive')", 'Answerlattice predictive widget scope');
  assertIncludes(widgetSearch, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget search product guard');
  assertIncludes(widgetConfig, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget config product guard');
  assertIncludes(widgetFeedback, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget feedback product guard');
  assertIncludes(predictiveHelp, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice predictive widget product guard');
  assertIncludes(widgetSearch, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget search purpose guard');
  assertIncludes(widgetConfig, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget config purpose guard');
  assertIncludes(widgetFeedback, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget feedback purpose guard');
  assertIncludes(predictiveHelp, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice predictive widget purpose guard');
  assertIncludes(widgetFeedback, 'Number(historyData.tId) !== tId', 'Answerlattice widget feedback history tenant guard');
  assertIncludes(widgetFeedback, 'Number(historyData.sId) !== sId', 'Answerlattice widget feedback history store guard');
  assertIncludes(mcpSession, 'auth.credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice MCP session product guard');
  assertIncludes(mcpSession, "auth.credential.purpose !== 'answerlattice_public_api'", 'Answerlattice MCP session purpose guard');
  assertIncludes(mcpSession, "hasPublicApiCredentialScope(auth.credential, 'signals:write')", 'Answerlattice MCP session signal scope');
}

function verifySearchAndRetrievalTruth() {
  const searchCore = read('src/lib/search/searchCore.ts');
  const canonical = read('src/lib/answerlattice/canonicalRetrieval.ts');
  const faq = read('src/lib/answerlattice/faqRetrieval.ts');
  const entity = read('src/lib/answerlattice/entityLookup.ts');

  assertIncludes(searchCore, ".where('tId', '==', tId)", 'Answerlattice search tenant-scoped vector lookup');
  assertIncludes(searchCore, ".where('sId', '==', sId)", 'Answerlattice search store-scoped vector lookup');
  assertIncludes(searchCore, 'ANSWER_WITHOUT_VALID_REFERENCES_BLOCKED', 'Answerlattice RAG reference enforcement');
  assertIncludes(canonical, 'ENTITY_MATCH_MIN_SCORE', 'Answerlattice canonical entity confidence gate');
  assertIncludes(canonical, ".where('tId', '==', tId)", 'Answerlattice canonical tenant scope');
  assertIncludes(canonical, ".where('sId', '==', sId)", 'Answerlattice canonical store scope');
  assertIncludes(faq, ".where('status', '==', ANSWERLATTICE_FAQ_STATUS.PUBLISHED)", 'Answerlattice FAQ published guard');
  assertIncludes(faq, ".where('active', '==', true)", 'Answerlattice FAQ active guard');
  assertIncludes(faq, 'Number(articleRecord.tId || faq.tId) !== Number(faq.tId)', 'Answerlattice FAQ article tenant guard');
  assertIncludes(faq, 'Number(articleRecord.sId || faq.sId) !== Number(faq.sId)', 'Answerlattice FAQ article store guard');
  assertIncludes(faq, "article.status !== 'published'", 'Answerlattice FAQ article published guard');
  assertIncludes(entity, ".where('tId', '==', Number(scope.tId))", 'Answerlattice entity tenant scope');
  assertIncludes(entity, 'Number(entity.tId) !== Number(scope.tId) || Number(entity.sId) !== Number(scope.sId)', 'Answerlattice entity final scope guard');
}

function verifyHostedHelpRegistryTruth() {
  const server = read('src/lib/answerlattice/hostedHelpServer.ts');
  const settings = read('src/app/api/answerlattice/hosted-help-settings/route.ts');
  const page = read('src/app/answerlattice-hosted-help/[[...segments]]/page.tsx');
  const client = read('src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx');

  assertIncludes(server, "String(data.pId || '') !== PRODUCT_IDS.ANSWERLATTICE", 'Answerlattice hosted-help registry product guard');
  assertNotIncludes(server, 'String(data.pId || PRODUCT_IDS.ANSWERLATTICE)', 'Answerlattice hosted-help registry product guard');
  assertIncludes(settings, 'registryScopeMatches', 'Answerlattice hosted-help registry scope helper');
  assertIncludes(settings, 'removedRegistryByDomain', 'Answerlattice hosted-help removed-domain scope snapshot');
  assertIncludes(settings, 'Skipped registry delete for mismatched domain scope', 'Answerlattice hosted-help scoped delete logging');
  assertIncludes(page, 'normalizeArticleSlug', 'Answerlattice hosted-help article slug normalization');
  assertIncludes(page, 'segments.slice(1)', 'Answerlattice hosted-help nested article route support');
  assertIncludes(client, 'normalizeArticleSlug(article.url || article.id)', 'Answerlattice hosted-help article href normalization');
  assertIncludes(client, 'encodeURIComponent(slug)', 'Answerlattice hosted-help article href escaping');
}

function verifyKnowledgeIntakePublishRecovery() {
  const intake = read('src/lib/answerlattice/knowledgeIntake.ts');
  const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');

  assertIncludes(intakeApi, 'requireAnswerlatticePermission', 'Answerlattice knowledge intake permission gate');
  assertIncludes(intakeApi, 'requireActiveLicense', 'Answerlattice knowledge intake paid license gate');
  assertIncludes(intake, 'await refreshJobCounters(scope, jobId).catch', 'Answerlattice partial publish counter recovery');
  assertIncludes(intake, 'Public cache revalidation failed after partial publish failure', 'Answerlattice partial publish cache recovery');
  assertIncludes(intake, 'published.length > 0', 'Answerlattice partial publish status branch');
  assertIncludes(intake, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS.REVIEWING', 'Answerlattice partial publish retryable status');
  assertIncludes(intake, 'Published ${published.length} item', 'Answerlattice partial publish owner-visible status');
  assertIncludes(intake, "revalidateAnswerlatticePublicCache(scope.tId, scope.sId, segment)", 'Answerlattice public cache revalidation');
}

function verifyArticleEntityExtractionScope() {
  const extraction = read('src/app/api/answerlattice/articles/extract-entities/route.ts');

  assertIncludes(extraction, 'const articleRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(article.id)', 'Answerlattice entity extraction article lookup');
  assertIncludes(extraction, 'if (Number(persistedArticle.tId) !== tenantId || Number(persistedArticle.sId) !== storeId)', 'Answerlattice entity extraction article scope guard');
  assertIncludes(extraction, 'Authorization Failed - Answerlattice Article Entity Extraction Scope Mismatch', 'Answerlattice entity extraction security logging');
  assertIncludes(extraction, 'const sourceContent = persistedArticle.content ?? article.content', 'Answerlattice entity extraction canonical content preference');
  assertIncludes(extraction, 'await articleRef.set', 'Answerlattice entity extraction scoped article write');
}

function verifyPredictiveTriggerPublicSummary() {
  const triggers = read('src/database/answerlattice/predictiveTriggers.ts');
  const predictiveEngine = read('src/lib/answerlattice/predictiveEngine.ts');

  assertIncludes(predictiveEngine, ".doc(`predictiveTriggers_${tId}_${sId}`)", 'Answerlattice predictive runtime summary read');
  assertIncludes(triggers, 'rebuildPredictiveTriggerSummary', 'Answerlattice predictive trigger summary rebuild');
  assertIncludes(triggers, "doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, `predictiveTriggers_${tId}_${sId}`)", 'Answerlattice predictive trigger summary doc');
  assertIncludes(triggers, 'pId: PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice predictive trigger summary product guard');
  assertIncludes(triggers, 'activeTriggerCount', 'Answerlattice predictive trigger active count');
  assertIncludes(triggers, "markAnswerlatticeCompiledContextSourceChanged('predictiveTriggers'", 'Answerlattice predictive trigger source invalidation');
  assertIncludes(triggers, "'predictive_trigger_create'", 'Answerlattice predictive trigger create refresh');
  assertIncludes(triggers, "'predictive_trigger_update'", 'Answerlattice predictive trigger update refresh');
  assertIncludes(triggers, "'predictive_trigger_delete'", 'Answerlattice predictive trigger delete refresh');
}

function verifyCompiledContextBundleTruth() {
  const builder = read('src/lib/answerlattice/contextBundleBuilderServer.ts');

  assertIncludes(builder, 'const storeTenantId = Number(storeData.tId || storeData.tenantId)', 'Answerlattice context bundle store tenant resolution');
  assertIncludes(builder, 'storeTenantId === Number(tId)', 'Answerlattice context bundle store scope guard');
  assertIncludes(builder, ".where('tId', '==', tId)", 'Answerlattice context bundle tenant-scoped source queries');
  assertIncludes(builder, ".where('sId', '==', sId)", 'Answerlattice context bundle store-scoped source queries');
  assertIncludes(builder, ".where('status', '==', 'published')", 'Answerlattice context bundle published content filter');
  assertIncludes(builder, ".where('active', '==', true)", 'Answerlattice context bundle active FAQ filter');
  assertIncludes(builder, "getPrivateBundlePath(tenantId, storeId, bundleVersion, filePath)", 'Answerlattice context bundle private tenant path');
  assertIncludes(builder, "getPublicBundlePath(publicBundleId, bundleVersion, filePath)", 'Answerlattice context bundle public bundle path');
}

function verifyMutationProposalScopeGuard() {
  const proposals = read('src/database/answerlattice/mutationProposals.ts');

  assertIncludes(proposals, 'Number(proposal.tId) !== Number(tId) || Number(proposal.sId) !== Number(sId)', 'Answerlattice mutation proposal approval scope guard');
  assertIncludes(proposals, 'Number(entity.tId) !== Number(tId) || Number(entity.sId) !== Number(sId)', 'Answerlattice mutation proposal entity scope guard');
}

function verifyFirestoreRuleBoundary() {
  const rules = read('firestore-answerlattice.rules');

  assertIncludes(rules, 'allow read, write: if false;', 'Answerlattice Firestore default deny');
  assertIncludes(rules, "data.pId == 'AL'", 'Answerlattice Firestore product scope guard');
  assertIncludes(rules, 'function isAnswerlatticeTenantStoreMember(data)', 'Answerlattice Firestore tenant-store guard');
  assertIncludes(rules, 'string(data.tId) == string(request.auth.token.tenantId)', 'Answerlattice Firestore tId guard');
  assertIncludes(rules, 'string(data.sId) == string(request.auth.token.storeId)', 'Answerlattice Firestore sId guard');
}

verifyDedicatedAnswerlatticeFirebase();
verifyPublicApiAndWidgetIsolation();
verifySearchAndRetrievalTruth();
verifyHostedHelpRegistryTruth();
verifyKnowledgeIntakePublishRecovery();
verifyArticleEntityExtractionScope();
verifyPredictiveTriggerPublicSummary();
verifyCompiledContextBundleTruth();
verifyMutationProposalScopeGuard();
verifyFirestoreRuleBoundary();

console.log('Answerlattice runtime truth verifier passed');
