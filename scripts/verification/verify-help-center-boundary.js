#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

function hasSingleFieldExemption(indexConfig, collectionGroup, fieldPath) {
  return indexConfig.fieldOverrides?.some((entry) => (
    entry.collectionGroup === collectionGroup
    && entry.fieldPath === fieldPath
    && Array.isArray(entry.indexes)
    && entry.indexes.length === 0
  ));
}

function verifySearchBoundary() {
  const searchRoute = read('src/app/api/helpCenter/search-kb/route.ts');
  const sessionScope = read('src/lib/answerlattice/sessionScope.ts');
  const searchResponse = read('src/lib/search/helpCenterSearchResponse.ts');
  const helpChatApi = read('src/components/templates/main-app/helpChat/api.ts');
  const aiSearchModal = read('src/components/organisms/AISearchModal/AiSearchBarComponent.tsx');
  const messageBubble = read('src/components/templates/main-app/helpChat/MessageBubble.tsx');
  const heroSearchBar = read('src/components/templates/main-app/helpCenter/HeroSearchBar.tsx');
  const helpCenter = read('src/components/templates/main-app/helpCenter/index.tsx');
  const tabsConfig = read('src/components/templates/main-app/helpCenter/tabsConfig.tsx');
  const chatInput = read('src/components/templates/main-app/helpChat/ChatInput.tsx');
  const helpChatDrafts = read('src/lib/answerlattice/helpChatDrafts.ts');
  const cacheScopeHook = read('src/hooks/answerlattice/useAnswerlatticeCacheScope.ts');
  const categoriesCache = read('src/hooks/useKBCategoriesCache.ts');
  const articleCache = read('src/hooks/useArticleCache.ts');
  const ticketCache = read('src/hooks/useTicketCache.ts');
  const changelogCache = read('src/hooks/useChangelogCache.ts');
  const platformTickets = read('src/components/templates/platform/supportTickets/index.tsx');
  const faqView = read('src/components/templates/main-app/helpCenter/FaqView.tsx');

  assertIncludes(searchRoute, 'withAuth(async (request: NextRequest, session)', 'Help Center search API auth boundary');
  assertIncludes(searchRoute, 'checkAIOperationLimit()', 'Help Center search API AI rate limit');
  assertIncludes(searchRoute, 'const HELP_CENTER_SEARCH_MAX_BODY_BYTES = 64 * 1024;', 'Help Center search API request cap');
  assertIncludes(searchRoute, 'readBoundedJsonBody(request, HELP_CENTER_SEARCH_MAX_BODY_BYTES)', 'Help Center search API bounded body parser');
  assertIncludes(searchRoute, 'getSafeZodValidationDetails(error)', 'Help Center search API safe validation details');
  assertNotIncludes(searchRoute, 'isAnswerlatticeSupportClientRoute(refererUrl?.pathname)', 'MenuList Help Center server auth must not trust the Referer pathname');
  assertIncludes(searchRoute, 'resolveAnswerlatticeSessionScope(session)', 'MenuList Help Center Answerlattice scoped account check');
  assertIncludes(searchRoute, 'getAnswerlatticeScopedSession(session)', 'MenuList Help Center Answerlattice scoped session');
  assertIncludes(searchRoute, "mountContext: 'help_center'", 'Help Center search accounting and runtime source');
  assertIncludes(searchRoute, 'answerlattice_search_operation_log_failed', 'Help Center search operation-log failure code');
  assertIncludes(searchRoute, 'answerlattice_help_center_search_failed', 'Help Center search top-level failure code');
  assertNotIncludes(searchRoute, 'request.json()', 'Help Center search API unbounded JSON parser');
  assertNotIncludes(searchRoute, 'error.issues.map', 'Help Center search API raw Zod issue mapping');
  assertNotIncludes(searchRoute, 'message: err.message', 'Help Center search API raw exception response');

  assertIncludes(sessionScope, "normalizedPath === '/help-center' || normalizedPath.startsWith('/help-center/')", 'Answerlattice support client route scope');
  assertIncludes(sessionScope, 'getAnswerlatticeScopedSession', 'Answerlattice scoped session helper');
  assertIncludes(sessionScope, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice session scope imports shared Firestore ID guard');
  assertIncludes(sessionScope, 'ANSWERLATTICE_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;', 'Answerlattice session scope exact numeric helper');
  assertIncludes(sessionScope, 'export function normalizeAnswerlatticeScopeDocumentId(value: unknown): number | null', 'Answerlattice session scope exports strict normalizer');
  assertIncludes(sessionScope, 'documentId !== raw', 'Answerlattice session scope must not trim mutated IDs');
  assertIncludes(sessionScope, '!isValidFirestoreDocumentId(documentId)', 'Answerlattice session scope Firestore document ID guard');
  assertNotIncludes(sessionScope, 'const normalizeNumber = (value: unknown): number | null => {', 'Answerlattice session scope must not use loose normalizeNumber helper');
  assertNotIncludes(sessionScope, 'Number.isFinite(parsed) && parsed > 0 ? parsed : null', 'Answerlattice session scope must not use loose numeric coercion');

  assertIncludes(searchResponse, 'HELP_CENTER_SEARCH_RESPONSE_JSON_MAX_BYTES = 1024 * 1024', 'Help Center browser response cap');
  assertIncludes(searchResponse, 'HELP_CENTER_SEARCH_REQUEST_POLICY', 'Help Center browser request policy');
  assertIncludes(searchResponse, "cache: 'no-store'", 'Help Center browser no-store policy');
  assertIncludes(searchResponse, "credentials: 'same-origin'", 'Help Center browser same-origin credentials');
  assertIncludes(searchResponse, "redirect: 'manual'", 'Help Center browser manual redirect policy');
  assertIncludes(searchResponse, 'readJsonResponseWithLimit<unknown>', 'Help Center browser bounded response parser');
  assertIncludes(searchResponse, 'isHelpCenterSearchResponse', 'Help Center browser response shape guard');
  assertIncludes(searchResponse, 'normalizeAnswerlatticePublicRelatedContent', 'Help Center related-content response normalizer');
  assertIncludes(
    searchResponse,
    "['cache', 'canonical', 'empty', 'faq', 'rag'].includes(String(value.answerSource))",
    'Help Center answer-source response allowlist',
  );
  assertIncludes(messageBubble, 'helpCenterArticleRouting(articleId)', 'Help Chat related articles use internal Help Center routes');
  assertNotIncludes(messageBubble, 'window.open(articleUrl', 'Help Chat must not open response-supplied article URLs');
  assertNotIncludes(messageBubble, "getBoundedHelpChatStringContext('articleUrl'", 'Help Chat must not log response-supplied article URLs');

  assertIncludes(helpChatApi, '...HELP_CENTER_SEARCH_REQUEST_POLICY', 'Help Chat search request policy');
  assertIncludes(helpChatApi, "readHelpCenterSearchResponse(response, 'help_chat')", 'Help Chat bounded response parser');
  assertNotIncludes(helpChatApi, 'response.json()', 'Help Chat direct JSON parser');

  assertIncludes(aiSearchModal, '...HELP_CENTER_SEARCH_REQUEST_POLICY', 'AI Search modal request policy');
  assertIncludes(aiSearchModal, "readHelpCenterSearchResponse(response, 'ai_search_modal')", 'AI Search modal bounded response parser');
  assertIncludes(aiSearchModal, 'getHelpCenterSearchClientFailureMessage(error, AI_SEARCH_FAILED_MESSAGE)', 'AI Search modal fixed local failure copy');
  assertNotIncludes(aiSearchModal, 'response.json()', 'AI Search modal direct JSON parser');

  assertIncludes(heroSearchBar, "'contact-us': 'contact_support'", 'Help Center contact workflow context');
  assertNotIncludes(heroSearchBar, "contact: 'contact_support'", 'Help Center stale contact workflow key');
  assertIncludes(heroSearchBar, 't(currentTab.titleKey as any)', 'Help Center translated breadcrumb title');
  assertIncludes(helpCenter, 't((activeTab?.titleKey ?? DEFAULT_HOME_TAB.titleKey) as any)', 'Help Center translated tab title');
  assertNotIncludes(tabsConfig, 'description:', 'Help Center dead hardcoded tab description metadata');
  assertNotIncludes(tabsConfig, 'title:', 'Help Center dead hardcoded tab title metadata');
  assertIncludes(helpChatDrafts, 'resolveAnswerlatticeHelpChatDraftScope', 'Help Chat workspace/user draft scope');
  assertIncludes(helpChatDrafts, 'normalizedIds.every((value) => value === firstId)', 'Help Chat consistent user identity requirement');
  assertIncludes(chatInput, 'getAnswerlatticeHelpChatDraftKeys(draftScope, sessionId)', 'Help Chat scoped draft storage keys');
  assertIncludes(chatInput, 'hydratedDraftKey !== draftKeys.draftKey', 'Help Chat draft hydration-before-save guard');
  assertIncludes(chatInput, 'purgeForeignAnswerlatticeHelpChatDrafts(localStorage, draftScope)', 'Help Chat prior-scope draft purge');
  assertIncludes(chatInput, 'parseAnswerlatticeHelpChatDraft(storedDraft)', 'Help Chat bounded draft parser');
  assertIncludes(chatInput, 'serializeAnswerlatticeHelpChatDraft(inputValue)', 'Help Chat versioned draft serializer');
  assertIncludes(chatInput, 'localStorage.removeItem(draftKeys.draftKey);', 'Help Chat invalid or empty draft removal');
  assertIncludes(chatInput, '[selectedImage, draftKeys, draftScope, legacyDraftKeys]', 'Help Chat scope-change draft purge dependency');
  assertNotIncludes(chatInput, 'const draftKey = `chat-draft-${sessionId', 'Help Chat unscoped draft key');
  assertIncludes(cacheScopeHook, 'resolveAnswerlatticeWorkspaceCacheScopeKey(session)', 'Help Center exact workspace cache scope');
  assertIncludes(categoriesCache, 'new Map<string, Promise<KnowledgeBaseCategoriesType | null>>()', 'Help Center category request coalescing per scope');
  assertIncludes(categoriesCache, 'cachedKBCategories?.scopeKey === scopeKey', 'Help Center category cache scope check');
  assertIncludes(articleCache, 'cachedArticles.scopeKey === scopeKey', 'Help Center article cache scope check');
  assertIncludes(ticketCache, 'cachedTickets.scopeKey === scopeKey', 'Help Center ticket cache scope check');
  assertIncludes(changelogCache, 'new Map<string, Promise<ChangelogPage | null>>()', 'Answerlattice changelog request coalescing per scope');
  assertIncludes(platformTickets, "useTicketCache({ audience: 'platform' })", 'Platform ticket cache audience separation');
  assertNotIncludes(categoriesCache, 'let categoriesFetchInFlight:', 'Help Center global category in-flight promise');
  assertNotIncludes(changelogCache, 'let changelogFetchInFlight:', 'Answerlattice global changelog in-flight promise');
  assertIncludes(faqView, "if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT)", 'Help Center explicit FAQ flag fallback');
  assertIncludes(faqView, 'if (failed) {', 'Help Center visible managed FAQ failure');
  assertNotIncludes(faqView, 'if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT || failed)', 'Help Center silent static FAQ failure fallback');
}

function verifyMobileBoundary() {
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileHelpScreen = read('src/components/mobile/screens/MobileHelpScreen.tsx');

  assertIncludes(mobileShell, 'const HELP_CENTER_TAB_TO_MORE_SCREEN', 'MobileShell Help Center route map');
  assertIncludes(mobileShell, "return HELP_CENTER_TAB_TO_MORE_SCREEN[tab] || 'answerlatticeHelp';", 'MobileShell Help Center fallback');
  assertIncludes(mobileShell, "normalizedPathname === '/help-center' || normalizedPathname.startsWith('/help-center/')", 'MobileShell Help Center direct route detection');
  assertIncludes(mobileMoreScreen, "else if (subScreen === 'answerlatticeHelp') subScreenContent = <MobileHelpScreen", 'Mobile More Help Center entry');
  assertIncludes(mobileMoreScreen, 'initialTab="kb"', 'Mobile More Help Center docs tab');
  assertIncludes(mobileMoreScreen, 'initialTab="ticket"', 'Mobile More Help Center support tab');
  assertIncludes(mobileMoreScreen, 'initialTab="changelog"', 'Mobile More Help Center release notes tab');
  assertIncludes(mobileHelpScreen, "const isDirectHelpCenterRoute = pathSegments[0] === 'help-center';", 'Mobile Help Center direct route awareness');
  assertIncludes(mobileHelpScreen, 'const requestedArticleId = requestedPathTab === \'kb\'', 'Mobile Help Center article deep link');
  assertIncludes(mobileHelpScreen, 'const requestedChangelogId = requestedPathTab === \'changelog\'', 'Mobile Help Center changelog deep link');
  assertIncludes(mobileHelpScreen, "window.history.replaceState(null, '', '/dashboard#mobile/more');", 'Mobile Help Center shell back target');
  assertIncludes(mobileHelpScreen, 'min-height: 44px;', 'Mobile Help Center touch target floor');
  assertIncludes(mobileHelpScreen, "useTranslations('MobileHelp')", 'Mobile Help Center translated header');
  assertNotIncludes(mobileHelpScreen, 'description="Search docs, check updates, and contact support."', 'Mobile Help Center hardcoded description');
}

function verifyTicketBoundary() {
  const ticketsDal = read('src/database/tickets/index.ts');
  const firestoreRules = read('firestore-answerlattice.rules');
  const sharedFirestoreRules = read('firestore.rules');
  const ticketHistoryView = read('src/components/templates/main-app/helpCenter/TicketHistoryView.tsx');
  const ticketDetailView = read('src/components/templates/platform/supportTickets/TicketDetailView.tsx');
  const conversationTimeline = read('src/components/templates/platform/supportTickets/ConversationTimeline.tsx');
  const platformTicketsView = read('src/components/templates/platform/supportTickets/PlatformTicketsView.tsx');
  const ticketActions = read('src/components/templates/platform/supportTickets/TicketActions.tsx');
  const attachmentBoundary = read('src/lib/answerlattice/supportTicketAttachmentBoundary.ts');
  const dedicatedIndexes = JSON.parse(read('firestore-answerlattice.indexes.json'));
  const sharedIndexes = JSON.parse(read('firestore.indexes.json'));

  for (const [label, indexConfig] of [['dedicated', dedicatedIndexes], ['shared', sharedIndexes]]) {
    for (const fieldPath of ['messages', 'statuses', 'documents', 'logs']) {
      assert(
        hasSingleFieldExemption(indexConfig, 'supportTickets', fieldPath),
        `Answerlattice ${label} supportTickets.${fieldPath} index exemption is missing`,
      );
    }
  }

  assertIncludes(ticketsDal, 'getScopedTicketConstraints(session)', 'Support ticket platform/client scoped query helper');
  assertIncludes(ticketsDal, 'SUPPORT_TICKET_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;', 'Support ticket exact numeric scope helper');
  assertIncludes(ticketsDal, 'documentId !== raw', 'Support ticket scope must not trim mutated IDs');
  assertIncludes(ticketsDal, '!isValidFirestoreDocumentId(documentId)', 'Support ticket scope Firestore document ID guard');
  assertIncludes(ticketsDal, 'const sessionScope = getRequiredSessionSupportTicketScope(session);', 'Support ticket store reads require normalized session scope');
  assertIncludes(ticketsDal, 'where("tId", "==", sessionScope.tId)', 'Store ticket read tenant scope');
  assertIncludes(ticketsDal, 'where("sId", "==", sessionScope.sId)', 'Store ticket read store scope');
  assertIncludes(ticketsDal, 'requireSupportTicketMutationContext', 'Support ticket session/mutation scope guard');
  assertIncludes(ticketsDal, 'requirePersistedTicket', 'Support ticket transaction persisted scope/schema guard');
  assertIncludes(ticketsDal, 'getSessionSupportTicketScope(session)', 'Support ticket session scope resolver');
  assertIncludes(ticketsDal, 'support_ticket_update', 'Support ticket update scope rejection code base');
  assertIncludes(ticketsDal, 'support_ticket_message', 'Support ticket message scope rejection code base');
  assertIncludes(ticketsDal, 'const currentTicket = requirePersistedTicket(', 'Support ticket update transaction revalidates persisted scope');
  assertNotIncludes(ticketsDal, 'applySupportTicketMutationScope', 'Support ticket must not restore retired caller scope merging');
  assertNotIncludes(ticketsDal, 'where("tId", "==", session.tId)', 'Support ticket reads must not query raw session tenant scope');
  assertNotIncludes(ticketsDal, 'where("sId", "==", session.sId)', 'Support ticket reads must not query raw session store scope');
  assertNotIncludes(ticketsDal, 'const tId = Number(session?.tId ?? session?.user?.tenantId);', 'Support ticket reads must not numeric-coerce session tenant scope');
  assertNotIncludes(ticketsDal, 'const sId = Number(session?.sId ?? session?.user?.storeId);', 'Support ticket reads must not numeric-coerce session store scope');

  assertIncludes(firestoreRules, 'match /supportTickets/{docId}', 'Answerlattice support ticket rules block');
  assertIncludes(firestoreRules, 'allow create: if isAnswerlatticeScopedCreateWithSupportControl()\n        && isValidAnswerlatticeSupportTicketCreate(request.resource.data);', 'Answerlattice support ticket scoped create/schema rule');
  assertIncludes(firestoreRules, 'allow update: if isAnswerlatticeScopedUpdateWithSupportControl()\n        && isValidAnswerlatticeSupportTicketUpdate(resource.data, request.resource.data);', 'Answerlattice support ticket scoped update/schema rule');
  assertIncludes(firestoreRules, "allow delete: if isAuthenticated() && isPlatformAdmin() && resource.data.pId == 'AL';", 'Answerlattice support ticket platform-only delete rule');
  assertNotIncludes(firestoreRules, 'allow update: if isAnswerlatticeScopedUpdateWithSupportControl();', 'Answerlattice support ticket update must not bypass persisted transition validation');
  assertIncludes(firestoreRules, 'request.resource.data.tId == resource.data.tId', 'Answerlattice rules stable tenant scope');
  assertIncludes(firestoreRules, 'request.resource.data.sId == resource.data.sId', 'Answerlattice rules stable store scope');
  assertIncludes(firestoreRules, 'answerlatticeSupportTicketMessagesAppendOne', 'Answerlattice support ticket append-only message rule');
  assertIncludes(firestoreRules, 'answerlatticeSupportTicketStatusesAppendOne', 'Answerlattice support ticket append-only status rule');
  assertIncludes(firestoreRules, 'isValidAnswerlatticeSupportTicketSatisfaction', 'Answerlattice support ticket immutable satisfaction rule');
  assertIncludes(firestoreRules, "answerlatticeSupportTicketMessagesAppendOne(before, after, 'system')", 'Answerlattice support ticket status system-message rule');
  for (const [label, rules] of [['dedicated', firestoreRules], ['shared', sharedFirestoreRules]]) {
    assertIncludes(rules, 'answerlatticeSupportTicketMessagesAppendOne', `Answerlattice ${label} append-only message rule`);
    assertIncludes(rules, 'answerlatticeSupportTicketStatusesAppendOne', `Answerlattice ${label} append-only status rule`);
    assertIncludes(rules, 'isValidAnswerlatticeSupportTicketSatisfaction', `Answerlattice ${label} immutable satisfaction rule`);
    assertIncludes(rules, "actor.id == request.auth.uid || actor.id == request.auth.token.get('uId', '')", `Answerlattice ${label} ticket actor auth binding`);
  }

  assertIncludes(ticketHistoryView, 'from="client"', 'MenuList Help Center ticket detail client mode');
  assertIncludes(ticketDetailView, 'const isClientView = from === "client";', 'Support ticket client view flag');
  assertIncludes(ticketDetailView, 'tId: ticket.tId', 'Support ticket detail mutation tenant scope');
  assertIncludes(ticketDetailView, 'sId: ticket.sId', 'Support ticket detail mutation store scope');
  assertIncludes(ticketDetailView, '{!isClientView && (', 'Support ticket client view hides platform-only actions/logs');
  assertIncludes(conversationTimeline, '{ tId: ticket.tId, sId: ticket.sId }', 'Support ticket reply mutation scope');
  assertIncludes(platformTicketsView, 'tId: ticket.tId', 'Support ticket table mutation tenant scope');
  assertIncludes(platformTicketsView, 'sId: ticket.sId', 'Support ticket table mutation store scope');
  assertIncludes(attachmentBoundary, 'ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024', 'Support ticket attachment shared size limit');
  assertIncludes(attachmentBoundary, 'getSupportTicketAttachmentDownloadUrl', 'Support ticket attachment trusted download URL boundary');
  assertIncludes(attachmentBoundary, "parsedUrl.hostname !== 'firebasestorage.googleapis.com'", 'Support ticket attachment Firebase host boundary');
  for (const [label, source] of [['ticket detail', ticketDetailView], ['ticket actions', ticketActions]]) {
    assertIncludes(source, 'getSupportTicketAttachmentDownloadUrl({', `Support ticket ${label} trusted attachment open`);
    assertIncludes(source, 'attachmentUrlPresent:', `Support ticket ${label} bounded attachment URL presence diagnostic`);
    assertNotIncludes(source, "getBoundedRuntimeStringContext('attachmentUrl'", `Support ticket ${label} signed URL diagnostic`);
    assertNotIncludes(source, 'window.open(item.url', `Support ticket ${label} raw attachment open`);
  }
}

function verifyDocsBoundary() {
  const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
  const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const helpCenterImpl = read('__docs__/answerlattice/help-center/help-center_impl.md');
  const helpCenterFirebase = read('__docs__/answerlattice/help-center/help-center_firebase.md');
  const helpCenterTests = read('__docs__/answerlattice/help-center/help-center_test-cases.md');
  const helpChatReadme = read('src/components/templates/main-app/helpChat/README.md');
  const helpChatSummary = read('src/components/templates/main-app/helpChat/IMPLEMENTATION_SUMMARY.md');
  const landingFooter = read('src/components/templates/main-app/helpCenter/landing/LandingFooter.tsx');
  const ticketView = read('src/components/templates/main-app/helpCenter/TicketView.tsx');
  const packageJson = read('package.json');

  assertIncludes(inventory, 'help_center | Owner Help Center', 'Help Center inventory row');
  assertIncludes(report, 'Help Center Answerlattice Support Boundary', 'Help Center sweep report checkpoint');
  assertIncludes(audit, 'Help Center Answerlattice support boundary checkpoint', 'Help Center production audit checkpoint');
  assertIncludes(audit, 'Answerlattice support ticket session scope boundary checkpoint', 'Help Center support ticket session scope audit checkpoint');
  assertIncludes(changelog, 'Help Center Answerlattice Support Boundary', 'Help Center changelog entry');
  assertIncludes(changelog, 'Answerlattice Support Ticket Session Scope Boundary', 'Help Center support ticket session scope changelog entry');
  assertIncludes(inventory, 'item 28 local source complete', 'Help Center item 28 inventory status');
  assertIncludes(report, 'Item 28 is locally source complete', 'Help Center item 28 sweep status');
  assertIncludes(audit, 'MenuList Help Center End-to-End Boundary', 'Help Center item 28 production audit');
  assertIncludes(changelog, 'MenuList Help Center End-to-End Hardening', 'Help Center item 28 changelog');
  assertIncludes(helpCenterImpl, 'Answerlattice support ticket session scope boundary', 'Help Center implementation support ticket session scope docs');
  assertIncludes(helpCenterImpl, 'exact positive numeric Firestore document IDs before querying `supportTickets`', 'Help Center implementation exact support ticket scope docs');
  assertIncludes(helpCenterFirebase, 'Support ticket session scope hardening is cost-neutral', 'Help Center Firebase support ticket session scope cost docs');
  assertIncludes(helpCenterFirebase, 'adds no Firestore reads/writes/deletes', 'Help Center Firebase support ticket session scope no-cost docs');
  assertIncludes(helpCenterImpl, 'binds every Help Center context cache to an exact `workspace:{tId}:{sId}` key', 'Help Center implementation cache-scope docs');
  assertIncludes(helpCenterImpl, 'text is stored in a strict 24-hour envelope', 'Help Center implementation draft-retention docs');
  assertIncludes(helpCenterTests, 'Platform ticket cache exists and customer Help Center opens', 'Help Center cache-audience test case');
  assertIncludes(helpCenterTests, 'Same user reloads within 24 hours', 'Help Center draft hydration test case');
  assertNotIncludes(helpCenterImpl, 'caches session in module-level variable', 'Help Center stale ticket session-cache claim');
  assertNotIncludes(helpCenterImpl, 'None of the 3 helpCenter API routes use `withAuth()`', 'Help Center stale unauthenticated API claim');
  assertIncludes(helpChatReadme, 'A source-gated help interface designed for non-technical owners.', 'Help Chat README source-gated overview');
  assertIncludes(helpChatReadme, 'Launch certification still requires the active Help Center verifier', 'Help Chat README launch certification boundary');
  assertNotIncludes(helpChatReadme, 'A production help interface designed for non-technical owners.', 'Help Chat README stale production overview');
  assertIncludes(helpChatSummary, 'Help Chat System - Source-Gated UI Slice', 'Help Chat summary source-gated title');
  assertIncludes(helpChatSummary, 'The current Help Chat UI slice is implemented and source-gated for the reviewed owner help interface.', 'Help Chat summary source-gated boundary');
  assertIncludes(helpChatSummary, 'Backend integration, provider behavior, browser/device QA, and launch certification remain gated', 'Help Chat summary launch boundary');
  assertNotIncludes(helpChatSummary, 'Production-Ready Features Implemented', 'Help Chat summary stale production-ready heading');
  assertNotIncludes(helpChatSummary, 'Ready for Production', 'Help Chat summary stale ready-for-production heading');
  assertNotIncludes(helpChatSummary, 'A production-ready, emotionally engaging help chat system', 'Help Chat summary stale production-ready mission');
  assertNotIncludes(helpChatSummary, 'Ready for user testing and backend integration', 'Help Chat summary stale user-testing signoff');
  assertIncludes(landingFooter, "href=\"/terms-of-service\"", 'Help Center footer current terms route');
  assertIncludes(landingFooter, "href=\"/privacy-policy\"", 'Help Center footer current privacy route');
  assertIncludes(landingFooter, 'new Date().getFullYear()', 'Help Center footer current copyright year');
  assertNotIncludes(landingFooter, '© 2025 MenulistAI', 'Help Center footer stale brand/year');
  assertNotIncludes(landingFooter, 'href="/blog"', 'Help Center footer unimplemented blog route');
  assertNotIncludes(landingFooter, 'href="/use-cases"', 'Help Center footer cross-product use-cases route');
  assertNotIncludes(ticketView, "message.success(t('requestSubmitted'))", 'Help Center ticket duplicate success message');
  assertIncludes(packageJson, 'test:help-center-runtime-boundaries', 'Help Center runtime boundary package script');
}

verifySearchBoundary();
verifyMobileBoundary();
verifyTicketBoundary();
verifyDocsBoundary();

console.log('Help Center boundary verification passed');
