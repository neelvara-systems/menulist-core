# Global Accessibility Mobile Support

MobileShell inherits the global focus and reduced-motion rules and the shared mobile primitive changes.

## Interaction contract

- Shared actions retain at least a 44-pixel target even when visually transparent.
- Clickable cards, list rows, and tags can be activated by keyboard.
- Back, filter, refresh, information, edit, delete, color, and floating command controls expose names or state.
- Browser pinch zoom remains available.
- Screen layout, optimistic updates, navigation callbacks, and PWA shell routing are unchanged.

## Pending external checks

Authenticated iOS and Android PWA runs must still cover VoiceOver/TalkBack reading order, 200% and larger zoom/reflow, external keyboard traversal, screen rotation, and representative light/dark high-contrast conditions.
