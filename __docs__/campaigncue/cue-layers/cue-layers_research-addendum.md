# CueLayers - Research Addendum

## Purpose

This addendum updates the original ChatGPT-derived CueLayers plan with fresh market and technical research. The product decision is to make CueLayers a business-safe creative reuse engine for CampaignCue, not a generic "most layers" image decomposition tool.

CueLayers should optimize for four outcomes:

1. The first editor render looks like the uploaded or generated source.
2. Business-critical text is not silently changed.
3. Layers are useful enough for small owner edits.
4. Export output matches the approved editor state.

## Sources Reviewed

| Source | Signal for CueLayers |
| --- | --- |
| [Canva Magic Layers announcement](https://www.canva.com/newsroom/news/magic-layers/) | Confirms the market expectation: flat/static images can be converted into editable multi-layered designs. CueLayers must match the owner expectation while keeping a safer promise. |
| [The Verge report on Canva Magic Layers beta](https://www.theverge.com/tech/893124/canva-ai-magic-layers-feature-beta) | Shows the closest public benchmark supports PNG/JPEG-style source conversion and is still framed as beta-quality for broad design use. |
| [The Verge text alteration report](https://www.theverge.com/ai-artificial-intelligence/919028/canva-magic-layers-ai-replacing-palestine) | Critical caution: layer conversion can alter visible text. CueLayers must treat business text as a hard safety gate, not a cosmetic detail. |
| [Codia Visual Struct](https://codia.ai/visual-struct) and [Visual Struct API notes](https://codia.ai/blog/visual-struct-api) | Useful reference for structured output: element type, bounding boxes, hierarchy, text, confidence, and layout relationships. |
| [ImageToLayers](https://www.imagetolayers.com/) | Practical reference for semantic raster layer separation, background completion, and export packaging. CueLayers should borrow raster-first pragmatism but keep owner UI simpler. |
| [Firebase Imagen migration guide](https://firebase.google.com/docs/ai-logic/imagen-models-migration) | Imagen model availability changes in 2026 mean CueLayers must not hardcode a provider/model as architecture truth. |
| [Firebase AI Logic supported models](https://firebase.google.com/docs/ai-logic/models) | Firebase lists supported Gemini image models and recommends remote model/version switching; this supports a server-side model registry. |
| [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation) | Gemini image models can be a generation adapter, but generated pixels still need validation and provenance capture. |
| [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/gemini-3) | Gemini 3 Pro/Flash do not support native segmentation masks; use Gemini 2.5 Flash or another segmentation adapter when mask output is required. |
| [Gemini 3 Pro Image docs](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image) | Best fit for complex graphic design, high-fidelity text, product mockups, and grounded visual output, so it belongs behind premium/cost gates. |
| [Vertex AI release notes](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes) | Google recommends Gemini 3.1 Flash Image for image generation because of improved pricing and latency; use through registry/availability gates. |
| [Gemini model migration guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate) | New Gemini features require the Gen AI SDK path after June 2026, matching the repo's `@google/genai` AI Gateway direction. |
| [SynthID overview](https://deepmind.google/models/synthid/) | Generated asset provenance should capture watermark/provenance evidence where available. |
| [Meta SAM 2](https://ai.meta.com/research/sam2/) and [Meta SAM 3.1](https://ai.meta.com/blog/segment-anything-model-3/) | Segmentation capability is moving from promptable object masks toward open-vocabulary/efficient segmentation. CueLayers should use a SAM-family adapter, not a fixed SAM2-only contract. |
| [Qwen-Image-Layered](https://github.com/QwenLM/Qwen-Image-Layered) | Native layered/RGBA model outputs are a possible observation source, but should not become canonical product truth. |
| [OmniPSD paper](https://arxiv.org/html/2512.09247v1) | Research direction validates iterative image-to-PSD decomposition with text/foreground/background steps, while still showing that baselines struggle. |
| [Google Cloud Vision OCR docs](https://docs.cloud.google.com/vision/docs/ocr) | OCR providers can return text, words, and bounding boxes required for text safety and reconstruction validation. |
| [Cloud Run jobs docs](https://docs.cloud.google.com/run/docs/create-jobs) | Heavy processing should use job-style workers with retries/timeouts instead of normal Next.js request handlers. |
| [Firebase Storage security rules](https://firebase.google.com/docs/storage/security) | Upload and processing paths must enforce auth, content type, and size constraints. |
| [Fabric custom properties docs](https://fabricjs.com/docs/using-custom-properties/) | Any CueLayers metadata carried through Fabric must be typed and explicitly serialized. |

## Product Decision

CueLayers should not chase "fully editable everything." That promise fails on real flattened images and creates dangerous owner trust issues. The stronger CampaignCue-specific product is:

```text
Reuse existing campaign images with business-safe accuracy, visible confidence, and export-ready fallback.
```

This is better for SMB owners because they usually need to change a date, price, location, CTA, service name, or offer. They do not need every confetti piece to become a perfect vector path.

## Accuracy Model

CueLayers quality must be measured by separate gates instead of one generic confidence score.

| Gate | Question | Required result |
| --- | --- | --- |
| Pixel fidelity | Does the first render match the source closely enough? | Pass, needs review, or flat-safe fallback. |
| Text fidelity | Did any protected business text change? | Exact/protected-match required for editable text. |
| Structural usefulness | Are layers helpful for owner edits without over-fragmenting? | Useful layer count, stable z-order, clear groups, warnings. |
| Export fidelity | Does server export match saved editor preview? | Export render diff must stay within threshold. |

`ready` requires all critical gates to pass. Useful-but-imperfect output uses `status=completed` with `outcome=needs_review`; flat-safe output uses `outcome=flat_safe`.

## Business Truth Layer

CueLayers should use CampaignCue facts as a safety layer whenever available:

- business name
- branch/location name
- phone number
- address
- booking link or public menu link
- offer title
- offer amount or price
- date, event, or festival name
- CTA and destination
- approved brand words

For generated sources, intended campaign text is higher authority than OCR. For uploads, OCR and source pixels are evidence, but protected text that conflicts with known business facts must be kept as raster or marked `outcome=needs_review` until the owner repairs it.

## Best Long-Term Architecture

The architecture should stay adapter-based:

```text
source package
  -> deterministic normalization
  -> routing and budgets
  -> observation adapters
  -> scene resolver
  -> accuracy gates
  -> shared editor projection
  -> saved runtime
  -> server export
```

No model provider should emit final Fabric JSON. Models can emit observations, masks, text, boxes, layer candidates, image candidates, or repair candidates. The scene resolver decides what becomes editable.

## Provider Strategy

| Provider area | Long-term decision |
| --- | --- |
| Image generation | Use a server-side registry. Gemini image models may be one adapter, but generated pixels still require validation. Do not hardcode Imagen-era assumptions. |
| OCR | Use an OCR adapter that returns words, line boxes, confidence, and language. Google Cloud Vision, PaddleOCR, Tesseract, or another provider can sit behind the same contract. |
| Segmentation | Use a SAM-family adapter or Gemini 2.5 Flash mask path when native masks are required; do not depend on Gemini 3 Pro/Flash for segmentation masks. |
| Native layered models | Treat Qwen-Image-Layered, OmniPSD-style, or newer layered generators as observation sources only. |
| Background repair | Keep conservative repair behind a feature flag. Do not allow semantic background changes to make a design "ready" without validation. |
| Provenance | Capture source kind, provider family, prompt/version ids, hash, and generated-media watermark/provenance signals where available. |

## Model Capability Registry

CueLayers should not persist or depend on exact model ids. Current Google docs show image-model naming and preview/stable availability changing across Firebase AI Logic and Gemini API surfaces, and Firebase documents Imagen shutdown on June 24, 2026. The product contract is therefore capability-based.

```ts
type ModelCapability =
  | "image_generation"
  | "image_editing"
  | "layout_reasoning"
  | "ocr"
  | "segmentation_masks"
  | "text_safety"
  | "background_repair";

type ModelRegistryEntry = {
  provider: "google" | "internal" | "open_source";
  modelId: string;
  releaseStage: "stable" | "preview" | "deprecated";
  capabilities: ModelCapability[];
  costTier: "low" | "medium" | "premium";
  enabled: boolean;
  rolloutPercent: number;
};
```

| Need | Registry posture |
| --- | --- |
| High-volume generated visual/background source | Cheapest enabled model with `image_generation`; current examples may include Gemini Flash Image variants depending on API surface and region. |
| Premium complex design/text-sensitive generation | Enabled premium model with `image_generation` or `image_editing`, only after route and cost approval. |
| Native segmentation masks | Enabled `segmentation_masks` adapter, such as a SAM-family adapter, dedicated segmentation model, or a Gemini path only when the registry marks mask support. |
| Layout/bounding box observations | Enabled `layout_reasoning` adapter through the repo AI Gateway; store output as observations only. |
| Protected text truth | `ocr` plus CampaignCue/MenuList facts; never use generated pixels alone as final truth. |
| Imagen | Do not use as an architecture dependency because Firebase documents shutdown on June 24, 2026. |

The recommended default for CueLayers is not "always use the strongest model." It is:

```text
deterministic checks -> cheapest acceptable model -> premium model only when the route requires it and capacity allows it
```

This keeps Firebase/provider cost aligned with the SMB owner value of the edit.

## UI Principle

The owner should not see model complexity. Owner UI should show:

- "Ready"
- "Needs review"
- "Kept as image for safety"
- "Text needs checking"
- "Restore original"
- "Download"

Avoid exposing provider names, mask thresholds, vectorization tuning, or diagnostic jargon to SMB owners.

## Quality Reports

Each job should produce a compact quality summary in Firestore and a full quality report in Storage.

Firestore summary:

- visual match score
- text safety status
- protected text mismatch count
- layer usefulness score
- export validation status
- warning count
- reviewer action required

Storage report:

- render diff image
- text comparison details
- rejected candidate summary
- provider/adapter versions
- source hashes
- quality thresholds used

## Risks To Keep Visible

| Risk | Control |
| --- | --- |
| Text altered by model or OCR | Protected text gate, intended-text truth, raster fallback, owner review. |
| Too many tiny layers | Layer cap, group metadata, merge/downgrade policy. |
| Model/provider churn | Server-side registry and observation contracts. |
| High cost from repeated jobs | Source hash dedupe, budgets, rate limits, one-doc status, lifecycle cleanup. |
| Unsafe SVG/Fabric payload | Allowlisted properties, SVG sanitizer, renderer isolation, no arbitrary URLs. |
| Overpromising against Canva | Public copy promises safe editable approximation, not perfect design recovery. |

## Changes Applied To Plan

This addendum requires the main CueLayers docs to include:

- four accuracy gates,
- a business truth layer for protected text,
- provider registry and SAM-family wording,
- no hardcoded Imagen dependency,
- native layered model outputs as observation sources only,
- quality report storage and Firestore summaries,
- tests for text-alteration regression and export fidelity,
- public/marketing language focused on business-safe reuse.
