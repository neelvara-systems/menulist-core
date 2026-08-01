import assert from "node:assert/strict";

import {
    isProjectSlugClaimed,
    isRecentlyDeletedProjectSlugReservation,
    resolveAvailableProjectSlug,
} from "../../src/lib/menu/projectSlugOwnership";

const projects = {
    "project-a": {
        slug: "lunch-menu",
        previousSlugs: ["old-lunch-menu"],
    },
    "project-b": {
        slug: "inactive-menu",
    },
};

assert.equal(isProjectSlugClaimed(projects, "LUNCH-MENU"), true);
assert.equal(isProjectSlugClaimed(projects, " old-lunch-menu "), true);
assert.equal(isProjectSlugClaimed(projects, "inactive-menu"), true);
assert.equal(isProjectSlugClaimed(projects, "lunch-menu", "project-a"), false);
assert.equal(isProjectSlugClaimed(projects, ""), false);
assert.equal(isProjectSlugClaimed({ malformed: { slug: 10, previousSlugs: [null, 4] } }, "10"), false);
assert.equal(isProjectSlugClaimed(new Proxy({}, {
    ownKeys() {
        throw new Error("blocked");
    },
}), "safe-slug"), true);
assert.equal(isProjectSlugClaimed({
    malformed: Object.defineProperty({}, "slug", {
        enumerable: true,
        get() {
            throw new Error("blocked");
        },
    }),
}, "safe-slug"), true);

assert.equal(
    resolveAvailableProjectSlug(projects, "fresh-menu", "stable-id"),
    "fresh-menu",
);
assert.equal(
    resolveAvailableProjectSlug(projects, "", "localized-project-id"),
    "menu",
    "non-Latin names that slugify to empty must still receive a canonical slug",
);
assert.equal(
    resolveAvailableProjectSlug({
        existing: { slug: "menu" },
    }, "", "localized-project-id"),
    "menu-localized-project-id",
    "empty-slug fallbacks must remain collision-safe",
);
assert.equal(
    resolveAvailableProjectSlug(projects, "  Fresh / Menu  ", "stable-id"),
    "fresh-menu",
    "the allocator must never return a non-canonical proposed slug",
);
assert.equal(
    resolveAvailableProjectSlug(projects, "lunch-menu", "stable-id"),
    "lunch-menu-stable-id",
);
assert.equal(
    resolveAvailableProjectSlug({
        ...projects,
        collision: { slug: "lunch-menu-stable-id" },
    }, "lunch-menu", "stable-id"),
    "lunch-menu-stable-id-2",
);

const cutoffMillis = Date.UTC(2026, 3, 1);
const recentDeletion = { toMillis: () => cutoffMillis + 1 };
const oldDeletion = { toMillis: () => cutoffMillis - 1 };

assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: recentDeletion,
    slug: "Lunch",
}, "lunch", cutoffMillis), true);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: recentDeletion,
    previousSlugs: ["Breakfast", "OLD-LUNCH"],
}, "old-lunch", cutoffMillis), true);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: false,
    deletedAt: recentDeletion,
    slug: "lunch",
}, "lunch", cutoffMillis), false);
assert.equal(isRecentlyDeletedProjectSlugReservation(
    new Proxy({} as never, {
        getOwnPropertyDescriptor() {
            throw new Error("blocked");
        },
    }),
    "lunch",
    cutoffMillis,
), true);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: new Proxy(new Date(cutoffMillis + 1), {}),
    slug: "lunch",
}, "lunch", cutoffMillis), false);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: oldDeletion,
    slug: "lunch",
}, "lunch", cutoffMillis), false);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: { toMillis: () => Number.NaN },
    slug: "lunch",
}, "lunch", cutoffMillis), false);
assert.equal(isRecentlyDeletedProjectSlugReservation({
    deleted: true,
    deletedAt: new Date(cutoffMillis + 1),
    slug: "dinner",
}, "lunch", cutoffMillis), false);

console.log("Project slug ownership tests passed.");
