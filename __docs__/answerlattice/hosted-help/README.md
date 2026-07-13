# Answerlattice Hosted Help Center

> Status: Implemented  
> Scope: Anonymous customer-facing docs/FAQ/changelog domains such as `help.example.com`  
> Product boundary: Answerlattice-owned hosted knowledge surface, not MenuList support copy and not a documentation CMS.

## Purpose

Hosted Help Center lets an Answerlattice client publish its reviewed support knowledge on a public domain:

- `/` — help home
- `/docs` — published article index
- `/articles/{articleUrlOrId}` — published article detail
- `/faq` — published FAQ
- `/changelog` — published release notes
- `/robots.txt` and `/sitemap.xml` — SEO controls

This is separate from:

- authenticated Help Center/client-mounted surfaces
- embeddable widget runtime
- Answerlattice marketing website routes
- ticket/chat/feedback operations

## Runtime Flow

1. Client configures hosted help in `/answerlattice/widget/hosted-help`.
2. Dashboard save adds new help domains to the shared Vercel project through the same domain-provisioning service used by MenuList custom domains.
3. Dashboard save writes `stores/{sId}.hostedHelpConfig`.
4. Dashboard save also writes one Answerlattice registry doc per domain:
   `answerlattice_publicHelpSites/{domain}`.
5. Owners can check DNS status from the Hosted Help tab; the check refreshes Vercel DNS config and stores compact status fields on the registry doc.
6. Middleware routes likely help domains such as `help.*`, `docs.*`, and `support.*` to `/answerlattice-hosted-help`, deleting caller-supplied hosted-help routing headers before forwarding middleware-owned request metadata.
7. The hosted route uses the validated original `Host` as the registry key before rendering; routed headers and query parameters cannot select another public workspace.
8. Published KB, FAQ, and changelog content is loaded through the existing tenant/store public cache.
9. Server payloads are compacted before hydration; anonymous clients receive display fields only, not tenant IDs, job IDs, author IDs, embeddings, Firestore objects, or raw changelog document trees. Changelog descriptions become bounded plain text and timestamp-like values become validated ISO strings.

## Security Rules

- Anonymous requests never use the authenticated session route.
- Tenant/store IDs are resolved server-side from the registry document only.
- Only published/active KB, FAQ, and changelog entries are rendered.
- Ticket creation, feedback, chat history, and authenticated user data are not exposed.
- Public article body rendering uses `renderPublicTiptapHtml()` in `src/lib/answerlattice/publicRichText.ts`. That server renderer is the sanitizer: it accepts Tiptap JSON, emits a fixed tag/mark set, escapes text and attributes, allows only safe link/image schemes, and drops unknown nodes to escaped children before `HostedHelpClient` renders `safeHtml`.
- `npm run verify:answerlattice-runtime-truth` guards this boundary by tying the hosted-help `dangerouslySetInnerHTML` call to the server-produced `safeHtml` field and the renderer escape/allowlist helpers.
- Public page reads are rate-limited per domain/IP.
- Public hosted-help identity is Host-authoritative. `?domain=` is accepted only for a middleware-marked local development rewrite, never for a public hostname, and malformed Host authorities fail closed.
- Article slug normalization fails closed on malformed percent encoding instead of throwing a public 500.
- Settings saves and manual DNS refreshes fail closed with a temporary error when rate limiting is enabled but unavailable; public pages show the empty shell instead of reading hosted content during that condition.
- Vercel provider failures stay in bounded runtime diagnostics with provider code/status and provider-message presence/length only. Browser responses and saved DNS status fields use generic hosted-help messages so provider exception text is not exposed to owners or anonymous users.
- Widget Management save and DNS-refresh failures show fixed owner-facing copy; route response text, provider exceptions, and browser exception messages are not copied into dashboard notices.
- Hosted Help settings reads use the shared Answerlattice dashboard `DATA_READ` limiter before permission and store/registry reads.
- `noIndex` can block SEO indexing during setup.
- In production, `/answerlattice-hosted-help` is an internal rewrite target only. Direct hits are redirected, and the `?domain=` test override is accepted only in local/dev rewrite mode.

## Owner Setup

In Answerlattice dashboard:

1. Open Widget Management.
2. Select Hosted Help.
3. Add a help domain such as `https://help.example.com`.
4. Configure title, description, FAQ/changelog visibility, and indexing.
5. Save.
6. Copy the DNS records shown in the Hosted Help tab into the domain registrar.
7. Use **Check DNS Status** until the domain shows `Live`.

## Domain Model

MenuList and Answerlattice share the Vercel deployment, but their domain data stays product-separated:

- MenuList custom menu domains are stored on MenuList `stores/{sId}.customDomain` and managed by `/api/domain`.
- Answerlattice hosted-help domains are stored in Answerlattice `stores/{sId}.hostedHelpConfig` plus `answerlattice_publicHelpSites/{domain}` and managed by `/api/answerlattice/hosted-help-settings`.
- The shared infrastructure layer is only Vercel provisioning (`src/lib/domains/vercelDomains.ts`).
- Answerlattice does not reuse MenuList store-domain fields because hosted help can have multiple support domains and must remain independent from MenuList public-menu routing.

## Local Testing

Use the dev route with a registered test domain:

```text
http://localhost:3000/__answerlattice-help?domain=help.example.com
http://localhost:3000/__answerlattice-help/docs?domain=help.example.com
http://localhost:3000/__answerlattice-help/sitemap.xml?domain=help.example.com
```

For true host routing, add a local hosts entry and use Chrome:

```text
http://help.example.test:3000/
```

## Files

- `src/constants/answerlattice/hostedHelp.ts`
- `src/lib/answerlattice/hostedHelpConfig.ts`
- `src/lib/answerlattice/hostedHelpServer.ts`
- `src/app/answerlattice-hosted-help/`
- `src/app/api/answerlattice/hosted-help-settings/route.ts`
- `src/components/templates/answerlattice/hostedHelp/`
- `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx`
