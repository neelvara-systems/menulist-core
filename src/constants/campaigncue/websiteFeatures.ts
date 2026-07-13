export const CAMPAIGNCUE_WEBSITE_FEATURE_PATHS = {
    dailyCampaignDesk: "/features/daily-campaign-desk",
    campaignPackStudio: "/features/campaign-pack-studio",
    creativeStudio: "/features/creative-studio",
    cueLayers: "/features/cuelayers",
    creativeTrustCenter: "/features/creative-trust-center",
    brandPlaybookProofDeck: "/features/brand-playbook-proof-deck",
    reusablePackTemplates: "/features/reusable-pack-templates",
} as const;

export const CAMPAIGNCUE_WEBSITE_FEATURES = [
    {
        slug: "daily-campaign-desk",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk,
        title: "Daily Campaign Desk",
        eyebrow: "First screen",
        heroTitle: "Know what to promote before the day gets noisy.",
        description:
            "The first owner screen combines current business facts, a quick stock-and-capacity pulse, commercial rules, recent results, and the next manual campaign task into one practical cue.",
        metaDescription:
            "See how CampaignCue's Daily Campaign Desk helps local owners pick one source-checked promotion, fill missing facts, export, and record the result.",
        ownerProblem:
            "Most local owners open a marketing tool and still have to decide what to say. CampaignCue starts from today's real business context instead.",
        outcome:
            "The owner sees one cue, the reason behind it, the missing detail if any, and the pack that can be exported when ready.",
        previewKind: "daily-desk",
        dashboardNote:
            "The real owner screen stays inside the CampaignCue app. This public preview shows the workflow shape without exposing workspace data.",
        proofRows: [
            { label: "Cue", value: "Lunch combo needs a push", status: "Recommended" },
            { label: "Pulse", value: "Quiet now, stock ready, capacity available", status: "Owner confirmed" },
            { label: "Reason", value: "Price, photo, and pickup link are ready", status: "Source backed" },
            { label: "Missing", value: "No owner action needed", status: "Ready" },
            { label: "Readiness", value: "Facts, trust, freshness, approval, and handoff", status: "No prediction" },
            { label: "Rhythm", value: "Use, approve, follow up, record, or reuse", status: "Owner controlled" },
        ],
        steps: [
            {
                title: "Read the current facts",
                detail: "Offers, services, photos, owner pulse, commercial limits, locality, and result memory become the daily context.",
            },
            {
                title: "Choose the practical cue",
                detail: "CampaignCue ranks useful work such as item push, slot fill, local update, or asset reuse.",
            },
            {
                title: "Show the missing input",
                detail: "If a price, image, date, link, or approval is missing, the owner sees the plain question first.",
            },
            {
                title: "Export and remember",
                detail: "The owner downloads or copies the pack, schedules a manual task if useful, then records posted, skipped, sold, booked, or needs follow-up.",
            },
        ],
        benefits: [
            "Starts without a blank prompt.",
            "Keeps the owner focused on one useful action.",
            "Works for restaurants, salons, retail, services, agencies, and multi-location businesses.",
            "Uses compact result memory instead of a heavy analytics dashboard.",
            "Can nominate a useful past recipe for a current-fact rebuild without copying stale output or approval.",
            "Stops a promotion when stock, capacity, discount, or do-not-promote rules make it unsafe.",
        ],
        boundaries: [
            "Not a social feed scheduler.",
            "Not an autopilot posting tool.",
            "Not a place for unsupported revenue or ranking claims.",
        ],
        faq: [
            {
                question: "Does the desk choose from all possible marketing ideas?",
                answer: "No. It keeps the owner focused on one practical cue from available facts, readiness, and recent result memory.",
            },
            {
                question: "Can the owner override the cue?",
                answer: "Yes. The app exposes campaign ideas and source inputs, but the first screen stays simple on purpose.",
            },
            {
                question: "Does CampaignCue automatically repeat a campaign that worked?",
                answer: "No. It can nominate a useful past recipe, but the owner starts a new pack from current facts and reviews it again before manual use.",
            },
        ],
        relatedFeatureSlugs: ["campaign-pack-studio", "creative-trust-center", "reusable-pack-templates"],
    },
    {
        slug: "campaign-pack-studio",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio,
        title: "Campaign Pack Studio",
        eyebrow: "Pack builder",
        heroTitle: "Turn one local cue into every handoff the owner can use.",
        description:
            "Campaign Pack Studio prepares channel copy, creative files, print notes, staff tasks, presence handoff, and a truth receipt from the same checked source.",
        metaDescription:
            "Explore CampaignCue Campaign Pack Studio for WhatsApp, Google local, social creative, print, video briefs, staff copy, and export-first handoff.",
        ownerProblem:
            "Owners usually prepare WhatsApp, Google, posters, and staff notes separately. The facts drift and the work gets repeated.",
        outcome:
            "One cue becomes a grouped pack with copy, assets, briefs, source checks, manual delivery notes, and result capture.",
        previewKind: "pack-studio",
        dashboardNote:
            "The public preview shows pack structure only. Real campaign creation and export permissions stay inside the authenticated app.",
        proofRows: [
            { label: "WhatsApp", value: "Status, reply line, and image note", status: "Copy ready" },
            { label: "Google", value: "Local update fields and publish checklist", status: "Manual publish" },
            { label: "Creative", value: "Square, story, poster, and print note", status: "Editable" },
            { label: "Review", value: "Claims, consent, commercial limits, and truth receipt", status: "Visible" },
        ],
        steps: [
            {
                title: "Pick a ready cue",
                detail: "The studio opens from a recommendation or selected campaign idea that passed missing-input checks.",
            },
            {
                title: "Prepare channel outputs",
                detail: "Each output keeps the same source facts so the WhatsApp line, Google post, and poster do not contradict each other.",
            },
            {
                title: "Review risky fields",
                detail: "Claims, spend, links, consent, and rights show before any public-use action is available.",
            },
            {
                title: "Export the pack",
                detail: "The owner downloads the ZIP, copies text, creates a manual task, sends for approval, or marks the result.",
            },
        ],
        benefits: [
            "Replaces scattered one-off content work with a single pack.",
            "Keeps print, in-store, WhatsApp, Google, social, and staff handoff aligned.",
            "Shows what is ready and what needs review before use.",
            "Preserves the day-one export/download delivery mode.",
        ],
        boundaries: [
            "No direct Instagram, Facebook, Google, or WhatsApp posting.",
            "No ad spend mutation.",
            "No hidden provider connection requirement.",
        ],
        faq: [
            {
                question: "Does a pack include only social media posts?",
                answer: "No. A pack can include WhatsApp text, Google local fields, social creative, print and staff notes, email or SMS copy, QR notes, trust checks, and result prompts.",
            },
            {
                question: "Can agencies use the pack for approval?",
                answer: "Yes. The pack includes review notes and a source trace so an agency can hand it to a client without losing the campaign context.",
            },
        ],
        relatedFeatureSlugs: ["daily-campaign-desk", "creative-studio", "brand-playbook-proof-deck"],
    },
    {
        slug: "creative-studio",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio,
        title: "Creative Studio",
        eyebrow: "Editable assets",
        heroTitle: "Finish campaign assets without leaving the source truth behind.",
        description:
            "Creative Studio uses the shared editor through the CampaignCue adapter so owners can edit campaign visuals with protected text, export checks, and source context.",
        metaDescription:
            "See CampaignCue Creative Studio for editable campaign assets, protected business text, Design Cue actions, resize presets, and export checks.",
        ownerProblem:
            "A generic blank canvas makes owners recreate the same business details and can separate artwork from the facts that made it safe.",
        outcome:
            "The owner edits the campaign asset while protected business text, channel purpose, review findings, and export options stay nearby.",
        previewKind: "creative-studio",
        dashboardNote:
            "This is a static website preview of the editor workflow. The real editor runs in the CampaignCue owner app with workspace context.",
        proofRows: [
            { label: "Canvas", value: "Square, story, poster, QR card, or custom size", status: "Preset ready" },
            { label: "Text", value: "Protected business facts and editable copy", status: "Context visible" },
            { label: "Actions", value: "Design Cue commands and local edits", status: "Owner reviewed" },
            { label: "Export", value: "PNG, JPG, PDF, ZIP, and product-owned policies", status: "Checked" },
        ],
        steps: [
            {
                title: "Open from a pack",
                detail: "The editor starts with campaign context instead of a disconnected design surface.",
            },
            {
                title: "Edit the useful parts",
                detail: "Owners can change layout, text, image placement, colors, QR details, and campaign-specific elements.",
            },
            {
                title: "Check readiness",
                detail: "The editor surfaces empty text, missing actions, source facts, and product-owned export limits.",
            },
            {
                title: "Download for manual use",
                detail: "The exported file stays part of the export-first workflow rather than direct account posting.",
            },
        ],
        benefits: [
            "Keeps CampaignCue different from generic design software.",
            "Gives SMB owners a clear finish-and-export workflow.",
            "Keeps CueLayers and generated pack outputs in one editor surface.",
            "Uses the product-neutral shared editor without leaking CampaignCue into core editor code.",
        ],
        boundaries: [
            "Not a generic source-file import tool.",
            "No arbitrary SVG or unsafe remote image import claim.",
            "No direct publishing from the editor.",
        ],
        faq: [
            {
                question: "Is Creative Studio the same as a normal design tool?",
                answer: "No. It is an editor for finishing CampaignCue assets that already have business context, source checks, and export boundaries.",
            },
            {
                question: "Can the owner start from scratch?",
                answer: "Yes, but CampaignCue keeps campaign context and protected business text visible so the asset still fits the workspace.",
            },
        ],
        relatedFeatureSlugs: ["cuelayers", "campaign-pack-studio", "creative-trust-center"],
    },
    {
        slug: "cuelayers",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers,
        title: "CueLayers",
        eyebrow: "Image reuse",
        heroTitle: "Reuse existing images without pretending they are perfect source files.",
        description:
            "CueLayers converts uploaded or generated flat images into safe editable candidates when possible, with protected text, review flags, and a flat fallback.",
        metaDescription:
            "Learn how CampaignCue CueLayers helps owners reuse uploaded or generated images as editable candidates with source snapshots and safe fallbacks.",
        ownerProblem:
            "Owners often have old posters, generated images, or downloaded creatives they want to adjust instead of recreating from scratch.",
        outcome:
            "CampaignCue keeps the original flat image safe, creates editable candidates where reliable, and marks uncertain text or layers for review.",
        previewKind: "cuelayers",
        dashboardNote:
            "Provider-driven editable decomposition remains gated. The active path is the safe upload spine and editor handoff with flat-safe fallback.",
        proofRows: [
            { label: "Source", value: "Uploaded flat image or generated asset", status: "Preserved" },
            { label: "Truth", value: "Business text, brand, rights, and source snapshots", status: "Pinned" },
            { label: "Layers", value: "Image, offer block, text candidate, and fallback", status: "Reviewable" },
            { label: "Export", value: "Saved revision and server-checked PNG path", status: "Revision pinned" },
        ],
        steps: [
            {
                title: "Upload or select the image",
                detail: "The source package stores the original and normalized references without persisting signed URLs.",
            },
            {
                title: "Create safe candidates",
                detail: "The reconstruction keeps a flat reference layer and marks any editable candidates with confidence and review state.",
            },
            {
                title: "Open in Creative Studio",
                detail: "The shared editor receives a CreativeEditorDocument snapshot and CueLayers layer index sidecar.",
            },
            {
                title: "Export only after save",
                detail: "Exports are pinned to the saved revision so the server does not trust an unsaved browser canvas state.",
            },
        ],
        benefits: [
            "Lets owners reuse real assets they already have.",
            "Keeps conservative fallbacks when reconstruction is uncertain.",
            "Avoids source-file recovery overclaims.",
            "Fits the same CampaignCue editor and asset library path used by generated packs.",
        ],
        boundaries: [
            "Not Canva, PSD, Figma, or SVG source recovery.",
            "Not a guarantee that every text or object becomes editable.",
            "Not a direct browser export bypass for unsafe formats.",
        ],
        faq: [
            {
                question: "Will CueLayers perfectly recover the original design file?",
                answer: "No. It creates a safe editable approximation where possible and keeps the flat image as the reliable fallback.",
            },
            {
                question: "What happens if text cannot be trusted?",
                answer: "CampaignCue keeps that part as an image or marks it for review instead of silently changing business-critical text.",
            },
        ],
        relatedFeatureSlugs: ["creative-studio", "creative-trust-center", "brand-playbook-proof-deck"],
    },
    {
        slug: "creative-trust-center",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
        title: "Creative Trust Center",
        eyebrow: "Review surface",
        heroTitle: "See the risky parts before a campaign leaves the workspace.",
        description:
            "Creative Trust Center keeps unsupported claims, missing source proof, rights notes, consent, spend gates, and delivery boundaries visible.",
        metaDescription:
            "Explore CampaignCue Creative Trust Center for claim, source, rights, consent, spend, and manual-delivery review before owners export campaigns.",
        ownerProblem:
            "Small businesses can publish the wrong price, unsupported ranking claim, fake testimonial wording, or unapproved spend when review is hidden.",
        outcome:
            "Every pack has a plain claim/source/risk/action view so owners know what is ready, what needs review, and what stays blocked.",
        previewKind: "trust-center",
        dashboardNote:
            "CampaignCue shows an owner-review posture. It does not claim legal advice, policy certification, or predictive performance scoring.",
        proofRows: [
            { label: "Price", value: "Matched to source snapshot", status: "Checked" },
            { label: "Ranking", value: "Best in town without proof", status: "Blocked" },
            { label: "Consent", value: "Before/after or testimonial wording", status: "Needs review" },
            { label: "Spend", value: "Paid action without approval", status: "Disabled" },
        ],
        steps: [
            {
                title: "Read every public-use action",
                detail: "Downloads, exports, schedule tasks, and mark-used actions respect trust-gated states.",
            },
            {
                title: "Compare claim to source",
                detail: "The system keeps the owner-facing source note next to the campaign line that uses it.",
            },
            {
                title: "Show the allowed action",
                detail: "A ready claim can export, a questionable claim asks for review, and a blocked claim cannot be used publicly.",
            },
            {
                title: "Keep language plain",
                detail: "The surface says what the owner can do, not internal diagnostics or model confidence jargon.",
            },
        ],
        benefits: [
            "Reduces accidental false or risky marketing copy.",
            "Keeps manual export safe without hiding the reason.",
            "Helps agencies explain client review clearly.",
            "Protects the product from unsupported AI-marketing claims.",
        ],
        boundaries: [
            "Not legal advice.",
            "Not platform-policy certification.",
            "Not creative score or ROAS prediction.",
        ],
        faq: [
            {
                question: "Can the owner still export when a claim is blocked?",
                answer: "Public-use actions stay blocked until the issue is fixed or the output is changed. Review and approval requests can still be used to resolve the issue.",
            },
            {
                question: "Does this replace human review?",
                answer: "No. It makes the review visible and easier, but the owner remains in control before public use.",
            },
        ],
        relatedFeatureSlugs: ["campaign-pack-studio", "cuelayers", "brand-playbook-proof-deck"],
    },
    {
        slug: "brand-playbook-proof-deck",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
        title: "Brand Playbook and Proof Deck",
        eyebrow: "Review brief",
        heroTitle: "Keep brand guidance and proof beside the campaign pack.",
        description:
            "Brand Playbook guides tone, visuals, product focus, and avoid-list wording while the Campaign Proof Deck keeps source trace and review notes together.",
        metaDescription:
            "See how CampaignCue Brand Playbook and Campaign Proof Deck keep brand guidance, source trace, UGC/reel notes, and review boundaries with each pack.",
        ownerProblem:
            "Brand direction often lives in one place while the facts that prove a campaign live somewhere else.",
        outcome:
            "CampaignCue keeps brand feel, motifs, avoid-list wording, source trace, trust checks, UGC or reel references, and delivery notes in one review brief.",
        previewKind: "proof-deck",
        dashboardNote:
            "The proof deck is a review brief inside the export-first workflow. It is not a final rendered ad, video, website, or legal approval artifact.",
        proofRows: [
            { label: "Brand", value: "Feel, motifs, typography, and avoid list", status: "Guidance" },
            { label: "Source", value: "Menu price, owner note, link, and asset rights", status: "Traceable" },
            { label: "UGC/Reel", value: "Shot plan, product placement, consent, and CTA", status: "Brief only" },
            { label: "Delivery", value: "Manual export and review boundary", status: "Clear" },
        ],
        steps: [
            {
                title: "Save brand guidance",
                detail: "The Business Brain stores tone, audience, motifs, product focus, and avoid-list wording.",
            },
            {
                title: "Generate the proof deck",
                detail: "The pack collects source trace, review checklist, UGC or reel references, and handoff notes.",
            },
            {
                title: "Review before use",
                detail: "The owner or agency checks claims, consent, spend, and delivery boundary before exporting.",
            },
            {
                title: "Keep source truth separate",
                detail: "Brand guidance influences presentation, but it does not replace campaign facts or approval.",
            },
        ],
        benefits: [
            "Makes CampaignCue feel like a real campaign system, not a prompt box.",
            "Helps agencies and owners review the same source-backed brief.",
            "Turns brand preferences into reusable context without inflating active costs.",
            "Keeps UGC and video support brief-first, consent-aware, and owner-reviewed.",
        ],
        boundaries: [
            "Brand Playbook is guidance, not proof.",
            "Proof deck is a review brief, not a rendered final ad or legal approval.",
            "No fake testimonials, avatars, or fictional customer experience.",
        ],
        faq: [
            {
                question: "Can Brand Playbook facts prove a campaign claim?",
                answer: "No. Brand Playbook guides tone and style. Campaign proof still comes from source facts, owner inputs, rights, and review notes.",
            },
            {
                question: "Is the proof deck a final PDF creative?",
                answer: "No. It is a review brief that travels with the export pack so humans can check the work before use.",
            },
        ],
        relatedFeatureSlugs: ["campaign-pack-studio", "creative-trust-center", "reusable-pack-templates"],
    },
    {
        slug: "reusable-pack-templates",
        path: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
        title: "Reusable Pack Templates",
        eyebrow: "Repeat useful work",
        heroTitle: "Save the pack that worked, update the facts, export again.",
        description:
            "Reusable Pack Templates and result-backed reuse let owners and agencies repeat useful campaign patterns while current facts and review checks stay visible.",
        metaDescription:
            "Learn how CampaignCue reusable pack templates help restaurants, salons, retail, agencies, and multi-location teams repeat approved campaign packs safely.",
        ownerProblem:
            "Recurring offers and weekly campaigns often get rebuilt from scratch, which wastes time and makes facts go stale.",
        outcome:
            "A useful pack becomes a workspace template. The next run updates price, date, product, location, photo, or CTA before export.",
        previewKind: "templates",
        dashboardNote:
            "Templates are CampaignCue pack starting points, not a generic marketplace. Every reuse pass must refresh source facts and review state.",
        proofRows: [
            { label: "Save", value: "Lunch, slot-fill, event, or approval pack", status: "Template base" },
            { label: "Refresh", value: "Price, date, photo, location, and CTA", status: "Source updated" },
            { label: "Review", value: "Claims, rights, consent, and delivery", status: "Checked again" },
            { label: "Export", value: "Download or send for manual approval", status: "No direct post" },
        ],
        steps: [
            {
                title: "Save an approved pack",
                detail: "Only useful, reviewed packs become repeatable workspace starting points.",
            },
            {
                title: "Choose the next use",
                detail: "The owner picks a business type, location, offer, event, product, service, or agency client context.",
            },
            {
                title: "Update current facts",
                detail: "The template cannot hide stale dates, prices, source links, rights, or approval requirements.",
            },
            {
                title: "Export the refreshed pack",
                detail: "The final output stays manual and reviewable just like a new CampaignCue pack.",
            },
        ],
        benefits: [
            "Makes recurring local marketing faster without losing source checks.",
            "Helps agencies standardize client approval packs.",
            "Supports restaurant, salon, retail, local-service, and multi-location rhythms.",
            "Keeps CampaignCue's export-first boundary intact.",
        ],
        boundaries: [
            "Not a generic public template marketplace.",
            "Not a shortcut around current fact checks.",
            "Not a direct scheduling or posting integration.",
        ],
        faq: [
            {
                question: "Can templates be reused without editing facts?",
                answer: "No. CampaignCue keeps the old pack as a starting point, but the current price, date, product, location, and review state must be checked again.",
            },
            {
                question: "What happens when a completed campaign was useful?",
                answer: "Result memory can nominate its recipe for safe reuse. CampaignCue creates a new pack from current business truth instead of copying old files, approval, or trust state.",
            },
            {
                question: "Can an agency use templates across clients?",
                answer: "Yes, as a workflow pattern, but each client still needs its own source facts, review state, and manual delivery boundary.",
            },
        ],
        relatedFeatureSlugs: ["brand-playbook-proof-deck", "campaign-pack-studio", "daily-campaign-desk"],
    },
] as const;

export type CampaignCueWebsiteFeature = (typeof CAMPAIGNCUE_WEBSITE_FEATURES)[number];
export type CampaignCueWebsiteFeatureSlug = CampaignCueWebsiteFeature["slug"];

export const CAMPAIGNCUE_WEBSITE_FEATURE_SLUGS = CAMPAIGNCUE_WEBSITE_FEATURES.map((feature) => feature.slug);

export function getCampaignCueWebsiteFeature(slug: string): CampaignCueWebsiteFeature | null {
    return CAMPAIGNCUE_WEBSITE_FEATURES.find((feature) => feature.slug === slug) ?? null;
}
