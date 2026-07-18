# External Menu Sync — Website Content Boundary

> **Status:** Capability note approved; dedicated public feature page not approved
> **Last reviewed:** July 16, 2026

## Current public treatment

External Menu Sync may appear as a low-prominence operational capability. It must not be presented as a universal POS integration or a guaranteed automation layer.

## Approved short copy

**Heading:** Connect a compatible external menu system

**Body:** If your provider or developer supplies a compatible public HTTPS endpoint, MenuList can send it a signed full-menu snapshot after approved project saves. Each store connection is configured and tested separately.

**Support line:** A successful delivery confirms the endpoint accepted the request; the receiving team remains responsible for applying it.

## Approved FAQ

### Does MenuList connect to my POS?

MenuList provides a store-level signed webhook. Compatibility depends on your POS provider or developer implementing the MenuList payload and confirming a test. MenuList does not claim support for every POS.

### Is the connection automatic?

When the connection is enabled and the MenuList app remains open, acknowledged project saves are combined briefly and sent once. There is no automatic retry service.

### Is it secure?

Requests use HTTPS, a store-specific HMAC signing secret, delivery IDs, timestamps, and versions. The destination must verify the signature and protect the secret.

### Can I connect every outlet?

Yes, one at a time. Each outlet has its own endpoint, secret, test, and status.

### Does MenuList send setup email?

MenuList can prepare a setup email draft and technical summary. The owner sends the draft from their device.

## CTA

**Primary:** Check compatibility with your provider
**Secondary:** Read setup guide

Do not use “Connect now” unless the owner already has a compatible endpoint.

## Metadata if a support page is published

- **Title:** External Menu Sync Webhook Setup | MenuList
- **Description:** Configure a store-level signed HTTPS menu snapshot for a compatible provider or developer.
- **OG title:** Send MenuList menu truth to a compatible system
- **OG description:** A tested, signed full-menu webhook for one store endpoint.

## Prohibited website content

- named vendor logos without written approval and verified compatibility;
- “works with any POS”;
- “real-time” or “instant”;
- delivery/application guarantees;
- retry claims;
- setup-in-two-minutes claims;
- “no integration required”;
- “no price mismatches” outcome guarantees;
- reliability percentages without measured production evidence;
- “enterprise-grade”, “bank-grade”, or comparison to another provider's security;
- pricing/free claims not backed by the current pricing source;
- direct GBP, social, or marketplace integration claims.

## Publication gate

A dedicated marketing page remains blocked until the owner can provide:

- at least one verified provider implementation;
- staging and production smoke evidence;
- accurate support ownership;
- current pricing posture;
- approved provider/customer naming.

The maintained help document can be published as technical setup guidance without implying vendor certification.
