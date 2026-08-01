# Owner Action Layer Test Cases

## Source Gate

```bash
npm run verify:owner-action-layer
```

## Functional Cases

| Case | Expected result |
| --- | --- |
| No selected project loaded yet | Desktop action layer waits instead of showing false missing-menu state. |
| Project missing or not published | Primary action opens menu/project path. |
| Inactive or deleted project retains historical publish time | Primary action still opens menu/project path and reports not live. |
| Hours missing | Primary action opens hours path before placement actions. |
| Customer link missing | Primary action opens customer-link path before placement actions. |
| No external placement confirmed | Primary action opens presence/share placement path. |
| Placement confirmed recently | Daily change becomes the routine action when required gaps are clear. |
| Placement confirmed over 45 days ago | Placement action asks for confirmation again. |
| Placement value is malformed | It remains missing and cannot inflate the confirmed count. |
| Customer link or working-hours value is a malformed object | It remains missing instead of suppressing the corrective action. |
| Feedback disabled | Private feedback becomes an attention action. |
| Mobile owner taps action | Navigation stays inside MobileShell. |
| Feature flag off | Action layer does not render. |

## Regression Cases

- Existing dashboard public source card remains.
- Existing official-link placement card remains.
- Existing quick actions remain.
- Existing Mobile More grouping remains.
- No new API route exists.
- No new Firestore collection or field exists.
