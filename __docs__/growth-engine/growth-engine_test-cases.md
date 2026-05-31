# Growth Engine - Test Cases

**Status:** Planning test matrix
**Scope:** Product, security, cost, compliance, AI, and MenuList integration

---

## 1. Product Boundary Tests

| Test | Expected |
| --- | --- |
| Growth Engine lead data is queried from MenuList Firestore | Fails; lead data must use Growth Engine Firebase. |
| Growth Engine writes MenuList menu/business truth | Fails; only tracked-route feedback bridge is allowed. |
| Growth Engine uses GrowthOS folders or `GR` product ID | Fails; GrowthOS/Growth Kits is separate. |
| Growth Engine creates a public lead demo page by default | Fails; artifacts are private/noindex unless separately approved. |

## 2. Source Import Tests

| Test | Expected |
| --- | --- |
| Source run starts without approved source policy | Blocked. |
| Source run imports candidates | Candidates are staged, not messaged. |
| Duplicate business appears in same run | Dedupe prevents duplicate lead creation. |
| Existing DNC identity appears in import | Lead is suppressed or held. |
| Source payload includes photos/reviews | Restricted content is not rehosted or stored as durable facts. |
| Source payload includes blocked fields | Blocked fields are dropped or run is held by policy. |
| Source policy retention is missing | Import is blocked. |
| Source run exceeds budget | Run is blocked or requires approval. |

## 2A. Policy And Readiness Tests

| Test | Expected |
| --- | --- |
| Campaign created without jurisdiction | Blocked. |
| Channel selected without matching channel policy | Blocked. |
| Email selected while sender domain has missing SPF/DKIM/DMARC readiness | Blocked. |
| Email selected while unsubscribe endpoint is missing | Blocked. |
| Email selected while bounce webhook is unhealthy | Blocked. |
| Provider missing vendor/register entry | Blocked before use. |
| Onboarding route selected outside approved flow inventory | Blocked. |
| AI classifier enabled without eval threshold pass | Blocked. |

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
