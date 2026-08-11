#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import {
    CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS,
    CAMPAIGNCUE_DAILY_DESK_MAX_OUTPUT_FORMATS,
    CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS,
    CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS,
    CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS,
    CAMPAIGNCUE_DAILY_DESK_RECIPES,
} from "../../src/constants/campaigncue/dailyDesk";
import {
    CAMPAIGNCUE_VERTICAL_PLAYBOOKS,
    campaignCueVerticalPlaybookForBusinessType,
} from "../../src/constants/campaigncue/verticalPlaybooks";
import type { CampaignCueBusinessType } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    if (!condition) throw new Error(message);
    checks += 1;
};

const allBusinessTypes: CampaignCueBusinessType[] = [
    "restaurant",
    "salon",
    "retail",
    "local_service",
    "fitness",
    "clinic",
    "other",
    "multi_location",
    "agency_client",
];
const primaryBusinessTypes: CampaignCueBusinessType[] = [
    "restaurant",
    "salon",
    "retail",
    "local_service",
    "fitness",
    "clinic",
];
const recipeIds = CAMPAIGNCUE_DAILY_DESK_RECIPES.map((recipe) => recipe.id);
const recipeIdSet = new Set(recipeIds);

assert(CAMPAIGNCUE_VERTICAL_PLAYBOOKS.length === 7, "registry must keep seven bounded vertical playbooks");
assert(CAMPAIGNCUE_DAILY_DESK_RECIPES.length === 20, "recipe library must keep twenty bounded action recipes");
assert(recipeIdSet.size === recipeIds.length, "recipe IDs must be unique");
assert(new Set(CAMPAIGNCUE_VERTICAL_PLAYBOOKS.map((playbook) => playbook.id)).size === CAMPAIGNCUE_VERTICAL_PLAYBOOKS.length, "playbook IDs must be unique");

for (const businessType of allBusinessTypes) {
    const playbook = campaignCueVerticalPlaybookForBusinessType(businessType);
    assert(Boolean(playbook), `${businessType} must resolve to a playbook`);
    assert(playbook.recipeIds.length > 0, `${businessType} playbook must expose recipes`);
}
assert(campaignCueVerticalPlaybookForBusinessType("multi_location").businessType === "other", "multi-location mode must use conservative fallback without inventing a vertical");
assert(campaignCueVerticalPlaybookForBusinessType("agency_client").businessType === "other", "agency mode must use conservative fallback without inventing a vertical");

for (const playbook of CAMPAIGNCUE_VERTICAL_PLAYBOOKS) {
    assert(playbook.ownerJobs.length > 0 && playbook.ownerJobs.length <= 4, `${playbook.id} owner jobs must stay bounded`);
    assert(playbook.protectedEvidence.length > 0 && playbook.protectedEvidence.length <= 8, `${playbook.id} evidence must stay bounded`);
    assert(playbook.prohibitedClaims.length > 0 && playbook.prohibitedClaims.length <= 8, `${playbook.id} claim boundaries must stay bounded`);
    assert(new Set(playbook.recipeIds).size === playbook.recipeIds.length, `${playbook.id} recipe references must be unique`);
    playbook.recipeIds.forEach((recipeId) => assert(recipeIdSet.has(recipeId), `${playbook.id} references unknown recipe ${recipeId}`));
}

for (const businessType of primaryBusinessTypes) {
    const specificRecipes = CAMPAIGNCUE_DAILY_DESK_RECIPES.filter((recipe) => recipe.businessTypes.includes(businessType));
    assert(specificRecipes.length >= 2, `${businessType} must have at least two specific action recipes`);
}

for (const recipe of CAMPAIGNCUE_DAILY_DESK_RECIPES) {
    assert(recipe.requiredInputs.length > 0 && recipe.requiredInputs.length <= 6, `${recipe.id} required inputs must stay bounded`);
    assert(recipe.outputFormats.length > 0 && recipe.outputFormats.length <= CAMPAIGNCUE_DAILY_DESK_MAX_OUTPUT_FORMATS, `${recipe.id} outputs must stay bounded`);
    assert(recipe.printFormats.length <= CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS, `${recipe.id} print formats must stay bounded`);
    assert(recipe.photoTasks.length <= CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS, `${recipe.id} photo tasks must stay bounded`);
    assert(recipe.manualDeliveryTasks.length > 0 && recipe.manualDeliveryTasks.length <= CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS, `${recipe.id} delivery tasks must stay bounded`);
    assert(recipe.resultOptions.length > 0 && recipe.resultOptions.length <= CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS, `${recipe.id} result options must stay bounded`);
    assert(recipe.resultOptions.some((option) => option.id === "not_used"), `${recipe.id} must preserve not-used feedback`);
    assert(recipe.resultOptions.some((option) => option.id === "not_useful"), `${recipe.id} must preserve not-useful feedback`);
    assert(recipe.guardrails.length > 0 && recipe.guardrails.length <= 5, `${recipe.id} guardrails must stay bounded`);
}

for (const expectedRecipeId of [
    "restaurant_catering_inquiry",
    "salon_membership_reminder",
    "retail_back_in_stock",
    "local_service_seasonal_maintenance",
    "fitness_trial_session",
    "clinic_service_availability",
]) {
    assert(recipeIdSet.has(expectedRecipeId), `${expectedRecipeId} must be implemented`);
}

const registrySource = fs.readFileSync(path.join(ROOT, "src/constants/campaigncue/verticalPlaybooks.ts"), "utf8");
for (const prohibitedImport of ["firebase", "firestore", "storage", "@google/genai", "modelAdapter", "fetch("]) {
    assert(!registrySource.toLowerCase().includes(prohibitedImport.toLowerCase()), `playbook registry must not include ${prohibitedImport}`);
}

console.log(`CampaignCue vertical playbook checks passed (${checks} checks).`);
