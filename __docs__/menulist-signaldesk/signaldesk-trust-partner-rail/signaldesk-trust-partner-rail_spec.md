# SignalDesk Trust Partner Rail - Specification

**Status:** Feature 17 locally source-complete; real partner outreach and spend remain manual and founder-approved
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Executive Summary

Trust Partner Rail helps MenuList test trust-based distribution without hiring a marketing team.

The source article is useful because it describes a system for high-speed distribution testing, not because MenuList should become a consumer-app influencer machine. MenuList should adapt the system to B2B/local business trust channels: restaurant consultants, food/local creators with operator audiences, menu photographers, local business communities, POS/payment partners, agencies, accountants, and SMB operators who can credibly introduce MenuList.

SignalDesk records partner scoring, test plans, briefs, approved deals, deliverables, attributable metrics, and evidence-backed recommendations. Policy approvers can plan tests and recommendations; only the founder can approve/activate partners or spend. Discovery, contact, contracts, payment, publication, and provider send remain outside this rail.

## Goals

| Goal | Success signal |
| --- | --- |
| Test trust channels quickly | Each approved niche gets 3-5 partner tests before continue/cut. |
| Avoid follower-count vanity | Scoring prefers owner-audience fit, baseline reach, real comments, and believable MenuList usage. |
| Keep briefs light | Partner receives one compact brief with approved claims and required disclosures. |
| Track outcomes, not posts | Renewal depends on owner leads, demos, current-list submissions, activations, and paid outcomes. |
| Preserve solo-founder control | Founder approves niche tests, budget caps, partner offers, and renewal/cut decisions. |

## In Scope

- partner/creator profile registry;
- partner type classification;
- 20-second trust test adapted for MenuList;
- 3-5 niche test method;
- flat-fee deal records and budget caps;
- one-page brief generation with approved claim rails;
- disclosure/compliance checklist;
- deliverable schedule and reminders;
- post URL/result capture;
- comment quality notes;
- MenuList outcome attribution;
- renew, hold, or cut recommendation.

## Out Of Scope

- broad consumer influencer campaigns;
- celebrity/follower-count buying;
- per-view pricing as the default model;
- affiliate marketplace or public partner portal;
- automated contract signature;
- automated payment execution;
- paid campaign automation;
- provider-send enablement;
- public SignalDesk pages.

## Partner Types

| Partner type | MenuList-fit reason | Default posture |
| --- | --- | --- |
| Restaurant consultant | Direct owner trust and operational context. | High-priority test candidate. |
| Menu photographer/designer | Already touches menus and current-list pain. | High-priority test candidate. |
| Local food/business creator | Can create local attention if owner/operator audience exists. | Test only after trust score passes. |
| Agency/freelancer | Can route owner demand and setup help. | Test with clear attribution. |
| POS/payment/local SaaS partner | Adjacent operator audience. | Test with approval and no platform claim. |
| Generic entertainment creator | Weak owner intent. | Reject by default. |

## Adapted 20-Second Trust Test

| Check | Pass condition | Reject signal |
| --- | --- | --- |
| Baseline reach | Consistent reach inside a restaurant/local business audience. | One viral spike with low normal reach. |
| Comment quality | Real owner/operator questions, objections, or local business discussion. | Emoji-only or unrelated fan comments. |
| Audience fit | Audience plausibly includes restaurant owners, managers, food operators, or SMB decision-makers. | Audience is mainly entertainment consumers. |
| Believable usage | Partner can naturally explain why MenuList matters. | Promotion would feel like a forced ad. |
| Trust feel | The audience appears to know or trust the partner. | No relationship beyond passive views. |

If the reviewer is still unsure after the quick test, the default is hold or reject.

## 3-5 Niche Test Rule

Each partner niche needs three to five attempts before SignalDesk recommends a decision.

| Result | Recommendation |
| --- | --- |
| One or more owner-quality leads or current-list submissions | Continue the niche and refine the angle. |
| Engagement but no owner intent | Hold; test one different CTA before cut. |
| No response across 3-5 attempts | Kill the niche and move budget elsewhere. |
| Complaints, misleading content, or source concerns | Pause immediately and review. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDTP-R001 | Partner profile must include type, audience, geography, channel, trust score, and source notes. | P0 |
| SDTP-R002 | Deal records must store flat fee, deliverable count, due date when supplied, budget authority, approval state, reservation evidence, and payment state. | P0 |
| SDTP-R003 | Only founder-admin may approve/activate partners or approve spend; briefs separately require disclosure text and approved/banned claim rails. | P0 |
| SDTP-R004 | Briefs must use approved MenuList claims only. | P0 |
| SDTP-R005 | A niche test must track 3-5 partner attempts before continue/cut recommendation. | P0 |
| SDTP-R006 | Renewal must use outcome data, not views alone. | P0 |
| SDTP-R007 | Every paid/incentivized content item must capture disclosure status. | P0 |
| SDTP-R008 | Partner source data must follow SignalDesk source policy and retention rules. | P0 |
| SDTP-R009 | Founder must approve first niche, first partner offer, and first budget cap. | P0 |
| SDTP-R010 | Public partner portal, automated contracts, and payment execution stay out of scope until explicitly approved. | P1 |
| SDTP-R011 | Forward-moving partner work must stop while the trust-partner pause is active; evidence, holds, and cuts remain recordable. | P0 |
| SDTP-R012 | Observed metrics require a matching live deliverable with a canonical credential-free HTTP(S) post URL. | P0 |
| SDTP-R013 | Retry-sensitive mutations must converge on one entity and one set of audit/timeline/cost effects. | P0 |

## Success Metrics

| Metric | Why it matters |
| --- | --- |
| Owner-qualified replies | Shows audience fit. |
| Current-list submissions | Shows MenuList demand, not passive attention. |
| Preview/demo bookings | Shows intent. |
| Activated businesses | Primary outcome. |
| Cost per activated business | Budget guard. |
| Founder edit rate on briefs | Measures whether briefs are too vague or risky. |
| Renewal win rate | Shows roster quality improving. |

## Disagreements With The Source Article

| Source claim | MenuList decision |
| --- | --- |
| Consumer app influencer scale is the model. | Partial. MenuList uses trust partners with restaurant-owner reach, not broad consumer creators. |
| Speed is the moat. | Adopted with gates. Speed matters only if source, claim, disclosure, and budget controls remain intact. |
| Let creators cook. | Adopted as lean briefs, but banned claims and disclosure rules are mandatory. |
| Flat rates, not per-view. | Adopted as default economics. |
| Volume outreach via VAs. | Held. SignalDesk can prepare outreach, but owner-approved source policy and budget gates come first. |

## Doctrine Preservation Check

No constitution-level doctrine was created. The article contains a useful SignalDesk feature framework, but not a MenuList-wide product doctrine. The durable rule lives inside this feature: trust channels must be tested by outcome, not vanity reach.

## Owner-Controlled Runtime Decisions

| Question | Default |
| --- | --- |
| First partner niche | Restaurant consultants or menu photographers in the first approved market pod. |
| First budget cap | Founder approval required before any paid partner test. |
| Disclosure wording | Use explicit paid/incentivized relationship disclosure and review against current legal guidance. |
| Contract/payment tool | Track manually first; no automated contract/payment execution in this feature slice. |
