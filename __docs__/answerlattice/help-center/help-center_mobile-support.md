# MenuList Help Center — Mobile Support

> **Version:** 1.3.0
> **Last Updated:** 2026-08-28
> **Audience:** Mobile, Product, QA
> **Source:** Current `MobileShell` and Help Center components

## Admission

Help is useful away from a desk and has short, touch-oriented tasks: find
guidance, read common answers, or contact support. Mobile coverage is required.

## Current Architecture

- `MobileMoreScreen` opens `MobileHelpScreen` inside `MobileShell`.
- Direct `/help-center/*` links map into the same mobile sub-screen instead of bypassing the shell.
- MenuList Help route state uses `menuListHelp`, `menuListDocs`, and
  `menuListContact`; it does not expose Answerlattice-labelled state in the
  owner URL or shell.
- `kb` and `faq` recover to the MenuList FAQ. `ticket`, `feedback`, and
  `contact-us` recover to the MenuList contact surface.
- The MenuList owner surface does not claim a release-notes workflow. Legacy
  `changelog` links recover to Help home without mounting Answerlattice.
- Back from a direct `/help-center/*` route returns to
  `/dashboard#mobile/more`. Back from Help opened inside an existing
  `MobileShell` route returns to that shell's More root without rewriting the
  route, dropping its safe query context, or remounting the desktop owner app.
- Help Center buttons and interactive roles receive a 44 px minimum touch target.
- Wide Ant Design content is contained within the mobile screen instead of forcing page-level horizontal overflow.
- The Mobile Help header and description use the maintained `MobileHelp` locale namespace rather than fixed English copy.

## Data and Product Boundary

MenuList Help is product-owned, static FAQ/contact guidance. It performs no
Help DAL, API, Firestore, Storage, Function, listener, AI, or provider work.
The governed Answerlattice Help application remains isolated under the
Answerlattice product route; MenuList does not borrow its ticket, knowledge,
feedback, chat, or changelog contracts.

## Failure Behavior

- Unsupported or legacy MenuList Help paths recover to Home, FAQ, or Contact
  instead of showing a dead tab or issuing a cross-product request.
- The maintained support email remains visible when external mail handling is
  unavailable; the operating-system mail client is an external boundary.

## Required Release QA

- iOS Safari/PWA and Android Chrome/PWA direct and in-shell routes;
- keyboard, screen-reader and 44 px target checks;
- primary Help Centre navigation cards expose button/pressed semantics and activate with Enter or Space as well as touch;
- Home, FAQ disclosures, Contact, support-email handoff, and Back recovery;
- direct legacy path recovery for `kb`, `ticket`, `feedback`, and `changelog`;
- verification that no MenuList Help interaction mounts an Answerlattice
  reader, listener, provider, or support mutation.

These device checks remain pending until run against the approved deployed target.
