#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const searchRoute = read('src/app/api/widget/search/route.ts');
const feedbackRoute = read('src/app/api/widget/feedback/route.ts');
const escalationRoute = read('src/app/api/widget/escalation/route.ts');
const escalationServer = read('src/lib/answerlattice/widgetEscalationServer.ts');
const ticketLifecycle = read('src/lib/answerlattice/supportTicketLifecycle.ts');
const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
const historyType = read('src/types/aiSearchHistory.ts');
const ticketType = read('src/types/supportTicket.ts');
const featureFlags = read('src/config/features.ts');
const escalationReadme = read('__docs__/answerlattice/ai-failure-escalation/README.md');
const escalationFirebase = read('__docs__/answerlattice/ai-failure-escalation/ai-failure-escalation_firebase.md');
const escalationHelp = read('__docs__/answerlattice/ai-failure-escalation/ai-failure-escalation_helpdoc.md');

assert(searchRoute.includes('normalizeAnswerlatticePublicCitationUrl(ref.url)'), 'widget references must pass through the public URL boundary');
assert(!searchRoute.includes('url: ref.url'), 'widget references must not expose raw source URLs');
assert(searchRoute.includes('fallbackSuggested:'), 'widget search must expose a bounded fallback suggestion');
assert(searchRoute.includes('imageProcessed: result.imageProcessed'), 'widget search must report whether the submitted image was used');
assert(searchRoute.includes('verifiedVisitor\n                        ? body.context\n                        : stripUnverifiedSensitiveContext(body.context)'), 'unsigned or rejected visitor context must not supply sensitive plan, role, or locale claims');
assert(!searchRoute.includes('verifiedContextRejected\n                        ? stripUnverifiedSensitiveContext(body.context)'), 'sensitive context filtering must not depend on an invalid token being present');
assert(searchRoute.includes('articles: (result.relatedContent.articles || []).slice(0, 5).map'), 'related content must be explicitly projected');
assert(!searchRoute.includes('articles: result.relatedContent.articles || []'), 'related content must not expose the full stored object');
assert(searchRoute.includes('const publicGraphExpansion = normalizeWidgetGraphExpansion(result.graphExpansion)'), 'widget graph data must pass through an explicit public projection');
assert(searchRoute.includes('if (publicGraphExpansion) response.graphExpansion = publicGraphExpansion'), 'empty public graph projections must be omitted rather than serialized as null');
assert(searchRoute.includes('? { interactionType, explanation }'), 'widget graph interaction output must contain only bounded public fields');
assert(!searchRoute.includes('interactionDetected: result.graphExpansion.interactionDetected || null'), 'widget graph output must not expose internal interaction rule IDs');
assert(!searchRoute.includes('relatedSuggestions: result.graphExpansion.relatedSuggestions || []'), 'widget graph output must not expose internal related entity IDs');
assert(searchRoute.indexOf('isAnswerlatticeWidgetRuntimeRequestAuthorized({') < searchRoute.indexOf('const rateLimitResult = await checkRateLimit({'), 'tenant/key search budget must be charged only after credential and runtime-origin authorization');

assert(feedbackRoute.includes('const transactionResult = await answerlatticeFirestoreAdmin.runTransaction'), 'widget feedback must derive replay state from the committed transaction attempt');
assert(feedbackRoute.includes('return { historyData: current, feedbackCreated: false, authoritativeOutcome };'), 'widget feedback must return the stored outcome on replay');
assert(feedbackRoute.includes('return { historyData: current, feedbackCreated: true, authoritativeOutcome };'), 'new widget feedback must return retry-local mutation state');
assert(!feedbackRoute.includes("let authoritativeOutcome: 'resolved' | 'not_resolved' | null = null"), 'widget feedback must not retain outcome state from an abandoned transaction attempt');
assert(feedbackRoute.includes('resolutionOutcome: authoritativeOutcome'), 'new widget feedback must persist an explicit authoritative outcome');
assert(feedbackRoute.includes('created: feedbackCreated'), 'widget feedback must disclose whether the mutation was new or replayed');
assert(feedbackRoute.includes('isAnswerlatticeSearchHistoryAvailableForInteraction(current)'), 'widget feedback must reject expired retained search history');
assert(feedbackRoute.includes("authoritativeOutcome === 'not_resolved'"), 'negative feedback replay must recover its idempotent signal side effect');
assert(feedbackRoute.includes('if (!signalEmitted)'), 'negative feedback must treat a missing durable signal as partial failure');
assert(feedbackRoute.includes("{ error: 'Feedback signal could not be saved' }, { status: 503 }"), 'negative feedback signal failure must remain retryable');
assert(!feedbackRoute.includes('if (feedbackCreated && !isGood && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION)'), 'signal recovery must not be restricted to the first feedback write');

assert(escalationRoute.includes("hasPublicApiCredentialScope(credential, 'widget:feedback')"), 'widget escalation must reuse the bounded feedback credential scope');
assert(escalationRoute.includes('isAnswerlatticeWidgetRuntimeRequestAuthorized'), 'widget escalation must enforce host/runtime-token authorization');
assert(escalationRoute.includes('readBoundedJsonBody(request, WIDGET_ESCALATION_MAX_BODY_BYTES'), 'widget escalation must bound request bodies');
assert(escalationRoute.includes('executeAnswerlatticeWidgetEscalation'), 'widget escalation route must delegate server-owned persistence');

assert(escalationServer.includes("value.mountContext === 'widget'"), 'widget escalation must accept only widget search-history rows');
assert(escalationServer.includes('buildAnswerlatticeWidgetEscalationTicketId'), 'widget escalation must use a deterministic ticket identity');
assert(escalationServer.includes('getAnswerlatticeSupportTicketDisplayId(ticketId)'), 'widget escalation must use the shared non-prefix display reference');
assert(escalationServer.includes('transaction.create(ticketRef, ticket)'), 'widget escalation ticket creation must be create-only and idempotent');
assert(escalationServer.includes('const transactionResult = await answerlatticeFirestoreAdmin.runTransaction'), 'widget escalation must derive its response from the committed transaction attempt');
assert(escalationServer.includes('return { created, signalContext };'), 'widget escalation transaction must return retry-local outcome state');
assert(!escalationServer.includes('let created = false;'), 'widget escalation must not mutate creation state outside a retryable transaction callback');
assert(escalationServer.includes("history.resolutionOutcome === 'resolved'"), 'widget escalation must reject a history row already marked solved');
assert(escalationServer.includes('isAnswerlatticeSearchHistoryAvailableForInteraction(history)'), 'widget escalation must reject expired retained search history');
assert(escalationServer.includes('widgetEscalation?.searchHistoryId !== searchHistoryId'), 'widget escalation replay must verify persisted ticket ownership');
assert(escalationServer.includes("triggerTypes: ['explicit_user_request']"), 'widget escalation must record an explicit human-support request without inventing model failure evidence');
assert(escalationServer.includes('transaction.set(historyRef, historyUpdate, { merge: true })'), 'ticket creation and search-history linkage must share the transaction');

assert(widgetClient.includes('The screenshot could not be used. This answer is based on your text only.'), 'widget must disclose image-processing fallback');
assert(widgetClient.includes("fetch('/api/widget/escalation'"), 'widget must submit an explicit support request');
assert(widgetClient.includes('readWidgetFeedbackResponse'), 'widget must consume authoritative feedback replay state');
assert(widgetClient.includes('onClick={() => handleSearch(article.title)}'), 'related articles must become actionable follow-up questions');
assert(widgetClient.includes('onClick={() => handleSearch(faq.question)}'), 'related FAQs must become actionable follow-up questions');
assert(widgetClient.includes('onClick={() => handleSearch(entry.title)}'), 'related changelogs must become actionable follow-up questions');
assert(widgetClient.includes('Support request #{msg.escalationTicketDisplayId} was created.'), 'widget must show a bounded ticket acknowledgement');
assert(widgetClient.includes('const activeSearchControllerRef = useRef<AbortController | null>(null)'), 'widget search must keep a synchronous in-flight request boundary');
assert(widgetClient.includes('if (!q || loading || activeSearchControllerRef.current) return'), 'widget search must reject duplicate admission before React state settles');
assert(widgetClient.includes('activeSearchControllerRef.current = searchController'), 'widget search must claim the synchronous request boundary before fetch');
assert(widgetClient.includes('signal: searchController.signal'), 'widget search must make the active request cancellable');
assert(widgetClient.includes('activeSearchControllerRef.current?.abort()'), 'widget clear/unmount must cancel active search work');

assert(historyType.includes('escalationTicketId?: string'), 'search history type must expose ticket linkage');
assert(historyType.includes("escalationStatus?: 'ticket_created'"), 'search history type must expose bounded escalation status');
assert(ticketType.includes('widgetEscalation?: {'), 'ticket type must expose widget handoff metadata');
assert(ticketLifecycle.includes("return `WE-${hashReference.toUpperCase()}`"), 'widget escalation display IDs must use the hash portion rather than the constant ticket prefix');

assert(featureFlags.includes('Automatic evaluator-driven suggestions are disabled'), 'feature flag docs must distinguish automatic evaluation from explicit widget fallback');
assert(escalationReadme.includes('explicit widget support requests are implemented'), 'escalation dossier must state the active explicit widget boundary');
assert(escalationReadme.includes('automatic evaluator-driven suggestions remain disabled'), 'escalation dossier must retain the automatic rollout gate');
assert(escalationFirebase.includes('There is no notification write in this flow.'), 'Firebase docs must not invent a widget escalation notification write');
assert(escalationHelp.includes('does not promise a response time'), 'help docs must not imply a support response SLA');
assert(!escalationHelp.includes('Typical escalation rate is 3-5%'), 'help docs must not publish an invented escalation rate');

process.stdout.write('Answerlattice widget answer and escalation contracts passed.\n');
