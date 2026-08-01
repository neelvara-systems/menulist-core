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
| Failure page URL contains query, fragment, credentials, or an external referrer path | report retains same-origin origin/path or external origin only; credentials and non-HTTP values are omitted |
| Error digest/name is exposed through a throwing accessor or malformed Proxy | accessor is not invoked; diagnostic preparation remains available |
| Bare email/bearer token in captured console text | redacted |
| Logged object contains getter, `toJSON`, conversion hook or malformed Proxy | hook is not executed; logging remains bounded and does not throw |
| Unhandled rejection contains arbitrary object | only type/presence retained |
| Sentry event or tracing transaction contains private path/identifier context | common contained sanitizer minimizes it before delivery |
| Sentry replay records error | text/inputs masked, media blocked, network details/bodies denied, URL-bearing custom frames dropped |
| Forced ticket refresh fails with prior cache | last-known list retained |
| Generic route throws unexpected error | fixed 5xx copy |
| Reviewed typed quota/conflict error | fixed domain message and bounded metadata |
