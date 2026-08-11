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
      --on-accent: #ffffff;
      --muted: #5d6678;
      --line: rgba(7, 19, 35, 0.12);
      --surface: rgba(255, 255, 255, 0.82);
      --blue: #1457d9;
      --clear: #2384ff;
      --indigo: #2737c8;
      --violet: #6542e8;
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
        radial-gradient(42% 34% at 8% 12%, rgba(35, 132, 255, 0.2), transparent 62%),
        radial-gradient(34% 28% at 86% 16%, rgba(35, 132, 255, 0.16), transparent 64%),
        radial-gradient(38% 30% at 18% 82%, rgba(20, 87, 217, 0.14), transparent 62%),
        radial-gradient(34% 28% at 78% 78%, rgba(101, 66, 232, 0.12), transparent 62%),
        radial-gradient(30% 24% at 54% 44%, rgba(39, 55, 200, 0.12), transparent 70%);
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
      width: min(100%, 920px);
      padding: 52px;
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
      font-size: 5.4rem;
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
      background: linear-gradient(135deg, var(--blue), var(--indigo), var(--violet));
      color: var(--on-accent);
    }
    .product-shortcuts {
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
    @media (max-width: 760px) {
      section {
        padding: 32px 24px;
      }
      h1 {
        font-size: 3.2rem;
      }
    }
    @media (max-width: 420px) {
      h1 {
        font-size: 2.5rem;
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
