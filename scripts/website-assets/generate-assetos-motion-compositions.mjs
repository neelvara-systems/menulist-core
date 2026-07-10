#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const today = new Date().toISOString().slice(0, 10);

const hyperframesVersion = '0.7.39';
const width = 1280;
const height = 720;
const duration = 6;

const projects = [
  {
    id: 'menulist.home.hero.business-truth-loop',
    slug: 'menulist-business-truth-loop',
    title: 'MenuList Business Truth Loop',
    type: 'menulist',
    publicFiles: {
      primary: 'public/images/website/menulist-business-truth-loop.webm',
      fallback: 'public/images/website/menulist-business-truth-loop.mp4',
      poster: 'public/images/website/menulist-business-truth-loop-poster.webp',
    },
    review: {
      strategicFit: 9,
      brandFit: 9,
      narrativeClarity: 8,
      notes:
        'Approved synthetic MenuList motion loop. Shows one owner-approved source flowing to menu, official page, QR, and screen surfaces without external sync or real customer data.',
    },
    shots: [
      { time: '0.0-1.0', beat: 'Reveal MenuList as the approved source of business truth.' },
      { time: '1.0-2.4', beat: 'Owner approval, public menu, official page, QR, and screen surfaces appear.' },
      { time: '2.4-4.8', beat: 'Truth tokens move through the loop and surface cards stabilize.' },
      { time: '4.8-6.0', beat: 'Final calm proof state with the public source still in control.' },
    ],
  },
  {
    id: 'answerlattice.home.hero.support-control-motion',
    slug: 'answerlattice-support-control-motion',
    title: 'Answerlattice Support Control Motion',
    type: 'answerlattice-control',
    publicFiles: {
      primary: 'public/answerlattice-support-control-motion.webm',
      fallback: 'public/answerlattice-support-control-motion.mp4',
      poster: 'public/answerlattice-support-control-motion-poster.png',
    },
    review: {
      strategicFit: 9,
      brandFit: 9,
      narrativeClarity: 8,
      notes:
        'Approved synthetic Answerlattice motion layer. Shows product pages, docs, tickets, hosted help, and widget context moving through a governed answer layer.',
    },
    shots: [
      { time: '0.0-1.2', beat: 'Input surfaces load as controlled knowledge sources.' },
      { time: '1.2-2.8', beat: 'Canonical answer, review state, and context layer lock into the center.' },
      { time: '2.8-4.8', beat: 'Hosted help, widget response, product page answer, and review queue receive approved output.' },
      { time: '4.8-6.0', beat: 'Unsupported fallback remains held while approved answers stay active.' },
    ],
  },
  {
    id: 'answerlattice.home.section.authority-transfer',
    slug: 'answerlattice-authority-transfer',
    title: 'Answerlattice Authority Transfer',
    type: 'answerlattice-authority',
    publicFiles: {
      primary: 'public/answerlattice-authority-transfer.webm',
      fallback: 'public/answerlattice-authority-transfer.mp4',
      poster: 'public/answerlattice-authority-transfer-poster.png',
    },
    review: {
      strategicFit: 9,
      brandFit: 9,
      narrativeClarity: 8,
      notes:
        'Approved synthetic Answerlattice authority-transfer clip. Questions become reviewed support knowledge with human review kept visible.',
    },
    shots: [
      { time: '0.0-1.2', beat: 'Incoming questions enter as unresolved support demand.' },
      { time: '1.2-3.0', beat: 'Review steps map each question to a product surface and approved wording.' },
      { time: '3.0-4.8', beat: 'Reviewed answers become hosted help and widget-safe support knowledge.' },
      { time: '4.8-6.0', beat: 'The loop ends with governance state, version, and citation visible.' },
    ],
  },
  {
    id: 'answerlattice.product.page-aware-widget.clip',
    slug: 'answerlattice-page-aware-widget-clip',
    title: 'Answerlattice Page Aware Widget Clip',
    type: 'answerlattice-widget',
    publicFiles: {
      primary: 'public/answerlattice-page-aware-widget-clip.webm',
      fallback: 'public/answerlattice-page-aware-widget-clip.mp4',
      poster: 'public/answerlattice-page-aware-widget-clip-poster.png',
    },
    review: {
      strategicFit: 9,
      brandFit: 9,
      narrativeClarity: 8,
      notes:
        'Approved synthetic page-aware widget clip. Shows safe page context, excluded private fields, and an approved answer without private tickets or tenant data.',
    },
    shots: [
      { time: '0.0-1.2', beat: 'A product page opens with bounded page context.' },
      { time: '1.2-2.8', beat: 'Allowed context is separated from excluded private fields.' },
      { time: '2.8-4.6', beat: 'The widget responds from an approved source and holds unsupported escalation.' },
      { time: '4.6-6.0', beat: 'Final proof state shows page awareness and safety boundary together.' },
    ],
  },
];

function repoPath(...parts) {
  return path.join(repoRoot, ...parts);
}

function writeRepoFile(relativePath, content) {
  const fullPath = repoPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function copyRepoFile(source, destination) {
  const sourcePath = repoPath(source);
  const destinationPath = repoPath(destination);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source file: ${source}`);
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function packageJson(slug) {
  return `${JSON.stringify(
    {
      name: slug,
      private: true,
      type: 'module',
      scripts: {
        dev: `npx --yes hyperframes@${hyperframesVersion} preview`,
        check: `npx --yes hyperframes@${hyperframesVersion} lint && npx --yes hyperframes@${hyperframesVersion} validate && npx --yes hyperframes@${hyperframesVersion} inspect`,
        render: `npx --yes hyperframes@${hyperframesVersion} render`,
        publish: `npx --yes hyperframes@${hyperframesVersion} publish`,
      },
    },
    null,
    2,
  )}\n`;
}

function readme(project) {
  return `# ${project.title}

AssetOS slot: \`${project.id}\`

This is a local HyperFrames source for a public website motion asset. It uses synthetic demo data only and must stay aligned with the AssetOS brief before public use.

## Render

\`\`\`bash
npm run check
npm run render -- --output ./renders/${project.slug}-source.mp4
\`\`\`

Final public files are transcoded with FFmpeg into the AssetOS destinations listed in \`packages/asset-factory/manifest/assets.json\`.
`;
}

function shotPlan(project) {
  return `${JSON.stringify(
    {
      slot: project.id,
      title: project.title,
      durationSeconds: duration,
      dimensions: { width, height },
      dataPolicy: 'Synthetic demo data only. No real customer, tenant, ticket, review, or private business data.',
      renderPolicy: 'Local HyperFrames plus FFmpeg. No cloud video renderer required.',
      shots: project.shots,
    },
    null,
    2,
  )}\n`;
}

function shell(project, body, timeline) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #05070d;
      }

      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #f8fafc;
      }

      .clip {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .scene {
        width: ${width}px;
        height: ${height}px;
        padding: 46px 56px;
      }

      .grid {
        position: absolute;
        inset: 0;
        opacity: 0.28;
        background-image:
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(circle at 50% 50%, black, transparent 72%);
      }

      .brand-row {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .brand-left {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .logo-tile {
        width: 54px;
        height: 54px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
      }

      .logo-tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .logo-tile.answerlattice img {
        width: 42px;
        height: 42px;
        object-fit: contain;
      }

      .brand-name {
        font-size: 24px;
        line-height: 1;
        font-weight: 760;
        letter-spacing: 0;
      }

      .brand-kicker {
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.2;
        color: rgba(255, 255, 255, 0.64);
      }

      .status-pill {
        min-height: 36px;
        padding: 9px 15px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.16);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 18px currentColor;
      }

      .mono {
        font-family: monospace;
      }

      .card {
        border: 1px solid rgba(255, 255, 255, 0.13);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.26);
      }

      ${project.type === 'menulist' ? menuListCss() : answerlatticeCss()}
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${duration}"
      data-width="${width}"
      data-height="${height}"
    >
      <section id="scene" class="clip scene ${project.type}" data-start="0" data-duration="${duration}" data-track-index="1">
        ${body}
      </section>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const hold = { progress: 0 };
      tl.to(hold, { progress: 1, duration: ${duration}, ease: "none" }, 0);
      ${timeline}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

function menuListCss() {
  return `
      .menulist {
        color: #0f172a;
        background:
          radial-gradient(circle at 78% 20%, rgba(0, 81, 209, 0.16), transparent 27%),
          linear-gradient(135deg, #f7fbff 0%, #eef5ff 48%, #ffffff 100%);
      }

      .menulist .grid {
        opacity: 0.45;
        background-image:
          linear-gradient(rgba(0,81,209,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,81,209,0.08) 1px, transparent 1px);
      }

      .menulist .brand-name {
        color: #0b1a35;
      }

      .menulist .brand-kicker {
        color: #54657e;
      }

      .menulist .status-pill {
        color: #0051d1;
        background: rgba(255, 255, 255, 0.82);
        border-color: rgba(0, 81, 209, 0.18);
      }

      .ml-stage {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: 340px 1fr 306px;
        gap: 28px;
        margin-top: 38px;
        align-items: stretch;
      }

      .source-card {
        position: relative;
        min-height: 468px;
        border-radius: 26px;
        padding: 26px;
        background: #ffffff;
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 34px 90px rgba(0, 44, 118, 0.16);
        overflow: hidden;
      }

      .source-card::after {
        content: "";
        position: absolute;
        inset: auto -70px -90px auto;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: rgba(0, 81, 209, 0.1);
      }

      .card-label {
        font-size: 13px;
        line-height: 1.2;
        font-weight: 800;
        color: #0051d1;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .source-title {
        margin-top: 18px;
        font-size: 39px;
        line-height: 1.03;
        font-weight: 820;
        letter-spacing: 0;
        color: #0f172a;
      }

      .source-copy {
        margin-top: 16px;
        font-size: 18px;
        line-height: 1.45;
        color: #475569;
      }

      .approval-box {
        margin-top: 28px;
        padding: 18px;
        border-radius: 18px;
        background: #f7fbff;
        border: 1px solid #dce9ff;
      }

      .approval-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid rgba(0, 81, 209, 0.09);
        font-size: 15px;
        color: #334155;
      }

      .approval-row:last-child {
        border-bottom: 0;
      }

      .approval-check {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #0051d1;
        font-size: 14px;
        font-weight: 900;
        background: #ffffff;
        border: 1px solid rgba(0, 81, 209, 0.24);
        box-shadow: 0 4px 16px rgba(0, 81, 209, 0.12);
      }

      .loop-board {
        position: relative;
        min-height: 468px;
      }

      .loop-line {
        position: absolute;
        inset: 62px 54px;
        border: 2px solid rgba(0, 81, 209, 0.16);
        border-radius: 42px;
      }

      .flow-dot {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #0051d1;
        box-shadow: 0 0 0 9px rgba(0, 81, 209, 0.12), 0 14px 34px rgba(0, 81, 209, 0.32);
      }

      .flow-dot.one {
        left: 58px;
        top: 58px;
      }

      .flow-dot.two {
        right: 58px;
        top: 58px;
      }

      .flow-dot.three {
        right: 58px;
        bottom: 58px;
      }

      .flow-dot.four {
        left: 58px;
        bottom: 58px;
      }

      .node {
        position: absolute;
        width: 184px;
        min-height: 104px;
        border-radius: 20px;
        padding: 18px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 81, 209, 0.13);
        box-shadow: 0 22px 56px rgba(0, 44, 118, 0.12);
      }

      .node.approve {
        left: 0;
        top: 4px;
      }

      .node.menu {
        right: 0;
        top: 4px;
      }

      .node.page {
        right: 0;
        bottom: 4px;
      }

      .node.link {
        left: 0;
        bottom: 4px;
      }

      .node-icon {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #0051d1;
        font-weight: 900;
        background: #ffffff;
        border: 1px solid rgba(0, 81, 209, 0.24);
        box-shadow: 0 8px 20px rgba(0, 81, 209, 0.13);
      }

      .node-title {
        margin-top: 12px;
        font-size: 17px;
        line-height: 1.15;
        font-weight: 800;
        color: #0f172a;
      }

      .node-sub {
        margin-top: 5px;
        font-size: 12px;
        line-height: 1.35;
        color: #64748b;
      }

      .phone {
        position: relative;
        min-height: 468px;
        padding: 14px;
        border-radius: 34px;
        background: #0f172a;
        box-shadow: 0 34px 90px rgba(15, 23, 42, 0.24);
      }

      .phone-screen {
        height: 100%;
        border-radius: 24px;
        padding: 22px;
        background: #ffffff;
        overflow: hidden;
      }

      .phone-bar {
        width: 74px;
        height: 5px;
        border-radius: 999px;
        margin: 0 auto 20px;
        background: #cbd5e1;
      }

      .restaurant-name {
        font-size: 24px;
        line-height: 1.1;
        font-weight: 820;
        color: #0f172a;
      }

      .restaurant-meta {
        margin-top: 8px;
        color: #475569;
        font-size: 13px;
      }

      .menu-item {
        margin-top: 16px;
        padding: 14px;
        border-radius: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .menu-item-title {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }

      .menu-item p {
        margin: 7px 0 0;
        font-size: 12px;
        line-height: 1.35;
        color: #475569;
      }

      .surface-row {
        position: absolute;
        left: 26px;
        right: 26px;
        bottom: 26px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .surface {
        border-radius: 14px;
        padding: 11px;
        background: #edf5ff;
        color: #0051d1;
        font-size: 12px;
        font-weight: 800;
        text-align: center;
      }
`;
}

function answerlatticeCss() {
  return `
      .answerlattice-control,
      .answerlattice-authority,
      .answerlattice-widget {
        color: #f8fafc;
        background:
          radial-gradient(circle at 18% 22%, rgba(45, 212, 191, 0.13), transparent 26%),
          radial-gradient(circle at 82% 14%, rgba(125, 92, 255, 0.12), transparent 24%),
          linear-gradient(135deg, #070714 0%, #0d1020 54%, #07131b 100%);
      }

      .answerlattice-control .status-pill,
      .answerlattice-authority .status-pill,
      .answerlattice-widget .status-pill {
        color: #5eead4;
      }

      .al-layout {
        position: relative;
        z-index: 2;
        margin-top: 36px;
        min-height: 500px;
      }

      .al-panel {
        border-radius: 24px;
        background: rgba(9, 12, 28, 0.72);
        border: 1px solid rgba(94, 234, 212, 0.15);
        box-shadow: 0 34px 100px rgba(0, 0, 0, 0.32);
      }

      .al-card-title {
        font-size: 14px;
        line-height: 1.2;
        font-weight: 760;
        color: rgba(255, 255, 255, 0.92);
      }

      .al-card-sub {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.35;
        color: rgba(226, 232, 240, 0.62);
      }

      .al-chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 54px;
        padding: 13px 14px;
        border-radius: 15px;
        color: #e2e8f0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .al-chip span {
        font-size: 12px;
        color: #5eead4;
      }

      .al-core {
        position: absolute;
        left: 50%;
        top: 48%;
        width: 300px;
        min-height: 230px;
        transform: translate(-50%, -50%);
        border-radius: 30px;
        padding: 26px;
        background: rgba(8, 16, 28, 0.94);
        border: 1px solid rgba(94, 234, 212, 0.28);
        box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.06), 0 32px 120px rgba(45, 212, 191, 0.16);
      }

      .al-core h2 {
        margin: 0;
        font-size: 31px;
        line-height: 1.04;
        letter-spacing: 0;
      }

      .al-core p {
        margin: 13px 0 0;
        font-size: 14px;
        line-height: 1.45;
        color: rgba(226, 232, 240, 0.67);
      }

      .al-rule {
        margin-top: 18px;
        padding: 12px;
        border-radius: 15px;
        background: rgba(94, 234, 212, 0.08);
        color: #a7f3d0;
        font-size: 13px;
        line-height: 1.35;
        border: 1px solid rgba(94, 234, 212, 0.12);
      }

      .al-line {
        position: absolute;
        z-index: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.46), transparent);
        transform-origin: left center;
        pointer-events: none;
      }

      .al-dot {
        position: absolute;
        z-index: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #5eead4;
        box-shadow: 0 0 24px rgba(94, 234, 212, 0.72);
        pointer-events: none;
      }

      .al-columns {
        display: grid;
        grid-template-columns: 290px 1fr 290px;
        gap: 38px;
        min-height: 500px;
        align-items: center;
      }

      .chip-stack {
        position: relative;
        z-index: 2;
        display: grid;
        gap: 14px;
      }

      .output-card {
        position: relative;
        z-index: 2;
        padding: 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .authority-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 22px;
      }

      .authority-lane {
        min-height: 430px;
        padding: 20px;
      }

      .lane-heading {
        font-size: 13px;
        font-weight: 800;
        color: #5eead4;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .question-card,
      .review-card,
      .knowledge-card {
        margin-top: 16px;
        padding: 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .review-card {
        background: rgba(94, 234, 212, 0.07);
        border-color: rgba(94, 234, 212, 0.18);
      }

      .knowledge-card {
        background: rgba(45, 212, 191, 0.1);
        border-color: rgba(94, 234, 212, 0.22);
      }

      .browser-mock {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 330px;
        gap: 24px;
        min-height: 500px;
        padding: 22px;
      }

      .browser-window {
        min-height: 456px;
        border-radius: 20px;
        overflow: hidden;
      }

      .browser-top {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 16px;
        background: rgba(255, 255, 255, 0.08);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .traffic {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.28);
      }

      .url-pill {
        margin-left: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.22);
        color: rgba(226, 232, 240, 0.8);
        font-size: 12px;
      }

      .page-body {
        padding: 24px;
      }

      .page-title {
        font-size: 30px;
        line-height: 1.05;
        font-weight: 800;
      }

      .context-grid {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }

      .context-card {
        padding: 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .widget-panel {
        position: relative;
        min-height: 456px;
        padding: 20px;
      }

      .widget-answer {
        margin-top: 18px;
        padding: 18px;
        border-radius: 18px;
        background: rgba(94, 234, 212, 0.09);
        border: 1px solid rgba(94, 234, 212, 0.22);
      }

      .boundary-list {
        margin-top: 18px;
        display: grid;
        gap: 10px;
      }

      .boundary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.06);
        font-size: 13px;
      }

      .boundary-row strong {
        color: #5eead4;
      }
`;
}

function menuListBody() {
  return `
        <div class="grid"></div>
        <div class="brand-row">
          <div class="brand-left">
            <div class="logo-tile"><img src="./assets/brand/menulist-icon.png" alt="" /></div>
            <div>
              <div class="brand-name">MenuList</div>
              <div class="brand-kicker">Official public business source</div>
            </div>
          </div>
          <div class="status-pill"><span class="status-dot"></span> Public source stable</div>
        </div>
        <div class="ml-stage">
          <div class="source-card">
            <div class="card-label">Owner-approved source</div>
            <div class="source-title">Update once. Publish everywhere.</div>
            <div class="source-copy">A restaurant owner keeps menu, QR, page, and link in sync from one approved source.</div>
            <div class="approval-box">
              <div class="approval-row"><span>Menu reviewed</span><span class="approval-check">✓</span></div>
              <div class="approval-row"><span>Business details checked</span><span class="approval-check">✓</span></div>
              <div class="approval-row"><span>Public link ready</span><span class="approval-check">✓</span></div>
            </div>
          </div>
          <div class="loop-board">
            <div class="loop-line"></div>
            <div class="flow-dot one"></div>
            <div class="flow-dot two"></div>
            <div class="flow-dot three"></div>
            <div class="flow-dot four"></div>
            <div class="node approve">
              <div class="node-icon">1</div>
              <div class="node-title">Owner approval</div>
              <div class="node-sub">No public change until the owner confirms.</div>
            </div>
            <div class="node menu">
              <div class="node-icon">2</div>
              <div class="node-title">Public menu</div>
              <div class="node-sub">Customers see current items and prices.</div>
            </div>
            <div class="node page">
              <div class="node-icon">3</div>
              <div class="node-title">Official page</div>
              <div class="node-sub">Hours, address, services, and links align.</div>
            </div>
            <div class="node link">
              <div class="node-icon">4</div>
              <div class="node-title">QR and screen</div>
              <div class="node-sub">Printed and display surfaces point back here.</div>
            </div>
          </div>
          <div class="phone">
            <div class="phone-screen">
              <div class="phone-bar"></div>
              <div class="restaurant-name">The Daily Plate</div>
              <div class="restaurant-meta">Open today · Menu updated</div>
              <div class="menu-item">
                <div class="menu-item-title"><span>Paneer Tikka Bowl</span><span>Rs. 220</span></div>
                <p>Rice, grilled paneer, mint chutney, salad.</p>
              </div>
              <div class="menu-item">
                <div class="menu-item-title"><span>Cold Coffee</span><span>Rs. 120</span></div>
                <p>House blend, chilled milk, cocoa finish.</p>
              </div>
              <div class="surface-row">
                <div class="surface">Menu</div>
                <div class="surface">Page</div>
                <div class="surface">QR</div>
              </div>
            </div>
          </div>
        </div>`;
}

function menuListTimeline() {
  return `
      tl.from(".brand-left", { opacity: 0, y: 16, duration: 0.45, ease: "power2.out" }, 0.12);
      tl.from(".status-pill", { opacity: 0, x: 18, duration: 0.45, ease: "power2.out" }, 0.2);
      tl.from(".source-card", { opacity: 0, y: 24, scale: 0.98, duration: 0.65, ease: "power2.out" }, 0.3);
      tl.from(".phone", { x: 34, scale: 0.98, duration: 0.7, ease: "power2.out" }, 0.52);
      tl.from(".loop-line", { opacity: 0, scale: 0.94, duration: 0.55, ease: "power2.out" }, 0.74);
      tl.from(".node", { y: 18, scale: 0.98, stagger: 0.14, duration: 0.44, ease: "power2.out" }, 1.05);
      tl.from(".approval-check", { scale: 0.4, stagger: 0.16, duration: 0.28, ease: "back.out(2)" }, 1.52);
      tl.from(".flow-dot", { opacity: 0, scale: 0.2, stagger: 0.18, duration: 0.26, ease: "back.out(2)" }, 1.88);
      tl.to(".flow-dot.one", { x: 420, duration: 1.2, ease: "power1.inOut" }, 2.15);
      tl.to(".flow-dot.two", { y: 350, duration: 1.2, ease: "power1.inOut" }, 2.55);
      tl.to(".flow-dot.three", { x: -420, duration: 1.2, ease: "power1.inOut" }, 2.95);
      tl.to(".flow-dot.four", { y: -350, duration: 1.2, ease: "power1.inOut" }, 3.35);
      tl.to(".node-icon", { scale: 1.08, duration: 0.28, yoyo: true, repeat: 1, stagger: 0.13, ease: "power2.inOut" }, 3.88);
      tl.to(".status-dot", { scale: 1.45, duration: 0.35, yoyo: true, repeat: 3, ease: "power2.inOut" }, 4.2);
`;
}

function answerlatticeControlBody() {
  return `
        <div class="grid"></div>
        <div class="brand-row">
          <div class="brand-left">
            <div class="logo-tile answerlattice"><img src="./assets/brand/answerlattice-logo.svg" alt="" /></div>
            <div>
              <div class="brand-name">Answerlattice</div>
              <div class="brand-kicker">Governed answer infrastructure</div>
            </div>
          </div>
          <div class="status-pill"><span class="status-dot"></span> Approved answers before fallback</div>
        </div>
        <div class="al-layout al-columns">
          <div class="chip-stack">
            <div class="al-chip"><strong>Product pages</strong><span>source</span></div>
            <div class="al-chip"><strong>Docs</strong><span>source</span></div>
            <div class="al-chip"><strong>Screenshots</strong><span>source</span></div>
            <div class="al-chip"><strong>Tickets</strong><span>source</span></div>
            <div class="al-chip"><strong>Release notes</strong><span>source</span></div>
          </div>
          <div>
            <div class="al-line" style="left: 310px; top: 250px; width: 238px;"></div>
            <div class="al-line" style="left: 730px; top: 250px; width: 238px;"></div>
            <div class="al-dot" style="left: 344px; top: 246px;"></div>
            <div class="al-dot" style="left: 898px; top: 246px;"></div>
            <div class="al-core">
              <h2>Governed answer layer</h2>
              <p>Canonical answers, review state, and page context stay together before any support surface responds.</p>
              <div class="al-rule">Fallback is held when no approved answer exists.</div>
            </div>
          </div>
          <div class="chip-stack">
            <div class="output-card"><div class="al-card-title">Hosted help</div><div class="al-card-sub">Published answer pages</div></div>
            <div class="output-card"><div class="al-card-title">Widget response</div><div class="al-card-sub">Context-aware, approved</div></div>
            <div class="output-card"><div class="al-card-title">Product page answer</div><div class="al-card-sub">Surface-specific wording</div></div>
            <div class="output-card"><div class="al-card-title">Review queue</div><div class="al-card-sub">Unknowns stay visible</div></div>
          </div>
        </div>`;
}

function answerlatticeControlTimeline() {
  return `
      tl.from(".brand-left", { opacity: 0, y: 16, duration: 0.45, ease: "power2.out" }, 0.1);
      tl.from(".status-pill", { opacity: 0, x: 18, duration: 0.45, ease: "power2.out" }, 0.2);
      tl.from(".al-chip", { opacity: 0, x: -22, stagger: 0.08, duration: 0.38, ease: "power2.out" }, 0.55);
      tl.from(".al-line", { opacity: 0, scaleX: 0, stagger: 0.14, duration: 0.44, ease: "power2.out" }, 1.12);
      tl.from(".al-dot", { opacity: 0, scale: 0.25, stagger: 0.18, duration: 0.3, ease: "back.out(2)" }, 1.38);
      tl.from(".al-core", { opacity: 0, scale: 0.94, duration: 0.66, ease: "power2.out" }, 1.48);
      tl.from(".output-card", { opacity: 0, x: 24, stagger: 0.11, duration: 0.42, ease: "power2.out" }, 2.15);
      tl.to(".al-dot", { x: 210, duration: 1.15, yoyo: true, repeat: 2, ease: "power1.inOut" }, 2.55);
      tl.to(".al-core", { boxShadow: "0 0 0 1px rgba(94, 234, 212, 0.18), 0 36px 130px rgba(45, 212, 191, 0.28)", duration: 0.6, yoyo: true, repeat: 3, ease: "power1.inOut" }, 3.05);
      tl.to(".status-dot", { scale: 1.45, duration: 0.32, yoyo: true, repeat: 3, ease: "power2.inOut" }, 4.35);
`;
}

function answerlatticeAuthorityBody() {
  return `
        <div class="grid"></div>
        <div class="brand-row">
          <div class="brand-left">
            <div class="logo-tile answerlattice"><img src="./assets/brand/answerlattice-logo.svg" alt="" /></div>
            <div>
              <div class="brand-name">Answerlattice</div>
              <div class="brand-kicker">Questions become reviewed support knowledge</div>
            </div>
          </div>
          <div class="status-pill"><span class="status-dot"></span> Review remains visible</div>
        </div>
        <div class="al-layout authority-grid">
          <div class="al-panel authority-lane">
            <div class="lane-heading">Incoming questions</div>
            <div class="question-card"><div class="al-card-title">How do roles work?</div><div class="al-card-sub">Asked from settings page</div></div>
            <div class="question-card"><div class="al-card-title">Can billing be changed?</div><div class="al-card-sub">Needs policy wording</div></div>
            <div class="question-card"><div class="al-card-title">Where is webhook setup?</div><div class="al-card-sub">Needs product surface map</div></div>
          </div>
          <div class="al-panel authority-lane">
            <div class="lane-heading">Review control</div>
            <div class="review-card"><div class="al-card-title">Map to product surface</div><div class="al-card-sub">Settings, billing, developer tools</div></div>
            <div class="review-card"><div class="al-card-title">Approve wording</div><div class="al-card-sub">No unsupported promise</div></div>
            <div class="review-card"><div class="al-card-title">Version answer</div><div class="al-card-sub mono">canonical:v3</div></div>
          </div>
          <div class="al-panel authority-lane">
            <div class="lane-heading">Support knowledge</div>
            <div class="knowledge-card"><div class="al-card-title">Reviewed answer</div><div class="al-card-sub">Safe to publish</div></div>
            <div class="knowledge-card"><div class="al-card-title">Hosted help</div><div class="al-card-sub">Visible support source</div></div>
            <div class="knowledge-card"><div class="al-card-title">Widget can cite</div><div class="al-card-sub">Approved route context</div></div>
          </div>
        </div>`;
}

function answerlatticeAuthorityTimeline() {
  return `
      tl.from(".brand-left", { opacity: 0, y: 16, duration: 0.45, ease: "power2.out" }, 0.1);
      tl.from(".status-pill", { opacity: 0, x: 18, duration: 0.45, ease: "power2.out" }, 0.2);
      tl.from(".authority-lane", { opacity: 0, y: 22, stagger: 0.14, duration: 0.5, ease: "power2.out" }, 0.55);
      tl.from(".question-card", { opacity: 0, x: -22, stagger: 0.1, duration: 0.38, ease: "power2.out" }, 1.08);
      tl.from(".review-card", { opacity: 0, y: 18, stagger: 0.12, duration: 0.4, ease: "power2.out" }, 1.68);
      tl.from(".knowledge-card", { opacity: 0, x: 22, stagger: 0.12, duration: 0.4, ease: "power2.out" }, 2.38);
      tl.to(".question-card", { x: 10, opacity: 0.78, stagger: 0.12, duration: 0.35, yoyo: true, repeat: 1, ease: "power1.inOut" }, 3.0);
      tl.to(".review-card", { scale: 1.025, stagger: 0.12, duration: 0.32, yoyo: true, repeat: 1, ease: "power1.inOut" }, 3.45);
      tl.to(".knowledge-card", { borderColor: "rgba(94, 234, 212, 0.42)", stagger: 0.1, duration: 0.35, ease: "power2.out" }, 4.15);
      tl.to(".status-dot", { scale: 1.45, duration: 0.32, yoyo: true, repeat: 3, ease: "power2.inOut" }, 4.55);
`;
}

function answerlatticeWidgetBody() {
  return `
        <div class="grid"></div>
        <div class="brand-row">
          <div class="brand-left">
            <div class="logo-tile answerlattice"><img src="./assets/brand/answerlattice-logo.svg" alt="" /></div>
            <div>
              <div class="brand-name">Answerlattice</div>
              <div class="brand-kicker">Page-aware support, safe by default</div>
            </div>
          </div>
          <div class="status-pill"><span class="status-dot"></span> Private fields excluded</div>
        </div>
        <div class="al-layout al-panel browser-mock">
          <div class="browser-window al-panel">
            <div class="browser-top">
              <span class="traffic"></span><span class="traffic"></span><span class="traffic"></span>
              <span class="url-pill mono">/product/page-aware-widget</span>
            </div>
            <div class="page-body">
              <div class="page-title">Billing settings support</div>
              <div class="al-card-sub">The page contributes only approved route context.</div>
              <div class="context-grid">
                <div class="context-card"><div class="al-card-title">Current page</div><div class="al-card-sub">Feature: billing settings</div></div>
                <div class="context-card"><div class="al-card-title">Allowed source</div><div class="al-card-sub">Approved help answer</div></div>
                <div class="context-card"><div class="al-card-title">Question intent</div><div class="al-card-sub">Change billing role</div></div>
                <div class="context-card"><div class="al-card-title">Fallback state</div><div class="al-card-sub">Escalate if uncovered</div></div>
              </div>
            </div>
          </div>
          <div class="widget-panel al-panel">
            <div class="lane-heading">Embedded widget</div>
            <div class="widget-answer">
              <div class="al-card-title">Approved answer shown</div>
              <div class="al-card-sub">Use role settings to control who can change billing. This answer comes from reviewed support knowledge.</div>
            </div>
            <div class="boundary-list">
              <div class="boundary-row"><span>Page context</span><strong>Allowed</strong></div>
              <div class="boundary-row"><span>Private tickets</span><strong>Excluded</strong></div>
              <div class="boundary-row"><span>Payment details</span><strong>Excluded</strong></div>
              <div class="boundary-row"><span>Unknown answer</span><strong>Escalate</strong></div>
            </div>
          </div>
        </div>`;
}

function answerlatticeWidgetTimeline() {
  return `
      tl.from(".brand-left", { opacity: 0, y: 16, duration: 0.45, ease: "power2.out" }, 0.1);
      tl.from(".status-pill", { opacity: 0, x: 18, duration: 0.45, ease: "power2.out" }, 0.2);
      tl.from(".browser-mock", { opacity: 0, y: 24, duration: 0.58, ease: "power2.out" }, 0.52);
      tl.from(".context-card", { opacity: 0, y: 18, stagger: 0.1, duration: 0.38, ease: "power2.out" }, 1.08);
      tl.from(".widget-panel", { opacity: 0, x: 28, duration: 0.55, ease: "power2.out" }, 1.44);
      tl.from(".widget-answer", { opacity: 0, scale: 0.96, duration: 0.45, ease: "power2.out" }, 1.92);
      tl.from(".boundary-row", { opacity: 0, x: 18, stagger: 0.1, duration: 0.34, ease: "power2.out" }, 2.34);
      tl.to(".context-card", { borderColor: "rgba(94, 234, 212, 0.32)", stagger: 0.1, duration: 0.32, yoyo: true, repeat: 1, ease: "power1.inOut" }, 3.2);
      tl.to(".widget-answer", { boxShadow: "0 0 0 1px rgba(94, 234, 212, 0.24), 0 28px 90px rgba(45, 212, 191, 0.14)", duration: 0.5, yoyo: true, repeat: 3, ease: "power1.inOut" }, 3.75);
      tl.to(".status-dot", { scale: 1.45, duration: 0.32, yoyo: true, repeat: 3, ease: "power2.inOut" }, 4.55);
`;
}

function renderProject(project) {
  if (project.type === 'menulist') {
    return shell(project, menuListBody(), menuListTimeline());
  }

  if (project.type === 'answerlattice-control') {
    return shell(project, answerlatticeControlBody(), answerlatticeControlTimeline());
  }

  if (project.type === 'answerlattice-authority') {
    return shell(project, answerlatticeAuthorityBody(), answerlatticeAuthorityTimeline());
  }

  return shell(project, answerlatticeWidgetBody(), answerlatticeWidgetTimeline());
}

function syncBrandAssets(project) {
  const brandDir = `__docs__/videos/hyperframes/${project.slug}/assets/brand`;
  if (project.type === 'menulist') {
    copyRepoFile('public/icons/icon-512x512.png', `${brandDir}/menulist-icon.png`);
    return;
  }

  copyRepoFile('public/answerlattice-logo.svg', `${brandDir}/answerlattice-logo.svg`);
  copyRepoFile('public/answerlattice-logo-mark.png', `${brandDir}/answerlattice-logo-mark.png`);
}

function generateSources() {
  for (const project of projects) {
    const root = `__docs__/videos/hyperframes/${project.slug}`;
    writeRepoFile(`${root}/package.json`, packageJson(project.slug));
    writeRepoFile(`${root}/README.md`, readme(project));
    writeRepoFile(`${root}/shot-plan.json`, shotPlan(project));
    writeRepoFile(`${root}/index.html`, renderProject(project));
    syncBrandAssets(project);
  }
}

function approveManifest() {
  const manifestPath = repoPath('packages/asset-factory/manifest/assets.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const project of projects) {
    for (const destination of Object.values(project.publicFiles)) {
      if (!fs.existsSync(repoPath(destination))) {
        throw new Error(`Cannot approve ${project.id}; missing rendered file ${destination}`);
      }
    }

    const entry = manifest.assets[project.id];
    if (!entry) {
      throw new Error(`Manifest entry not found for ${project.id}`);
    }

    entry.status = 'approved';
    entry.version = 2;
    entry.files = { ...project.publicFiles };
    entry.review = {
      decision: 'approved',
      strategicFit: project.review.strategicFit,
      brandFit: project.review.brandFit,
      narrativeClarity: project.review.narrativeClarity,
      performance: 'pass',
      reviewer: 'asset-factory-v1',
      reviewedAt: today,
      notes: project.review.notes,
    };
  }

  manifest.updatedAt = today;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

generateSources();

if (process.argv.includes('--approve-manifest')) {
  approveManifest();
}

console.log(`Generated ${projects.length} AssetOS motion composition source(s).`);
