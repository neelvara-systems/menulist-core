# MyCodex Founder Console Implementation

## Architecture

```text
MyCodex responsive shell
  -> current persisted PLATFORM authorization
     -> existing MenuList platform DAL/APIs
     -> existing Answerlattice platform APIs
```

No product data is stored by MyCodex.

## Runtime files

| File | Responsibility |
| --- | --- |
| `src/lib/mycodex/founderConsoleCatalog.ts` | Single route and product ownership catalog |
| `src/lib/mycodex/requestBasePath.ts` | Safe owner-app/local MyCodex base-path projection |
| `src/components/templates/mycodex/founder-console/MyCodexFounderConsoleShell.tsx` | Laptop/mobile navigation and shared states |
| `src/components/templates/mycodex/founder-console/MyCodexFounderConsoleHome.tsx` | Attention-first home using the bounded Ops snapshot |
| `src/components/templates/mycodex/founder-console/MyCodexFounderConsoleSurface.tsx` | Existing-component adapter and mobile monitor selection |
| `src/components/templates/mycodex/founder-console/MyCodexFounderConsoleProviders.tsx` | Session, locale, Ant Design theme, Firebase-auth sync, and network providers |
| `src/app/sites/mycodex/operations/layout.tsx` | Server admission and console shell |
| `src/app/sites/mycodex/operations/[[...surface]]/page.tsx` | Catalog-validated operational routing |
| `src/app/sites/mycodex/layout.tsx` | Private metadata, shared Redux theme scope, and pre-paint theme projection |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Document reader, Operations entry, routed base path, and shared theme control |
| `src/app/sites/mycodex/api/document/route.ts` | Platform-authenticated private document reads |
| `src/proxy.ts` | Exact owner-app `/__mycodex` rewrite and private headers |
| `src/config/features.ts` | `ENABLE_MYCODEX_FOUNDER_CONSOLE` release gate |

## Authorization

1. Proxy performs routing and privacy headers only; it is not the authorization authority.
2. The MyCodex server layout reuses the existing platform route guard, and each operational page request repeats the current persisted-role check because nested layouts may remain mounted during client navigation.
3. The guard validates the NextAuth session and re-reads the current persisted user.
4. Browser platform APIs continue using `withPlatformAuth`; direct browser Firebase monitors call the current-access gate before reads.
5. MyCodex's historical Basic Auth cookie does not authorize the founder console or platform APIs.

## Component reuse

The console imports the existing platform templates. Mobile-specific Ops, Scheduler, and Extraction screens are selected on handheld widths. Other screens render through a shared responsive containment layer that provides bounded overflow, touch targets, modal sizing, and stacked Answerlattice admin layouts.

## Theme contract

The MyCodex root layout owns the single Redux store for both the document reader and operational console. The reader and Founder Console dispatch the same `clientThemeConfig.darkMode` action, while the root `dark` class and legacy `theme` key are synchronized for Tailwind and pre-paint compatibility. Embedded Ant Design tools consume that same Redux value. Operations must not mount a nested Redux store because that would allow the shell and embedded tools to diverge.

## Compatibility

- `/platform/*` remains functional.
- `/ops/*` remains functional until its redirects are separately certified.
- The MyCodex catalog records each canonical legacy route for traceability.
- Unknown or disabled catalog routes render not-found rather than importing arbitrary modules.

## Feature flag

`ENABLE_MYCODEX_FOUNDER_CONSOLE` controls routing and UI admission. Disabling it removes the console entry and returns not-found for operational MyCodex routes without starting background reads.
