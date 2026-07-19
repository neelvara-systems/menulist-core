# Advanced White Label Test Cases

| Case | Expected result |
|---|---|
| Flag is false | Governance branding navigation and editor stay hidden |
| Valid profile | Values trim, colors normalize to lowercase, one document write succeeds |
| Missing profile | Default profile is returned |
| Invalid stored profile | Default profile is returned and nothing is published |
| Wrong `pId`, tenant, store, or document ID | Read/write rejected |
| HTTP, credential-bearing, whitespace, or fragment URL | Rejected before write or by rules |
| HTTPS URL containing `@` in its path | Accepted when it has no credentials |
| Invalid color or email | Rejected |
| `customCss`, `fontFamily`, or unknown field | Rejected |
| Firestore write fails | Save does not report success |
| Widget/hosted help/KB/email/public API request | No branding-profile read occurs |
| Mobile width | Form columns collapse without horizontal dependency |

## Commands

- `npm run test:answerlattice-advanced-branding-contracts`
- `npm run test:answerlattice-platform-summary:rules`
- `npm run test:answerlattice-platform-summary:shared-rules`
- focused ESLint
- strict root TypeScript
- `npm run typecheck:answerlattice`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run docs:check-links`
- `npm run verify:dependency-freeze`
