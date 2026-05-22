# Canonica Hosted Help Center

> Status: Implemented  
> Scope: Anonymous customer-facing docs/FAQ/changelog domains such as `help.example.com`  
> Product boundary: Canonica-owned hosted knowledge surface, not MenuList support copy and not a documentation CMS.

## Purpose

Hosted Help Center lets a Canonica client publish its reviewed support knowledge on a public domain:

- `/` — help home
- `/docs` — published article index
- `/articles/{articleUrlOrId}` — published article detail
- `/faq` — published FAQ
- `/changelog` — published release notes
- `/robots.txt` and `/sitemap.xml` — SEO controls

This is separate from:

- authenticated Help Center/client-mounted surfaces
- embeddable widget runtime
- Canonica marketing website routes
- ticket/chat/feedback operations

## Runtime Flow

1. Client configures hosted help in `/canonica/widget` → Hosted Help tab.
2. Dashboard save adds new help domains to the shared Vercel project through the same domain-provisioning service used by MenuList custom domains.
3. Dashboard save writes `stores/{sId}.hostedHelpConfig`.
4. Dashboard save also writes one Canonica registry doc per domain:
   `canonica_publicHelpSites/{domain}`.
5. Owners can check DNS status from the Hosted Help tab; the check refreshes Vercel DNS config and stores compact status fields on the registry doc.
6. Middleware routes likely help domains such as `help.*`, `docs.*`, and `support.*` to `/canonica-hosted-help`.
7. The hosted route validates the hostname against the registry before rendering.
8. Published KB, FAQ, and changelog content is loaded through the existing tenant/store public cache.
9. Server payloads are compacted before hydration; anonymous clients receive display fields only, not tenant IDs, job IDs, author IDs, embeddings, or Firestore objects.

## Security Rules

- Anonymous requests never use the authenticated session route.
- Tenant/store IDs are resolved server-side from the registry document only.
- Only published/active KB, FAQ, and changelog entries are rendered.
- Ticket creation, feedback, chat history, and authenticated user data are not exposed.
- Public article body rendering uses a server-safe Tiptap JSON renderer followed by DOMPurify sanitization.
- Public page reads are rate-limited per domain/IP.
- `noIndex` can block SEO indexing during setup.
- In production, `/canonica-hosted-help` is an internal rewrite target only. Direct hits are redirected, and the `?domain=` test override is accepted only in local/dev rewrite mode.

## Owner Setup

In Canonica dashboard:

1. Open Widget Management.
2. Select Hosted Help.
3. Add a help domain such as `https://help.example.com`.
4. Configure title, description, FAQ/changelog visibility, and indexing.
5. Save.
6. Copy the DNS records shown in the Hosted Help tab into the domain registrar.
7. Use **Check DNS Status** until the domain shows `Live`.

## Domain Model

MenuList and Canonica share the Vercel deployment, but their domain data stays product-separated:

- MenuList custom menu domains are stored on MenuList `stores/{sId}.customDomain` and managed by `/api/domain`.
- Canonica hosted-help domains are stored in Canonica `stores/{sId}.hostedHelpConfig` plus `canonica_publicHelpSites/{domain}` and managed by `/api/canonica/hosted-help-settings`.
- The shared infrastructure layer is only Vercel provisioning (`src/lib/domains/vercelDomains.ts`).
- Canonica does not reuse MenuList store-domain fields because hosted help can have multiple support domains and must remain independent from MenuList public-menu routing.

## Local Testing

Use the dev route with a registered test domain:

```text
http://localhost:3000/__canonica-help?domain=help.example.com
http://localhost:3000/__canonica-help/docs?domain=help.example.com
http://localhost:3000/__canonica-help/sitemap.xml?domain=help.example.com
```

For true host routing, add a local hosts entry and use Chrome:

```text
http://help.example.test:3000/
```

## Files

- `src/constants/canonica/hostedHelp.ts`
- `src/lib/canonica/hostedHelpConfig.ts`
- `src/lib/canonica/hostedHelpServer.ts`
- `src/app/canonica-hosted-help/`
- `src/app/api/canonica/hosted-help-settings/route.ts`
- `src/components/templates/canonica/hostedHelp/`
- `src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx`
