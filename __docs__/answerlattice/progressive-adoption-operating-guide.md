# AnswerLattice Progressive Adoption Operating Guide

> Status: Active product operating contract
> Last updated: 2026-07-31
> Primary audience: solo founders, small product teams, support leads, product owners, and engineering owners
> Governing doctrine: `doctrine/01-core-doctrine.md`, `doctrine/02-non-goals-charter.md`, and `doctrine/03-infrastructure-freeze-v1.md`

## Decision

AnswerLattice has one governed support system and three operating depths:

1. **Start** - launch trustworthy support with the smallest useful setup.
2. **Coordinate** - divide recurring support work across a small team.
3. **Govern** - protect answer correctness across releases, roles, and higher support volume.

These are guidance levels, not product editions, database states, workspace modes, or automatic maturity scores.

Solo founders remain the primary first-use audience. Small teams and larger companies use the same product model by adding existing team, workflow, testing, and governance controls only when ownership or risk increases.

Company headcount does not determine fit. A 100-person company can be a good fit when a bounded product, support, and engineering group needs approved support truth for one product. AnswerLattice does not need all 100 employees inside the workspace.

## Core Operating Promise

AnswerLattice should do support work continuously. A human should be interrupted only when judgment or an accountable support response is required.

The owner or team should not be expected to:

- inspect every dashboard every day;
- model the complete product ontology before receiving value;
- convert every ticket into reusable knowledge;
- activate every advanced feature;
- invite every employee;
- treat AnswerLattice as a second helpdesk, project manager, or product analytics suite.

The human responsibilities are narrower:

- approve what becomes official support truth;
- respond when a user still needs human help;
- confirm how a product release changes an existing answer;
- decide whether repeated friction needs a knowledge correction, product investigation, known-limitation note, or no action.

## Fit By Operating Shape

| Operating shape | Default depth | Who operates AnswerLattice | Main outcome |
| --- | --- | --- | --- |
| Solo founder or one product owner | Start | One owner | Repeated questions stop returning to the founder |
| Two to ten people sharing product and support work | Coordinate | Owner plus selected manager/support members | Clear ownership without giving everyone full control |
| Growing company or product group | Govern | Bounded product, support, and engineering owners | Releases and approved answers remain traceable across teams |
| Large contact center needing omnichannel routing, workforce management, or SLAs | Not the primary fit | Existing helpdesk remains operational center | AnswerLattice may govern answer truth, but it does not replace contact-center operations |

## Depth 1: Start

### Use this first

- One workspace for one product.
- Product profile and support email.
- Existing docs, FAQs, setup notes, policies, release notes, screenshots, short recordings, or repeated founder replies.
- Two to five support-heavy Product Surfaces.
- Ten priority customer questions.
- Canonical answer review for the questions that require official truth.
- Deterministic Answer Tests for critical expected answers.
- One verified widget installation with safe page context and ticket fallback.
- Daily Brief as the default post-launch owner surface.

### Recommended launch path

1. Use the Pre-Onboarding Kit only when product truth is scattered across several sources.
2. Run one bounded Knowledge Intake job.
3. Review the first ten product-specific questions and their evidence.
4. Approve only supported answer truth. Keep an explicit fallback when evidence is insufficient.
5. Run canonical-only Answer Tests.
6. Install the widget and verify one known-answer path and one missing-answer path.
7. Return to the Daily Brief after launch. Do not browse every governance screen looking for work.

### Ignore initially

- Custom roles when one owner operates the workspace.
- Support Board when no selected issue requires follow-up.
- Workflow notifications when the owner already checks the Daily Brief.
- Advanced Knowledge Map overlays when no decision points there.
- Public API access, broad connectors, and external agent distribution.
- Large article libraries created only to make the workspace look complete.

### Move to Coordinate when

Add team operation only when one of these is true:

- a second person regularly answers users;
- ownership of tickets or answer review becomes unclear;
- support work is missed because it remains in the founder's head;
- releases are being shipped by someone other than the person approving support truth;
- weekly review regularly contains work for more than one person.

## Depth 2: Coordinate

### Add these controls

- Invite only the people who actively operate support knowledge or respond to users.
- Start with the protected Owner, Manager, and Support Staff roles.
- Create a custom role only when the protected defaults grant too much or too little access.
- Route qualified workflow notifications to Slack or email when the team no longer shares one review habit.
- Use Support Board only for selected support items that need internal notes, ownership, or follow-up.
- Keep tickets as user fallback and evidence, not as the center of AnswerLattice.
- Review the Weekly Digest and Daily Brief rather than maintaining a separate reporting routine.
- Record releases that change plans, roles, limits, navigation, integrations, errors, or customer-visible behavior.
- Expand Answer Tests around billing, permissions, cancellation, retention, security, and other high-risk answers.

### Suggested ownership

| Responsibility | Accountable role |
| --- | --- |
| Approve official answer truth | Owner or permitted governance manager |
| Respond to fallback tickets | Support Staff or Manager |
| Confirm release impact | Product or engineering owner |
| Maintain widget context and blocked routes | Engineering owner |
| Review repeated gaps | Owner, product owner, or support lead |
| Manage workspace access | Owner or permitted manager |

One person may hold several responsibilities. The purpose is accountability, not organizational ceremony.

### Weekly operating rhythm

1. Open the Daily Brief or the delivered workflow notification.
2. Handle real user fallback first.
3. Review qualified stale-answer, release-impact, or repeated-gap items.
4. Approve, edit, classify, defer, or reject the exact item.
5. Leave stable areas alone.

### Move to Govern when

- several functions rely on the same support truth;
- releases frequently affect existing answers;
- role, plan, locale, or workflow context changes the correct answer;
- a wrong answer has material billing, security, retention, or permission risk;
- buyers or internal reviewers require repeatable answer tests and audit evidence;
- external surfaces need controlled access to approved support truth.

## Depth 3: Govern

### Use these existing capabilities

- Knowledge Map for a curated view of structure, coverage, demand, freshness, and connected review work.
- Release impact preview before activating customer-visible product changes.
- Critical Answer Tests before and after important knowledge or release changes.
- Canonical answer version history and audit evidence.
- Product Friction Evidence for qualified support-event concentration, without claiming root cause or product-health certainty.
- Role and permission controls so support responders, knowledge approvers, and technical operators do not share owner authority.
- Support truth export for bounded handoff and review.
- Public API or external agent distribution only after the feature is enabled, keys are verified, and approved coverage is sufficient.

### Governance rules

- Keep one accountable owner for official support truth.
- Require explicit review for canonical publication and high-risk corrections.
- Do not give every employee an AnswerLattice account.
- Do not duplicate the same issue across Daily Brief, Support Board, an external project tracker, and a second internal queue without a clear owner.
- Do not infer revenue impact, affected-user count, defect classification, or causal product health from support-event counts alone.
- Keep the existing helpdesk as the conversation and SLA system when the company needs those operations.
- Use AnswerLattice as the authority behind support surfaces, not as a forced replacement for every support tool.

## What "Use AnswerLattice Fully" Means

Full utilization does not mean enabling every feature.

It means:

- users receive approved answers where approved coverage exists;
- unknown questions reach safe fallback;
- repeated support gaps become bounded evidence;
- product changes trigger the appropriate answer review;
- critical answers are tested;
- each decision has one accountable human;
- stable areas remain quiet;
- advanced tools are opened because a decision requires them, not because a dashboard exists.

The correct workspace may therefore use only Start capabilities for months. That is successful operation, not incomplete adoption.

## Feature Admission Triggers

| Capability | Introduce it when | Do not introduce it merely because |
| --- | --- | --- |
| Team Access | A second person regularly operates support or governance | The company has more employees |
| Custom roles | Default roles cannot express a real authority boundary | More configuration feels professional |
| Workflow Notifications | Work is missed outside the workspace | A nightly message can be sent |
| Support Board | A selected issue needs private ownership or notes | Every ticket exists |
| Knowledge Map | The operator needs cross-feature context for a decision | A visual map is available |
| Release Impact | A release changes customer-visible truth | Every internal deployment occurs |
| Answer Tests | An answer is important enough to protect from regression | Test count is treated as a vanity metric |
| Support Truth Export | A buyer, reviewer, or downstream team needs bounded evidence | A second source of truth can be created |
| Public API | Approved coverage and key controls are ready | A technical team asks for generic API access |

## Mental-Load Budget

The product should be evaluated against these design targets:

- one bounded launch session;
- no mandatory daily login after launch;
- a quiet Daily Brief when complete evidence requires no decision;
- at most a small number of qualified decision items at once;
- one direct handoff from each item to the exact evidence and action;
- an optional weekly review for normal operation;
- deeper governance only when product risk or team ownership requires it.

These are product-design targets, not public service-level promises.

## Current Boundary For Larger Companies

AnswerLattice can support a product team inside a larger company with current team access, custom permissions, tests, release review, exports, and audit history.

It should not claim complete enterprise readiness where the buyer requires capabilities that are not currently verified, including:

- SAML or SCIM lifecycle management;
- contractual service levels;
- enterprise procurement commitments;
- a verified public compliance certification;
- workforce management or complex agent routing;
- omnichannel contact-center operations;
- a visual workflow builder.

Company size alone should not reject a buyer. The required operating contract determines fit.

## Cost And Architecture

This operating guide introduces no runtime mode and no Firebase work.

- No Firestore reads, writes, deletes, collections, or listeners.
- No Storage objects.
- No Cloud Function or scheduled task.
- No model call.
- No workspace maturity score.
- No new feature flag.

The public guide is bundled static content. Existing permissions, summaries, routes, and feature flags continue to own runtime access.

## Maintained Public Path

The buyer-facing manual is published at:

`/resources/answerlattice-operating-guide`

The public version must preserve the same progressive contract while avoiding unsupported enterprise-readiness, automation, resolution, and time-saving claims.
