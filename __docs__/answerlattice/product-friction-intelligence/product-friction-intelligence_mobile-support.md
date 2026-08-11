# Product Friction Evidence Mobile Support

No separate mobile data path is required. Responsive owner surfaces use the same compact snapshot, advisory document, strict parsers, and permissions as desktop.

Mobile requirements:

- keep the completed date range visible;
- stack the friction level and totals without clipping;
- keep the ranked table horizontally scrollable when necessary;
- preserve load failure, stale, no-evidence, and entity-mapping-needed states;
- keep the AI-assisted summary visibly advisory;
- render validated advisory actions as 44px **Review evidence** links;
- provide a 44px **Open in Knowledge Map** action for each ranked card only
  while the Knowledge Map feature is enabled;
- provide a 44px **Prepare evidence brief** action for each ranked card;
- open the brief in the existing responsive drawer at full viewport width,
  with a large review-path selector, visible next-action explanation, and
  stacked 44px continue/copy/download actions;
- preserve the selected entity when the primary action opens Knowledge Map or
  trusted answers;
- bind an open brief to one workspace scope and one completed snapshot so a
  scope switch or background refresh cannot mix evidence;
- show the same explicit unavailable state as desktop when a requested map
  topic is absent, without selecting another topic;
- keep product review as local copy and make watch/no-action close without
  implying a reminder or saved decision;
- preserve a Daily Brief entity focus without a mobile-only data path;
- do not add mobile-only raw signal queries, listeners, or notification claims.

The owner view uses a stacked top-area list at narrow widths when the component
breakdown is shown. The list preserves:

- entity name and type;
- exact evidence total;
- ticket, negative-feedback, escalation, and canonical-miss components;
- completed-window comparison;
- one clear map destination and one local evidence-handoff action.

Do not render a journey canvas, heatmap, or compressed product tree on mobile.
Do not add a mobile-only save, share, issue-tracker, or raw-evidence path for
the brief. Native sharing can be reconsidered only through the same local
bounded packet and an explicit privacy review.

A future notification should be considered only after real founders demonstrate that a high-confidence emerging issue requires action away from the desktop workflow. The current feature remains a review surface, not an interruptive alert system.
