import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    CSP_ALLOWLIST,
    CSP_DEV_SETTINGS,
    buildCSPDirective,
} from '../../src/config/csp-allowlist';
import {
    DECISION_REASON_KEYS,
    formatDuration,
    getDurationConfig,
    getEffectiveDuration,
    isQuickPickEligible,
} from '../../src/config/decisionBlocks';
import { APP_NAME, LOGO_TEXT } from '../../src/constants/common';
import { getDecisionBlockTranslation } from '../../src/data/decisionBlockTranslations';
import { MENU_INTELLIGENCE_POLICY } from '../../src/data/shared/menuIntelligencePolicy';
import { FEATURE_FLAGS } from '../../src/config/features';

const productionConnectDirective = buildCSPDirective(
    'connect-src',
    CSP_ALLOWLIST.connectSources,
);
const developmentConnectDirective = buildCSPDirective(
    'connect-src',
    [...CSP_ALLOWLIST.connectSources, ...CSP_DEV_SETTINGS.connectSources],
);

for (const localSource of CSP_DEV_SETTINGS.connectSources) {
    assert.equal(
        productionConnectDirective.includes(localSource),
        false,
        `${localSource} must not be admitted by the production CSP`,
    );
    assert.equal(
        developmentConnectDirective.includes(localSource),
        true,
        `${localSource} must remain available for local emulator development`,
    );
}

const foodDefaultDuration = getDurationConfig('restaurant').default;
for (const invalidDuration of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(getEffectiveDuration(invalidDuration, 'restaurant'), foodDefaultDuration);
    assert.equal(
        formatDuration(invalidDuration, 'restaurant'),
        formatDuration(foodDefaultDuration, 'restaurant'),
    );
}
assert.equal(
    isQuickPickEligible(-1, 'restaurant'),
    isQuickPickEligible(foodDefaultDuration, 'restaurant'),
    'a malformed negative duration must not become an automatic Quick Pick',
);
assert.equal(getEffectiveDuration(0, 'restaurant'), 0);
assert.equal(formatDuration(0, 'restaurant'), 'Instant');

const decisionReasonKeys: string[] = [];
const collectDecisionReasonKeys = (value: unknown): void => {
    if (typeof value === 'string') {
        decisionReasonKeys.push(value);
        return;
    }
    if (value && typeof value === 'object') {
        Object.values(value).forEach(collectDecisionReasonKeys);
    }
};
collectDecisionReasonKeys(DECISION_REASON_KEYS);
for (const reasonKey of decisionReasonKeys) {
    for (const language of ['en', 'hi']) {
        assert.notEqual(
            getDecisionBlockTranslation(reasonKey, language),
            reasonKey,
            `${language} must translate the declared Decision Block reason ${reasonKey}`,
        );
    }
}

assert.equal(APP_NAME, 'MenuList');
assert.equal(LOGO_TEXT, 'MenuList');
assert.equal(
    FEATURE_FLAGS.MENU_INTELLIGENCE_CONFIDENT_THRESHOLD,
    MENU_INTELLIGENCE_POLICY.confidentThreshold,
);
assert.equal(
    FEATURE_FLAGS.MENU_INTELLIGENCE_CAUTIOUS_THRESHOLD,
    MENU_INTELLIGENCE_POLICY.cautiousThreshold,
);
assert.equal(
    FEATURE_FLAGS.MENU_INTELLIGENCE_CALIBRATION_LOCK_DAY,
    MENU_INTELLIGENCE_POLICY.calibrationLockDay,
);
assert.equal(
    FEATURE_FLAGS.MENU_INTELLIGENCE_MIN_STABLE_DAYS,
    MENU_INTELLIGENCE_POLICY.minimumStableDays,
);
const footerSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/components/organisms/footerComponent/index.tsx'),
    'utf8',
);
assert.equal(footerSource.includes('©2023'), false);
assert.match(footerSource, /new Date\(\)\.getUTCFullYear\(\)/);

console.log('Runtime policy constant regression tests passed.');
