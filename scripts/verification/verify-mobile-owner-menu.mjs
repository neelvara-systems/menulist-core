#!/usr/bin/env node

/**
 * Mobile owner Menu-tab verifier.
 *
 * Uses Chrome DevTools Protocol directly so the app boots with true handheld
 * signals: mobile UA, touch support, device metrics, auth cookie, and selected
 * mobile project localStorage.
 */

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';
import WebSocket from 'ws';

const envFile = process.env.MOBILE_QA_ENV_FILE || '.env';
dotenv.config({ path: envFile });

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.MOBILE_QA_BASE_URL || 'http://localhost:3000';
const configuredProjectId = process.env.MOBILE_QA_PROJECT_ID || '';
const projectId = configuredProjectId || 'auto-selected-project';
const expectedProjectName = process.env.MOBILE_QA_PROJECT_NAME || '';
const storeId = process.env.MOBILE_QA_STORE_ID || '15';
const email = process.env.MOBILE_QA_EMAIL || 'danny.tools.4884@gmail.com';
const outputDir = process.env.MOBILE_QA_OUTPUT_DIR || '/tmp';
const debugPort = readPositiveIntegerEnv('MOBILE_QA_DEBUG_PORT', 9333);
const cdpTimeoutMs = readPositiveIntegerEnv('MOBILE_QA_CDP_TIMEOUT_MS', 45000);
const requireExplicitFixture = process.env.MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE === '1';
const screenshotPath = path.join(outputDir, `mobile-owner-menu-${projectId}.png`);
const bulkSheetScreenshotPath = path.join(outputDir, `mobile-owner-menu-bulk-${projectId}.png`);
const visibilitySheetScreenshotPath = path.join(outputDir, `mobile-owner-menu-visibility-${projectId}.png`);
const textCaseSheetScreenshotPath = path.join(outputDir, `mobile-owner-menu-text-case-${projectId}.png`);

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required in .env for authenticated mobile QA.');
}

if (requireExplicitFixture) {
  const missing = [
    'MOBILE_QA_EMAIL',
    'MOBILE_QA_STORE_ID',
    'MOBILE_QA_PROJECT_ID',
    'MOBILE_QA_PROJECT_NAME',
  ].filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE=1 requires ${missing.join(', ')}.`);
  }
}

const iPhoneUserAgent = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  'AppleWebKit/605.1.15 (KHTML, like Gecko)',
  'Version/17.0 Mobile/15E148 Safari/604.1',
].join(' ');

function fetchJson(url, options) {
  return fetch(url, options).then(async (res) => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while fetching ${url}: ${await res.text()}`);
    }
    return res.json();
  });
}

async function waitForChromeEndpoint() {
  const endpoint = `http://127.0.0.1:${debugPort}/json/version`;
  const started = Date.now();
  let lastError;
  while (Date.now() - started < cdpTimeoutMs) {
    try {
      return await fetchJson(endpoint);
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError || new Error('Chrome DevTools endpoint did not become ready.');
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    const callbacks = listeners.get(message.method);
    if (callbacks) callbacks.forEach((callback) => callback(message.params, message.sessionId));
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  function send(method, params = {}, sessionId) {
    const nextId = ++id;
    const payload = { id: nextId, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.has(nextId)) {
          pending.delete(nextId);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, cdpTimeoutMs);
      pending.set(nextId, { resolve, reject, timer });
    });
  }

  function on(method, callback) {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(callback);
  }

  return { ready, send, on, close: () => ws.close() };
}

async function waitForExpression(client, sessionId, expression, timeoutMs = cdpTimeoutMs) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    lastValue = result.result?.value;
    if (lastValue) return lastValue;
    await delay(500);
  }
  throw new Error(`Timed out waiting for expression: ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function captureScreenshot(client, sessionId, filePath) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
  await writeFile(filePath, Buffer.from(screenshot.data, 'base64'));
}

async function getMobileShellDebugState(client, sessionId) {
  return evaluate(client, sessionId, `(() => {
    const text = document.body?.innerText || '';
    return {
      url: location.href,
      hash: location.hash,
      readyState: document.readyState,
      width: innerWidth,
      height: innerHeight,
      hasMobileShellScroll: Boolean(document.querySelector('[data-mobile-shell-scroll="true"]')),
      hasMobileNavLabels: text.includes('Menu') && text.includes('Share') && text.includes('More'),
      hasSignIn: /sign in/i.test(text),
      hasErrorText: /application error|internal server error|something went wrong|this page could not be found/i.test(text),
      selectedProjectId: localStorage.getItem('mobileSelectedProjectId:${storeId}') || localStorage.getItem('mobileSelectedProjectId') || '',
      text: text.replace(/\\s+/g, ' ').trim().slice(0, 2200),
    };
  })()`);
}

async function waitForMobileShellOrAccessBlocker(client, sessionId) {
  return waitForExpression(client, sessionId, `(() => {
    const text = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
    const hasMobileNavLabels = text.includes('Menu') && text.includes('Share') && text.includes('More');
    if (hasMobileNavLabels) {
      return { status: 'ready' };
    }
    const hasSubscriptionGate = /Subscribe to Get Started/i.test(text) || /View Plans/i.test(text);
    if (hasSubscriptionGate) {
      return {
        status: 'fixture_blocked',
        reason: 'subscription_or_starter_required',
        text: text.slice(0, 900),
      };
    }
    const hasSignIn = /sign in/i.test(text);
    if (hasSignIn) {
      return {
        status: 'auth_blocked',
        reason: 'sign_in_required',
        text: text.slice(0, 900),
      };
    }
    const hasRuntimeError = /application error|internal server error|something went wrong|this page could not be found/i.test(text);
    if (hasRuntimeError) {
      return {
        status: 'runtime_blocked',
        reason: 'runtime_or_not_found',
        text: text.slice(0, 900),
      };
    }
    return null;
  })()`);
}

async function clickByText(client, sessionId, text, exact = false) {
  return evaluate(client, sessionId, `
    (() => {
      const wanted = ${JSON.stringify(text)};
      const exact = ${JSON.stringify(exact)};
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, .ant-float-btn, .ant-btn, .ant-list-item, div'));
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const match = candidates.find((el) => {
        if (!visible(el)) return false;
        const label = (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim();
        return exact ? label === wanted : label.includes(wanted);
      });
      if (!match) return false;
      match.click();
      return true;
    })()
  `);
}

function isIgnorablePageError(message) {
  return /Failed to load resource: net::ERR_CONNECTION_RESET/i.test(message)
    || /webpack-hmr/i.test(message);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'menulist-mobile-qa-'));
  let client = null;
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  chrome.stderr.on('data', (chunk) => {
    const text = String(chunk);
    if (process.env.MOBILE_QA_VERBOSE === '1') process.stderr.write(text);
  });

  try {
    const version = await waitForChromeEndpoint();
    client = createCdpClient(version.webSocketDebuggerUrl);
    await client.ready;

    const pageErrors = [];
    client.on('Runtime.exceptionThrown', (params) => {
      pageErrors.push(params?.exceptionDetails?.exception?.description || params?.exceptionDetails?.text || 'Runtime exception');
    });
    client.on('Log.entryAdded', (params) => {
      if (params?.entry?.level === 'error') pageErrors.push(params.entry.text);
    });

    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;

    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Log.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
      screenWidth: 393,
      screenHeight: 852,
      positionX: 0,
      positionY: 0,
    }, sessionId);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
    await client.send('Network.setUserAgentOverride', {
      userAgent: iPhoneUserAgent,
      platform: 'iPhone',
    }, sessionId);

    const authToken = await encode({
      token: {
        email,
        name: 'Mobile QA',
        sub: 'mobile-qa',
      },
      secret: process.env.NEXTAUTH_SECRET,
    });

    await client.send('Network.setCookie', {
      name: 'next-auth.session-token',
      value: authToken,
      url: baseUrl,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }, sessionId);

    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true });
        const originalMatchMedia = window.matchMedia.bind(window);
        window.matchMedia = (query) => {
          if (query === '(display-mode: standalone)') {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false,
            };
          }
          return originalMatchMedia(query);
        };
        const configuredProjectId = ${JSON.stringify(configuredProjectId)};
        if (configuredProjectId) {
          localStorage.setItem('mobileSelectedProjectId:${storeId}', configuredProjectId);
          localStorage.setItem('mobileSelectedProjectId', configuredProjectId);
        }
      `,
    }, sessionId);

    await client.send('Page.navigate', { url: `${baseUrl}/projects#mobile/menu` }, sessionId);
    try {
      const initialState = await waitForMobileShellOrAccessBlocker(client, sessionId);
      if (initialState?.status !== 'ready') {
        const initialShellFailureScreenshot = path.join(outputDir, `mobile-owner-menu-initial-shell-failed-${projectId}.png`);
        await captureScreenshot(client, sessionId, initialShellFailureScreenshot);
        const debugState = await getMobileShellDebugState(client, sessionId);
        throw new Error(`Mobile owner Menu QA cannot continue: ${initialState?.status || 'unknown_initial_state'}. ${JSON.stringify({
          blocker: initialState,
          debugState,
          screenshot: initialShellFailureScreenshot,
        })}`);
      }
    } catch (error) {
      if (error.message.includes('Mobile owner Menu QA cannot continue:')) {
        throw error;
      }
      const initialShellFailureScreenshot = path.join(outputDir, `mobile-owner-menu-initial-shell-timeout-${projectId}.png`);
      await captureScreenshot(client, sessionId, initialShellFailureScreenshot);
      const debugState = await getMobileShellDebugState(client, sessionId);
      throw new Error(`${error.message}. Initial mobile shell debug: ${JSON.stringify({
        ...debugState,
        screenshot: initialShellFailureScreenshot,
      })}`);
    }
    await delay(8000);

    const mainState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      const itemCountMatch = text.match(/(\\d+)\\s+items\\b/i);
      const categoryCountMatch = text.match(/(\\d+)\\s+categor(?:y|ies)\\b/i);
      const missingImagesMatch = text.match(/(\\d+)\\s+(?:items\\s+)?missing images\\b/i);
      const selectedProjectKey = 'mobileSelectedProjectId:${storeId}';
      const selectedProject = localStorage.getItem(selectedProjectKey) || localStorage.getItem('mobileSelectedProjectId');
      const expectedName = ${JSON.stringify(expectedProjectName)};
      return {
        url: location.href,
        hash: location.hash,
        width: innerWidth,
        height: innerHeight,
        screenWidth: screen.width,
        screenHeight: screen.height,
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        hasMobileNav: text.includes('Today') && text.includes('Menu') && text.includes('Share') && text.includes('More'),
        hasDesktopSidebar: text.includes('Dashboard') && text.includes('Users') && text.includes('Use MenuList'),
        hasSelectedProjectId: ${JSON.stringify(Boolean(configuredProjectId))}
          ? selectedProject === ${JSON.stringify(configuredProjectId)}
          : Boolean(selectedProject),
        hasExpectedProjectName: expectedName ? text.includes(expectedName) : true,
        selectedProject,
        itemCount: itemCountMatch ? Number(itemCountMatch[1]) : null,
        categoryCount: categoryCountMatch ? Number(categoryCountMatch[1]) : null,
        missingImageCount: missingImagesMatch ? Number(missingImagesMatch[1]) : null,
        hasMissingImagesSignal: Boolean(missingImagesMatch),
        hasNoCategoryIconWarning: !text.includes('missing icons') && !text.includes('missing icon'),
        text: text.slice(0, 2200),
      };
    })()`);

    await captureScreenshot(client, sessionId, screenshotPath);

    const clickedFloatingActions = await evaluate(client, sessionId, `
      (() => {
        const button = document.querySelector('.ant-float-btn') || document.querySelector('[aria-label*="actions" i]');
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    const clickedMoreActions = clickedFloatingActions
      || await clickByText(client, sessionId, 'More Actions')
      || await clickByText(client, sessionId, 'Manage')
      || await clickByText(client, sessionId, 'Bulk actions');
    await delay(1500);
    const bulkState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      const navBars = Array.from(document.querySelectorAll('.ant-drawer, .ant-drawer-content, .ant-drawer-body')).map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height, text: el.textContent?.slice(0, 160) };
      });
      return {
        clickedMoreActions: ${JSON.stringify(clickedMoreActions)},
        hasBulkActions: text.includes('Bulk actions') || text.includes('Manage & Control Your Menu'),
        hasRepairMenu: text.includes('Repair Menu'),
        hasBottomGapRisk: navBars.some((entry) => entry.height > 1 && Math.round(entry.bottom) < Math.round(innerHeight) - 4),
        drawerRects: navBars,
        text: text.slice(0, 2200),
      };
    })()`);

    await captureScreenshot(client, sessionId, bulkSheetScreenshotPath);

    const clickedVisibility = await clickByText(client, sessionId, 'Visibility', true);
    await delay(1500);
    const visibilityState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      const drawers = Array.from(document.querySelectorAll('.ant-drawer-content')).map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height, text: el.textContent?.slice(0, 180) };
      });
      return {
        clickedVisibility: ${JSON.stringify(clickedVisibility)},
        hasVisibilitySheet: text.includes('Visibility') && text.includes('Select visible results'),
        hasBottomGapRisk: drawers.some((entry) => entry.height > 1 && Math.round(entry.bottom) < Math.round(innerHeight) - 4),
        drawerRects: drawers,
        text: text.slice(0, 2200),
      };
    })()`);
    await captureScreenshot(client, sessionId, visibilitySheetScreenshotPath);

    await client.send('Page.navigate', { url: `${baseUrl}/projects#mobile/menu` }, sessionId);
    await waitForExpression(client, sessionId, `
      document.body && /(\\d+)\\s+(?:items\\s+)?missing images\\b/i.test(document.body.innerText)
    `);
    await delay(1500);
    await evaluate(client, sessionId, `
      (() => {
        const button = document.querySelector('.ant-float-btn');
        if (button) button.click();
      })()
    `);
    await delay(1000);
    const clickedTextCase = await clickByText(client, sessionId, 'Fix Text Case', true);
    await delay(1500);
    const textCaseState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      const drawers = Array.from(document.querySelectorAll('.ant-drawer-content')).map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height, text: el.textContent?.slice(0, 180) };
      });
      return {
        clickedTextCase: ${JSON.stringify(clickedTextCase)},
        hasTextCaseSheet: text.includes('Fix Text Case') && text.includes('Apply changes'),
        hasBottomGapRisk: drawers.some((entry) => entry.height > 1 && Math.round(entry.bottom) < Math.round(innerHeight) - 4),
        drawerRects: drawers,
        text: text.slice(0, 2200),
      };
    })()`);
    await captureScreenshot(client, sessionId, textCaseSheetScreenshotPath);

    const failures = [];
    const materialPageErrors = pageErrors.filter((message) => !isIgnorablePageError(message));
    if (!mainState.hasMobileNav) failures.push('Mobile bottom navigation did not render.');
    if (mainState.hasDesktopSidebar) failures.push('Desktop sidebar content rendered in mobile harness.');
    if (!mainState.hasSelectedProjectId) {
      failures.push(configuredProjectId
        ? `Expected QA project id ${configuredProjectId} was not selected on mobile.`
        : 'Expected a mobile project to be selected.');
    }
    if (!mainState.hasExpectedProjectName) failures.push(`Expected QA project name "${expectedProjectName}" was not visible.`);
    if (!(mainState.itemCount > 0)) failures.push('Expected a positive item count to be visible.');
    if (!(mainState.categoryCount > 0)) failures.push('Expected a positive category count to be visible.');
    if (!mainState.hasMissingImagesSignal) failures.push('Expected a missing images signal to be visible.');
    if (!mainState.hasNoCategoryIconWarning) failures.push('Category-icon warning was visible even though extracted categories have icons.');
    if (bulkState.clickedMoreActions && bulkState.hasBottomGapRisk) failures.push('Bulk sheet left a visible bottom gap.');
    if (!visibilityState.clickedVisibility || !visibilityState.hasVisibilitySheet) failures.push('Visibility bulk sheet did not open.');
    if (visibilityState.hasBottomGapRisk) failures.push('Visibility sheet left a visible bottom gap.');
    if (!textCaseState.clickedTextCase || !textCaseState.hasTextCaseSheet) failures.push('Fix Text Case sheet did not open.');
    if (textCaseState.hasBottomGapRisk) failures.push('Fix Text Case sheet left a visible bottom gap.');
    if (materialPageErrors.length) failures.push(`Page errors: ${materialPageErrors.join(' | ')}`);

    const result = {
      ok: failures.length === 0,
      failures,
      mainState,
      bulkState,
      visibilityState,
      textCaseState,
      screenshots: {
        menu: screenshotPath,
        bulk: bulkSheetScreenshotPath,
        visibility: visibilitySheetScreenshotPath,
        textCase: textCaseSheetScreenshotPath,
      },
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1500);
      chrome.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        break;
      } catch (error) {
        if (attempt === 2 && process.env.MOBILE_QA_VERBOSE === '1') console.warn(error);
        await delay(250);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
