import assert from "node:assert/strict";

import {
    isProjectSlugClaimed,
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

assert.equal(
    resolveAvailableProjectSlug(projects, "fresh-menu", "stable-id"),
    "fresh-menu",
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

console.log("Project slug ownership tests passed.");
