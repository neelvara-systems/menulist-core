# Support Truth Change Control Mobile Support

## Decision

No separate mobile data path or route is required. The existing changelog editor and Knowledge Intake surfaces already adapt through the shared responsive shell.

## Mobile Contract

- Release review remains one responsive, vertically scrolling modal flow.
- Proof sections use short alerts, wrapping tags, and no horizontal table.
- Lists show a bounded sample; detailed review opens the existing owner routes.
- Every action has a minimum 44 px target.
- Long source, surface, and entity labels wrap instead of resizing the layout.
- The owner can keep the release as a draft at any point.
- No pan/zoom graph is introduced.

## Inheritance

Mobile inherits the same authenticated API, permission checks, exact workspace scope, caps, DTO validation, and release fingerprint as desktop.

## Test Viewports

- 390 x 844 narrow phone.
- 768 x 1024 tablet.
- Desktop modal at 1280 px or wider.
