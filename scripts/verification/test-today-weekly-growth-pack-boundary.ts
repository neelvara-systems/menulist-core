import assert from 'node:assert/strict';

import {
    buildTodayWeeklyGrowthPack,
    copyTodayGrowthPackText,
} from '../../src/lib/today/weeklyGrowthPack';

const validPack = buildTodayWeeklyGrowthPack({
    businessName: '  Example\nCafe  ',
    inactiveItemCount: 4.8,
    inactiveItemNames: [' Tea\nCake ', '', 'Soup', 'Ignored'],
    menuUrl: 'https://menu.example.com/today',
    operationalCampaigns: [{
        subject: { itemName: '  Summer\nSpecial  ' },
    }] as never,
    projectName: 'Main',
});

assert.equal(validPack.primarySubject, 'Summer Special');
assert.equal(validPack.summary, 'Ready from current MenuList truth for Example Cafe. Review before posting.');
assert.match(validPack.assets[0].copy, /https:\/\/menu\.example\.com\/today$/);
assert.equal(validPack.readyActions[0].title, '4 inactive items');
assert.equal(validPack.readyActions[0].description, 'Tea Cake, Soup and more cannot be seen by customers.');
assert.ok(validPack.readyActions.some(({ id }) => id === 'public-link'));

for (const menuUrl of [
    'javascript:alert(1)',
    'http://menu.example.com',
    'https://user:password@menu.example.com',
    'https://127.0.0.1/menu',
    'https://localhost/menu',
]) {
    const pack = buildTodayWeeklyGrowthPack({ menuUrl });
    assert.ok(pack.assets.every(({ copy }) => !copy.includes(menuUrl)));
    assert.ok(pack.readyActions.every(({ id }) => id !== 'public-link'));
}

let getterExecuted = false;
const malformedInput: Record<string, unknown> = {
    businessName: { value: 'Leaked' },
    hasActiveTempStatus: 'true',
    inactiveItemCount: '9',
    inactiveItemNames: { 0: 'Leaked' },
    menuUrl: ['https://menu.example.com'],
    operationalCampaigns: { subject: { itemName: 'Leaked' } },
    primaryCampaign: { subject: { itemName: ['Leaked'] } },
    projectName: ['Leaked'],
    staffPromptText: { text: 'Leaked' },
    tempStatusMessage: { text: 'Leaked' },
    todayTimingsLabel: { text: 'Leaked' },
};
Object.defineProperty(malformedInput, 'businessName', {
    enumerable: true,
    get() {
        getterExecuted = true;
        throw new Error('persisted accessor must not execute');
    },
});

const malformedPack: ReturnType<typeof buildTodayWeeklyGrowthPack> = Reflect.apply(
    buildTodayWeeklyGrowthPack,
    undefined,
    [malformedInput],
);
assert.equal(getterExecuted, false);
assert.equal(malformedPack.primarySubject, 'your menu');
assert.equal(malformedPack.summary, 'Ready from current MenuList truth for your business. Review before posting.');
assert.ok(malformedPack.assets.every(({ copy }) => !copy.includes('[object Object]') && !copy.includes('Leaked')));
assert.ok(malformedPack.readyActions.every(({ id }) => (
    id !== 'inactive-items' && id !== 'temporary-status' && id !== 'today-hours' && id !== 'public-link'
)));

async function verifyCopyBoundary(): Promise<void> {
    const failureStages: string[] = [];
    assert.equal(await copyTodayGrowthPackText('   ', {
        onFailure: (stage) => failureStages.push(stage),
    }), false);
    assert.deepEqual(failureStages, ['empty_text']);
}

verifyCopyBoundary()
    .then(() => {
        console.log('Today weekly growth pack boundary tests passed.');
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
