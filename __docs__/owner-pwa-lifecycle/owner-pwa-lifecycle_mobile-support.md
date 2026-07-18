# Owner PWA Lifecycle Mobile Support

MobileShell inherits the shared network notice from `AntdLayoutWrapper`; it no longer keeps a duplicate `navigator.onLine` listener or banner.

The manifest opens `/today`, which maps into the maintained Today tab. Menu, Share, Feedback, Billing, Locations, Users/Roles, transactions, settings, platform, operations, and reseller entry paths remain mapped into MobileShell where admitted.

The update prompt respects safe-area padding, can be deferred while editing, and reloads only after an explicit tap. Reconnecting never forces a reload. Offline writes are not queued or replayed.

Pending device evidence: Android install/update, iOS Add to Home Screen/update, standalone rotation, offline launch after a prior online install, reconnect during an unsaved edit, app/account switch, and Cache Storage inspection.
