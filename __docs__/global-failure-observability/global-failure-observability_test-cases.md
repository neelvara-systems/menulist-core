# Global Failure And Observability Test Cases

| Case | Expected result |
| --- | --- |
| Root/App/global-page render throws | bounded fallback appears |
| Layout wrapper or child throws | standalone fallback; no recursive child render |
| Try Again | calls boundary reset only |
| Refresh Page | explicit browser reload |
| Get Help | real `/help` navigation |
| Ordinary route crash | no Cache Storage deletion |
| Monitoring configured and event ID returned | `Report sent` plus ID |
| Monitoring absent or capture unacknowledged | support details ready; no sent/queued claim |
| Bare email/bearer token in captured console text | redacted |
| Unhandled rejection contains arbitrary object | only type/presence retained |
| Sentry replay records error | all text/inputs masked; media blocked |
| Forced ticket refresh fails with prior cache | last-known list retained |
| Generic route throws unexpected error | fixed 5xx copy |
| Reviewed typed quota/conflict error | fixed domain message and bounded metadata |
