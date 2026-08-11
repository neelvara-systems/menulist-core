# Knowledge Map Mobile Support

## Governance

The Knowledge Map remains inside the existing Answerlattice governance route and shell. On narrow screens:

- filters use full-width controls;
- the selected entity appears first;
- typed relationship groups render as a vertical outline behind one `Show relationships` / `Hide relationships` disclosure;
- every interactive control has a minimum 44px target;
- no horizontal canvas dragging is required;
- changing focus preserves the current route.
- an inbound entity handoff selects that entity only after it is found in the
  exact-scope map;
- a valid but absent inbound entity keeps the map unselected and shows the same
  explicit unavailable warning as desktop;
- **Review canonical answers** opens the responsive existing editor filtered to
  the selected entity.

## Hosted Help

The public topic map renders as nested disclosure controls. Selecting a topic:

1. switches to article mode;
2. scrolls to the deterministic heading anchor;
3. moves keyboard focus to the target heading where supported.

## Accessibility

- semantic buttons, lists, and headings;
- `aria-expanded` on disclosure controls;
- `aria-controls` connects the owner disclosure to both relationship columns;
- visible keyboard focus;
- text labels in addition to color;
- reduced-motion behavior relies on instant scrolling;
- no information is available only through hover.

## Mobile Cost

Mobile uses the same loaded payload as desktop. It does not issue additional Firestore reads.

The external Product Truth Map proposal correctly reinforces the drill-down
requirement. It does not justify a second mobile route, horizontal canvas,
minimap, hover-only status, placement editor, or mobile-specific snapshot.
Mobile correction actions continue to open the existing governed owner
workflow.
