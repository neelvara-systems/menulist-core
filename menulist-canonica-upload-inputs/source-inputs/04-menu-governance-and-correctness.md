# Menu Governance And Correctness

## Menu Correctness Engine

The Menu Correctness Engine is a validation layer that runs on menu save. It ensures project data is complete, valid, and safe before it reaches customer-facing surfaces.

It validates the existing project data. It does not create a parallel routing layer or separate copies of menu data.

Evidence:

- `__docs__/menu-correctness-engine/README.md:1`
- `__docs__/menu-correctness-engine/README.md:7`
- `__docs__/menu-correctness-engine/README.md:9`
- `__docs__/menu-correctness-engine/README.md:36`
- `__docs__/menu-correctness-engine/README.md:44`
- `__docs__/menu-correctness-engine/README.md:102`

## Five Correctness Laws

MenuList correctness is governed by five laws:

1. Price integrity.
2. Availability integrity.
3. Hours data consistency.
4. Data completeness.
5. Structural integrity.

These laws are useful Canonica examples because they show how product knowledge can be governed by deterministic rules instead of loose generated text.

## Menu Trust Signals

Menu Trust Signals are factual indicators on customer-facing pages:

- location;
- operational status;
- offering type label;
- freshness date;
- menu version or published date where available;
- sold-out or unavailable state where available.

They are not analytics, branding, or decorative badges. They are evidence that the page is current and official.

Evidence:

- `__docs__/menu-trust-signals/README.md:3`
- `__docs__/menu-trust-signals/README.md:8`

## Menu Quality Signals

Menu Quality Signals are owner-facing nudges for improvement opportunities:

- missing descriptions;
- missing images;
- pricing gaps;
- hidden items;
- price outliers.

They read existing menu/project data and connect owners to existing correction actions. They are not a score, criticism layer, or analytics feature.

Evidence:

- `__docs__/menu-quality-signals/README.md:4`
- `__docs__/menu-quality-signals/README.md:9`
- `__docs__/menu-quality-signals/README.md:17`

## Canonica Interpretation

MenuList is a strong Canonica example because it has:

- source truth;
- validation before public use;
- owner review;
- customer-facing proof;
- quality signals;
- public freshness and trust language;
- explicit boundaries around what the system can and cannot claim.

Canonica should convert this source into drafts such as:

- "How MenuList keeps public menu data correct";
- "Why owner approval matters before publishing";
- "What MenuList trust signals mean";
- "What MenuList does not guarantee."

