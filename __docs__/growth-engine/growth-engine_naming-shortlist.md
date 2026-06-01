# Growth Engine - Naming Shortlist

**Status:** Naming recommendation
**Decision date:** June 1, 2026
**Purpose:** Suggest names only after preliminary domain, search, and company-name availability signals.

---

## 1. Availability Check Method

Checks performed:

- `.com` WHOIS through Verisign where applicable
- DNS lookups for candidate domains
- exact-match web search for name collisions
- public search against `mca.gov.in` for obvious India company-name collisions
- GitHub organization/profile availability signal

Limits:

- Registrar availability can change at any time.
- A registered domain can exist without DNS.
- Social handle checks can return login pages and are not final proof.
- MCA/company-name approval requires final check inside the official MCA portal or professional filing workflow.
- Trademark clearance needs a legal search before public launch.

## 2. Recommended Name

## MenuNexus

**Recommendation:** Use `MenuNexus` as the external/internal system name if you want a name now.

Why:

- It describes the system better than "Growth Engine": a nexus connecting menu truth, owner claim, public surfaces, discovery feeds, and distribution handoffs.
- It does not sound like a generic cold-email or CRM tool.
- It can sit beside MenuList without confusing it with GrowthOS or KitStamp.
- It leaves room for global distribution, not only lead gen.

Availability signals checked on June 1, 2026:

| Check | Result |
| --- | --- |
| `menunexus.com` | Verisign WHOIS returned no match. |
| `menunexus.ai` | WHOIS returned domain not found. |
| `menunexus.co` | WHOIS returned domain not found. |
| `menunexus.app` | No DNS record found in local lookup; final registrar check still required. |
| `menunexus.in` | No DNS record found in local lookup; final registrar check still required. |
| Exact web search | No obvious product/company collision found in the quick search. |
| GitHub `menunexus` | Returned 404 in public check. |
| MCA public search query | No obvious `MenuNexus` result from public search. |

Recommended domain action:

```txt
buy menunexus.com first
then protect menunexus.ai, menunexus.app, menunexus.co, and menunexus.in if budget allows
```

Recommended product code:

```txt
MN
```

Use `MN` only if the product is renamed before implementation. If not renamed, keep `GE` for Growth Engine.

## 3. Backup Name

## MenuAnchor

**Recommendation:** Keep as backup, not first choice.

Why:

- The metaphor is strong: canonical menu truth anchors public distribution.
- `menuanchor.com` returned no match in Verisign WHOIS.
- `menuanchor.ai` and `menuanchor.co` returned domain not found in WHOIS-style checks.

Concern:

- Exact web search is dominated by `MenuAnchor` as a Flutter/Kotlin/UI component term. That creates search ambiguity and weakens brand clarity.

Use only if `MenuNexus` cannot be purchased or approved.

## 4. Rejected Names From Availability Review

| Name | Reason |
| --- | --- |
| MenuRelay | `menurelay.com` is already registered and has web evidence of Shopify use. |
| MenuTruth | `menutruth.com` is registered. |
| MenuSignal | `menusignal.com` is registered. |
| MenuBeacon | `menubeacon.com` is registered. |
| MenuAtlas | `menuatlas.com` is registered. |
| MenuPulse | `menupulse.com` is registered. |
| MenuIndex | `menuindex.com` is registered. |
| MenuRadar | `menuradar.com` is registered. |
| MenuFlow | `menuflow.com`, `menuflow.ai`, and `menuflow.in` show registered or active DNS signals. |
| MenuReach | `menureach.com` is registered. |

## 5. Naming Decision

The docs should continue using folder name `growth-engine` until a final purchase and filing check is complete.

If `MenuNexus` is secured, implementation should use:

```txt
Product name: MenuNexus
Product code: MN
Docs folder: __docs__/growth-engine/ can stay as historical planning folder, or move once code work starts.
Route namespace: /menu-nexus or internal /growth-engine until public name is approved.
Collection prefix: menuNexus* only after product code/name lock.
```

Do not rename code, folders, Firebase projects, or product constants before the domain is purchased and the MCA/company-name check is confirmed.

