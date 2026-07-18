# Configuration Safety Test Cases

| Case | Expected result |
| --- | --- |
| Empty stage environment | local target |
| `VERCEL=1` without `VERCEL_ENV` | invalid stage configuration |
| Preview server marker plus production public marker | conflict; no promotion |
| Functions override `false`, `0`, `no`, or `off` | disabled |
| Functions override `flase` or blank text | fail closed |
| CampaignCue premium gate set to string `false` | premium entry disabled |
| Segmentation model set to string `false` | no segmentation entry |
| Rollout `0` | no model admission |
| Rollout `25` without stable bucket | no model admission |
| Rollout `25` with bucket `24` | admitted |
| Rollout `25` with bucket `25` | rejected |
| Rollout outside 0–100 | startup diagnostic; runtime clamp |
| Shorthand product env prefix in maintained template | verifier failure |
| Secret-like private field under `NEXT_PUBLIC_*` | verifier failure |
