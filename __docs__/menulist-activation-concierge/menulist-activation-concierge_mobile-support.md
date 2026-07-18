# MenuList Activation Concierge - Mobile Support

**Status:** Local source complete; device evidence pending
**Last reviewed:** July 16, 2026

Activation guidance stays inside current MobileShell surfaces:

- the global starter banner;
- Menu Setup Progress in Menu and Share;
- Share link/QR/Menu Kit/native/WhatsApp actions;
- Search & Discovery Presence Monitor;
- one More root setup shortcut.

The UI distinguishes MenuList-recorded owner action from owner-confirmed external placement. It advances only after a typed write acknowledgement. A delayed acknowledgement cannot update another store after switching. Removing a placement immediately removes that evidence from loaded state after the transaction succeeds.

Pending device checks: offline/reconnect action acknowledgement, native-share completion/cancel, WhatsApp open blocking, rapid duplicate actions, store switch during write, confirmation removal, screen-reader evidence labels, and two-action completion suppression.
