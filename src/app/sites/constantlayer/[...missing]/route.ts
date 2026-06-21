import { NextResponse } from 'next/server';
import {
    CONSTANTLAYER_SITE_DESCRIPTION,
    CONSTANTLAYER_SITE_TITLE,
} from '@constant/constantlayer/website';

export const dynamic = 'force-static';

const notFoundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Page not found | ${CONSTANTLAYER_SITE_TITLE}</title>
  <style>
    :root {
      color-scheme: light;
      --text: #101828;
      --muted: #516078;
      --line: #d9e2ef;
      --blue: #0a5bd7;
      --bg: #ffffff;
      --subtle: #f7f9fc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px 20px;
    }
    section {
      width: min(100%, 760px);
      padding: clamp(32px, 8vw, 72px) 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
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
      background: var(--blue);
      color: #fff;
    }
  </style>
</head>
<body>
  <main>
    <section>
      <span class="eyebrow">ConstantLayer Systems</span>
      <h1>Page not found</h1>
      <p>The page is unavailable. ${CONSTANTLAYER_SITE_DESCRIPTION}</p>
      <nav aria-label="Not found navigation">
        <a id="cl-home-link" href="/">Home</a>
        <a id="cl-products-link" href="/products">Products</a>
      </nav>
    </section>
  </main>
  <script>
    (function () {
      var prefix = window.location.pathname.indexOf('/__constantlayer') === 0 ? '/__constantlayer' : '';
      document.getElementById('cl-home-link').setAttribute('href', prefix || '/');
      document.getElementById('cl-products-link').setAttribute('href', (prefix || '') + '/products');
    })();
  </script>
</body>
</html>`;

export function GET() {
    return new NextResponse(notFoundHtml, {
        status: 404,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
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
