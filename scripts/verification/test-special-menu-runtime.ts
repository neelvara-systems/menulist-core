#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import {
    normalizeSpecialMenuInstant,
    normalizeSpecialMenuScheduleRange,
} from "../../src/data/shared/specialMenuSchedule";
import { resolveLiveSpecialMenuProject } from "../../src/lib/menu/specialMenuRuntime";
import {
    formatDateTimeRange,
    fromNativeDateTimeInputValue,
    toNativeDateTimeInputValue,
} from "../../src/utils/dateTime";

const NOW = new Date("2026-07-30T12:00:00.000Z");
const PROJECT_ID = "1-summer-special-101";
const BASE_PROJECT_ID = "1-main-menu-101";

const project = {
    active: true,
    deleted: false,
    projectId: PROJECT_ID,
    sId: 101,
    tId: 1,
    _specialMenu: {
        baseProjectId: BASE_PROJECT_ID,
        displayName: { en: "Summer Specials" },
        endsAt: "2026-07-30T14:00:00.000Z",
        mode: "replace",
        startsAt: "2026-07-30T10:00:00.000Z",
        status: "active",
    },
};

const resolve = (value: unknown, overrides: Partial<{
    now: Date;
    projectId: string;
    sId: number | string;
    tId: number | string;
}> = {}) => resolveLiveSpecialMenuProject(value, {
    now: NOW,
    projectId: PROJECT_ID,
    sId: 101,
    tId: 1,
    ...overrides,
});

assert.equal(resolve(project)?.projectId, PROJECT_ID);
assert.equal(resolve(project)?.metadata.baseProjectId, BASE_PROJECT_ID);
assert.equal(
    normalizeSpecialMenuInstant("2026-07-30T15:30:00+05:30"),
    "2026-07-30T10:00:00.000Z",
    "explicit-offset ISO instants must normalize to one canonical persisted representation",
);
assert.equal(
    normalizeSpecialMenuInstant("2026-07-30 10:00:00"),
    null,
    "timezone-less implementation-dependent date strings must fail closed",
);
assert.equal(
    normalizeSpecialMenuInstant("2026-02-30T10:00:00.000Z"),
    null,
    "impossible calendar instants must fail closed instead of rolling into another day",
);
assert.equal(
    normalizeSpecialMenuScheduleRange(
        "2026-07-30T15:30:00+05:30",
        "2026-07-30T16:30:00+05:30",
    )?.endsAt,
    "2026-07-30T11:00:00.000Z",
);
assert.equal(
    resolve({
        ...project,
        _specialMenu: {
            ...project._specialMenu,
            startsAt: "2026-07-30T15:30:00+05:30",
            endsAt: "2026-07-30T19:30:00+05:30",
        },
    })?.metadata.startsAt,
    "2026-07-30T10:00:00.000Z",
    "legacy explicit-offset schedule values must remain readable through canonical normalization",
);
assert.equal(
    Object.prototype.hasOwnProperty.call(project, "isSpecialMenu"),
    false,
    "runtime eligibility must not require the summary-only isSpecialMenu marker",
);

assert.equal(resolve({ ...project, active: false }), null);
assert.equal(resolve({ ...project, deleted: true }), null);
assert.equal(resolve({ ...project, projectId: "1-other-101" }), null);
assert.equal(resolve(project, { projectId: "2-cross-201", sId: 201, tId: 2 }), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, baseProjectId: "2-cross-201" },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, status: "scheduled" },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, startsAt: "2026-07-30T13:00:00.000Z" },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, endsAt: NOW.toISOString() },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, endsAt: "not-a-date" },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, startsAt: "2026-07-30 10:00:00" },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, displayName: {} },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, displayName: { en: " " } },
}), null);
assert.equal(resolve({
    ...project,
    _specialMenu: { ...project._specialMenu, activatedAt: "not-a-date" },
}), null);

assert.equal(
    fromNativeDateTimeInputValue("2026-08-15T18:30", "Asia/Kolkata"),
    "2026-08-15T13:00:00.000Z",
    "owner-entered wall time must be stored using the business timezone",
);
assert.equal(
    toNativeDateTimeInputValue("2026-08-15T13:00:00.000Z", "Asia/Kolkata"),
    "2026-08-15T18:30",
    "persisted schedule must round-trip in the business timezone",
);
const kolkataScheduleLabel = formatDateTimeRange(
    "2026-08-29T18:30:00.000Z",
    "2026-08-30T18:30:00.000Z",
    undefined,
    "Schedule unavailable",
    "Asia/Kolkata",
);
assert.equal(
    /Aug 29|29 Aug/.test(kolkataScheduleLabel),
    false,
    "store-timezone schedule labels must not render the preceding UTC calendar date",
);
assert.equal(
    /Aug 30|30 Aug/.test(kolkataScheduleLabel),
    true,
    "store-timezone schedule labels must render the owner-entered start date",
);

process.stdout.write("Special menu public runtime tests passed.\n");
