# MenuList Video Campaign Measurement Ledger

**Status:** Active production ledger  
**Created:** July 11, 2026  
**Scope:** Version identity, conversion job, distribution readiness, and results for MenuList video assets

## Operating Rule

Every public, website, sales, social, or paid video version must have one row before distribution. Update this ledger after every approved render, publish, controlled test, or retirement decision.

Use:

- [conversion brief template](./videos_conversion-brief-template.md);
- [launch-video conversion research](./videos_launch-video-conversion-research.md);
- [HyperFrames operating guide](./videos_hyperframes-operating-guide.md).

Do not put personal customer data, uploaded menu contents, raw lead details, or advertising credentials in this file.

## Asset Register

| Asset id | Parent | Funnel job | Format | Status | Display close | Linked action / destination | `utm_content` | Primary metric | Paid eligibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `owner_ease_v4_no_retyping_30s_16x9` | - | Setup relief -> trust | 30s, 16:9 | Founder review MP4 rendered; website typography and brand-audio v3 aligned | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v4_no_retyping_30s_16x9` | First approved customer link per qualified referred session | Blocked: final public asset approval and deeper create-menu attribution pending |
| `owner_ease_v1_7_no_retyping_30s_16x9` | `owner_ease_v4_no_retyping_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder review MP4 rendered; current motion and encoded-QA workflow aligned | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v1_7_no_retyping_30s_16x9` | First approved customer link per qualified referred session | Blocked: final public asset approval and deeper create-menu attribution pending |
| `owner_ease_v1_8_one_link_motion_30s_16x9` | `owner_ease_v1_7_no_retyping_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder selected as primary default music reference; visual source unchanged | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v1_8_one_link_motion_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: public asset approval, terms review, and attribution pending |
| `owner_ease_v1_9_outlet_control_30s_16x9` | `owner_ease_v1_7_no_retyping_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder approved as operational alternate music reference; visual source unchanged | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v1_9_outlet_control_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: public asset approval, terms review, and attribution pending |
| `owner_ease_v1_10_clean_close_30s_16x9` | `owner_ease_v1_8_one_link_motion_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review MP4 rendered with simplified brand signature | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_10_clean_close_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_11_clean_close_outlet_30s_16x9` | `owner_ease_v1_9_outlet_control_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review alternate rendered with the same simplified brand signature | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_11_clean_close_outlet_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_12_readable_url_30s_16x9` | `owner_ease_v1_10_clean_close_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review primary rendered with phone-legible URL destination label | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_12_readable_url_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_13_readable_url_outlet_30s_16x9` | `owner_ease_v1_11_clean_close_outlet_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review alternate rendered with the same phone-legible URL treatment | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_13_readable_url_outlet_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_14_centered_url_30s_16x9` | `owner_ease_v1_12_readable_url_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review primary rendered with centered compact URL label | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_14_centered_url_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_15_centered_url_outlet_30s_16x9` | `owner_ease_v1_13_readable_url_outlet_30s_16x9` | Setup relief -> trust | 30s, 16:9 | Founder-review alternate rendered with the same centered compact URL label | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_15_centered_url_outlet_30s_16x9` | First approved customer link per qualified referred session after distribution approval | Blocked: final public asset approval, terms review, and attribution pending |
| `owner_ease_v1_16_start_there_30s_9x16` | `owner_ease_v1_14_centered_url_30s_16x9` | Setup relief hook test | 30s, 9:16 | Founder-review MP4 rendered; controlled immediate-hook and native-layout variant | MenuList / One approved customer link / menulist.ai | Platform CTA -> `https://menulist.ai/create-menu` | `owner_ease_v1_16_start_there_30s_9x16` | First approved customer link per qualified referred session, interpreted with early retention | Blocked: founder public approval, terms review, attribution, and matched control distribution pending |
| `owner_ease_v4_no_retyping_30s_9x16` | `owner_ease_v4_no_retyping_30s_16x9` | Setup relief -> trust | 30s, 9:16 | Founder review MP4 rendered; website typography aligned | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v4_no_retyping_30s_9x16` | First approved customer link per qualified referred session | Blocked: final public asset approval and deeper attribution pending |
| `owner_ease_v4_start_there_30s_9x16` | `owner_ease_v4_no_retyping_30s_9x16` | Setup relief hook test | 30s, 9:16 | Superseded by the retained `v1.16` implementation; do not distribute | Create customer link | Create customer link -> `/create-menu` | `owner_ease_v4_start_there_30s_9x16` | Qualified create-link starts, guarded by private-preview rate | Retired before render |
| `photo_pdf_v1_start_there_25s_9x16` | - | Setup relief proof | 20-25s, 9:16 | Production handoff ready | Create your customer link | Create customer link -> `/create-menu` | `photo_pdf_v1_start_there_25s_9x16` | Private preview reached per referred session | Blocked: asset not rendered and deeper attribution pending |
| `approval_v1_owner_control_20s_9x16` | - | Trust | 20s, 9:16 | Production handoff ready | Review before publishing | Create customer link -> `/create-menu` | `approval_v1_owner_control_20s_9x16` | Claim/review progress per referred session | Blocked: asset not rendered and deeper attribution pending |
| `hero_v1_approved_link_75s_16x9` | - | Product understanding | 75s, 16:9 | Production handoff ready | Create customer link | Create customer link -> `/create-menu` | `hero_v1_approved_link_75s_16x9` | First approved customer link per qualified referred session | Blocked: master not rendered and deeper attribution pending |
| `demo_v1_upload_to_publish_180s_16x9` | - | Evaluation | 2-3m, 16:9 | Production handoff ready | Start menu preview | Start menu preview -> `/create-menu` | `demo_v1_upload_to_publish_180s_16x9` | Private preview and approved publish per referred session | Blocked: demo not rendered and deeper attribution pending |

## Current Measurement Readiness

| Layer | Status | Evidence / action |
| --- | --- | --- |
| Video retention | Platform available after publishing | Capture platform retention and completion reports |
| Website CTA | Available | Website records `create_customer_link_clicked` for `/create-menu` links |
| Video version identity | Ready in documentation | Use unique `utm_content` per row |
| Source selected | Not available as campaign milestone | Requires separate consent-aware implementation review |
| Upload completed | Not available as campaign milestone | Requires separate consent-aware implementation review |
| Private preview reached | Not available as campaign milestone | Requires separate consent-aware implementation review |
| Owner claim completed | Not available as campaign milestone | Requires separate consent-aware implementation review |
| First approved publish | Not available as campaign milestone | Requires separate consent-aware implementation review |

## Baseline Results

No public baseline has been recorded yet.

Use `Not available` until a real platform or product event supplies the value. Do not invent zeros, conversion rates, cost per result, or attributed publishes.

| Asset id | Publish URL/date | Reach | 3s/engaged view | 50% | Complete | Linked action | Private preview | Approved publish | Decision |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `owner_ease_v4_no_retyping_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder review only |
| `owner_ease_v1_7_no_retyping_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder review only |
| `owner_ease_v1_8_one_link_motion_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-selected primary track reference; distribution blocked |
| `owner_ease_v1_9_outlet_control_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-approved operational alternate; distribution blocked |
| `owner_ease_v1_10_clean_close_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review clean-close primary; distribution blocked |
| `owner_ease_v1_11_clean_close_outlet_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review clean-close alternate; distribution blocked |
| `owner_ease_v1_12_readable_url_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review readable-URL primary; distribution blocked |
| `owner_ease_v1_13_readable_url_outlet_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review readable-URL alternate; distribution blocked |
| `owner_ease_v1_14_centered_url_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review centered-URL primary; distribution blocked |
| `owner_ease_v1_15_centered_url_outlet_30s_16x9` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review centered-URL alternate; distribution blocked |
| `owner_ease_v1_16_start_there_30s_9x16` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder-review native vertical hook test; distribution blocked |
| `owner_ease_v4_no_retyping_30s_9x16` | Not published | Not available | Not available | Not available | Not available | Not available | Not available | Not available | Founder review only |

## Decision Rules

- Organic results establish language and objection signals; they do not prove paid efficiency.
- Paid A/B testing starts only after the primary and guard metrics can be measured.
- Change one variable per test.
- A click-rate winner is rejected if private-preview, claim, or approved-publish quality falls.
- Retire a version when it repeatedly creates category misunderstanding or unsupported-platform assumptions.
- Keep the result as directional until the predeclared sample and statistical rule are satisfied.
