import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    isRazorpayCheckoutConfigurationReady,
    isRazorpayCheckoutReady,
} from '../../src/lib/billing/razorpayScriptBoundary';
import { parseCookieItem, serializeCookieItem } from '../../src/hooks/useCookie';
import { normalizeStoredColorList, parseStoredColorList } from '../../src/hooks/useRecentColors';
import { matchesKeyboardShortcut } from '../../src/hooks/useKeyboardShortcuts';
import { loader, startLoader, stopLoader } from '../../src/redux/slices/loader';

let loaderState = loader.reducer(undefined, startLoader('same-request'));
loaderState = loader.reducer(loaderState, startLoader('same-request'));
assert.deepEqual(loaderState, {
    activeRequests: 2,
    requestCounts: { 'same-request': 2 },
    requestIds: ['same-request'],
}, 'duplicate starts for one request id must retain both concurrent operations');

loaderState = loader.reducer(loaderState, stopLoader('same-request'));
assert.deepEqual(loaderState, {
    activeRequests: 1,
    requestCounts: { 'same-request': 1 },
    requestIds: ['same-request'],
}, 'one matching stop must preserve another concurrent request with the same label');

loaderState = loader.reducer(loaderState, stopLoader('same-request'));
assert.deepEqual(loaderState, {
    activeRequests: 0,
    requestCounts: {},
    requestIds: [],
}, 'the final matching stop must clear the shared request label');

loaderState = loader.reducer(loaderState, stopLoader('missing-request'));
assert.deepEqual(loaderState, {
    activeRequests: 0,
    requestCounts: {},
    requestIds: [],
}, 'stopping an unknown request must not corrupt loader accounting');

class Checkout {
    open(): void {}
}

assert.equal(isRazorpayCheckoutReady(Checkout), true);
assert.equal(isRazorpayCheckoutReady({}), false);
assert.equal(isRazorpayCheckoutReady(undefined), false);
assert.equal(isRazorpayCheckoutConfigurationReady(true, 'rzp_test_12345678'), true);
assert.equal(isRazorpayCheckoutConfigurationReady(false, 'rzp_test_12345678'), false);
assert.equal(isRazorpayCheckoutConfigurationReady(true, ''), false);
assert.equal(isRazorpayCheckoutConfigurationReady(true, 'pk_test_12345678'), false);

const serializedCookie = serializeCookieItem('owner pref', { compact: true }, 1, 0);
assert.match(serializedCookie || '', /^owner%20pref=/);
assert.match(serializedCookie || '', /SameSite=Lax$/);
assert.deepEqual(
    parseCookieItem('broken=%E0%A4%A; owner%20pref=%7B%22compact%22%3Atrue%7D', 'owner pref'),
    { compact: true },
);
assert.equal(parseCookieItem('owner%20pref=%E0%A4%A', 'owner pref'), undefined);
assert.equal(serializeCookieItem('owner pref', undefined, 1, 0), null);
assert.equal(serializeCookieItem('owner pref', 'value', 0, 0), null);
assert.deepEqual(
    normalizeStoredColorList([' #ABC ', '#abc', null, { toString: () => '#fff' }, 'red', '#123456'], 10),
    ['#abc', '#123456'],
);
assert.deepEqual(normalizeStoredColorList({ 0: '#fff' }, 10), []);
assert.deepEqual(parseStoredColorList('[" #ABC ","#abc","#123456"]', 10), ['#abc', '#123456']);
assert.deepEqual(parseStoredColorList(null, 10), []);
assert.equal(parseStoredColorList('{"color":"#fff"}', 10), null);
assert.equal(parseStoredColorList('{', 10), null);

const recentColorsHookSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/hooks/useRecentColors.ts'),
    'utf8',
);
assert.doesNotMatch(
    recentColorsHookSource,
    /set(?:Recent|Favorite)Colors\(\(prev\)[\s\S]{0,800}localStorage\.setItem/,
    'React state updater callbacks must not perform browser-storage side effects',
);
const enhancedColorPickerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/organisms/appSettings/EnhancedColorPicker.tsx'),
    'utf8',
);
assert.match(enhancedColorPickerSource, /recentColors\.map\(/);
assert.doesNotMatch(enhancedColorPickerSource, /rgbaColors:\s*any/);

assert.equal(
    matchesKeyboardShortcut(
        { key: 'k', ctrlKey: false, metaKey: true, shiftKey: false },
        { key: 'k', metaKey: true },
    ),
    true,
    'an explicit Meta shortcut must not be made impossible by the default Ctrl matcher',
);
assert.equal(
    matchesKeyboardShortcut(
        { key: 'k', ctrlKey: true, metaKey: false, shiftKey: false },
        { key: 'k', metaKey: true },
    ),
    false,
);
assert.equal(
    matchesKeyboardShortcut(
        { key: 'k', ctrlKey: false, metaKey: true, shiftKey: false },
        { key: 'k', ctrlKey: true },
    ),
    true,
    'the cross-platform Ctrl shortcut contract must continue accepting Command on macOS',
);

process.stdout.write('Browser runtime boundary tests passed.\n');
