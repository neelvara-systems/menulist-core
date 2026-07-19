# Hosted Help Center Owner Guide

**Status:** Current owner guidance  
**Last verified:** July 18, 2026

## Set up the first domain

1. Open **Widget Management**.
2. Select **Hosted Help**.
3. Add a hostname such as `help.example.com`.
4. Set the site title and description.
5. Choose whether FAQ and changelog pages are visible.
6. Keep search indexing off until the content and domain are ready.
7. Save.
8. Add the shown DNS records at the domain provider.
9. Select **Check DNS Status** until the domain is live.
10. Open the public domain and test home, docs, one article, FAQ/changelog settings, and an unknown URL.

## Domain rules

Use one of these first labels:

```text
help docs support kb knowledge answers
```

General labels such as `care.example.com` are not routed by the current edge contract. A hostname used by MenuList cannot also be assigned to Answerlattice hosted help.

## Content visibility

Hosted help publishes only reviewed public content. An article must be active, published, and present in the published Knowledge Base navigation. Saving an article document alone does not make it public.

## Common recovery

### Domain is pending

- Confirm the displayed DNS record is present at the correct provider.
- Wait for DNS propagation, then run **Check DNS Status** again.
- Do not repeatedly remove and re-add the domain while propagation is pending.

### Domain requires ownership review

The hostname is already known to the deployment provider or its Answerlattice registry is missing/assigned elsewhere. Do not overwrite registry data. Confirm the intended workspace and resolve the previous provider assignment before saving again.

### Help is temporarily unavailable

The public admission dependency is unavailable. Content is intentionally not read or served as though the site were empty. Retry after the temporary condition clears.

### An article returns 404

Confirm that the article is active, published, and listed in an active published category/section. Also check that the URL uses the generated article link rather than a hand-built raw slug.

### Search engine should not index yet

Enable `noIndex` during setup or private review. Recheck `robots.txt`, canonical URLs, and `sitemap.xml` before allowing indexing.

## Safe operating rule

DNS/ticket content and connected support sources do not become public automatically. Review publication state and public navigation before enabling the domain.
