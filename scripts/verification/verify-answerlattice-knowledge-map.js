#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, value, label) => assert(content.includes(value), `${label} must include ${value}`);
const excludes = (content, value, label) => assert(!content.includes(value), `${label} must not include ${value}`);

const features = read('src/config/features.ts');
const navigation = read('src/constants/answerlattice/navigations.ts');
const governance = read('src/components/templates/answerlattice/governance/index.tsx');
const dashboard = read('src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx');
const dal = read('src/database/answerlattice/knowledgeMap.ts');
const graphContracts = read('src/lib/answerlattice/runtimeSummaryContracts.ts');
const nightly = read('functions-answerlattice/src/answerlattice/answerlatticeNightly.ts');
const graphState = read('functions-answerlattice/src/answerlattice/entityGraphIndexState.ts');
const publicRenderer = read('src/lib/answerlattice/publicRichText.ts');
const hostedPage = read('src/app/answerlattice-hosted-help/[[...segments]]/page.tsx');
const hostedClient = read('src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx');
const topicMap = read('src/components/templates/answerlattice/hostedHelp/ArticleTopicMap.tsx');
const firebaseDoc = read('__docs__/answerlattice/knowledge-map/knowledge-map_firebase.md');
const packageJson = JSON.parse(read('package.json'));

includes(features, 'ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP: true', 'Knowledge Map feature flag');
includes(features, 'Owner cost is two parallel platformSummary point reads', 'Knowledge Map feature-flag cost contract');
includes(navigation, "MAP: 'map'", 'Knowledge Map governance route');
includes(navigation, "featureFlag: 'ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP'", 'Knowledge Map sidebar gate');
includes(governance, '<KnowledgeMapDashboard tId={tId} sId={sId} />', 'Knowledge Map governance mount');

includes(dal, '`entityGraphIndex_${scope.tenantId}_${scope.storeId}`', 'Knowledge Map existing summary read');
includes(dal, 'getAnswerlatticeSourceVersionsDocId(scope.tenantId, scope.storeId)', 'Knowledge Map existing source-version read');
includes(dal, 'parseAnswerlatticeEntityGraphIndex(graphSnapshot.data(), { tId, sId })', 'Knowledge Map exact scope parser');
includes(dal, 'parseAnswerlatticeCurrentGraphSourceVersions', 'Knowledge Map current source-version parser');
includes(dal, 'getAnswerlatticeEntityGraphFreshness', 'Knowledge Map freshness comparison');
includes(dal, 'Promise.all([', 'Knowledge Map parallel point reads');
includes(dal, 'getDoc(', 'Knowledge Map point read');
excludes(dal, 'getDocs(', 'Knowledge Map collection scan');
excludes(dal, 'onSnapshot(', 'Knowledge Map listener');
excludes(dashboard, 'getDoc(', 'Knowledge Map per-node read');
excludes(dashboard, 'fetch(', 'Knowledge Map network fan-out');

includes(graphContracts, 'driftedAnswerCount,', 'Knowledge Map bounded drift projection');
includes(graphContracts, 'reviewRequiredAnswerCount,', 'Knowledge Map bounded review projection');
includes(graphContracts, 'getAnswerlatticePredictiveTimestampMillis(data.lastRebuiltAt) === null', 'Knowledge Map rebuild timestamp validation');
includes(graphContracts, 'entries.length !== data.entityCount', 'Knowledge Map complete graph validation');
includes(graphContracts, 'answerlatticeRelationTypes.has(relationType)', 'Knowledge Map governed relation validation');
includes(graphContracts, 'outgoingRelationTypes', 'Knowledge Map outgoing relation validation');
includes(graphContracts, 'incomingRelationTypes', 'Knowledge Map incoming relation validation');
includes(graphContracts, "return 'unverified'", 'Knowledge Map fail-closed freshness state');
excludes(graphContracts, '...data,', 'Knowledge Map unknown summary-field projection');
includes(nightly, 'const driftedAnswerCountByEntity = new Map<string, number>();', 'Knowledge Map same-snapshot drift aggregation');
includes(nightly, 'const reviewRequiredAnswerCountByEntity = new Map<string, number>();', 'Knowledge Map same-snapshot review aggregation');
includes(nightly, "window: 'entity_graph_source_versions'", 'Knowledge Map nightly source-version telemetry');
includes(nightly, 'sourceVersions: graphSourceVersions,', 'Knowledge Map rebuild source-version evidence');
includes(nightly, 'outgoingRelationTypes: {}', 'Knowledge Map outgoing relation summary');
includes(nightly, 'incomingRelationTypes: {}', 'Knowledge Map incoming relation summary');
includes(nightly, 'isCurrentAnswerlatticeEntityGraphIndex(existingData', 'Knowledge Map persisted summary recovery admission');
includes(nightly, 'hashAnswerlatticeEntityGraphPayload(graphPayload)', 'Knowledge Map rebuilt payload hash proof');
excludes(nightly, 'if (entitiesSnap.empty) return result;', 'Knowledge Map empty graph reconciliation');
includes(graphState, 'actualKeys.length !== sortedExpectedKeys.length', 'Knowledge Map exact persisted envelope');
includes(graphState, 'hashAnswerlatticeEntityGraphPayload({', 'Knowledge Map stored payload hash proof');
includes(graphState, 'hashAnswerlatticeEntityGraphPayload(expected.payload)', 'Knowledge Map expected payload hash proof');

includes(dashboard, 'const relationGroups = useMemo<RelationGroup[]>', 'Knowledge Map relation grouping');
includes(dashboard, 'formatRelationType(type)', 'Knowledge Map governed relation labels');
includes(dashboard, "requires: { incoming: 'Required by', outgoing: 'Requires' }", 'Knowledge Map directional relation wording');
includes(dashboard, 'ANSWERLATTICE_GOVERNANCE_TABS.CANDIDATES', 'Knowledge Map candidate review action');
includes(dashboard, "data.freshness === 'stale'", 'Knowledge Map explicit freshness warning');
includes(dashboard, 'Missing answer', 'Knowledge Map uncovered status');
includes(dashboard, 'need review', 'Knowledge Map review status');
includes(dashboard, 'denormalizeVersion', 'Knowledge Map version display');
includes(dashboard, 'aria-expanded={relationshipsExpanded}', 'Knowledge Map mobile relationship disclosure');
includes(dashboard, 'styles.mobileCollapsed', 'Knowledge Map mobile relationship collapse');
includes(publicRenderer, 'MAX_PUBLIC_ARTICLE_HEADINGS = 40', 'Knowledge Map public heading cap');
includes(publicRenderer, 'renderPublicTiptapArticle', 'Knowledge Map sanitized public renderer');
includes(hostedPage, 'outline: rendered.outline', 'Knowledge Map compact public outline');
includes(hostedClient, '<ArticleTopicMap', 'Knowledge Map hosted-help mount');
includes(topicMap, 'aria-expanded={expanded}', 'Knowledge Map accessible disclosure');
excludes(topicMap, 'entityId', 'Knowledge Map public internal entity boundary');
excludes(topicMap, 'canonical', 'Knowledge Map public canonical-record boundary');
excludes(hostedClient, 'article.content', 'Knowledge Map public raw article boundary');

includes(firebaseDoc, '2 point reads', 'Knowledge Map cost contract');
includes(firebaseDoc, 'AI calls: 0', 'Knowledge Map AI cost contract');
assert(
  packageJson.scripts?.['verify:answerlattice-knowledge-map']
    === "node scripts/verification/verify-answerlattice-knowledge-map.js && npm run test:answerlattice-knowledge-map",
  'package must expose the focused Knowledge Map verifier',
);

console.log('Answerlattice Knowledge Map boundary verification passed.');
