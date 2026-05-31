# Answerlattice Pre-Onboarding Input Kit — Help Documentation

## Quick Summary

The Pre-Onboarding Kit helps you prepare Answerlattice inputs before you start setup. You run a master prompt inside your AI coding tool, review the generated folder, and upload selected sources into Answerlattice Knowledge Intake.

## Before You Start

You need:

- product name and short slug;
- source mode: repo and website, multi-product repo, website only, docs only, owner notes only, or mixed;
- your public website URL, docs URL, local repo/docs path, or owner-written product notes;
- target product paths and sister products to exclude if one repo contains multiple products;
- API specs, support exports, demo recordings, screenshots, or website/FAQ asset requests if you want those reviewed;
- your production app URL if it exists;
- links to pricing, terms, privacy, security, help, and contact pages if they exist;
- approval to let your AI coding tool read the local files you choose;
- time to review the generated package before upload.

## How To Use It

1. Open `/pre-onboarding`.
2. Select the prompt action.
3. Copy the prompt from the modal or download the Markdown file.
4. Paste it into Codex, Cursor, Windsurf, Antigravity, Claude Code, or your preferred AI coding agent.
5. Direct AI-agent access remains available at `/pre-onboarding.md`.
6. Fill in the copy/paste intake fields at the top of the prompt.
7. Let the agent inspect the source bundle you have: repo, docs, website links, owner notes, support exports, or screenshots.
8. Review the generated `*-answerlattice-pre-onboarding-inputs/` folder.
9. Remove anything private or inaccurate.
10. Upload selected source files into Answerlattice Knowledge Intake.
11. Review the drafts Answerlattice creates.
12. Enable live support only after the test questions pass.

## What The Prompt Should Create

- A product context summary.
- Website, docs, owner-note, and source evidence maps.
- Support FAQ seed questions.
- Live support test questions.
- Risk boundaries for billing, legal, privacy, security, and integrations.
- Product surface mappings.
- Screenshot and asset usage rules.
- API payload skeletons for faster upload.

## What This Cannot Guarantee

The prompt can only use sources the AI tool can access in that session. It may not be able to read private repos, login-only app screens, restricted websites, local files, recordings, or screenshots unless you grant access or provide exports.

No prompt guarantees perfect results across every AI IDE, product, private app, or source shape. If something cannot be inspected, the generated package should mark it as pending. Review the package before upload.

## What Not To Include

Do not include:

- passwords;
- API keys;
- service accounts;
- tokens or cookies;
- customer records;
- payment details;
- raw logs;
- private support messages;
- unapproved screenshots.

## Troubleshooting

### The agent says it cannot access the website.

Ask it to continue from local docs and mark website verification as pending. Before upload, manually add the public pages that matter.

### The agent says it cannot access the repo.

Continue with website, docs, owner notes, screenshots, and support exports. The generated source evidence map should mark repo/code coverage as unavailable.

### The repo has multiple products.

Do not let the agent create a blended package. Give it the target product name, website URL, app URL, and known target paths. Ask it to list sister products it excluded and shared infrastructure it included.

### You want FAQ, demo video, or website assets from the repo.

Use the prompt, but treat the output as a brief. The agent should create source-backed FAQ seeds, a demo walkthrough brief, screenshot/capture rules, and website claim candidates. Do not publish them until you review and approve the wording, data, and screenshots.

### You only have owner notes.

Use the prompt anyway. Fill `SOURCE_MODE` as `owner_notes_only`, add the best product summary you have, and require the agent to mark unsupported product, legal, website, and production facts as pending.

### The generated package includes private IDs or customer data.

Remove them before upload. Answerlattice does not need private production identifiers to prepare general support knowledge.

### The agent says coverage is not complete.

Do not force it to say complete. Add the missing docs, links, screenshots, or owner notes, then rerun the coverage check.

### The generated answers mention legal, refund, billing, privacy, or security claims.

Keep those review-gated. Answerlattice should not publish them as official answers until the owner has approved the wording.

## Live Support Gate

Do not use Answerlattice with live end users until:

- all required source files are uploaded;
- risky topics are escalation-gated;
- common questions have approved answers;
- product surfaces are mapped;
- widget context is verified;
- live support test questions pass.
