# MyCodex PWA Shell Mobile Support

## Decision

Supported. MyCodex is intended to be usable on iPhone/iPad PWA installs, especially for reading documents away from desktop.

## Mobile Contract

- Mobile header height includes `env(safe-area-inset-top)`.
- Main content starts below the safe-area-aware header.
- Sidebar and settings drawers reserve top and bottom safe areas.
- Fixed mini-player, scroll-to-top button, and toast sit above `env(safe-area-inset-bottom)`.
- Mobile bottom navigation sits above the iOS home indicator and gives one-tap access to Home, Search, Queue, Favorites, and Settings.
- Mobile `/` starts with a continue-reading home so short sessions can resume the last document quickly.
- Login and offline screens use safe-area padding.
- Horizontal safe areas are respected for landscape/notched layouts.
- Reader preferences, audio preferences, pinned sidebar state, recent docs, favorite docs, read-later queue, scroll positions, and expanded navigation folders persist in browser `localStorage` across PWA relaunches.

## iPhone Notes

This fixes visual placement around the status bar and home indicator. It does not change iOS background audio limits or lock-screen playback behavior.
