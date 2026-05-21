# Website Content — MenuList Main Website (menulist.ai)

**Status:** ✅ CURRENT — Canonical website copy and section map
**Last Updated:** May 21, 2026
**Governance:** All content follows `02-language-governance.md` + `10-communication-worldbuilding-doctrine.md`  
**Test:** Every line passes: "Would a busy restaurant owner in Mumbai, reading this on their phone between lunch rush and dinner prep, immediately understand what this means for them?"

---

## Content Principles (From Constitution)

1. **Persuasion sequence:** Atomic truth → Hidden problem → New standard → Proof → Identity close
2. **Two Layers of Value:** Lead with Layer A (outcome), surface Layer B (ease) subtly
3. **Effort-removal clarity target:** 8.5/10 — SMBs must feel "this saves me work"
4. **Tone:** Premium calm + practical. Not fancy, not salesy, not startup-y.
5. **Language:** Operational words only. No AI-hype, no jargon, no marketing buzzwords.

---

## Page 1: Homepage

### Canonical Implementation Scope

The current homepage is the only default MenuList marketing website. It keeps the strongest first-visit conversion jobs in safer official-source language: public drift pain, upload/review/publish clarity, setup effort removal, customer preview proof, public-surface clarity, rollout proof, FAQ trust, and final CTA confidence. Advanced proof areas stay available in supporting pages/components instead of lengthening the first homepage scroll. It intentionally does **not** edit pricing, payment, subscription, Razorpay, auth, or onboarding runtime logic.

Supporting pages now share the same official-source discipline through shared hero/proof components, owner-readable trust language, safer pricing/setup claims, and a unified website palette. Pricing payment, subscription, Razorpay, auth, and onboarding runtime logic remains protected unless a separate payment-scope task explicitly approves it.

**Current route/component order:**

1. `HeroSection`
2. `ProblemSection`
3. `SolutionSection`
4. `InteractiveWorkflowSection`
5. `SetupReliefSection`
6. `SurfacesSection`
7. `CustomerBrowseSection`
8. `PreparedForYouSection`
9. `FaqSection`
10. `FinalCtaSection`
11. `StickyCta`

**Canonical section policy:** the homepage is intentionally compressed to reduce mobile and first-visit density. `RevenuePathSection`, `StatsSection`, `SearchDiscoverySection`, `AnalyticsInsightsSection`, `SmartFeaturesSection`, `BusinessSection`, and `IndustrySection` remain in the repo as supporting components/future page material, but they are not mounted in the current homepage composition.

**CTA rule:** Primary public CTAs now point to `/create-menu` and should consistently read "Upload your menu →" for non-technical SMB owners. `/get-started` remains a guided setup/sign-in page for owners who need account context, not the first upload funnel.

---

### Section 1 — Hero

**Headline:**

> Upload your current menu. Publish one official version customers can trust.

**Subline:**

> Start with a photo, PDF, link, or typed menu. MenuList prepares your live menu, official page, QR menu, web link, customer view, and PDF from one owner-approved source.

**Primary CTA:** Upload your menu →
**Secondary CTA:** See customer preview (`#customer-demo`)
**Micro-trust line:** Start with a 7-day setup. Review the public menu before choosing a paid plan.

**Proof strip:** Review before publishing · Upload before sign-in · No desktop required

**Visual:** Official-source composite showing owner source, Official Business Page, customer menu phone preview, and surface pills for QR menu, official page, digital screen, web/link, print/PDF, and saved menu shortcut.

**Notes:**

- Direction A: Current-menu owner action first, official-source proof second.
- Hero must communicate upload → review → publish one trusted customer version in under 5 seconds.
- Avoid "digital menu maker", "AI menu generator", and generic dashboard visuals.
- Avoid using "no account needed" as a hero or upload-page proof point. Keep the funnel promise aligned to the current setup model: "Start with a 7-day setup. Review before choosing a paid plan."

---

### Supporting Component — Revenue Path (not mounted on current homepage)

**Purpose:**

This section shows the practical path from the menu a business already has to the customer actions that matter. It keeps the source-of-truth idea, but explains it in plain owner language.

**Eyebrow:**

> From menu to customer action

**Headline:**

> Your menu should help customers choose faster.

**Supporting text:**

> MenuList turns the menu you already use into a live menu, official page, QR, link, screen, and PDF that customers can trust before they call, visit, order, or share.

**Path steps:**

| Step | Label | Title | Description |
| --- | --- | --- | --- |
| 1 | Start | Use your current menu | Photo, PDF, link, or typed items. The owner-approved version is the starting point. |
| 2 | Publish | Customers see one clear page | The live menu and official page replace old files, screenshots, and broken links. |
| 3 | Share | Put the same menu everywhere | QR, web link, screen, and PDF all point back to the current menu. |
| 4 | Action | Customers can act quickly | Call, WhatsApp, directions, order, and share stay close to the menu. |

**Trust panel:**

- Find items fast.
- Know it is current.
- Know it is official.
- Take the next step.

**Link row:**

- See customer surfaces
- See setup steps
- See business types
- See plans

---

### Section 2 — The Problem

**Section heading:**

> Business menus on the internet are broken.

**Supporting text:**

> Your Google listing shows old prices. The QR menu has items you removed. The PDF on WhatsApp is from months ago. Customers see different versions everywhere they look — and none of them are correct.

**Visual stack:**

The section now uses a split layout: left-side narrative, right-side public-drift stack. This is more direct and self-selling than a generic card grid.

**Visual tiles (4):**

| Tile | Short Label | Description |
| --- | --- | --- |
| 1 | Outdated Google listing | Old prices and hours still showing to customers searching for you |
| 2 | Wrong QR menu | Items you removed months ago still visible when customers scan |
| 3 | Old PDF on WhatsApp | Last year's menu still circulating in customer group chats |
| 4 | Inconsistent pricing | Different prices on different platforms — customers notice |

**Notes:**

- Keeps the owner pain obvious before introducing product mechanics.
- Tile count is intentionally 4, not 6, to reduce visual noise.

---

### Section 3 — The Solution

**Section heading:**

> One source. Public surfaces stay aligned.

**Supporting text:**

> MenuList gives your menu and business information one official home. From there, the public menu, official page, QR assets, saved menu shortcut, screens, and share links all reflect the same owner-approved truth.

**Bullet points (6):**

- Start from what you already have.
- Owner approval stays in the loop.
- Public output comes first.
- Updates have one place to begin.
- Real-world placement is included.
- Infrastructure stays quiet.

**Notes:**

- This is the category bridge from "menu" to "public business truth infrastructure".
- Public output and owner approval must remain explicit.

---

### Supporting Component — Source Proof Numbers (not mounted on current homepage)

**Section heading:**

> One source. Many places. Less repeated work.

**Metric cards (4):**

| # | Metric | Meaning |
| --- | --- | --- |
| 1 | 1 owner-approved source | Menu, prices, hours, and public business details begin from one controlled source. |
| 2 | 6 customer places | Live menu, official page, QR assets, saved menu shortcut, screens, and PDF outputs can show the same current menu. |
| 3 | 3 clear steps | Start with the current menu, review the prepared version, then publish what customers see. |
| 4 | 0 technical setup | No website build, design tool, or separate QR-menu system is needed before publishing. |

**Notes:**

- Included because it sells the reduction in repeated work quickly.
- Copy avoids broad "every surface / always in sync" overclaims.

---

### Section 4 — Source-To-Public Workflow

**Section heading:**

> From current menu to public truth.

**Steps (4):**

| Step | Title | Description |
| --- | --- | --- |
| 1 | Start with the menu you already use | Photo, PDF, or typed menu. The setup starts from the current source your business already trusts. |
| 2 | Review the prepared source | Items, categories, prices, language, images, and business details become structured before they go public. |
| 3 | Publish the official version | The official page and live menu become the customer-facing source for your menu and business information. |
| 4 | Deploy it where customers look | QR assets, saved menu shortcut, screens, print, and share links point back to the same current source. |

**Micro-copy below steps:**

> Simple on the surface. Serious underneath.

---

### Section 5 — Setup Effort Removed

**Section heading:**

> Most setup work is prepared before you publish.

**Supporting text:**

> MenuList starts from the menu you already have, then prepares the pieces owners usually chase across separate tools.

**Prepared cards (6):**

- Upload the current menu.
- Item images prepared.
- Descriptions and details.
- Language support.
- Brand and layout.
- Launch materials.

**Notes:**

- Included because setup-effort removal is one of the strongest buying triggers.
- New copy keeps owner approval in the center and avoids pretending AI publishes unchecked.

---

### Section 6 — Public Proof Surfaces

**Section heading:**

> One source for the places customers check.

**Supporting text:**

> The public output is the proof. MenuList connects the official page, live menu, QR assets, saved menu shortcut, screens, and share links around the same source.

**Surface tiles (7):**

| # | Surface | Purpose |
| --- | --- | --- |
| 1 | QR Menu | Customers scan and see the current published menu. |
| 2 | Public Link | One official link for WhatsApp, Instagram, and packaging. |
| 3 | Digital Screens | Store screens can reflect the same published source. |
| 4 | PDF Export | Clean export when print or internal use is needed. |
| 5 | Official Page | Menu, hours, photos, directions, contact, and language choice. |
| 6 | Saved menu shortcut | Repeat customers keep the business close on their phone. |
| 7 | Google, Instagram, WhatsApp | Presence Monitor tracks manual placement without claiming automatic external sync. |

**Notes:**

- Section still carries `id="public-proof"` for footer/public-proof links. The hero secondary CTA now points to the customer preview section at `#customer-demo`.
- Do not claim automatic Google/Instagram/WhatsApp sync unless the runtime path proves it.

---

### Supporting Component — Search and AI Discovery (not mounted on current homepage)

**Section heading:**

> Be readable where customers search.

**Supporting text:**

> Your official page and menu are prepared as clear public business facts, so search engines and AI assistants have a cleaner source to read.

**Primary proof panel:**

> One official source for people and machines.

MenuList turns approved menu and business details into visible public pages, structured data, sitemap signals, and owner-controlled search copy.

**Flow:**

1. Owner-approved menu and business facts
2. Official page, live menu, and public link
3. Structured data, sitemap, and AI-readable files

**Signal cards:**

| Signal | Message |
| --- | --- |
| Business facts stay clear | Hours, address, phone, actions, cuisine, service modes, photos, and social links can sit on the official page. |
| Menu facts are structured | Items, sections, prices, availability, update signals, and business context are published in machine-readable formats. |
| Search copy can follow each language | Owner settings include SEO and AEO fields, preview, and business-copy setup for enabled languages. |
| Crawlers get a stable source | Public pages, sitemap, robots rules, and LLM discovery files point systems back to the current MenuList source. |

**Proof chips:**

- SEO and AEO settings are built in.
- Copy starts from current business and menu facts.
- Owners review before publishing.
- No ranking or citation promises.

**Caveat:**

> Google, Bing, ChatGPT, and other AI systems decide what they crawl, cite, and show. MenuList prepares a clearer official source; it does not promise placement.

**Notes:**

- Added because AI search and answer-engine discovery are now an owner-relevant buying concern.
- Grounded in existing owner SEO/AEO settings, Business Copy Setup, public schema/sitemap/robots infrastructure, and LLM discovery files.
- The section must never promise Google ranking, Google Maps updates, ChatGPT citation, or automatic external-platform refresh.

---

### Section 7 — Customer Browse Proof

**Section heading:**

> Customers find what they want faster.

**Supporting text:**

> A MenuList page is built for real browsing. Customers can search, jump sections, switch language, check details, and decide without asking staff.

**Proof points (4):**

- Search is always within reach.
- Sections keep big menus easy.
- Language is part of the menu.
- Trust signals stay visible.

**Visual:** Customer-facing menu preview showing business identity, open/update state, search, section chips, item cards, and prices.

---

### Supporting Component — Analytics And Intent Proof (not mounted on current homepage)

**Section heading:**

> See what customers do after publishing.

**Supporting text:**

> MenuList connects your public menu and Official Business Page into one owner dashboard, so you can see what customers opened, searched, and acted on.

**Proof cards:**

- Menu and page journeys together.
- Demand stays attached to the menu.
- Final actions show real intent.
- Where calls came from.
- Private and cost-safe by default.

**Notes:**

- Included because it explains why MenuList matters after publish.
- Keep this proof as owner insight, not hype or surveillance language.

---

### Supporting Component — Quiet Reliability (not mounted on current homepage)

**Section heading:**

> Quiet reliability underneath.

**Supporting text:**

> Customers see a simple public page. Under it, MenuList keeps your menu controlled, current, and ready for the places customers already check.

**Reliability proof points:**

- Owner-approved publishing.
- Freshness signals.
- Change memory.
- Temporary status reaches customers.
- Presence visibility.
- Ready for serious operations.
- Connected POS updates.
- Staff access control.

**Notes:**

- This is proof language, not hype language.
- Keep all claims tied to implemented surfaces and repo evidence.
- POS Sync belongs here as an operations proof, not as a separate homepage promise. Use signed full-menu snapshot to connected store POS webhook language; avoid "works with any POS", "real-time sync", and POS integration suite claims.
- Staff access belongs here as operations proof, not as the homepage promise. Use concrete owner controls: add staff, assign roles, reset passcodes, and sign out access when staff leaves.

---

### Section 8 — Real-World Deployment

**Section heading:**

> The official menu leaves the screen.

**Supporting text:**

> A correct public link matters only when customers can find it. MenuList helps place the official menu where your business already speaks to customers.

**Deployment cards:**

- Table and counter QR.
- Packaging and takeaway.
- WhatsApp and Instagram.
- Saved menu shortcut access.
- Digital screens.
- Placement checklist.

**Notes:**

- This section borrows Stage 3 Direction B's limited deployment strength without changing the overall Direction A system.
- The value is placement confidence, not decoration.

---

### Supporting Component — Business Fit (not mounted on current homepage)

**Section heading:**

> For businesses that want things to stay correct.

**Points:**

- Pricing stays consistent.
- Brand stays controlled.
- Locations stay aligned.
- Festival menus can be handled.
- Temporary status updates can reach customers.
- Presentation stays professional.

**Link text:** Learn about multi-location →
**Link destination:** `/multi-location`

---

### Supporting Component — Industry Breadth (not mounted on current homepage)

**Section heading:**

> Not only restaurants.

**Supporting text:**

> MenuList works for any business with a public menu, price list, catalogue, or service list that customers need to trust.

**Industry chips:**

- Restaurant
- Cafe
- Bakery
- Cloud Kitchen
- Bar & Lounge
- Food Truck
- Salon
- Spa & Wellness
- Retail Shop
- Gym & Fitness
- Hotel
- Service Business

**Notes:**

- Retained as a supporting component because `IndustrySection` can prevent category narrowing on future/expanded pages.
- This should widen the buyer's mental model without turning the homepage into scattered industry SEO pages.

---

### Section 9 — FAQ

FAQ language should reinforce MenuList as the official customer-facing source. Avoid reducing the product to a "digital menu", "restaurant website", "AI tool", or "QR generator". Do not overclaim automatic external distribution; use owner-approved source and MenuList public-surface language.

Key FAQ topics:

- What MenuList is.
- Whether technical setup is needed.
- What happens after a price/item update.
- Branding control.
- Supported business types.
- Business data safety.
- Multi-location support.
- Search/AI placement caveat.
- Staff access without owner access.
- Pricing entry point.

---

### Section 10 — Final CTA

**Heading:**

> Make one public menu customers can trust.

**Subtitle:**

> Start from the menu you already have. MenuList turns it into the official customer-facing version of your business.

**Button:** Upload your menu →

**Caption:**

> No technical setup. Owner approval before publishing.

**Phone workflow line:** No desktop required — manage and publish from a phone browser or the MenuList PWA.

**Bottom text:**

> Public page, live menu, QR assets, saved menu shortcut, and customer-facing materials from one menu.

---

## Page 2: Product (/product)

**Canonical note:** Supporting website pages must follow the current official-source strategy. Revalidate claims against the current codebase before promoting them. Do not use automatic Google/external-surface language unless the runtime path proves it.

### Hero

**Headline:**

> How MenuList works

**Subline:**

> Start with your current menu. MenuList prepares the owner-approved source for the customer-facing surfaces your business uses.

**CTA:** Upload your menu →

---

### Section: Upload & Create

**Heading:**

> Start with what you have.

**Body:**

> Take a photo of your paper menu. Upload a PDF. Or type items directly. In a few minutes, everything is read, structured, and ready for you. No data entry. No formatting. No starting from scratch.

**Key points:**

- Works with any format — photo, PDF, or typed input
- Items, prices, and categories read for you — no manual entry
- Handles multiple pages and handwritten menus
- Edit anything before publishing — you stay in control, without the setup work

**Source:** `ai-data-extraction_website.md`

---

### Section: Review & Approve

**Heading:**

> Check everything before it goes live.

**Body:**

> See your extracted menu alongside the original document. Edit any item, fix a price, adjust a description. Nothing publishes without your approval.

**Key points:**

- Side-by-side view: original document next to structured data
- Edit any field — names, prices, descriptions, categories
- Quality checks flag potential issues before publishing
- You approve. Then it goes live.

**Source:** `menu-correctness-engine_website.md` (quality assurance backing)

---

### Section: Everything Prepared For You

**Heading:**

> Images, descriptions, and translations — prepared before you publish.

**Body:**

> Your menu items get professional descriptions, images, and translations without you writing, designing, or translating anything. The system prepares everything from your menu data.

**Key points:**

- Professional descriptions for every item — written for you from your menu data
- Menu images and uploaded photos prepared for you — no photographer, no designer, no formatting needed
- Multiple languages added with one click — no translator needed
- Consistent quality across your entire menu — without you writing a single line

**Source:** `ai-image-generation_website.md`, `media-image-system_website.md`, `description-generation_website.md`, `multi-language-translation_website.md`

**Note:** This is the Layer B section — surfaced as outcomes ("descriptions created", "images created"), never as technology ("AI generates", "neural network").

---

### Section: Publish

**Heading:**

> Publish from one owner-approved source.

**Body:**

> When you publish, your MenuList-controlled public surfaces can point customers to the same approved source: QR menu, official page, digital screens, PDF, and share links. External placements such as Google, Instagram, and WhatsApp still require owner placement or checklist confirmation.

**Key points:**

- Atomic publishing — all surfaces update together
- No duplicate updates across MenuList-controlled surfaces
- MenuList-controlled public surfaces can stay aligned from the approved source
- Publish history lets you see what changed and when

**Source:** `client-menu_website.md` (controlled MenuList surface publishing)

---

### Section: Where It Lives

**Heading:**

> Your menu, everywhere your customers look.

**Body:**

> Once published, your menu appears across every surface customers already use.

**Surfaces (detailed):**

1. **QR Menu** — Customers scan and see your current published menu on any phone or browser. No app download needed.
2. **Official Business Page** — One official link with your menu, hours, location, photos, social links, and customer actions. Share it on WhatsApp, Instagram, packaging, Google profile, or QR.
3. **Google Presence** — Your Google Business Profile can point customers toward the current MenuList public menu where configured.
4. **Digital Screens** — Your full menu on your shop TV. Categories, items, prices, and visibility can follow the published MenuList source.
5. **PDF Export** — A clean, formatted PDF of your current menu. For print, packaging, or internal use.
6. **Shareable Link** — Direct link to your live menu. Works in any message, email, or social post.

**Source:** `client-menu_website.md`, `official-business-page_website.md`, `digital-screens_website.md`, `gbp-sync_website.md`

---

### Section: Always Current

**Heading:**

> Your menu stays correct. You never check again.

**Body:**

> Change a price, mark an item unavailable, or update business details from the owner-approved menu. Customer-facing pages can reflect the current published version without separate manual copies.

**Key points:**

- Price changes start from one owner-approved menu
- Unavailable items can be hidden from controlled customer-facing menus
- Hours displayed accurately — customers see "Open" or "Closed" in real time
- One current menu reduces duplicate updates across controlled public pages

**Source:** `pricing-integrity-system_website.md`, `hours-holiday-accuracy_website.md`

---

### Final CTA

**Heading:**

> Your menu deserves one official home.

**CTA:** Upload your menu →

**Sub-text:**

> No technical setup. Owner review before publishing.

---

## Page 2A: Features (/features)

**Canonical note:** The Features page can explain deeper product capability than the homepage, but it must stay owner-readable and evidence-backed. Feature cards should not become a generic SaaS checklist.

### Hero

**Headline:**

> Everything your menu needs. No extra work for you.

**Subline:**

> MenuList handles the public places your menu touches, so you can stay focused on the business.

**CTA:** Upload your menu →

**Notes:**

- This hero should sell reduced owner work, not an abstract feature catalogue.
- Keep the phone-first and owner-approval helper lines directly below the hero subline.

### Operations Group

**Mobile owner operations card:**

Title:

> Owner dashboard on your phone

Description:

> Use the mobile owner dashboard from a phone browser or the MenuList PWA to update menus, publish changes, check customer signals, adjust settings, manage screens, and handle daily operations without a desktop.

**Notes:**

- This is a dedicated Features page proof point because it reduces the non-technical SMB owner's fear that MenuList requires desktop administration.
- Keep the homepage version short as reassurance copy near CTAs.
- Avoid claiming exact parity for every advanced edge case; the claim is practical phone-first owner operation.

**Staff accounts and roles card:**

Title:

> Staff accounts and roles

Description:

> Add staff with email or Staff ID and passcode, choose what each role can access, reset passcodes, and sign out old sessions when staff changes.

**Notes:**

- This is a day-one business-operations proof point for teams where not everyone should have owner access.
- Keep the claim to implemented access controls. Do not imply payroll, attendance, shift planning, or HR management.

### Customer Signals Block

**Eyebrow:**

> Customer signals

**Heading:**

> Your menu, understood after it goes live

**Subline:**

> MenuList records decision-ready customer signals from the public menu and official business page, then shows them as clear owner metrics.

**Notes:**

- This block should align visually with the other Features page groups, including the same small section label treatment.
- Cards use left-side Lucide icons with title and supporting copy on the same row.
- Keep the analytics claim privacy-conscious and decision-ready. Do not imply customer profiling, exact GPS tracking, heatmaps, or guaranteed attribution.

---

## Page 3: Multi-Location (/multi-location)

**Primary source:** `multi-outlet-consistency_website.md`

### Hero

**Headline:**

> One menu. Every location. Built to stay consistent.

**Subline:**

> Manage pricing, availability, and presentation across all your outlets from one place. Approved updates can reach every location without manual coordination between branches.

**CTA:** Set up your first location →

---

### Section: The Chain Problem

**Heading:**

> Managing five menus is five times the work.

**Body:**

> Prices drift between locations. Items disappear from one outlet but not others. Names change without HQ knowing. Instead of running your business, you're chasing consistency across five different menus.

---

### Section: Master → Outlet Model

**Heading:**

> One master menu. Every outlet follows it.

**Body:**

> Build your core menu once at HQ. When you update the master and publish the approved version, linked outlets can reflect the change from the same source.

**Visual:** Master menu → approved-source flow → 5 outlet menus using the same source

---

### Section: Per-Location Control

**Heading:**

> Local flexibility, without breaking consistency.

**Body:**

> Each outlet can adjust prices for their market or mark items as temporarily unavailable — without affecting the master menu or other locations. Core menu items, names, and descriptions stay locked. No outlet manager can rename your signature dish without HQ approval.

**Key points:**

- Local price adjustments for different markets
- Outlet-specific availability (mark items temporarily unavailable)
- Core items locked by HQ — names and descriptions protected
- Every change stays within brand boundaries

---

### Section: Central Dashboard

**Heading:**

> One dashboard. Every location.

**Body:**

> The Locations page shows all your outlets in one place. See which outlets are active, view billing per store, and switch between locations with one click.

**Key points:**

- Add a new outlet and let it inherit the master menu structure
- Billing adjusts automatically — per-outlet pricing, no plan changes needed
- Switch between any location from one screen
- See status and activity across all outlets at a glance

---

### Section: Pricing for Chains

**Heading:**

> Simple per-outlet pricing.

**Body:**

> Each outlet is billed individually. Add or remove outlets anytime. No enterprise pricing negotiations. No custom contracts. Same transparent pricing as any other MenuList account.

**CTA:** See pricing →  
**Link:** `/pricing`

---

### Final CTA

**Heading:**

> Ready to bring consistency to every location?

**CTA:** Set up your first location →

---

## Page 4: Pricing (/pricing)

### Page Heading

**Headline:**

> Everything your customers see. One system.

**Subline:**

> Menu, pricing, availability, and presentation stay connected to one owner-approved source. No design or technical setup required.

**Proof row:**

- Look professional from one source
- No scattered menu files
- No outdated public PDFs

---

### Plan Display Rules

- Show **B2C plans only** (2-3 plans) — no B2B/developer tab
- **INR primary** (auto-detected for India timezone), USD secondary
- **Monthly/yearly toggle** with savings badge
- Keep existing plan data from `PlatformPlansList`
- Each plan card: Plan name, price, billing period, key features, CTA button
- Recommended plan highlighted

### CTA on Plan Cards

> Upload your menu →

### Below Plans: Credit / Enhancement Packs

**Heading:**

> Need more from your menu?

**Body:**

> Every plan includes menu preparation features. For businesses with larger menus or frequent updates, Enhancement Packs provide additional capacity. One-time purchase. No expiry.

**Source:** `ai-enhancement-packs_website.md`

---

### FAQ Section

**Q: How does billing work?**

> Choose monthly or yearly. Yearly saves 17%. You can switch anytime.

**Q: Can I change my plan later?**

> Yes. Upgrade or downgrade anytime from your dashboard.

**Q: Is there a free trial?**

> Menu extraction is free and unlimited. To publish and share your menu, choose a plan.

**Q: What payment methods do you accept?**

> All major cards, UPI, and net banking via Razorpay. Payments are secure and processed in India.

**Q: What happens if I cancel?**

> Your menu stays accessible to customers until the end of your billing period. After that, you can still access your data.

**Q: Do I need to pay per location?**

> Each outlet has its own billing. Add or remove outlets anytime.

**Q: What are Content Credit Packs?**

> Every plan includes menu preparation features — images, descriptions, and translations. Content Credit Packs give you additional capacity for larger menus. One-time purchase, never expires.

---

## Page 5: About (/about)

### Hero

**Eyebrow:**

> Built for public menu truth

**Headline:**

> About MenuList

**Subline:**

> MenuList exists so a business can approve one current source, then use it wherever customers look.

**Proof strip:**

- Official source, not QR-only utility
- Simple for owners, serious underneath
- Built in India for growing businesses

### Mission

**Heading:**

> Why MenuList exists

**Body:**

> MenuList is a system that manages official menus and public business information from a single source of truth. It keeps menu content accurate and aligned across customer-facing surfaces including QR, web, screens, and print.

> We built MenuList because every business deserves one trusted place where the current menu starts. Not a tool to manage. Not a platform to learn. A system that keeps the owner-approved menu at the center.

---

### Who We Are

> MenuList is built in India for businesses that care about how they present themselves to customers.

**Contact:**

- Email: hello@menulist.ai
- Support: Available via email

---

### CTA

> Make your menu source official.

**CTA:** Upload your menu →

---

## Page 6: Get Started (/get-started)

**Eyebrow:**

> Start with control

**Heading:**

> Start with the menu you already use

**Subline:**

> Start with your current menu, review the prepared source, and choose a plan only when the setup path is clear.

**Proof strip:**

- Google sign-in only
- Owner review before publishing
- Dashboard setup comes next

**Primary action:** Upload your menu → (`/create-menu`)
**Secondary action:** Continue with Google / Sign in (`#sign-in`, redirects to dashboard)

**Below button:**

> Already have an account? Login

**Notes:**

- Extremely clean, centered page
- No form fields (Google OAuth handles everything)
- Primary upload path → `/create-menu`; returning-owner sign-in goes to `/dashboard`, while pricing remains available from nav and publish/setup decisions.
- Supporting cards explain current-menu start, owner approval, and pricing as the next decision without changing auth/payment behavior.

---

## Page 7: Contact (/contact)

**Heading:**

> Ask us about your menu source.

**Body:**

> Use this for setup questions, pricing clarity, multi-location planning, or anything that affects what customers see.

**Contact methods:**

- Email: hello@menulist.ai
- Website enquiry form persists through `addEnquiry()`.

**Notes:**

- Contact page keeps the existing form logic.
- New proof strip reinforces real product team, setup/pricing help, and multi-location planning.

---

## Page 8: Trust & Security (/trust-security)

**Heading:**

> Your business data is safe here.

**Body:**

> MenuList is built so your menu, business information, owner account, and public customer-facing source stay protected.

**Proof strip:**

- No stored plain-text passwords
- Business data stays isolated
- Privacy-conscious analytics

**Staff access security facts:**

- Plain-text passwords or passcodes stored by MenuList: No.
- Owner-managed staff access: roles, reset, and sign-out.
- Staff access belongs in the access-control/security layer, not in public claims as GDPR certification or HR/workforce management.

**Copy policy:**

- Owner-first language is preferred over raw implementation jargon.
- Technical facts are allowed when they are factual and useful, but avoid public overclaims such as "impossible by design".
- Security copy must not claim more than the implemented auth, tenant isolation, staff role/access controls, analytics, HTTPS, and integration behavior supports.

---

## Page 9: Legal Pages

### Privacy Policy, Terms of Service, Refund Policy

- **Privacy Policy staff-access content:** Disclose staff account details, role/store assignment, account status, reset/session metadata, authorized team access, and that MenuList does not store plain-text staff passcodes.
- **Terms staff-access content:** Make owners responsible for staff access they create, safe sharing of Staff ID/passcode details, correct role assignment, and ending access when staff leave.
- **Trust/security staff-access content:** Use factual role-scoped access language. Do not claim legal certification, GDPR certification, HR/payroll/attendance coverage, or full workforce management.
- **Refund Policy:** No staff-specific change required.
- **Styling:** Apply new design system (clean typography, proper spacing)
- **Layout:** Single column, `max-w-3xl`, generous line height

---

## Header Copy

**Logo text:** MenuList (not MenuListAI)

**Nav items:**

- How It Works → `/how-it-works`
- Multi-Location → `/multi-location`
- Pricing → `/pricing`
- Login (subtle sign-in button; no pricing detour)
- Upload your menu → `/create-menu` (primary button)

---

## Footer Copy

**Footer strategy:**

The footer is now a revenue and trust layer, not only a legal/navigation block. It should give high-intent visitors a final conversion path and help skeptical visitors understand that MenuList is a public-source system, not a QR-menu utility.

**Closing CTA:**

Eyebrow:

> Ready when the menu is

Headline:

> Put your menu online from the version you trust.

Body:

> Start from the menu you already have. MenuList prepares the customer-facing version, then keeps your public page, QR, screen, PDF, and links aligned.

Primary CTA:

> Upload your menu →

Secondary CTA:

> See plans

**Proof cards:**

- Owner approval before publishing
- One source for public surfaces
- Single-location simple. Chain-capable.

**Logo + tagline:**

> MenuList — One official source for your menu and business details.

**Source line:**

> MenuList is not a QR menu maker. It is the source behind your menu, page, QR assets, screens, PDFs, and links.

**Column 1: Product**

- How It Works
- Features
- Multi-Location
- Pricing

**Column 2: Source**

- Public proof
- Official Business Page
- Trust & Security
- Get Started

**Column 3: Resources**

- About
- Contact
- Trust & Security

**Column 4: Legal**

- Privacy Policy
- Terms of Service
- Refund Policy

**Bottom line:**

> © 2026 MenuList. Built in India.

**Trust badge (right side):**

> One public source. Built to be found.

**NOT included:**

- No newsletter signup
- No "Powered by EcomsAi"
- No phone number
- No chat widget
- No fake customer logos, fake metrics, or unsupported testimonials

---

## Meta Content (All Pages)

## Owner Reassurance Helpers

Two reusable owner-facing helper lines are part of the website conversion system:

- Phone-first operation: "No desktop required: manage and publish from a phone browser or the MenuList PWA."
- Owner approval boundary: "Nothing is published until you review and approve it."

These lines are intentionally short. They answer two high-friction SMB owner doubts: "Can I run this without a laptop?" and "Will the system publish something wrong without me?" They should appear near primary CTAs and supporting-page heroes, not inside every feature card. They render through `ws-support-hint` so the copy stays readable and wraps cleanly on mobile.

| Page           | Title Tag                                              | Meta Description                                                                                                                           |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Homepage       | MenuList - One Official Menu Source for Customers | Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source. |
| Product        | How MenuList Works — One Menu, Everywhere              | See how MenuList keeps your menu correct across QR, official pages, screens, web links, and print outputs from one approved source.         |
| Multi-Location | MenuList for Chains & Multi-Location Businesses        | Manage menus across all your locations from one place. Master menu, per-location control, instant sync.                                    |
| Pricing        | MenuList Pricing — Simple, Transparent Plans           | Start managing your official menu. Simple plans with transparent pricing in INR. No hidden fees.                                           |
| About          | About MenuList — Built in India for Growing Businesses | MenuList is a public menu infrastructure system built in India for cafes, service businesses, and growing teams that publish customer-facing offers. |
| Get Started    | Get Started — Create Your Official Menu Source         | Start with your current menu and create the owner-approved source for your public menu, official business page, QR assets, saved menu shortcut, and share links. |
| Contact        | Contact MenuList                                       | Have a question about MenuList? Reach out to our team.                                                                                     |
| Privacy        | Privacy Policy — MenuList                              | MenuList privacy policy. How we handle and protect your data.                                                                              |
| Terms          | Terms of Service — MenuList                            | MenuList terms of service for all users and businesses.                                                                                    |
| Refund         | Refund Policy — MenuList                               | MenuList refund and cancellation policy for subscriptions.                                                                                 |

---

## Language Governance Compliance Checklist

Stage 7.4 reviewed the homepage copy after the reference-informed layout pass. It corrected internal phrasing, grammar, capitalization, public-surface casing, and spelling drift while preserving the official-source positioning and avoiding unsupported claims.

| Rule                                            | Status                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| No "AI-powered" in public copy                  | ✅ Not used                                         |
| No "Smart" / "Intelligent" / "Dynamic"          | ✅ Not used                                         |
| No "You should..." / "We recommend..."          | ✅ Not used                                         |
| No "Helps you..." / "Assists with..."           | ✅ Not used — uses "Manages", "Handles", "Prepares" |
| No "Revolutionary" / "Game-changing"            | ✅ Not used                                         |
| No "Optimize" / "Advanced"                      | ✅ Not used                                         |
| No excitement language / exclamation marks      | ✅ Not used                                         |
| No statistics without stories                   | ✅ Concrete scenarios used instead                  |
| No feature-first copy                           | ✅ Outcome-first throughout                         |
| No explaining "how" the system works internally | ✅ Only shows what owner/customer sees              |
| Calm, flat, professional tone                   | ✅ Verified                                         |
| One idea per sentence                           | ✅ Verified                                         |
| Every line passes One-Line Test                 | ✅ Verified                                         |

---

## Communication Doctrine Compliance

| Law                               | Applied Where                                                               |
| --------------------------------- | --------------------------------------------------------------------------- |
| Law 1 — Reception over Expression | Every headline engineered for specific mental state (trust/clarity/action)  |
| Law 2 — Enter Their World First   | Section 2 (Problem) starts with what they already feel                      |
| Law 3 — Worldbuilding             | Sections build from problem → standard → proof → identity                   |
| Law 4 — Identity Mirroring        | "Serious businesses" / "growing businesses" / "businesses that care"        |
| Law 5 — Cognitive Hospitality     | Short sentences, familiar words, zero jargon                                |
| Law 6 — One Core Argument         | "Your menu, from one place, correct everywhere" — repeated throughout       |
| Law 7 — Stories Beat Statistics   | Concrete scenarios: price change → customer sees it, QR scan → current menu |
| Law 8 — Dissonance                | "You update your menu. Customers still see the old one."                    |
| Law 9 — Frame Shifts              | Never attacks current behavior. Small shift: "Wouldn't it be easier if..."  |

---

**This document contains all copy for the new menulist.ai website.**  
**Every line has been validated against Language Governance (Doc 02) and Communication Worldbuilding Doctrine (Doc 10).**
