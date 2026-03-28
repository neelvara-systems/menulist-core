# Canonica — Founder Onboarding (Knowledge Bootstrap Engine) — Help Documentation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Canonica Customers (SaaS Founders)

---

## Getting Started: Upload Docs → AI Works

Canonica automatically bootstraps your AI support system from your existing documentation. Here's how it works.

---

## Step 1: Upload Your Documentation

Go to your Canonica dashboard → **KB Generation** → **New Import**.

Supported formats:
- **PDF files** — product manuals, help guides
- **Website URLs** — your existing help center or documentation site
- **Images** — screenshots of documentation
- **Copied text** — paste content directly
- **YouTube videos** — tutorial transcripts
- **Google Drive files** — shared documents

Upload one or more files and click **Start Generation**.

---

## Step 2: Review Generated Articles

Canonica's AI processes your uploaded files and generates structured help articles. This typically takes 2-5 minutes depending on the amount of content.

You'll see:
- Generated categories and sections
- Individual articles with content
- Quality scores per article

Review the structure, make any edits, then click **Publish**.

---

## Step 3: Automatic Knowledge Bootstrap

After publishing, Canonica automatically:

1. **Extracts product concepts** — identifies features, workflows, settings, integrations, and other product entities from your articles
2. **Builds your knowledge graph** — connects related concepts together
3. **Generates structured answers** — creates canonical answer drafts for each detected concept

This happens in the background. Your AI support is already working while this runs.

---

## Step 4: AI Support Is Live

Once articles are published, your AI support system starts answering customer questions immediately. It uses your article content to find and generate accurate answers.

You don't need to wait for the knowledge bootstrap to complete — your customers get help right away.

---

## Step 5: Review Generated Drafts (At Your Pace)

Go to **Governance** → look for the "Drafts awaiting review" badge.

For each generated draft, you can:
- **Approve** — makes it a canonical answer (highest-quality deterministic response)
- **Edit & Approve** — adjust the content, then approve
- **Reject** — remove drafts that aren't useful

There's no rush. Your AI already works using the article content. Approving drafts improves answer quality over time.

---

## FAQ

### How long until my AI can answer questions?
5 minutes from upload to first answer. Upload docs → publish articles → AI works.

### Do I need to approve all drafts before my AI works?
No. Your AI works immediately using published articles. Approving drafts adds higher-quality structured answers over time.

### What if my docs are outdated?
Upload your current docs. You can always update articles later, and Canonica will detect changes and suggest updates.

### Can I upload more docs later?
Yes. Each new import goes through the same pipeline — upload, generate, publish, bootstrap.

### What happens if entity extraction finds something wrong?
Low-confidence entities are placed in a review queue for you to check. Only high-confidence entities are auto-promoted. You can always deprecate or edit any entity.

---

## Troubleshooting

### "No entities detected"
- Ensure your articles have substantial content (>500 words total)
- Very generic or marketing-focused content may not yield product entities
- Try uploading more technical documentation

### "Bootstrap status shows failed"
- This doesn't affect your AI support (articles still work via RAG)
- The bootstrap will retry on the next nightly run
- Check the error message for details

### "Drafts don't look right"
- Generated drafts are starting points, not final answers
- Edit them to match your product's language and accuracy standards
- Reject any that aren't useful

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial customer documentation |
