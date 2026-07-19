# Multi-Language Articles Mobile Support

## Admission

The feature is not admitted as a customer mobile capability because customer delivery is not implemented and the rollout flag is off.

The existing Governance component is responsive and uses a compact modal, but that is not mobile-runtime proof. There is no widget locale selector, mobile locale fallback, translated search result, or translated hosted-help route.

## Future Requirements

A future rollout must test:

- owner review/edit/approve on touch layouts;
- right-to-left content for applicable locales;
- long translated titles and instructions;
- locale selection and fallback in embedded/mobile widget contexts;
- screen-reader language metadata;
- no draft leakage when locale context changes.

