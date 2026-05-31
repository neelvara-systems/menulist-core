# Compiled Context Distribution Mobile Support

This feature is infrastructure and owner-screen support, not a separate mobile workflow.

Mobile impact:

- Activation already uses responsive Ant Design layout. The bundle readiness card and rebuild action must remain usable on narrow screens.
- The rebuild action uses one clear button, loading state, and compact status text.
- No new mobile-specific navigation is required.
- The widget runtime runs in customer browsers; bundle pointers are independent of owner desktop/mobile.

Mobile acceptance:

- Bundle readiness is visible without horizontal scrolling.
- Rebuild button remains at least 40px high in the existing Ant Design surface.
- Error copy is short and operational.
- No additional owner setting is created.
