# Menu Intake And Owner Review

## Public Create Menu Flow

MenuList has a controlled public-facing `/create-menu` flow.

The owner uploads a current menu image, gets a structured owner-review preview, and signs in before claiming the public starter activation. The public marketing promise is free to start and review before publishing, not an unlimited public processing utility.

Core loop:

```text
Upload -> extraction -> preview -> sign in -> official source setup
```

Evidence:

- `__docs__/public-menu-entry/README.md:1`
- `__docs__/public-menu-entry/README.md:12`
- `__docs__/public-menu-entry/README.md:14`
- `__docs__/public-menu-entry/README.md:20`

## Existing Menu Link Import

Menu Link Import lets an authenticated owner paste a public menu URL and receive an extraction draft for review.

It is an intake convenience for menus the owner controls or has permission to import. It is not a general scraper, marketplace crawler, login bypass, or auto-publish flow.

Final architecture:

```text
Owner-provided URL -> protected API -> URL safety gate -> DNS-pinned acquisition -> private artifact -> existing processing pipeline -> review screen -> owner approval -> project write and cache invalidation
```

Evidence:

- `__docs__/menu-link-import/README.md:1`
- `__docs__/menu-link-import/README.md:7`
- `__docs__/menu-link-import/README.md:22`
- `__docs__/menu-link-import/README.md:26`

## Intake Boundaries

MenuList intake must keep these boundaries:

- no import without owner permission confirmation;
- no unauthenticated menu link import;
- no private IP, localhost, link-local, metadata, non-HTTP, or credentialed URLs;
- no marketplace/CAPTCHA/login bypass;
- no public menu mutation during acquisition or extraction;
- no automatic publishing;
- no broad crawl claim.

## Owner Review Contract

The owner review step matters more than extraction speed.

The product should be described as:

```text
MenuList prepares the public version. The owner reviews before publishing.
```

Do not describe MenuList as automatically publishing extracted menus. Do not imply that every source is trusted equally.

## Answerlattice Support Questions This Source Should Answer

Potential Answerlattice draft questions:

- What happens after I upload a menu?
- Can I paste an existing menu link?
- Does MenuList publish automatically?
- Can MenuList import a competitor or marketplace page?
- Why does MenuList need owner review?
- Is a login required before publishing?

