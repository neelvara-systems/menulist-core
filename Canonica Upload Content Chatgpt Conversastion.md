ChatGPT

0BC2061F-8205-4319-8551-3BF692607416.png
For canonica we have currently document upload flow
This is the core heart of the canonica and we need to made it world best class feature of imprting because this from where canonica startes
When customers upload docs about their product internally we pass everything to gemini ai modal to convert everything into article and faq per article this is the flow now tell me what things we should support fr ex their business website their uploaded docs there vdo files like this end to end pipline from scratch if canonica is yours then how do you design this feature
Not technical theoretically will go deep first

Thought for 4m 22s
According to a document from 2026-05-21, Canonica already treats this area as part of Launch Setup: import knowledge, map product surfaces, verify widget installation, and review generated ontology/canonical-answer drafts. The same document says generated candidates and drafts go to Governance for human approval, not automatic publishing. That is the right foundation. But the current screen still feels like a file uploader. For Canonica, this should become the Knowledge Import Command Center.

1. The core shift
   I would stop calling this only “Upload New Content.”

The feature should be positioned as:

Import everything Canonica needs to understand your product, support your users, and keep answers current.

A world-class Canonica import flow should not just convert documents into articles and FAQs. It should convert messy company knowledge into:

product map

entity ontology

canonical answers

help articles

FAQs

guided workflows

ticket macros

missing-knowledge gaps

stale/conflicting content warnings

widget-ready support behavior

Canonica’s existing direction already supports this. The product inventory says Canonica has KB generation, product ontology, entity candidates, canonical answers, guided workflow answers, drift governance, signal mutation, tickets, changelog, weekly digest, coverage KPI, and trust/readiness metrics. The import flow should become the front door into all of that, not just the KB generator.

2. What the current screenshot is missing
   The current flow is useful but too small for Canonica’s ambition.

Problems:

It starts with files, not business context.
The first thing Canonica needs is not a PDF. It needs to know: what product is this, who uses it, what pages exist, what users ask, what should be answered, and what should never be answered.

URLs are treated as passive text.
The screen says pasted URLs are kept as source material, not crawled. For Canonica, website/docs import should become first-class: crawl, classify, dedupe, detect stale pages, and show coverage.

It generates articles too early.
Before generating articles, Canonica should build the product model: features, plans, roles, workflows, errors, policies, integrations, limits, permissions, billing rules.

It lacks source trust.
A pricing page, support ticket, old PDF, and sales deck should not have equal authority.

It lacks review intelligence.
The user should not review 80 generated articles blindly. They should review conflicts, high-risk answers, missing policies, and low-confidence drafts first.

It lacks launch readiness.
Import should end with a readiness score: “You are ready to launch widget support for billing and onboarding, but not for refunds or API errors.”

3. What Canonica should support as import sources
   A. Business website
   This is mandatory. Most SaaS companies already expose important truth publicly.

Support:

main marketing website

pricing page

feature pages

FAQ page

terms, privacy, refund, security pages

blog posts

changelog / release notes

status page

docs subdomain

API documentation

sitemap.xml

robots-aware crawl

Canonica should ask for the company domain and then say:

“We found 126 pages. 42 look like support knowledge. 9 look stale. 5 conflict with your uploaded docs. Select what Canonica should trust.”

B. Existing help docs
Support all common help-center sources:

Intercom articles

Zendesk Guide

Freshdesk solutions

Help Scout docs

GitBook

ReadMe

Docusaurus

Mintlify

Notion public docs

Confluence export

Google Docs / Drive folders

Markdown docs

HTML docs

PDFs

These should become the fastest way to migrate from “old help center” to Canonica.

C. Uploaded documents
Support:

PDF

DOCX

TXT

Markdown

HTML

CSV

FAQ CSV

XLSX

PPTX

JSON / YAML

ZIP of docs

screenshots

exported support macros

release notes

product specs

onboarding guides

sales decks

internal SOPs

But each upload should be classified. Canonica should label files as “support doc,” “sales material,” “internal policy,” “product spec,” “release note,” “API reference,” “training material,” etc.

D. Video and audio
Yes, support video files. This is high leverage.

Support:

MP4

MOV

WebM

Loom links

YouTube unlisted links

Zoom recordings

support-call recordings

onboarding walkthroughs

product demo videos

webinar recordings

uploaded transcripts

Canonica should extract:

transcript

speaker intent

product workflows shown

UI screens mentioned

action steps

questions asked

objections

support-worthy explanations

timestamps as source references

Video import should not blindly become articles. It should produce “workflow candidates” and “answer candidates.”

Example:

From a 14-minute onboarding video, Canonica finds:
1 billing workflow, 3 setup steps, 4 common mistakes, 2 role-permission rules, 5 FAQ candidates.

E. Helpdesk history
This is one of the most important sources.

Support:

Zendesk tickets

Intercom conversations

Freshdesk tickets

Help Scout conversations

email support exports

chat transcripts

resolved-ticket CSV exports

support tags

canned replies

macros

CSAT / thumbs-down feedback

Canonica should mine:

repeated questions

unresolved gaps

confusing workflows

escalation reasons

best human replies

outdated macros

ticket clusters that deserve articles

This aligns with Canonica’s signal mutation direction, where repeated tickets, negative feedback, fallback, and escalations can become reviewable knowledge changes.

F. Product surfaces
This is where Canonica can be meaningfully different from generic KB tools.

Canonica should import or collect:

app routes

page names

feature areas

workflows

user roles

plan gates

empty states

error states

settings pages

checkout/billing pages

onboarding steps

dashboard widgets

integrations pages

The inventory already says product surfaces map routes/pages/workflows to entities, tags, articles, changelogs, and tickets, and context-aware support passes page/feature/workflow context into Canonica.

This means import should ask:

“Where will users need help inside your product?”

Not just:

“Upload your docs.”

G. Release and changelog material
Support:

release notes

changelog entries

GitHub releases

Linear/Jira shipped issues

product update emails

migration notes

deprecation notices

This matters because stale answers are a core Canonica problem. The inventory says changelog/release notes connect changes to surfaces, tags, entities, and stale-answer review.

H. Policies and business rules
Support structured import for:

pricing

plan limits

trials

refunds

cancellation

invoice handling

data retention

SLA

security/compliance

roles and permissions

account deletion

integrations

API limits

These should become high-confidence canonical answers, not just article text.

4. The end-to-end import pipeline I would design
   Stage 1: Product context first
   Before upload, Canonica asks:

product name

website URL

support email

target users

product category

main use cases

pricing model

important plans

main support areas

what Canonica should not answer

escalation rules

This matches the self-service onboarding direction where users create a Canonica workspace and then go to the dashboard to configure KB and widget.

The first import screen should say:

“Start by giving Canonica your product context. Then add sources.”

Stage 2: Source selection
Replace the current upload modal with source cards:

Website / public docs

Upload files

Paste URLs

Connect helpdesk

Import videos or calls

Import changelog

Add product surfaces

Add support macros

Add policies manually

Start from template

Each card should show expected value.

Example:

Website: “Find public product knowledge.”

Helpdesk: “Find repeated user questions.”

Videos: “Extract workflows from demos.”

Product surfaces: “Make widget answers page-aware.”

Changelog: “Prevent stale answers after releases.”

Stage 3: Source audit
After importing, Canonica should not immediately generate articles.

It should first show a Source Audit:

sources found

source type

last updated

trust level

duplicates

conflicts

unsupported files

missing critical areas

stale pages

private/internal source warnings

Example:

“Pricing page says Pro includes API access. Uploaded PDF says API access is Enterprise-only. Which source should Canonica trust?”

This is a major trust-building moment.

Stage 4: Knowledge extraction
Canonica should extract a product model before article generation.

Outputs:

features

sub-features

workflows

user roles

plans

integrations

error states

permissions

data objects

billing rules

support policies

setup steps

known limitations

deprecated items

release-linked changes

This connects directly to Canonica’s product ontology and entity-candidate model. The inventory says product ontology models features, plans, roles, workflows, states, integrations, and errors; entity candidates are staged for human approval before becoming ontology entities.

Stage 5: Knowledge graph preview
Before generating support content, show:

“Canonica understood your product like this.”

Example:

38 product entities

11 workflows

6 user roles

4 plans

9 integrations

17 policy rules

14 unknown/missing areas

5 contradictions

This is where the user says, “Yes, Canonica understands my product.”

That is more powerful than “AI generated 22 articles.”

Stage 6: Draft generation
Now generate:

help articles

FAQs per article

canonical answers

troubleshooting flows

setup guides

ticket macros

widget suggested answers

guided workflow answers

escalation prompts

related changelog links

missing-content tasks

The current pipeline already supports “Upload raw files → AI generates articles → review → publish → embed.”

The upgrade is: generate structured support intelligence, not just articles.

Stage 7: Risk-based review
Do not ask the user to review everything in a flat list.

Use review buckets:

Must review — pricing, billing, refunds, security, legal, permissions.

Conflict review — sources disagree.

Low confidence — model is unsure.

High traffic potential — likely frequent support questions.

Safe to approve quickly — simple docs with strong source support.

Needs owner input — Canonica found a gap.

Canonica should show source evidence for every draft.

A canonical answer should show:

answer

source documents

source confidence

scope

related product surface

owner

freshness date

risk level

suggested fallback

Stage 8: Publish to multiple surfaces
Publishing should not mean only “publish article.”

It should publish into:

knowledge base

canonical answer engine

FAQ layer

widget answers

page-aware support suggestions

ticket macro library

internal governance queue

changelog-linked freshness model

Canonica already has separate management routes for dashboard, governance, knowledge base, changelog, product surfaces, widget, tickets, and conversations.

The import pipeline should feed all of them.

Stage 9: Readiness testing
After publishing, Canonica should run a launch simulation.

It should generate test questions from the imported knowledge:

beginner questions

billing questions

troubleshooting questions

edge cases

plan-limit questions

role-permission questions

outdated-feature questions

vague user questions

angry user questions

Then show:

answered confidently

answered with fallback

wrong/conflicting

missing source

needs escalation

unsafe to answer

Final output:

“Your support widget is ready for Billing, Onboarding, and Integrations. It is not ready for API troubleshooting or refund policy.”

Stage 10: Continuous import
World-class import is not one-time.

Canonica should continuously watch:

new docs

updated website pages

new release notes

repeated tickets

negative feedback

fallback questions

stale canonical answers

unresolved product entities

new app surfaces

support macros changed by humans

This aligns with Canonica’s drift governance, signal mutation engine, coverage KPI, and trust/readiness metrics.

5. The actual product UX I would build
   Screen 1: “Import Knowledge”
   Tabs:

Sources

Scan Results

Product Map

Drafts

Review

Publish

Readiness

Sources page
Cards:

Website

Help docs

Files

Videos

Helpdesk

Changelog

Product surfaces

Support macros

Policies

Manual template

Each source has status:

Not connected

Scanning

Needs attention

Ready

Synced

Failed

Scan Results page
Shows:

imported source count

usable content count

duplicate count

stale source count

conflict count

unsupported file count

missing source suggestions

Product Map page
Shows Canonica’s understanding:

entities

workflows

roles

plans

integrations

errors

policies

product surfaces

This is the “wow” screen.

Drafts page
Grouped outputs:

Articles

FAQs

Canonical answers

Workflows

Macros

Gap tasks

Review page
Prioritized review queue:

high-risk

low-confidence

conflicts

stale

owner-needed

ready-to-approve

Publish page
Choose publishing destinations:

KB only

Widget

Canonical answer engine

Help center

Internal macros

Changelog-linked update

Product-surface suggestions

Readiness page
Show:

launch score

canonical coverage

unresolved gaps

risky topics

stale topics

top test questions

widget readiness

recommended next import

6. The source priority model
   Canonica needs source hierarchy.

Default trust ranking:

Manually approved Canonica canonical answers

Current product settings / policies entered by owner

Current official docs

Current pricing / terms / security pages

Current release notes

Help-center articles

Support macros

Resolved tickets

Videos / demos

Sales decks

Old PDFs

Unstructured chat/internal notes

The product should let the user override this.

Example:

“Use pricing page as truth for plans. Use support macros only as examples. Do not use sales decks for final answers.”

This prevents garbage-in-garbage-out.

7. What Canonica should generate
   For every import job, Canonica should generate more than articles.

Minimum outputs:

Output Purpose
Product entities Canonica understands the product structure
Canonical answers Governed, trusted answers
KB articles Long-form help content
FAQs Fast answers per topic
Guided workflows Step-by-step assistance
Troubleshooting flows Error and issue handling
Ticket macros Human support replies
Product-surface mappings Page-aware widget support
Gaps Missing knowledge
Conflicts Source disagreements
Staleness warnings Outdated content risk
Readiness score Launch confidence
Test questions Validation before publish 8. MVP order
I would not build everything at once.

Version 1: “serious import”
Build:

website/docs crawl

uploaded files

pasted URLs

Markdown / CSV / PDF / DOCX / HTML

changelog/release notes

product context form

source audit

entity extraction

article + FAQ + canonical answer drafts

review queue

publish readiness score

Version 2: “support intelligence”
Add:

helpdesk import

ticket clustering

macro import

solved-ticket knowledge extraction

fallback-to-draft proposals

duplicate/conflict detection

source trust controls

Version 3: “rich media”
Add:

video upload

Loom/YouTube links

call transcript import

screenshot understanding

workflow extraction from demos

timestamped source references

Version 4: “continuous knowledge control”
Add:

scheduled website re-scan

docs sync

release-triggered stale answer detection

recurring ticket-to-answer proposals

weekly import digest

automatic gap queue

product-surface coverage scoring

9. The positioning
   Do not sell this as:

“Upload docs and AI writes articles.”

That is easy to copy.

Sell it as:

“Canonica imports your company’s scattered product knowledge, converts it into a governed support brain, maps it to your product surfaces, and keeps it current as your product changes.”

That is much stronger.

The website spec already positions Canonica around “knowledge infrastructure, not another tool,” and the public messaging frames Canonica as turning support knowledge into a governed source of truth with canonical answers and zero drift.

10. My final design principle
    For Canonica, the import feature should answer four questions:

What does this company know?
Sources, docs, videos, tickets, website, policies.

What is actually true?
Trust ranking, conflict detection, source evidence, owner approval.

Where should this knowledge be used?
KB, widget, product pages, workflows, tickets, changelog, governance.

How do we keep it true?
Drift detection, release awareness, feedback signals, recurring fallback, review queue.

That is the difference between a document upload flow and a world-class Canonica import system.

I’ll condense the full intake-system design into a CEO-facing story: what the feature is, how customers experience it, why it matters, and what makes it defensible long term.

Thought for 2m 48s
Canonica Intake Engine — CEO-Ready Summary
The big idea
Canonica should not start with “upload documents.”

Canonica should start with:

Teach Canonica Your Product

This becomes the first major “wow” moment in the product. A SaaS founder or product owner gives Canonica their product website, docs, policies, product pages, files, and later support history. Canonica turns that scattered knowledge into a governed support brain: articles, FAQs, approved answers, product-page help, widget suggestions, and future update proposals.

This fits Canonica’s existing direction. Canonica already has Launch Setup, Support Control, Knowledge Governance, KB generation, product surfaces, canonical answers, drift governance, signal mutation, widget runtime, coverage KPI, and trust/readiness metrics. The current system already separates launch setup, daily support, and governance, and it already says generated entity/canonical-answer drafts go to human review instead of being auto-published.

1. The CEO-level positioning
   Canonica is not “AI that writes help docs.”

The stronger positioning is:

Canonica learns your product, creates source-backed support knowledge, maps it to your app pages, and keeps it accurate as the product changes.

That means the intake feature is not a side feature. It is the heart of Canonica.

Why? Because every customer starts here. If Canonica understands the customer’s product well, every later feature becomes better:

Better intake
→ better product map
→ better articles
→ better approved answers
→ better widget
→ fewer support tickets
→ stronger governance
→ more trust
The public website already positions Canonica as a “Support Knowledge Control Plane,” not just another help center or chatbot.

This intake engine is the product experience that proves that claim.

2. What customers experience
   Step 1 — Customer signs up
   A SaaS founder visits Canonica, signs in with Google, enters company name and product name, and Canonica creates their workspace, subscription, widget key, tenant/store records, and dashboard access. This self-service onboarding already exists.

Then instead of sending them to a simple document uploader, we send them to:

Teach Canonica Your Product
Step 2 — Canonica asks for the easiest inputs first
The first screen asks for simple business inputs:

Product website
App URL
Docs/help URL
Support email
Product category
The owner does not need to understand AI, embeddings, RAG, chunking, or ontology.

They only see:

“Give Canonica your product link and docs. We will find what matters.”

This makes the product feel easy.

Step 3 — Canonica finds useful sources
Canonica scans or imports sources such as:

Product website
Pricing page
Feature pages
Help docs
FAQ pages
Security/privacy/legal pages
Refund/cancellation pages
Uploaded PDFs/DOCX/CSV/XLSX
Policy form
Product routes/pages
Changelog/release notes
FAQ CSV
Support macros later
Tickets later
Videos later
Demo walkthrough later
The important point for the CEO:

Canonica does not depend on one upload format. It can learn from every place where product knowledge already exists.

But everything enters the same system as a source.

Step 4 — Canonica shows what it found
Canonica should not immediately generate 100 articles.

First it shows a source inventory:

We found 82 pages.
31 look useful for support.
7 involve billing/security/legal risk.
4 may be outdated.
3 need your review.
This builds trust because the customer can see what Canonica is using.

Example:

Pricing page — high trust
Help docs — high trust
Old sales deck — low trust
Support ticket export — internal only
Refund policy PDF — needs review
This is how we avoid bad AI output.

Step 5 — Canonica builds a Product Map
Before writing content, Canonica builds a structured understanding of the product:

Features
Plans
Roles
Permissions
Workflows
Integrations
Error states
Policies
Product pages/routes
Example:

Features:

- Billing
- Team management
- Stripe integration

Plans:

- Free
- Pro
- Enterprise

Roles:

- Owner
- Admin
- Member

Workflows:

- Connect Stripe
- Invite teammate
- Update payment method
- Cancel subscription
  This is one of Canonica’s biggest differentiators. Existing docs confirm Canonica already has product ontology, entity candidates, canonical answers, product surfaces, and context-aware support.

The customer should feel:

“Canonica understands my product like a new support expert would.”

Step 6 — Canonica finds conflicts and missing knowledge
Canonica checks whether sources disagree or whether important support knowledge is missing.

Examples:

Pricing page says API access is Enterprise-only.
Old sales deck says API access is included in Pro.

Docs say billing is under Account → Billing.
Product route says billing is under Workspace → Subscription.

Refund policy is missing.
Data deletion policy is missing.
Role permissions are unclear.
Canonica does not guess silently.

It asks the product owner:

Which source should Canonica trust?
What is your refund policy?
Who can update billing?
Which plan includes API access?
This is where Canonica becomes accurate.

Step 7 — Canonica generates drafts
Only after source review, Product Map, and conflict/gap checks does Canonica generate:

Help articles
FAQs
Approved answer drafts
Guided workflow drafts
Widget suggestion drafts
Product-page help prompts
Support macros later
Example outputs:

Article:
How to connect Stripe

FAQ:
Who can connect Stripe?

Approved answer:
Admins can connect Stripe from Settings → Integrations.

Widget suggestions for /settings/integrations/stripe:

- How do I connect Stripe?
- Who can connect Stripe?
- Why did Stripe sync fail?
  This improves the current KB generation flow, which already supports raw files → AI-generated articles → review → publish → embed.

The new system makes that flow source-backed, product-aware, and safer.

Step 8 — Product owner reviews only what matters
The owner should not review hundreds of AI outputs.

Canonica creates one simple review queue:

Critical blockers
Needs review
Product concepts
Drafts
Safe to approve
Resolved
The UI should say:

Canonica needs 12 decisions before launch.
42 safe items can be bulk approved.
Examples of review items:

Confirm refund policy.
Resolve API plan conflict.
Approve Pro plan as a product concept.
Review billing approved answer.
Approve 32 safe FAQs.
High-risk topics always require explicit review:

Pricing
Billing
Refunds
Cancellation
Security
Privacy
Legal
Data deletion
API limits
Roles and permissions
This is aligned with Canonica’s existing human-in-the-loop governance model. Auto-approval of high-risk changes would violate the product doctrine.

Step 9 — Canonica publishes safely
Publishing is explicit.

The owner chooses what goes live:

Help articles
FAQs
Approved answers
Product concepts
Product pages
Widget suggestions
Before publishing, Canonica runs a final check:

Are all selected items approved?
Are sources trusted?
Are conflicts resolved?
Are high-risk topics approved?
Are there duplicate articles?
Is widget context ready?
Then Canonica publishes into existing systems:

Knowledge Base
Canonical answers / Governance
Product ontology
Product surfaces
Widget context
Readiness dashboard
Canonica already has these systems: KB articles, canonical answers, product surfaces, widget management, context-aware support, governance, and compact summaries.

Step 10 — Canonica shows launch readiness
After publishing, Canonica does not just say “done.”

It tells the customer:

Ready for:

- Onboarding
- Team invites
- Stripe integration

Partially ready for:

- Billing

Not ready for:

- Refunds
- API troubleshooting
- Account deletion
  This gives the founder clarity:

“I know exactly what Canonica can safely support today.”

Canonica already has Activation Command Center and trust/readiness summary patterns that avoid expensive collection scans.

The new intake engine should feed that readiness layer.

Step 11 — Canonica keeps learning after launch
This is the long-term moat.

After the customer launches, Canonica watches:

Questions users ask
Canonical misses
Fallbacks
Negative feedback
Support tickets
Article feedback
Product changelogs
Pricing/docs changes
Drift warnings
But Canonica does not auto-change live support answers.

Instead:

Signal detected
→ Canonica proposes update
→ Owner reviews
→ Approved update publishes
→ Canonica tracks whether support improved
Canonica already has nightly scheduler, signal mutation, mutation proposals, coverage KPI, drift governance, weekly digest, and trust metrics.

So the intake feature becomes the beginning of a living support knowledge system, not a one-time import.

3. The complete user journey in one view
1. Founder signs up.
1. Canonica asks for product website, app URL, docs URL, and support email.
1. Canonica scans website/docs and accepts files, policies, product pages, and changelog.
1. Canonica shows all sources and their trust level.
1. Canonica builds a Product Map: features, plans, roles, workflows, policies, pages.
1. Canonica detects conflicts, stale sources, and missing policies.
1. Product owner resolves only important decisions.
1. Canonica generates articles, FAQs, approved answers, workflows, and widget suggestions.
1. Product owner reviews high-risk items and bulk-approves safe items.
1. Canonica publishes approved content into KB, Governance, Product Surfaces, and Widget context.
1. Canonica shows launch readiness by topic.
1. After launch, Canonica watches signals and proposes controlled updates.
1. What makes this feature world-class
   A. It starts with product understanding, not files
   Most tools do:

Upload PDF → AI writes article
Canonica should do:

Sources → evidence → facts → Product Map → review → drafts → publish
This is much stronger.

B. It is source-backed
Every article, FAQ, approved answer, and widget suggestion should know:

Which source it came from
Which quote/fact supports it
When the source was last checked
Whether the owner approved it
This is how Canonica earns trust.

C. It handles risk properly
Canonica should be helpful, but careful.

It can draft answers for billing, refunds, security, roles, and legal topics, but it should not publish those without approval.

This makes the system safe for real SaaS companies.

D. It maps knowledge to product pages
A normal help center has articles.

Canonica should know:

This answer belongs on /settings/billing.
This workflow belongs on /integrations/stripe.
This FAQ belongs on /team/invite.
That enables page-aware widget support, which Canonica already supports through product surfaces and context-aware mounting.

E. It stays accurate after launch
The strongest long-term value is not generation.

The strongest value is:

Canonica knows when support knowledge is becoming stale.

This matters because SaaS products change constantly.

Canonica already has drift governance, signal mutation, coverage KPI, weekly digest, and trust/readiness metrics. The intake engine should feed those systems from day one.

5. Why this matters for the business
   First customer value
   The customer sees value quickly:

I pasted my product link and docs.
Canonica understood my product.
Canonica generated useful support content.
Canonica told me what is safe to launch.
This creates a strong first impression.

Accuracy advantage
Accuracy does not come only from “better AI.”

Accuracy comes from:

Source trust
Evidence
Conflict detection
Owner review
Risk rules
Governance
Post-launch signals
This is harder for competitors to copy than “AI article generation.”

Retention advantage
After launch, Canonica keeps creating value:

Your pricing page changed.
This answer may be stale.
Users keep asking about API keys.
Approve this new answer draft.
Canonical coverage improved from 58% to 72%.
That gives the owner a reason to keep using Canonica every week.

Cost advantage
The system should be Firebase-cost-safe from the beginning.

The rule:

Firestore stores small metadata, summaries, review decisions, and live records.
Firebase Storage stores heavy source files, parsed text, facts, drafts, and evidence.
This protects margins as customers import more data. Canonica’s current architecture already uses compact summaries, capped queries, and cost-optimized platform summary docs.

6. How to explain this in one sentence
   For a CEO, the simplest explanation is:

Canonica’s intake engine lets a SaaS company teach Canonica its product once, then Canonica turns that knowledge into source-backed support articles, approved answers, product-page help, and a living system that stays accurate as the product changes.

7. What we are actually building
   We are not building:

A better file uploader
A generic AI article writer
A chatbot content importer
A one-time migration tool
We are building:

A permanent Product Knowledge Intake Engine
It has nine permanent parts:

1. Source registry
2. Evidence storage
3. Fact extraction
4. Product Map
5. Conflict and gap detection
6. Review queue
7. Draft generation
8. Safe publishing
9. Post-launch learning
   New input types can come later — video, tickets, demo walkthroughs, native integrations — but they all plug into the same engine.

10. Suggested CEO-facing wording
    You can share this directly:

Canonica should not begin with a document upload screen. It should begin with “Teach Canonica Your Product.”

The customer gives Canonica their product website, docs, policies, product pages, files, and later support history. Canonica scans these sources, shows what it found, assigns trust levels, builds a Product Map of features, plans, roles, workflows, policies, and app pages, then detects conflicts and missing knowledge before generating anything.

After that, Canonica creates source-backed help articles, FAQs, approved answer drafts, guided workflows, and widget suggestions. The product owner reviews only important decisions — billing, refunds, security, roles, conflicts, stale sources — while safe low-risk drafts can be approved in bulk.

Publishing is controlled. Canonica only publishes approved, source-backed content into the knowledge base, canonical answers, product surfaces, and widget context. Then it shows launch readiness by topic: what Canonica can safely support, what is partial, and what is not ready.

After launch, Canonica keeps watching product changes, support signals, missed questions, and feedback. It does not auto-change live answers. It creates reviewable update proposals so the support knowledge stays accurate over time.

This makes Canonica more than an AI help-doc generator. It becomes the product’s governed support knowledge control plane.

9. Final CEO takeaway
   The intake feature is the start of Canonica’s moat.

If done correctly, the customer journey becomes:

Paste product link
→ Canonica understands product
→ Canonica finds truth and gaps
→ Canonica drafts support system
→ Owner approves important decisions
→ Canonica launches page-aware support
→ Canonica keeps knowledge current
That is the long-term product story.

Is there any missing pieces
Do you want to say anything or anything remaining then tell me before i start the implication

I’ll treat this as a pre-implementation risk review, focusing only on missing decisions, easy-to-miss risks, and things that would be expensive to fix later.

Thought for 2m 35s
Yes. The core plan is strong, but I would not start implementation until these missing pieces are explicitly decided. Most of the remaining gaps are not “more features”; they are product, governance, Firebase-cost, and rollout decisions that prevent rework later.

Final pre-implementation warnings

1. Decide the real primary user
   There is still a strategic mismatch.

One Canonica document frames the target as SMB SaaS ICP, where owners will not manually run governance and the system must automate most loops.

The website spec frames the ICP as VP Engineering, Head of Support, or CTO at $5M–$40M SaaS companies with support teams and existing tools.

This matters because the intake UX changes.

For SMB founders:

Paste product link
→ Canonica does most of the work
→ review only 5–10 decisions
For mid-market teams:

Connect docs, tickets, changelog, product surfaces
→ assign owners
→ approve by department
→ governance workflow
My recommendation:

Design the default UX for a busy founder/product owner, but keep advanced controls for larger support/engineering teams.

Do not make the first version feel like an enterprise admin console.

2. Do not build this as a KB-generation upgrade only
   Canonica already has a KB generation pipeline: upload raw files, AI generates articles, review, publish, and embed.

The mistake would be to simply improve that screen.

The new system must sit above it:

Intake Engine
→ Sources
→ Evidence
→ Facts
→ Product Map
→ Review
→ Drafts
→ Publish
Then KB generation becomes only one output.

If you implement this inside only /canonica/kb-generation, the feature will become too small.

Correct product ownership:

/canonica/intake = main command center
/canonica/kb-generation = article generation/draft sub-area
/canonica/governance = approval of canonical/product truth
/canonica/product-surfaces = product-page mapping
/canonica/widget = runtime deployment
Canonica already has Launch Setup, Support Control, and Knowledge Governance as separate operating modes. Intake should feed all three.

3. Build the Firebase cost foundation before the AI pipeline
   This is the biggest engineering warning.

Do not start with:

crawler
Gemini extraction
article generation
Start with the cost-safe foundation:

Source registry
Firebase Storage artifact paths
platformSummary/intake*{tId}*{sId}
job metadata
version counters
idempotency keys
materialization caps
rate limits
Canonica already uses compact summaries for activation, product-surface context, trust metrics, and scheduler discovery.

Keep that pattern.

Non-negotiable Firebase rules:

No Firestore doc per source section.
No Firestore doc per extracted fact.
No Firestore doc per full draft body.
No Firestore doc per discovered low-value URL.
No realtime listeners for intake screens.
No dashboard collection scans.
Use:

Firestore = metadata, summaries, review decisions, published records
Firebase Storage = raw files, parsed text, evidence, facts, drafts, manifests
If this is not built first, cost will become hard to fix later.

4. Define the permanent source contract before adding inputs
   Before building website import, file upload, videos, demo account, tickets, or macros, define one permanent source contract.

Every input must become:

Source
→ Evidence
→ Facts
→ Product Map
→ Review/Drafts
Do not create different pipelines like:

video-to-article
ticket-to-answer
demo-scan-to-doc
website-to-FAQ
That will become messy.

The adapter model should be:

Website adapter
File adapter
Policy form adapter
Product surface adapter
Changelog adapter
Ticket adapter
Video adapter
Demo walkthrough adapter
But after adapter normalization, everything enters the same Canonica intake engine.

5. Lock source authority rules early
   More sources can make accuracy worse unless Canonica knows which source wins.

Before implementation, define default source trust:

Owner policy form — highest
Owner-approved canonical answer — highest
Current pricing/legal/security pages — high
Current official docs — high
Changelog/release notes — high
Product UI/surfaces — medium-high
Help center articles — medium-high
Support macros — medium
Tickets — medium-low
Videos — medium-low
Sales decks — low
Old PDFs — low
Rule:

Gemini confidence must never outrank source authority.

Example:

Pricing page says API access is Enterprise-only.
Old sales deck says API access is Pro.

Canonica should not guess.
Canonica should recommend the pricing page and ask the owner to confirm. 6. Define approval permissions now
You need to decide who can approve what.

At minimum:

Owner/Admin:
Can approve everything.

Support manager:
Can approve normal articles, FAQs, macros.

Product manager:
Can approve product concepts, workflows, product pages.

Only owner/admin:
Can approve billing, refunds, cancellation, legal, privacy, security, data deletion, API limits, roles, permissions.
Do not let any teammate bulk-approve high-risk answers.

High-risk topics must always require explicit owner/admin approval:

Pricing
Plan limits
Billing
Refunds
Cancellation
Security
Privacy
Legal
Data deletion
API limits
Roles
Permissions
Account deletion
Failed payment behavior
This aligns with Canonica’s current governance invariant: generated entity candidates and canonical answer drafts go to human approval and are never auto-published.

7. Do not build demo-account scanning first
   Your demo account idea is good long term, but it should not be the first implementation.

It introduces:

credential security
2FA
data mutation risk
payment/destructive actions
customer trust concerns
privacy concerns
browser automation complexity
When you build it later, position it as:

Let Canonica inspect a safe demo workspace.
Not:

Give AI your login.
Also:

credentials must never go directly to Gemini
Gemini should only see extracted page evidence
view-only mode first
human-guided walkthrough before autonomous crawler
no production accounts by default
For the first implementation, use:

website
docs
files
policy form
product surfaces
changelog
FAQ CSV
That is enough.

8. Do not build video, tickets, and native connectors first
   These are valuable, but not first.

Do not start with:

video/Loom import
Zendesk/Intercom native connectors
ticket clustering
demo browser agent
Slack/GitHub/Jira integrations
Reason: they add cost, privacy, and complexity before the core intake engine is proven.

Build the permanent engine first. Then these become adapters.

Canonica already has ticket fallback, signal mutation, mutation proposals, ticket knowledge loop, changelog, weekly digest, and governance infrastructure.

Use those later rather than overloading the first implementation.

9. Add source lineage from day one
   Every published output must remember where it came from.

For every article, FAQ, canonical answer, product surface, and widget suggestion, store:

source IDs
evidence path
intake session ID
publish run ID
source version at publish
last verified date
Without this, post-launch drift detection becomes weak.

Example:

Pricing page changed.
Canonica should know which answers and articles depend on that pricing page.
This is essential for the long-term promise:

Canonica knows when support knowledge is becoming stale.

Canonica already has drift governance, changelog/release notes, coverage KPI, trust metrics, and nightly scheduler machinery.

Source lineage is what lets intake feed that system properly.

10. Define the review queue as the main UX
    The owner should not review separate messy lists:

facts
entities
drafts
conflicts
gaps
sources
FAQs
widget suggestions
The owner should see one queue:

Canonica needs 12 decisions before launch.
Review item types:

Source conflict
Knowledge gap
Product concept
High-risk draft
Canonical answer draft
Widget suggestion
Safe bulk approval group
This is the core usability piece.

If you miss this, the product will feel powerful but exhausting.

11. Add a “no docs yet” path
    Some early customers will not have mature docs.

Do not assume every customer has:

help center
pricing page
policies
support tickets
changelog
Add a starter path:

No docs yet?
Use starter template + policy pack + product pages.
Ask simple questions:

What does your product do?
Who uses it?
What are your plans?
Who can manage billing?
How do users cancel?
Do you offer refunds?
What are your main workflows?
This lets early-stage SaaS customers still get value.

12. Decide what “ready” means
    Readiness should not be vague.

Before implementation, define readiness rules.

Example:

Ready:
Product profile complete
Trusted sources imported
Product Map approved
Critical conflicts resolved
High-risk policies reviewed
Articles published
Approved answers pending/active
Widget configured
Product surfaces mapped

Not ready:
refund policy missing
billing conflict unresolved
no approved answers
widget not installed
no source evidence
Topic readiness should be specific:

Onboarding — ready
Billing — partial
Refunds — not ready
API — deferred
Security — needs review
This is much more useful than a generic “setup complete.”

13. Define success metrics before building
    Track these from day one:

Time to first useful source scan
Time to first Product Map
Time to first approved answer
Time to first published article
Number of owner decisions required
Number of conflicts found
Number of missing policies found
Source coverage
Canonical coverage
Launch readiness score
Post-launch fallback reduction
Canonica already has coverage KPI and trust/readiness metrics.

Intake should feed those metrics, not create disconnected analytics.

14. Add a quality/evaluation harness
    Before giving this to customers, create test workspaces.

Example test workspaces:

Simple SaaS with clean docs
SaaS with conflicting pricing
SaaS with no docs
SaaS with old PDFs
Developer API product
Integration-heavy product
Billing-heavy product
For each, have expected outputs:

expected features
expected plans
expected roles
expected conflicts
expected missing policies
expected articles
expected canonical answers
Without this, it will be hard to know whether Gemini extraction is improving or regressing.

15. Define rollback and failure behavior
    Every major job must be recoverable.

Examples:

Website scan failed → source still saved, retry scan
Gemini classification failed → manual label source
Extraction failed → retry from parsed artifacts
Draft generation failed → retry without re-upload
Publish partially failed → publish manifest shows what succeeded
Before implementation, define:

job statuses
retry rules
idempotency keys
publish manifest
rollback manifest
This prevents painful partial states.

16. Keep current KB generation working during transition
    Do not break existing /canonica/kb-generation.

Canonica already has KB generation, article embedding, and RAG systems.

Migration plan:

Keep current KB generation route.
Add /canonica/intake beside it.
Make new intake feed article drafts into existing KB flow.
Later, make KB generation a sub-tab of intake.
Do not delete the existing path until the new one is stable.

17. Decide plan limits before users import large sources
    Canonica onboarding already defines Beta, Starter, and Pro limits for entities, answers, and articles.

The intake system should respect limits early, not only at publish time.

Example:

Starter:
import fewer pages
generate fewer drafts
materialize fewer review items

Pro/Beta:
deeper import
more entities
more canonical answers
Otherwise users will import 1,000 pages and later discover they cannot publish most of it.

18. Add privacy and data retention controls
    Before allowing broad uploads, decide:

Do we keep original uploaded files?
Can customer delete sources?
Can customer delete raw files but keep extracted evidence?
How long do Gemini raw outputs stay?
How long do parsed artifacts stay?
What happens if a source supports live content?
Minimum owner settings:

Keep original files
Delete originals after processing
Keep only evidence snippets
Delete source and dependent drafts
This matters especially before ticket import, video import, or demo scan.

19. Decide support for private/internal docs carefully
    For v1, avoid too much private-data complexity.

Safe first:

public website
public docs
manual file upload
policy form
product routes
changelog
FAQ CSV
Careful later:

Google Drive
Notion private
Confluence
Zendesk/Intercom
Slack
support tickets
demo credentials
call recordings
Those need stronger consent, PII scrubbing, and retention controls.

20. Make the product copy consistent
    The product should not say:

Upload docs and generate articles.
It should say:

Teach Canonica your product.
Use this language everywhere:

Sources
Product Map
Product concepts
Approved answers
Product pages
Needs review
Safe to approve
Launch readiness
Outdated answer
Suggested update
Avoid showing users:

chunks
embeddings
RAG
LLM
entity candidates
canonical objects
mutation proposals
materialization
The current public website already positions Canonica as a “Support Knowledge Control Plane” and “knowledge infrastructure, not another tool.”

The intake UX should prove that.

My final recommendation before implementation
Do not start by building the crawler or Gemini prompts.

Start by writing one short internal engineering contract:

Canonica Intake Permanent Contract
It should define:

1. Source object
2. Storage path contract
3. platformSummary/intake*{tId}*{sId}
4. Source authority rules
5. Risk domains
6. Review queue object
7. Draft item object
8. Publish plan object
9. Source lineage object
10. Cost limits
11. Idempotency/retry rules
12. Approval permissions
    Once that is frozen, implementation can move quickly without architectural rework.

What I would absolutely not do
Do not implement:

AI directly reads docs and writes articles.
Gemini decides source conflicts silently.
Every extracted fact becomes a Firestore document.
Every section becomes a Firestore document.
Demo credential scan as v1.
Video import as v1.
Ticket connector as v1.
High-risk bulk approval.
Auto-publish.
Graph visualization as main UX.
Nightly full website/docs crawl.
Those will either create cost problems, trust problems, or product complexity.

Final answer
Yes, there are missing pieces, but they are now clear.

The core design is correct. Before implementation, lock these decisions:

Primary user
Source contract
Firebase cost architecture
Source authority
Risk approval rules
Unified review queue
Source lineage
Readiness definition
Plan limits
Privacy/retention
Rollback/retry behavior
Migration from current KB generation
If you implement those foundations first, the feature can support website import, docs, files, policies, product surfaces, changelog, tickets, videos, and demo walkthroughs over time without changing the core architecture.

The most important sentence to keep in mind:

Build Canonica Intake as the permanent product-understanding layer, not as a document upload feature.

Let me clear some points
Icp:
My main intention to build canonica is to support first time founder or solo founders or the product owner who vibe coded multiple paltforms since this is now ai era development is now cracked by ai or tech guy who ready to launch their first ever startup or does not capable or does not have time to manage this all support related task

Firebase cost is very top most priority for me

There is no free or start free setup thing everyone needs to pay the price for running this since its heavily ai based and firebase used

This clarification changes the plan: Canonica intake should be founder-first, paid-before-processing, and cost-governed as a product rule, not backend housekeeping.

Thought for 3m 8s
According to documents from 2026-05-21, the current Canonica docs still describe self-service onboarding with a Beta $0 plan and paid Starter/Pro plans, while the system inventory already supports a separate Canonica product, self-service onboarding, widget key creation, compact summaries, product surfaces, governance, and Firebase isolation. Your clarification should override the old beta/free assumption before implementation.

Yes — this changes the plan in important ways.

Updated Canonica intake direction

1. ICP is now much sharper
   The ICP is not mid-market SaaS support teams.

The real ICP is:

First-time founders, solo founders, indie hackers, technical builders, product owners, and “vibe-coded” SaaS/app creators who are launching quickly but do not have the time, team, or support knowledge to create and manage support infrastructure.

That means Canonica should not feel like:

Enterprise support governance platform
It should feel like:

Your first support system, created from your product.
The deeper governance engine can still exist, but the user experience must hide complexity.

The owner should not think:

I need to manage ontology, canonical answers, drift, and review queues.
They should think:

I gave Canonica my product. It created my support system and tells me only what needs my decision.
This aligns with the existing product doctrine that owner-side actions should be obvious, minimal, and recoverable, and that the system should reduce owner burden.

2. New product positioning
   Use this positioning:

Canonica builds the first support brain for your newly launched product.

Or:

Launch support before your first users arrive.

Or:

Paste your product link. Canonica creates your help center, approved answers, and widget support.

Avoid positioning like:

Knowledge governance platform for support teams
Enterprise support control plane
AI help desk for CX teams
Those are too heavy for your real buyer.

The public website spec currently frames the ICP as VP Engineering, Head of Support, and CTO at $5M–$40M SaaS companies. That should be revised because your target is now much earlier-stage.

3. “No free” changes onboarding completely
   This is very important.

Earlier docs say the Beta plan is $0 for 6 months and paid plans activate later.

You are now saying:

Everyone pays because Canonica runs heavy AI and Firebase.

So the implementation must change.

New onboarding rule
Do not allow expensive Canonica processing before payment.

The correct flow:

1. User lands on Canonica.
2. User sees product promise.
3. User signs in.
4. User selects paid plan.
5. Payment succeeds.
6. Canonica creates tenant/store/subscription/widget key.
7. User enters product website/app/docs.
8. Intake scan starts.
   Do not do:

User signs up
→ free tenant created
→ free widget key created
→ free scan starts
→ user may never pay
That will leak Firebase and Gemini cost.

4. Keep one low-cost demo, but no free workspace
   You can still have a public demo, but it must be static or sample-data based.

Allowed:

Static product demo
Sample Canonica workspace
Fake/example scanned product
Read-only preview
Marketing calculator
Not allowed:

Free scan of user’s real website
Free AI article generation
Free widget creation
Free extraction
Free embeddings
Free storage-heavy upload
The demo should prove value without processing the user’s real data.

Example:

See how Canonica would support a sample SaaS product.
Then CTA:

Create your own support brain
Payment happens before real processing.

5. Pricing should include processing limits
   Because Firebase cost is top priority, every paid plan must include explicit processing limits.

Do not sell “unlimited import.”

Sell:

Workspace
Product support brain
AI processing allowance
Source scan allowance
Article/answer limits
Widget usage allowance
Post-launch monitoring allowance
A simple plan model:

Launch plan
For solo founders launching one product.

1 product
1 website scan
1 docs/help scan
up to 50 imported pages
up to 10 uploaded files
up to 50 articles
up to 50 approved answers
up to 50 product concepts
widget included
basic post-launch monitoring
Builder plan
For founders with more product surface area.

1 product
up to 150 imported pages
up to 25 files
up to 150 articles
up to 200 approved answers
up to 200 product concepts
widget included
standard post-launch monitoring
Studio / Multi-product plan
For people who vibe-coded multiple platforms.

multiple products/workspaces
separate support brain per product
higher scan/import limits
higher widget usage
higher monitoring allowance
Important rule:

One product/app should equal one Canonica workspace by default.

Do not let a founder import five unrelated products into one workspace. That hurts accuracy and cost.

6. Payment-gated job execution
   Every expensive action needs an entitlement check.

Before running any job, check:

active paid subscription
plan limits
remaining processing allowance
workspace status
rate limits
Expensive jobs:

website scan
docs scan
file parsing
Gemini classification
Gemini extraction
Product Map build
draft generation
readiness tests
post-launch source sync
widget answer search at scale
If no paid subscription:

Block job.
Show upgrade/payment required.
If limit reached:

Pause job.
Show processing limit reached.
Offer paid top-up or plan upgrade.
This is not just billing. It is Firebase cost control.

7. The intake UX must become even simpler
   Since your ICP is solo/first-time founders, the UX should not expose many source cards at once.

Use a simple guided sequence:

1. Paste product website.
2. Add app URL.
3. Add docs URL if available.
4. Upload anything you already have.
5. Answer a few launch policy questions.
6. Review only important decisions.
7. Publish support system.
   The first screen should not show 12 complicated cards.

Show:

Start with your product link
Then progressively ask:

Do you have docs?
Do you have a pricing page?
Do users log into an app?
Do you already have support FAQs?
For this ICP, the “no docs yet” path is not edge case. It is central.

8. “No docs yet” must be a first-class path
   Many first-time founders will have:

no help center
no policies
no changelog
no support tickets
no docs
maybe only a landing page and app
So Canonica must support:

Start from product website + app URL + founder answers.
The policy pack becomes critical.

Ask simple questions:

What does your product do?
Who is it for?
What are the main things users can do?
What plans do you offer?
Do you offer refunds?
Can users cancel anytime?
Who can manage billing?
How do users contact support?
What should Canonica never answer?
These answers become high-authority sources.

For your ICP, this may be more important than file upload.

9. Product link + app URL become required
   For first-time founders, Canonica should start from:

Product website
App URL
Product name
Support email
Docs are optional.

Files are optional.

Demo account is later.

The first version should say:

Paste your product link. Canonica will find what it can and ask only for missing launch decisions.
The current onboarding already creates a Canonica workspace and routes users to configure KB/widget, and workspace profile already stores product URL/support context.

Now that flow should be changed so payment happens before the expensive configuration begins.

10. Review queue must be tiny
    Your user does not want governance.

So the review UX should not say:

Review entity candidates
Resolve ontology conflicts
Approve canonical answers
Govern drift
It should say:

Canonica needs 7 decisions before launch.
Examples:

Confirm refund policy.
Confirm who can manage billing.
Confirm your support email.
Choose which plan includes API access.
Approve 12 safe help articles.
Target review burden:

First launch: 5–15 decisions
Not:

50–100 decisions
Everything low-risk should be hidden behind:

Safe to approve 11. The product should default to doing less, not more
For cost and simplicity, do not deep scan everything.

Default behavior:

Scan highest-value public pages only.
Extract only support-relevant content.
Generate only launch-critical docs first.
Create only top approved answers.
Map only most important product pages.
Avoid:

scan entire website
generate every possible article
create hundreds of FAQs
extract every entity
monitor every page daily
For your ICP, “good enough to launch safely” is better than “complete enterprise knowledge graph.”

12. Replace “Governance” language with “Launch decisions”
    Internally, keep governance.

Externally, for this ICP, use:

Launch decisions
Needs your confirmation
Ready to publish
Safe to approve
Missing launch info
Outdated source
Avoid:

governance
mutation proposal
canonical ontology
signal queue
entity candidate
drift engine
Canonica can still use the existing governance systems internally; the docs already show Canonica has Governance routes, mutation proposals, canonical answers, drift, coverage, and trust metrics.

But the founder should see a launch-friendly interface.

13. Firebase cost becomes part of the product model
    Because there is no free usage, Canonica should expose usage as a normal paid product concept.

Owner-facing usage:

Pages scanned
Files processed
Articles generated
Approved answers generated
Widget answers used
Monitoring checks used
Not technical:

Firestore reads
Gemini tokens
Storage operations
Cloud Function runtime
Internal cost controls:

No realtime listeners for intake.
No Firestore doc per fact.
No Firestore doc per section.
No Firestore doc per draft body.
No full website crawl by default.
No full nightly docs crawl.
No Gemini over entire corpus.
No unbounded collection reads.
The existing Firebase cost audit already confirms the direction: correctness stays higher priority than lower Firebase spend, but user-facing paths are bounded, live listeners are kept only where needed, and source-version manifests reduce repeated reads.

14. The plan should be “paid-first, cost-bounded, founder-simple”
    Your corrected product rule should be:

Canonica is paid from the first real workspace.
Every plan includes a fixed processing allowance.
Every expensive job checks entitlement before running.
Every output is source-backed.
Every risky answer needs owner confirmation.
Every screen reduces founder decisions.
This is the updated strategy.

15. What changes from previous plan
    Keep
    Source registry
    Evidence storage
    Fact extraction
    Product Map
    Conflict/gap detection
    Review queue
    Draft generation
    Safe publish
    Readiness
    Post-launch learning
    Firebase Storage-heavy architecture
    Firestore summary-first architecture
    Change
    ICP changes from mid-market/support team to solo founder/product owner.
    No free beta/default free workspace.
    Payment before real AI/Firebase processing.
    No enterprise-style review UX.
    No heavy governance language.
    No deep default scans.
    No default multi-product workspace.
    No advanced connectors first.
    No demo account scan first.
    No video/ticket import first.
16. Revised first paid user journey
17. Founder visits Canonica.
18. Founder sees promise: “Launch support for your product.”
19. Founder signs in.
20. Founder selects paid plan.
21. Payment succeeds.
22. Canonica creates tenant/store/subscription/widget key.
23. Founder enters product website and app URL.
24. Canonica scans only high-value pages.
25. Founder answers simple launch questions.
26. Canonica builds Product Map.
27. Canonica asks only important decisions.
28. Canonica generates help articles, FAQs, approved answers, and widget suggestions.
29. Founder approves safe launch set.
30. Canonica publishes.
31. Canonica shows readiness:
    “Ready for onboarding and basic support. Refund/API topics need confirmation.”
32. After launch, Canonica watches signals and proposes updates.
    This is the correct founder-first journey.

33. New first implementation priority
    Given your clarification, the first implementation priority should be:

34. Paid onboarding gate
35. Plan limits and processing allowance
36. Cost-safe intake foundation
37. Product link scan
38. Founder policy questions
39. Product Map summary
40. Tiny review queue
41. Draft support system
42. Publish safe launch set
43. Readiness by topic
    Do not start with:

advanced crawler
demo account agent
ticket import
video import
native integrations
enterprise governance UI 18. Pricing note
Current docs say Starter is ₹2,999/mo and Pro is ₹7,999/mo, with Beta $0.

Given your cost concern, I would remove the free Beta and be cautious with too-low Starter pricing.

Minimum pricing should cover:

Gemini usage
Firebase reads/writes/storage
Cloud Functions
widget traffic
post-launch monitoring
support margin
failed/retry jobs
A cheap plan can exist, but it must have strict limits.

Example model:

Launch plan:
small scan + small support brain + widget

Builder plan:
larger scan + more answers/articles + monitoring

Studio plan:
multiple products/workspaces
Avoid “unlimited AI support” language completely.

19. Final corrected doctrine
    Use this as the implementation doctrine:

Canonica is for solo and first-time product builders who need support infrastructure before they have a support team. It is paid from the first real workspace because every real workspace runs AI and Firebase. The product must feel simple: paste product link, confirm important launch decisions, publish support. Internally, Canonica remains source-backed, cost-bounded, review-gated, and summary-first.

That is the corrected direction.
