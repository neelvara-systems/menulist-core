# Growth Engine - Test Cases

**Status:** Planning test matrix
**Scope:** Product, security, cost, compliance, AI, and MenuList integration

---

## 1. Product Boundary Tests

| Test | Expected |
| --- | --- |
| Growth Engine lead data is queried from MenuList Firestore | Fails; lead data must use Growth Engine Firebase. |
| Growth Engine writes MenuList menu/business truth directly | Fails; only approved bridge contracts are allowed. |
| Growth Engine uses GrowthOS folders or `GR` product ID | Fails; GrowthOS/Growth Kits is separate. |
| Growth Engine creates a public lead demo page by default | Fails; artifacts are private/noindex unless separately approved. |
| Growth Engine uses a third-party CRM/outreach tool as system of record | Fails; owned target registry, distribution queue, and attribution are required. |

## 2. Source Import Tests

| Test | Expected |
| --- | --- |
| Source run starts without approved source policy | Blocked. |
| Source run imports candidates | Candidates are held, not messaged. |
| Duplicate business appears in same run | Dedupe prevents duplicate lead creation. |
| Existing DNC identity appears in import | Lead is suppressed or held. |
| Source payload includes photos/reviews | Restricted content is not rehosted or stored as durable facts. |
| Source payload includes blocked fields | Blocked fields are dropped or run is held by policy. |
| Source policy retention is missing | Import is blocked. |
| Source run exceeds budget | Run is blocked or requires approval. |

## 2D. Google Places Source Tests

| Test | Expected |
| --- | --- |
| Google Places run starts without approved source policy | Blocked. |
| Google Places run starts without provider budget cap | Blocked. |
| Text Search uses wildcard field mask | Blocked. |
| Text Search seed uses approved IDs-only field mask | Place IDs and request metadata can be stored. |
| Text Search requests non-ID fields without higher budget approval | Blocked. |
| Query run exceeds policy page/result cap | Run stops at cap. |
| Place Details runs before dedupe and pre-score | Blocked. |
| Place Details uses unapproved field mask | Blocked. |
| Place Details requests photos, reviews, review summary, generative summary, or editorial summary | Blocked. |
| Full Places response is written to Firestore | Test fails. |
| Places content is used in public artifact, sitemap, feed, truth packet, or MenuList truth | Test fails. |
| Google attribution is missing when Places content is displayed internally | Blocked. |
| Stored place ID remains after raw evidence expiry | Allowed. |

## 2E. Foursquare Source And Business Truth Graph Tests

| Test | Expected |
| --- | --- |
| Foursquare Places API run starts without approved source policy | Blocked. |
| Foursquare Places API PAYG run attempts outreach eligibility | Blocked unless separate contract or written permission is recorded. |
| Foursquare Places API PAYG data is used to contact a listed business as a prospect | Test fails. |
| Foursquare source run requests Premium Signal fields without explicit approval | Blocked. |
| Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content appears in public artifacts, public pages, sitemaps, feeds, truth packets, or MenuList truth | Test fails. |
| Foursquare category or chain signal creates a candidate graph edge only | Allowed. |
| Foursquare unresolved flag such as closed, duplicate, privatevenue, or doesnt_exist is present | Target is held or routed to review. |
| FSQ OS Places source run starts without license/source review | Blocked. |
| Business Truth Graph edge has missing source provenance | Blocked. |
| Business Truth Graph edge has low confidence and requests public publishing | Blocked and human review required. |
| Business Truth Graph candidate edge is converted to confirmed truth without owner confirmation or approved MenuList verification | Test fails. |

## 2B. Distribution Target Tests

| Test | Expected |
| --- | --- |
| Candidate has no distribution target identity | Held before campaign or publishing. |
| Target maps to duplicate business/location/menu key | Merged or held for review. |
| Target is candidate-only and public surface publish is requested | Blocked. |
| Target has owner-confirmed truth | Canonical surface can enter distribution readiness checks. |
| Target has stale MenuList truth | Freshness review required before discovery publishing. |
| Private artifact is added to sitemap | Blocked. |

## 2A. Policy And Readiness Tests

| Test | Expected |
| --- | --- |
| Campaign created without jurisdiction | Blocked. |
| Channel selected without matching channel policy | Blocked. |
| Email selected while sender domain has missing SPF/DKIM/DMARC readiness | Blocked. |
| Email selected while unsubscribe endpoint is missing | Blocked. |
| Email selected while bounce webhook is unhealthy | Blocked. |
| Provider missing vendor/register entry | Blocked before use. |
| Google Places provider register entry is missing | Blocked before use. |
| Onboarding route selected outside approved flow inventory | Blocked. |
| AI classifier enabled without eval threshold pass | Blocked. |
| Canonical surface contract missing | Distribution publishing blocked. |
| Structured data contract missing | Distribution publishing blocked. |
| Discovery publisher disabled | Sitemap/IndexNow/feed/truth-packet jobs remain blocked. |
| Sender assignment missing for email campaign | Blocked. |
| Campaign changes sender halfway through target conversation | Blocked unless incident-owner override exists. |
| Send outside target timezone window | Held until eligible window. |
| Sender ramp would exceed daily cap | Send held or rescheduled. |

## 2C. Automation Workflow Tests

| Test | Expected |
| --- | --- |
| Workflow run starts without idempotency key | Blocked. |
| Workflow step runs while global automation kill switch is active | Blocked. |
| Workflow step retries past retry cap | Blocked and incident/work item created. |
| Workflow run exceeds budget policy | Non-critical steps pause. |
| Enrichment waterfall runs without approved source policy | Blocked. |
| Enrichment waterfall finds valid evidence in an early step | Later paid steps are skipped. |
| Same unchanged target runs the same AI worker twice | Cached typed output is reused or duplicate spend is blocked. |
| AI worker output schema does not validate | Output is blocked and work item created. |
| AI worker eval status is stale | Autonomy is blocked. |
| Decision snapshot missing evidence or rejected facts | Target action is blocked. |
| Low-confidence identity match requests public publish | Blocked and human review required. |
| Operator work item is closed without required role | Blocked. |

## 3. Campaign Dry-Run Tests

| Test | Expected |
| --- | --- |
| Campaign has no caps | Dry-run blocks launch. |
| Campaign has no stop rules | Dry-run blocks launch. |
| Template missing unsubscribe for email | Dry-run blocks launch. |
| WhatsApp API channel selected without opt-in proof | Dry-run blocks launch. |
| Audience includes suppressed leads | Dry-run excludes them and reports count. |
| Estimated cost exceeds policy | Dry-run blocks or requires admin approval. |
| Complaint-rate threshold already exceeded | Dry-run blocks launch. |
| Source policy status changed to paused after audience build | Launch recheck blocks campaign. |

## 4. Message Guardrail Tests

| Test | Expected |
| --- | --- |
| Message invents discount | Blocked. |
| Message claims website/page is owner verified | Blocked unless verified state exists. |
| Message uses Google review/rating as source claim without rights | Blocked. |
| Message says "I saw you clicked" | Blocked for retargeting. |
| Pricing answer missing approved pricing policy | Human review. |

## 5. Email Tests

| Test | Expected |
| --- | --- |
| Commercial email without opt-out | Blocked. |
| Missing List-Unsubscribe headers where required by sender policy | Blocked. |
| One-click unsubscribe endpoint returns error | Channel health becomes unhealthy and sends pause. |
| Opt-out reply received | Email identity suppressed within policy window and pending sends cancelled. |
| Hard bounce received | Email identity suppressed and campaign summary updated. |
| Reply says "stop contacting me" | Global suppression and pending actions cancelled. |
| Spam-rate warning threshold crossed | Sends throttle and admin alert is created. |
| Spam-rate block threshold crossed | Email channel kill switch activates or requires admin intervention. |

## 6. WhatsApp Assisted Tests

| Test | Expected |
| --- | --- |
| Operator opens WhatsApp but does not mark sent | Send is not counted. |
| Operator marks wrong number | Phone/WhatsApp identity suppressed, not entire business unless DNC. |
| API send attempted while channel paused | Blocked. |
| API send attempted without opt-in evidence | Blocked. |
| API send attempted without approved template | Blocked. |
| Assisted queue exceeds daily cap | New tasks held. |

## 7. Inbox And Classifier Tests

| Test | Expected |
| --- | --- |
| Reply says "not interested" | Conversation cooled down or closed by policy. |
| Reply says "unsubscribe" | Suppression created and pending sends cancelled. |
| Reply asks price | Pricing workflow or human review. |
| Reply asks "how to start" | Route-to-onboarding recommendation. |
| Ambiguous reply | Human review. |

## 8. MenuList Integration Tests

| Test | Expected |
| --- | --- |
| Raw onboarding URL used in template | Blocked. |
| Unknown onboarding flow used in campaign | Blocked. |
| Tracked route clicked | Growth feedback event records click. |
| Onboarding started | Campaign/source/channel summaries update. |
| Onboarding completed | North-star metric updates. |
| Unknown routeId feedback arrives | Stored in unmatched feedback queue; no crash. |

## 8B. Distribution Publishing Tests

| Test | Expected |
| --- | --- |
| Owner-confirmed menu publishes canonical page | Surface state records canonical URL, indexability, structured data, sitemap state, and freshness state. |
| Canonical page lacks Restaurant/Menu/MenuItem structured data | Surface health marks invalid and discovery publishing is blocked. |
| Sitemap lastmod uses generation time instead of content modified time | Test fails. |
| Sitemap includes URL from another host | Test fails. |
| Sitemap exceeds URL or size limit without sitemap index | Test fails. |
| IndexNow job submits unchanged URL repeatedly | Job is deduped or blocked. |
| Google Indexing API is called for a menu page | Test fails. |
| Menu feed export includes candidate-only facts | Export is blocked. |
| Menu feed export has item outside a section | Export validation fails. |
| Truth packet contains private contact data | Test fails. |
| Truth packet contains unconfirmed scraped menu data | Test fails. |
| GBP handoff starts without owner authorization | Blocked. |
| GBP GoogleLocations endpoint used for lead generation | Test fails. |
| Owner sets MenuList URL as GBP menu link | Handoff state records completion and attribution. |
| Apple Business Connect handoff starts without owner authorization | Blocked. |
| Bing Places handoff starts without owner authorization | Blocked. |
| External listing handoff imports external listing facts as MenuList truth | Test fails. |

## 8A. Artifact Tests

| Test | Expected |
| --- | --- |
| Artifact generated without noindex flag | Blocked. |
| Artifact references unsupported source facts | Blocked or human review. |
| Artifact claims owner verification without proof | Blocked. |
| Artifact expires | Public/private access is disabled and state updates. |
| Owner complaint/takedown arrives | Artifact is removed or hidden, incident is logged, and pending campaign use stops. |

## 9. Cost Tests

| Test | Expected |
| --- | --- |
| Lead list opens | Reads summary docs only. |
| Campaign dashboard opens | Reads campaign summaries, not raw messages. |
| Inbox opens | Reads bounded inbox items. |
| Raw event scan attempted by dashboard | Fails test. |
| AI worker called twice for same unchanged source hash | Uses cached typed result or blocks duplicate spend. |
| Enrichment waterfall continues after valid evidence exists | Later paid provider steps are skipped. |
| Workflow dashboard scans raw step events | Fails test. |
| BigQuery query exceeds max bytes billed | Query is blocked. |
| Source provider daily cap exceeded | Non-critical source jobs pause. |
| Email provider spend cap exceeded | Email sends pause or require admin approval. |

## 10. Kill-Switch Tests

| Test | Expected |
| --- | --- |
| Global outbound kill switch active | No sends or assisted tasks execute. |
| Email channel paused | Email jobs do not dispatch. |
| Campaign paused | Campaign follow-ups and sends stop. |
| Template paused | Template cannot render for outbound. |
| Source provider paused | Source runs do not start. |
| Provider webhook signature fails | Payload is rejected and incident/event is logged. |

## 10A. Data And Compliance Tests

| Test | Expected |
| --- | --- |
| Contact reveal requested by unauthorized role | Blocked. |
| Contact reveal requested by authorized role | Full value appears and audit log records actor/reason. |
| Data deletion request received for contact identity | Eligible personal data is deleted or restricted while suppression evidence is retained as policy allows. |
| Correction request received | Lead/contact record is corrected and source of correction is recorded. |
| Raw sensitive payload appears in AI prompt fixture | Test fails. |

## 11. Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile opens Growth status | Shows summaries only. |
| Mobile pauses all outbound | Succeeds with confirmation and audit log. |
| Mobile tries to launch campaign | Not available. |
| Mobile tries to reveal full contact | Not available. |
| Mobile stale summaries | Shows warning. |
