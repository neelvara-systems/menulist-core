#!/usr/bin/env node

/**
 * Mobile upload + extraction verifier.
 *
 * Creates a new menu through the mobile project selector, uploads a supplied
 * image/PDF through the mobile upload sheet, then waits for the processing job
 * and the mobile UI to leave the queued/processing state.
 */

import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { encode } from 'next-auth/jwt';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const envFile = process.env.MOBILE_QA_ENV_FILE || '.env';
dotenv.config({ path: envFile, override: true });

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.MOBILE_QA_BASE_URL || 'http://localhost:3000';
const storeId = process.env.MOBILE_QA_STORE_ID || '15';
const email = process.env.MOBILE_QA_EMAIL || 'danny.tools.4884@gmail.com';
const outputDir = process.env.MOBILE_QA_OUTPUT_DIR || '/tmp';
const debugPort = Number(process.env.MOBILE_QA_DEBUG_PORT || 9344);
const defaultUploadFilePath = path.resolve(
  'menulist-answerlattice-upload-inputs/asset-inputs/private-reference-captures/public-menu-mobile.png',
);
const uploadFilePath = process.env.MOBILE_QA_UPLOAD_FILE || defaultUploadFilePath;
const projectName = process.env.MOBILE_QA_PROJECT_NAME || `Mobile Upload QA ${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)}`;
const waitForCompletionMs = Number(process.env.MOBILE_QA_WAIT_MS || 240000);
const tenantId = process.env.MOBILE_QA_TENANT_ID || '14';
const userId = process.env.MOBILE_QA_UID || 'bGtB7K2rFUI6abPrZhZ8';
const shouldUseAdminCreatedProject = process.env.MOBILE_QA_ADMIN_CREATE_PROJECT === '1';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(`${envFile} must provide NEXTAUTH_SECRET for authenticated mobile QA.`);
}
if (!existsSync(uploadFilePath)) {
  throw new Error(`Upload file does not exist: ${uploadFilePath}`);
}

const screenshots = {
  created: path.join(outputDir, `mobile-upload-created-${projectName.replace(/[^a-z0-9]+/gi, '-')}.png`),
  uploadSheet: path.join(outputDir, `mobile-upload-sheet-${projectName.replace(/[^a-z0-9]+/gi, '-')}.png`),
  processing: path.join(outputDir, `mobile-upload-processing-${projectName.replace(/[^a-z0-9]+/gi, '-')}.png`),
  final: path.join(outputDir, `mobile-upload-final-${projectName.replace(/[^a-z0-9]+/gi, '-')}.png`),
};

const iPhoneUserAgent = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  'AppleWebKit/605.1.15 (KHTML, like Gecko)',
  'Version/17.0 Mobile/15E148 Safari/604.1',
].join(' ');

function getFirebaseAdmin() {
  if (getApps().length) return getFirestore();

  const privateKey = (process.env.MENULIST_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  const clientEmail = process.env.MENULIST_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID
    || process.env.MENULIST_FIREBASE_PROJECT_ID
    || process.env.FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(`${envFile} must provide NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID, MENULIST_FIREBASE_CLIENT_EMAIL, and MENULIST_FIREBASE_PRIVATE_KEY.`);
  }

  initializeApp({
    credential: cert({ clientEmail, privateKey, projectId }),
    projectId,
  });
  return getFirestore();
}

function fetchJson(url, options) {
  return fetch(url, options).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}: ${await res.text()}`);
    return res.json();
  });
}

async function waitForChromeEndpoint() {
  const endpoint = `http://127.0.0.1:${debugPort}/json/version`;
  const started = Date.now();
  let lastError;
  while (Date.now() - started < 15000) {
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
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
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
      pending.set(nextId, { resolve, reject });
      setTimeout(() => {
        if (pending.has(nextId)) {
          pending.delete(nextId);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, Number(process.env.MOBILE_QA_CDP_TIMEOUT_MS || 30000));
    });
  }

  function on(method, callback) {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(callback);
  }

  return { ready, send, on, close: () => ws.close() };
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function waitForExpression(client, sessionId, expression, timeoutMs = 45000) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    lastValue = await evaluate(client, sessionId, expression);
    if (lastValue) return lastValue;
    await delay(500);
  }
  throw new Error(`Timed out waiting for expression: ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

async function captureScreenshot(client, sessionId, filePath) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
  await writeFile(filePath, Buffer.from(screenshot.data, 'base64'));
}

async function clickByText(client, sessionId, text, exact = false) {
  return evaluate(client, sessionId, `
    (() => {
      const wanted = ${JSON.stringify(text)};
      const exact = ${JSON.stringify(exact)};
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, .adm-list-item, .ant-card, .ant-list-item, div'));
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!(rect.width > 0 && rect.height > 0 &&
          rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
          return false;
        }
        const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
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

async function clickButtonByText(client, sessionId, text) {
  return evaluate(client, sessionId, `
    (() => {
      const wanted = ${JSON.stringify(text)};
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!(rect.width > 0 && rect.height > 0 &&
          rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
          return false;
        }
        const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
      };
      const matches = Array.from(document.querySelectorAll('button'))
        .filter((el) => visible(el) && !el.disabled && (el.textContent || '').replace(/\\s+/g, ' ').trim() === wanted);
      const match = matches[matches.length - 1];
      if (!match) return false;
      match.click();
      return true;
    })()
  `);
}

async function clickMobileProjectSelector(client, sessionId) {
  const selectMenuVisibleExpression = `
    Array.from(document.querySelectorAll('div, h1, h2, h3, h4, span'))
      .some((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!(rect.width > 0 && rect.height > 0 &&
          rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
          return false;
        }
        const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el))) &&
          (el.textContent || '').replace(/\\s+/g, ' ').trim().includes('Select a Menu');
      })
  `;
  const clicked = await evaluate(client, sessionId, `
    (() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!(rect.width > 0 && rect.height > 0 &&
          rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
          return false;
        }
        const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
      };
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], .ant-card, div'))
        .map((el) => ({ el, rect: el.getBoundingClientRect(), text: (el.textContent || '').replace(/\\s+/g, ' ').trim() }))
        .filter(({ el, rect, text }) => visible(el) && rect.top >= 0 && rect.top < 190 && rect.height >= 42 && rect.width > innerWidth * 0.5 && text.length > 0);
      const match = candidates.find(({ text }) => text.includes('Default') || text.includes('Menu')) || candidates[0];
      if (!match) return false;
      match.el.click();
      return true;
    })()
  `);
  if (clicked) {
    await delay(600);
    const opened = await evaluate(client, sessionId, selectMenuVisibleExpression);
    if (opened) return true;
  }

  // The selector card can be icon-heavy with weak accessible text in mobile
  // screenshots. Fall back to tapping the visual center of the top project card.
  const x = 360;
  const y = 56;
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, x, y, clickCount: 1 }, sessionId);
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, x, y, clickCount: 1 }, sessionId);
  await delay(600);
  return evaluate(client, sessionId, selectMenuVisibleExpression);
}

async function setFirstFileInput(client, sessionId, filePath) {
  const document = await client.send('DOM.getDocument', { depth: -1, pierce: true }, sessionId);
  const inputs = await client.send('DOM.querySelectorAll', {
    nodeId: document.root.nodeId,
    selector: 'input[type="file"]',
  }, sessionId);
  let selectedNodeId = 0;
  for (const nodeId of inputs.nodeIds || []) {
    const attributesResult = await client.send('DOM.getAttributes', { nodeId }, sessionId);
    const attributes = {};
    for (let i = 0; i < (attributesResult.attributes || []).length; i += 2) {
      attributes[attributesResult.attributes[i]] = attributesResult.attributes[i + 1] || '';
    }
    const accept = String(attributes.accept || '').toLowerCase();
    const name = String(attributes.name || '').toLowerCase();
    if (accept.includes('pdf') || name === 'file' || Object.prototype.hasOwnProperty.call(attributes, 'multiple')) {
      selectedNodeId = nodeId;
      break;
    }
    if (!selectedNodeId) selectedNodeId = nodeId;
  }
  if (!selectedNodeId) throw new Error('No file input found in mobile upload sheet.');
  await client.send('DOM.setFileInputFiles', {
    files: [filePath],
    nodeId: selectedNodeId,
  }, sessionId);
  await evaluate(client, sessionId, `
    (() => {
      const input = Array.from(document.querySelectorAll('input[type="file"]'))
        .find((candidate) => candidate.files && candidate.files.length > 0)
        || Array.from(document.querySelectorAll('input[type="file"]'))
          .find((candidate) => ((candidate.getAttribute('accept') || '').toLowerCase().includes('pdf') || candidate.name === 'file'));
      if (!input) return false;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
}

async function getLatestJobForProject(db, projectId, createdAfterMs) {
  const snapshot = await db.collection('menuImageProcessingJobs')
    .where('projectId', '==', projectId)
    .get();
  const jobs = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((job) => {
      const createdAt = typeof job.createdAt?.toMillis === 'function' ? job.createdAt.toMillis() : 0;
      return !createdAfterMs || createdAt >= createdAfterMs - 5000;
    })
    .sort((a, b) => {
      const left = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const right = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return right - left;
    });
  return jobs[0] || null;
}

async function waitForJobTerminal(db, projectId, createdAfterMs) {
  const started = Date.now();
  let latestJob = null;
  while (Date.now() - started < waitForCompletionMs) {
    latestJob = await getLatestJobForProject(db, projectId, createdAfterMs);
    if (latestJob && ['completed', 'preview_ready', 'failed', 'cancelled'].includes(latestJob.status)) {
      return latestJob;
    }
    await delay(2500);
  }
  return latestJob;
}

async function getProjectDocument(db, projectId) {
  const [tenantIdPart, , storeIdPart] = projectId.split('-');
  if (tenantIdPart && storeIdPart) {
    const tenantScopedProject = await db.collection('projects').doc(tenantIdPart).collection(storeIdPart).doc(projectId).get();
    if (tenantScopedProject.exists) return tenantScopedProject;
  }
  return db.collection('projects').doc(projectId).get();
}

async function resolveVisibleIntakePrompts(client, sessionId, db, projectId, createdAfterMs) {
  const started = Date.now();
  let latestJob = null;
  while (Date.now() - started < 70000) {
    const text = await evaluate(client, sessionId, `document.body?.innerText || ''`);
    if (text.includes('This looks like a partial menu')) {
      if (!await clickButtonByText(client, sessionId, 'Continue')) {
        throw new Error('Partial-menu confirmation appeared, but Continue could not be clicked.');
      }
      await delay(1000);
      continue;
    }
    if (text.includes('Save detected business details?')) {
      if (!await clickButtonByText(client, sessionId, 'Skip')) {
        throw new Error('Business identity confirmation appeared, but Skip could not be clicked.');
      }
      await delay(1000);
      continue;
    }

    latestJob = await getLatestJobForProject(db, projectId, createdAfterMs);
    if (latestJob) return latestJob;
    await delay(1000);
  }
  return latestJob;
}

function isIgnorablePageError(message) {
  return /Failed to load resource: net::ERR_CONNECTION_RESET/i.test(message)
    || /webpack-hmr/i.test(message)
    || /ResizeObserver loop completed/i.test(message);
}

function slugifyName(value) {
  return String(value || 'menu')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'menu';
}

async function createAdminQaProject(db) {
  const timestamp = Date.now().toString(36);
  const projectId = `${tenantId}-${timestamp}-${storeId}`;
  const now = new Date();
  const localizedName = { en: projectName };
  const localizedDescription = { en: 'Temporary mobile upload extraction QA menu.' };
  const projectData = {
    _mce: { verified: true, verifiedAt: Date.now(), warnings: [] },
    active: true,
    config: {
      design: {
        brand: { accentColor: '#0051d1' },
        home: { style: 'bold' },
        menu: {
          layout: 'list',
          mood: 'clean',
          showCategoryIcons: true,
          showCategoryTabs: true,
          showImages: true,
          showItemPrices: true,
        },
      },
    },
    createdBy: 'Mobile QA',
    createdOn: now,
    defaultLanguage: 'en',
    deleted: false,
    files: [],
    languages: ['en'],
    menuVersion: 1,
    modifiedBy: 'Mobile QA',
    modifiedOn: now,
    name: localizedName,
    description: localizedDescription,
    pId: 'ML',
    projectId,
    role: 'PLATFORM',
    sId: Number(storeId),
    tId: Number(tenantId),
    uId: userId,
  };
  const summaryData = {
    active: true,
    description: localizedDescription,
    isDefault: false,
    name: localizedName,
    slug: `${slugifyName(projectName)}-${timestamp}`,
  };
  await db.collection('projects').doc(String(tenantId)).collection(String(storeId)).doc(projectId).set(projectData, { merge: true });
  await db.collection('platformSummary').doc(`projects_${storeId}`).set({
    [`projects.${projectId}`]: summaryData,
  }, { merge: true });
  return projectId;
}

async function main() {
  const db = getFirebaseAdmin();
  const adminCreatedProjectId = shouldUseAdminCreatedProject
    ? await createAdminQaProject(db)
    : '';
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'menulist-mobile-upload-qa-'));
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
    if (process.env.MOBILE_QA_VERBOSE === '1') process.stderr.write(String(chunk));
  });

  try {
    const version = await waitForChromeEndpoint();
    const client = createCdpClient(version.webSocketDebuggerUrl);
    await client.ready;

    const pageErrors = [];
    const consoleMessages = [];
    client.on('Runtime.exceptionThrown', (params) => {
      pageErrors.push(params?.exceptionDetails?.exception?.description || params?.exceptionDetails?.text || 'Runtime exception');
    });
    client.on('Runtime.consoleAPICalled', (params) => {
      const text = (params?.args || []).map((arg) => arg.value || arg.description || '').join(' ');
      if (text) consoleMessages.push(text);
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
    await client.send('DOM.enable', {}, sessionId);
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

    const cookieNames = baseUrl.startsWith('https://')
      ? ['next-auth.session-token', '__Secure-next-auth.session-token']
      : ['next-auth.session-token'];
    for (const name of cookieNames) {
      await client.send('Network.setCookie', {
        name,
        value: authToken,
        url: baseUrl,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: baseUrl.startsWith('https://'),
      }, sessionId);
    }

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
        ${adminCreatedProjectId ? `
        localStorage.setItem('mobileSelectedProjectId:${tenantId}:${storeId}', ${JSON.stringify(adminCreatedProjectId)});
        sessionStorage.setItem('menulist_dashboard_project_id', ${JSON.stringify(adminCreatedProjectId)});
        ` : ''}
      `,
    }, sessionId);

    await client.send('Page.navigate', { url: `${baseUrl}/projects#mobile/menu` }, sessionId);
    try {
      await waitForExpression(client, sessionId, `
        document.body &&
        document.body.innerText.includes('Today') &&
        document.body.innerText.includes('Menu') &&
        document.body.innerText.includes('Share') &&
        document.body.innerText.includes('More')
      `, 90000);
    } catch (error) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-initial-load-failed.png'));
      const initialDebug = await evaluate(client, sessionId, `(() => ({
        url: location.href,
        text: document.body?.innerText?.slice(0, 1800) || '',
        selected: localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id') || '',
      }))()`);
      throw new Error(`${error.message}. Initial debug: ${JSON.stringify(initialDebug)}`);
    }
    await delay(3000);

    let projectId = adminCreatedProjectId;
    if (!projectId && !await clickMobileProjectSelector(client, sessionId)) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-selector-open-failed.png'));
      const text = await evaluate(client, sessionId, `document.body.innerText.slice(0, 1800)`);
      throw new Error(`Could not open the mobile project selector. Visible text: ${text}`);
    }
    if (!projectId) {
      await waitForExpression(client, sessionId, `
      Array.from(document.querySelectorAll('div, h1, h2, h3, h4, span'))
        .some((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 &&
            rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
            style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' &&
            (el.textContent || '').replace(/\\s+/g, ' ').trim().includes('Select a Menu');
        })
      `, 20000);
    }
    let clickedCreateMenu = projectId ? true : await clickByText(client, sessionId, 'Create Menu', true);
    if (!clickedCreateMenu) {
      await evaluate(client, sessionId, `
        (() => {
          const scroller = Array.from(document.querySelectorAll('div'))
            .find((el) => el.scrollHeight > el.clientHeight && (el.textContent || '').includes('Select a Menu'));
          if (!scroller) return false;
          scroller.scrollTop = scroller.scrollHeight;
          scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
          return true;
        })()
      `);
      await delay(500);
      clickedCreateMenu = await clickByText(client, sessionId, 'Create Menu', true);
    }
    if (!projectId && !clickedCreateMenu) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-create-menu-click-failed.png'));
      throw new Error('Could not click Create Menu in project selector.');
    }
    if (!projectId) await waitForExpression(client, sessionId, `
      (() => {
        const visible = (el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (!(rect.width > 0 && rect.height > 0 &&
            rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
            style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
            return false;
          }
          const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
          const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
          const hit = document.elementFromPoint(x, y);
          return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
        };
        const visibleText = Array.from(document.querySelectorAll('button, input, textarea, h1, h2, h3, h4, label, span, div'))
          .filter(visible)
          .map((el) => (el.getAttribute('placeholder') || el.textContent || '').replace(/\\s+/g, ' ').trim())
          .join(' ');
        return visibleText.includes('Menu Name') && visibleText.includes('Create');
      })()
    `, 20000);
    const previousProjectId = projectId || await evaluate(client, sessionId, `
      localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id') || ''
    `);
    const focusedNameInput = projectId ? true : await evaluate(client, sessionId, `
      (() => {
        const visible = (el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (!(rect.width > 0 && rect.height > 0 &&
            rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
            style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none' && style.opacity !== '0')) {
            return false;
          }
          const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
          const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
          const hit = document.elementFromPoint(x, y);
          return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
        };
        const input = Array.from(document.querySelectorAll('input')).find((el) => visible(el) && (el.placeholder || '').includes('Enter menu name'));
        if (!input) return false;
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '');
        else input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);
    if (!focusedNameInput) throw new Error('Could not focus the Create Menu name input.');
    if (!projectId) {
      await client.send('Input.insertText', { text: projectName }, sessionId);
      await delay(300);
    }
    let clickedCreateSubmit = projectId ? true : await clickButtonByText(client, sessionId, 'Create');
    if (!clickedCreateSubmit) {
      await evaluate(client, sessionId, `
        (() => {
          const scroller = Array.from(document.querySelectorAll('div'))
            .find((el) => el.scrollHeight > el.clientHeight && (el.textContent || '').includes('Menu Name'));
          if (!scroller) return false;
          scroller.scrollTop = scroller.scrollHeight;
          scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
          return true;
        })()
      `);
      await delay(500);
      clickedCreateSubmit = await clickButtonByText(client, sessionId, 'Create');
    }
    if (!projectId && !clickedCreateSubmit) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-create-submit-failed.png'));
      throw new Error('Could not submit the Create Menu form.');
    }
    if (!projectId) try {
      await waitForExpression(client, sessionId, `
        (
          (localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id') || '') !== ${JSON.stringify(previousProjectId)}
        ) &&
        document.body.innerText.includes(${JSON.stringify(projectName)})
      `, 45000);
    } catch (error) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-create-project-failed.png'));
      const createDebug = await evaluate(client, sessionId, `(() => ({
        selected: localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id') || '',
        text: document.body.innerText.slice(0, 1800),
        inputs: Array.from(document.querySelectorAll('input')).map((input, index) => ({
          index,
          placeholder: input.placeholder,
          value: input.value,
          disabled: input.disabled,
        })),
        buttons: Array.from(document.querySelectorAll('button')).map((button, index) => ({
          index,
          text: (button.textContent || '').replace(/\\s+/g, ' ').trim(),
          disabled: button.disabled,
        })).filter((button) => button.text),
      }))()`);
      throw new Error(`${error.message}. Create debug: ${JSON.stringify(createDebug)}`);
    }
    await delay(2000);

    projectId = projectId || await evaluate(client, sessionId, `
      localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id') || ''
    `);
    if (!projectId) throw new Error('Mobile project creation did not set a selected project id.');
    await captureScreenshot(client, sessionId, screenshots.created);

    const jobCreateStartMs = Date.now();
    let uploadSheetRequested = await clickButtonByText(client, sessionId, 'Upload Menu Photo or PDF');
    if (!uploadSheetRequested) {
      const openedActions = await evaluate(client, sessionId, `
        (() => {
          const button = document.querySelector('.ant-float-btn') || document.querySelector('[aria-label*="actions" i]');
          if (!button) return false;
          button.click();
          return true;
        })()
      `);
      if (!openedActions) throw new Error('Could not open mobile menu command actions.');
      await waitForExpression(client, sessionId, `document.body.innerText.includes('Import Menu')`, 20000);
      let clickedImportMenu = await clickByText(client, sessionId, 'Import Menu', true)
        || await clickByText(client, sessionId, 'Import Menu', false);
      if (!clickedImportMenu) {
        await evaluate(client, sessionId, `
          (() => {
            const scroller = Array.from(document.querySelectorAll('div'))
              .find((el) => el.scrollHeight > el.clientHeight && (el.textContent || '').includes('Import Menu'));
            if (!scroller) return false;
            scroller.scrollTop = scroller.scrollHeight;
            scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
            return true;
          })()
        `);
        await delay(500);
        clickedImportMenu = await clickByText(client, sessionId, 'Import Menu', true)
          || await clickByText(client, sessionId, 'Import Menu', false);
      }
      if (!clickedImportMenu) {
        await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-import-menu-click-failed.png'));
        throw new Error('Could not click Import Menu.');
      }
      uploadSheetRequested = true;
    }
    try {
      await waitForExpression(client, sessionId, `document.body.innerText.includes('Choose Photo or PDF')`, 30000);
    } catch (error) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-sheet-open-failed.png'));
      const uploadOpenDebug = await evaluate(client, sessionId, `(() => ({
        text: document.body.innerText.slice(0, 2200),
        buttons: Array.from(document.querySelectorAll('button')).map((button, index) => ({
          index,
          text: (button.textContent || '').replace(/\\s+/g, ' ').trim(),
          disabled: button.disabled,
          rect: (() => { const r = button.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; })(),
        })).filter((button) => button.text),
      }))()`);
      throw new Error(`${error.message}. Upload sheet open debug: ${JSON.stringify(uploadOpenDebug)}`);
    }
    await setFirstFileInput(client, sessionId, uploadFilePath);
    try {
      await waitForExpression(client, sessionId, `document.body.innerText.includes('Review your upload')`, 45000);
    } catch (error) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-file-input-failed.png'));
      const debugState = await evaluate(client, sessionId, `(() => ({
        text: document.body.innerText.slice(0, 1600),
        inputs: Array.from(document.querySelectorAll('input[type="file"]')).map((input, index) => ({
          index,
          accept: input.getAttribute('accept'),
          multiple: input.multiple,
          files: input.files?.length || 0,
          outerHTML: input.outerHTML.slice(0, 240),
        })),
      }))()`);
      throw new Error(`${error.message}. Upload debug: ${JSON.stringify(debugState)}`);
    }
    await captureScreenshot(client, sessionId, screenshots.uploadSheet);

    if (!await clickButtonByText(client, sessionId, 'Upload and Process')) {
      throw new Error('Could not click Upload and Process.');
    }
    await delay(2500);
    await resolveVisibleIntakePrompts(client, sessionId, db, projectId, jobCreateStartMs);
    try {
      await waitForExpression(client, sessionId, `
        document.body.innerText.includes('Working on upload') ||
        document.body.innerText.includes('Preparing your upload') ||
        document.body.innerText.includes('Checking your upload') ||
        document.body.innerText.includes('Uploading') ||
        document.body.innerText.includes('Creating') ||
        document.body.innerText.includes('Processing your menu') ||
        document.body.innerText.includes('Upload complete') ||
        document.body.innerText.includes('Menu updated') ||
        document.body.innerText.includes('View Updated Menu') ||
        /\\b\\d+ items?\\b/.test(document.body.innerText)
      `, 60000);
    } catch (error) {
      await captureScreenshot(client, sessionId, path.join(outputDir, 'mobile-upload-post-submit-timeout.png'));
      const latestJob = await getLatestJobForProject(db, projectId, jobCreateStartMs);
      const postSubmitDebug = await evaluate(client, sessionId, `(() => ({
        text: document.body.innerText.slice(0, 2600),
        buttons: Array.from(document.querySelectorAll('button')).map((button, index) => ({
          index,
          text: (button.textContent || '').replace(/\\s+/g, ' ').trim(),
          disabled: button.disabled,
          rect: (() => { const r = button.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; })(),
        })).filter((button) => button.text),
      }))()`);
      throw new Error(`${error.message}. Post-submit debug: ${JSON.stringify(postSubmitDebug)}. Latest job: ${JSON.stringify(latestJob ? { id: latestJob.id, status: latestJob.status, currentStep: latestJob.currentStep, error: latestJob.error || null } : null)}`);
    }
    await delay(3000);
    await captureScreenshot(client, sessionId, screenshots.processing);

    const postUploadUiState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      return {
        url: location.href,
        selectedProjectId: localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id'),
        hasProcessingSheet: text.includes('Processing your menu'),
        hasQueuedText: text.includes('Queued'),
        hasSuccess: text.includes('Menu updated') || text.includes('View Updated Menu'),
        hasItems: /\\b\\d+ items?\\b/.test(text),
        hasCategories: /\\b\\d+ categor/.test(text),
        text: text.slice(0, 2400),
      };
    })()`);
    const activeProjectId = postUploadUiState.selectedProjectId || projectId;
    let terminalJob = await getLatestJobForProject(db, activeProjectId, jobCreateStartMs);
    if (!terminalJob || !['completed', 'preview_ready', 'failed', 'cancelled'].includes(terminalJob.status)) {
      terminalJob = await waitForJobTerminal(db, activeProjectId, jobCreateStartMs);
    }
    projectId = activeProjectId;
    await delay(2500);
    const finalUiState = await evaluate(client, sessionId, `(() => {
      const text = document.body.innerText;
      return {
        url: location.href,
        selectedProjectId: localStorage.getItem('mobileSelectedProjectId:${tenantId}:${storeId}') || sessionStorage.getItem('menulist_dashboard_project_id'),
        hasProcessingSheet: text.includes('Processing your menu'),
        hasQueuedText: text.includes('Queued'),
        hasSuccess: text.includes('Menu updated') || text.includes('View Updated Menu'),
        hasItems: /\\b\\d+ items?\\b/.test(text),
        hasCategories: /\\b\\d+ categor/.test(text),
        text: text.slice(0, 2400),
      };
    })()`);
    await captureScreenshot(client, sessionId, screenshots.final);

    const latestProject = await getProjectDocument(db, projectId);
    const projectData = latestProject.exists ? latestProject.data() : null;
    const files = Array.isArray(projectData?.files) ? projectData.files : [];
    const items = files.flatMap((file) => file?.extractedData?.data?.items || []);
    const categories = files.flatMap((file) => file?.extractedData?.data?.categories || []);

    const materialPageErrors = pageErrors.filter((message) => !isIgnorablePageError(message));
    const failures = [];
    if (!terminalJob) failures.push('No processing job was found for the mobile-created project.');
    if (terminalJob && terminalJob.status !== 'completed') failures.push(`Processing job did not complete. Final status: ${terminalJob.status}`);
    if (finalUiState.hasQueuedText || finalUiState.hasProcessingSheet) failures.push('Mobile UI still shows queued/processing after the job wait window.');
    if (!items.length) failures.push('Extracted project has no menu items.');
    if (!categories.length) failures.push('Extracted project has no categories.');
    if (materialPageErrors.length) failures.push(`Page errors: ${materialPageErrors.join(' | ')}`);

    const result = {
      ok: failures.length === 0,
      failures,
      baseUrl,
      envFile,
      projectId,
      projectName,
      uploadFilePath,
      job: terminalJob ? {
        id: terminalJob.id,
        status: terminalJob.status,
        progress: terminalJob.progress,
        currentStep: terminalJob.currentStep,
        error: terminalJob.error || null,
      } : null,
      extracted: {
        files: files.length,
        items: items.length,
        categories: categories.length,
        defaultLanguage: projectData?.defaultLanguage || null,
        languages: projectData?.languages || null,
      },
      finalUiState,
      consoleMessages: consoleMessages.filter((message) => /createMenuProcessingJob|useMenuProcessingJob|Status update|Job created/i.test(message)).slice(-12),
      screenshots,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
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
