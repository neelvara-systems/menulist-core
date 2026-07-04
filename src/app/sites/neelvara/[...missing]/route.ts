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
    :root {
      color-scheme: light;
      --bg: #f7f9fc;
      --text: #071323;
      --muted: #5d6678;
      --line: rgba(7, 19, 35, 0.12);
      --surface: rgba(255, 255, 255, 0.82);
      --blue: #1457d9;
      --clear: #2384ff;
      --indigo: #2737c8;
      --violet: #6542e8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(70% 70% at 12% 10%, rgba(35, 132, 255, 0.16), transparent 65%),
        radial-gradient(55% 65% at 86% 24%, rgba(39, 55, 200, 0.12), transparent 70%),
        radial-gradient(42% 52% at 86% 82%, rgba(101, 66, 232, 0.08), transparent 70%),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 32px 20px;
    }
    section {
      width: min(100%, 760px);
      padding: clamp(28px, 6vw, 52px);
      border: 1px solid var(--line);
      border-radius: 24px;
      background: var(--surface);
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
      font-weight: 760;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 22px 0 18px;
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
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
      font-weight: 760;
    }
    a:first-child {
      border-color: var(--blue);
      background: linear-gradient(135deg, var(--blue), var(--indigo), var(--violet));
      color: #fff;
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
      min-height: 42px;
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
  </style>
</head>
<body>
  <main>
    <section>
      <img class="brand-mark" src="/neelvara-logo.svg" alt="" aria-hidden="true" />
      <span class="eyebrow">Page not found</span>
      <h1>Page not found</h1>
      <p>The page you requested is not available on the Neelvara Systems company reference website. ${NEELVARA_SITE_DESCRIPTION}</p>
      <nav aria-label="Not found navigation">
        <a id="nv-home-link" href="/">Home</a>
        <a id="nv-products-link" href="/products">Products</a>
        <a id="nv-contact-link" href="/contact">Contact</a>
      </nav>
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
