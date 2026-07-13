import { NextResponse } from 'next/server';
import {
    NEELVARA_PRODUCT_LINEUP,
    NEELVARA_SITE_DESCRIPTION,
    NEELVARA_SITE_TITLE,
} from '@constant/neelvara/website';

export const dynamic = 'force-static';

const productShortcutLinks = NEELVARA_PRODUCT_LINEUP.map((product) => (
    `<a class="product-link" href="${product.url}">${product.name}<span aria-hidden="true">&#8599;</span></a>`
)).join('');

const notFoundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <meta name="theme-color" content="#f7f9fc" />
  <link rel="manifest" href="/neelvara.webmanifest" />
  <link rel="icon" href="/neelvara-favicon.svg" type="image/svg+xml" sizes="any" />
  <link rel="icon" href="/neelvara-favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/neelvara-apple-touch-icon.png" type="image/png" sizes="180x180" />
  <title>Page not found | ${NEELVARA_SITE_TITLE}</title>
  <style>
    @font-face {
      font-family: "Neelvara Akshar";
      font-style: normal;
      font-weight: 300;
      font-display: swap;
      src: url("/fonts/neelvara/akshar-300.ttf") format("truetype");
    }
    @font-face {
      font-family: "Neelvara Akshar";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("/fonts/neelvara/akshar-400.ttf") format("truetype");
    }
    @font-face {
      font-family: "Neelvara Akshar";
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url("/fonts/neelvara/akshar-500.ttf") format("truetype");
    }
    @font-face {
      font-family: "Neelvara Akshar";
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url("/fonts/neelvara/akshar-600.ttf") format("truetype");
    }
    @font-face {
      font-family: "Neelvara Akshar";
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url("/fonts/neelvara/akshar-700.ttf") format("truetype");
    }
    :root {
      color-scheme: light;
      --bg: #f7f9fc;
      --text: #071323;
      --muted: #5d6678;
      --line: rgba(7, 19, 35, 0.12);
      --surface: rgba(255, 255, 255, 0.82);
      --blue: #6f86e2;
      --clear: #9fc6f6;
      --indigo: #8798e7;
      --violet: #b7acef;
      --frost: #a9c2f5;
      --lavender: #d9cbf3;
      --glass: rgba(255, 255, 255, 0.7);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      background: var(--bg);
      color: var(--text);
      font-family: "Neelvara Akshar", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .skip-link {
      position: fixed;
      top: 10px;
      left: 50%;
      z-index: 10;
      min-height: 44px;
      padding: 11px 18px;
      border: 2px solid var(--blue);
      border-radius: 12px;
      background: #fff;
      color: var(--text);
      font-weight: 700;
      text-decoration: none;
      transform: translate(-50%, calc(-100% - 20px));
    }
    .skip-link:focus {
      outline: 3px solid var(--clear);
      outline-offset: 3px;
      transform: translate(-50%, 0);
    }
    body::before,
    body::after {
      position: fixed;
      inset: 0;
      pointer-events: none;
      content: "";
    }
    body::before {
      inset: -10%;
      background:
        radial-gradient(42% 34% at 8% 12%, rgba(159, 198, 246, 0.2), transparent 62%),
        radial-gradient(34% 28% at 86% 16%, rgba(169, 194, 245, 0.24), transparent 64%),
        radial-gradient(38% 30% at 18% 82%, rgba(111, 134, 226, 0.14), transparent 62%),
        radial-gradient(34% 28% at 78% 78%, rgba(183, 172, 239, 0.12), transparent 62%),
        radial-gradient(30% 24% at 54% 44%, rgba(217, 203, 243, 0.28), transparent 70%);
      filter: blur(66px) saturate(112%);
    }
    body::after {
      opacity: 0.08;
      mix-blend-mode: multiply;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>");
    }
    main {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 32px 20px;
    }
    section {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 0.62fr);
      gap: 28px;
      width: min(100%, 1060px);
      padding: clamp(28px, 6vw, 52px);
      border: 1px solid var(--line);
      border-radius: 24px;
      background: var(--glass);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 30px 80px rgba(7, 19, 35, 0.12);
      backdrop-filter: blur(22px);
    }
    .brand-mark {
      display: block;
      width: 92px;
      height: auto;
      margin: 0 0 22px;
    }
    .eyebrow {
      display: inline-flex;
      min-height: 30px;
      align-items: center;
      padding: 0 11px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--blue);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 22px 0 18px;
      font-weight: 700;
      font-size: clamp(2.7rem, 10vw, 5.4rem);
      line-height: 1.12;
      letter-spacing: 0;
    }
    p {
      max-width: 620px;
      margin: 0;
      color: var(--muted);
      font-size: 1.05rem;
      line-height: 1.66;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 30px;
    }
    a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      padding: 0 18px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--text);
      text-decoration: none;
      font-weight: 700;
    }
    a:focus-visible {
      outline: 3px solid var(--clear);
      outline-offset: 3px;
    }
    a:first-child {
      border-color: var(--blue);
      background: linear-gradient(135deg, var(--clear), var(--frost), var(--indigo), var(--lavender));
      color: var(--text);
    }
    .product-shortcuts {
      grid-column: 1 / -1;
      margin-top: 34px;
      padding-top: 24px;
      border-top: 1px solid var(--line);
    }
    .product-shortcuts h2 {
      margin: 0 0 12px;
      font-size: 1.3rem;
    }
    .product-link {
      min-height: 44px;
      border-radius: 999px;
      font-size: 0.92rem;
    }
    .product-link:first-child {
      border-color: var(--line);
      background: transparent;
      color: var(--text);
    }
    .product-link span {
      margin-left: 8px;
      color: var(--blue);
    }
    .prism-panel {
      position: relative;
      min-height: 360px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.5);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    }
    .prism-visual {
      position: relative;
      min-height: 190px;
      margin: 20px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 18px;
      background:
        radial-gradient(72% 70% at 18% 20%, rgba(159, 198, 246, 0.16), transparent 68%),
        radial-gradient(64% 62% at 80% 78%, rgba(217, 203, 243, 0.28), transparent 68%),
        rgba(255, 255, 255, 0.46);
    }
    .prism-visual span {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 70%;
      height: 34%;
      border: 1px solid rgba(111, 134, 226, 0.48);
      border-radius: 26px;
      background: linear-gradient(112deg, rgba(169, 194, 245, 0.4), rgba(156, 168, 236, 0.34), rgba(217, 203, 243, 0.38));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.66);
      transform: translate(-50%, -50%) rotate(-17deg);
    }
    .prism-visual span:nth-child(2) { width: 62%; transform: translate(-43%, -33%) rotate(8deg); }
    .prism-visual span:nth-child(3) { width: 42%; height: 30%; transform: translate(-62%, -10%) rotate(31deg); }
    .route-list {
      display: grid;
      gap: 10px;
      padding: 0 20px 20px;
    }
    .route-list div {
      min-height: 40px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.5);
    }
    @media (max-width: 760px) {
      section {
        grid-template-columns: 1fr;
      }
      .prism-panel {
        min-height: 0;
      }
      .prism-visual {
        min-height: 118px;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <main id="main-content" tabindex="-1">
    <section class="glass">
      <div>
        <img class="brand-mark" src="/neelvara-logo.svg" alt="" aria-hidden="true" />
        <span class="eyebrow">Page not found</span>
        <h1>Page not found</h1>
        <p>The page you requested is not available on the Neelvara Systems company reference website. ${NEELVARA_SITE_DESCRIPTION}</p>
        <nav aria-label="Not found navigation">
          <a id="nv-home-link" href="/">Home</a>
          <a id="nv-products-link" href="/products">Products</a>
          <a id="nv-contact-link" href="/contact">Contact</a>
        </nav>
      </div>
      <aside class="prism-panel glass" aria-label="Recovery routes">
        <div class="prism-visual" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="route-list">
          <div>Home</div>
          <div>Products</div>
          <div>Contact</div>
        </div>
      </aside>
      <div class="product-shortcuts">
        <h2>Product sites</h2>
        <p>Product support, onboarding, billing, documentation, and account questions start from the relevant product site.</p>
        <nav aria-label="Product shortcuts">
          ${productShortcutLinks}
        </nav>
      </div>
    </section>
  </main>
  <script>
    (function () {
      var pathname = window.location.pathname;
      var prefix = (pathname === '/nv' || pathname.indexOf('/nv/') === 0)
        ? '/nv'
        : pathname.indexOf('/__neelvara') === 0
          ? '/__neelvara'
          : '';
      document.getElementById('nv-home-link').setAttribute('href', prefix || '/');
      document.getElementById('nv-products-link').setAttribute('href', (prefix || '') + '/products');
      document.getElementById('nv-contact-link').setAttribute('href', (prefix || '') + '/contact');
    })();
  </script>
</body>
</html>`;

export function GET() {
    return new NextResponse(notFoundHtml, {
        status: 404,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}

export function HEAD() {
    return new NextResponse(null, {
        status: 404,
        headers: {
            'Cache-Control': 'public, max-age=300',
        },
    });
}
