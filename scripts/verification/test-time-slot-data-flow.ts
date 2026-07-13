import assert from "node:assert/strict";
import type { Project } from "@template/main-app/projects/types";
import { isWithinTimeSlot } from "@hook/useTimedCategories";
import {
    clockRangeAppliesOnDay,
    isMinuteWithinClockRange,
    isValidClockRange,
    minutesUntilClockStart,
    normalizeTimeSlotPreset,
    normalizeTimeSlotPresetId,
    normalizeTimeSlotPresets,
    projectReferencesTimeSlotPreset,
    projectTimeSlotPresetReferences,
} from "@lib/menu/timeSlotPresetBoundary";

assert.equal(isValidClockRange("09:00", "17:00"), true);
assert.equal(isValidClockRange("22:00", "02:00"), true);
assert.equal(isValidClockRange("09:00", "09:00"), false);
assert.equal(isValidClockRange("24:00", "02:00"), false);
assert.equal(isValidClockRange("9:00", "17:00"), false);

assert.equal(isMinuteWithinClockRange(23 * 60, "22:00", "02:00"), true);
assert.equal(isMinuteWithinClockRange(60, "22:00", "02:00"), true);
assert.equal(isMinuteWithinClockRange(2 * 60, "22:00", "02:00"), false);
assert.equal(isMinuteWithinClockRange(12 * 60, "22:00", "02:00"), false);
assert.equal(isMinuteWithinClockRange(12 * 60, "09:00", "17:00"), true);
assert.equal(minutesUntilClockStart(23 * 60, "22:00"), 23 * 60);
assert.equal(minutesUntilClockStart(21 * 60, "22:00"), 60);
assert.equal(clockRangeAppliesOnDay(5, [5], 23 * 60, "22:00", "02:00"), true);
assert.equal(clockRangeAppliesOnDay(6, [5], 60, "22:00", "02:00"), true);
assert.equal(clockRangeAppliesOnDay(6, [6], 60, "22:00", "02:00"), false);
assert.equal(clockRangeAppliesOnDay(1, [1], 12 * 60, "09:00", "17:00"), true);
assert.equal(clockRangeAppliesOnDay(2, [1], 12 * 60, "09:00", "17:00"), false);
const fridayAtElevenPm = new Date("2026-07-17T23:00:00.000Z");
const saturdayAtOneAm = new Date("2026-07-18T01:00:00.000Z");
const saturdayAtThreeAm = new Date("2026-07-18T03:00:00.000Z");
assert.equal(isWithinTimeSlot([
    { days: [5], startTime: "22:00", endTime: "02:00" },
], "UTC", fridayAtElevenPm), true);
assert.equal(isWithinTimeSlot([
    { days: [5], startTime: "22:00", endTime: "02:00" },
], "UTC", saturdayAtOneAm), true);
assert.equal(isWithinTimeSlot([
    { days: [5], startTime: "22:00", endTime: "02:00" },
], "UTC", saturdayAtThreeAm), false);
assert.equal(isWithinTimeSlot([
    { days: [6], startTime: "22:00", endTime: "02:00" },
], "UTC", saturdayAtOneAm), false);

assert.equal(normalizeTimeSlotPresetId(" ts_123 "), "ts_123");
assert.equal(normalizeTimeSlotPresetId("../ts_123"), null);
assert.deepEqual(normalizeTimeSlotPreset({
    id: "ts_123",
    label: " Late Night ",
    startTime: "22:00",
    endTime: "02:00",
    color: "#1890FF",
}), {
    id: "ts_123",
    label: "Late Night",
    startTime: "22:00",
    endTime: "02:00",
    color: "#1890FF",
});
assert.equal(normalizeTimeSlotPreset({
    id: "ts_123",
    label: "Late Night",
    startTime: "22:00",
    endTime: "22:00",
}), null);
assert.throws(() => normalizeTimeSlotPresets([
    { id: "one", label: "Lunch", startTime: "11:00", endTime: "15:00" },
    { id: "two", label: " lunch ", startTime: "12:00", endTime: "16:00" },
]), /time_slot_preset_duplicate/);

const project = {
    projectId: "1-project-10",
    files: [{
        uid: "file-1",
        extractedData: {
            data: {
                categories: [{
                    id: "category-1",
                    active: true,
                    name: { en: "Dinner" },
                    timeSlots: [
                        { presetId: "late", startTime: "21:00", endTime: "01:00", days: [5] },
                        { presetId: "other", startTime: "08:00", endTime: "10:00" },
                    ],
                }],
                items: [],
                languages: [],
            },
        },
    }],
} satisfies Pick<Project, "projectId" | "files">;

assert.equal(projectReferencesTimeSlotPreset(project, "late"), true);
assert.equal(projectReferencesTimeSlotPreset(project, "missing"), false);

const updated = projectTimeSlotPresetReferences(project, {
    type: "update",
    preset: {
        id: "late",
        label: "Late Night",
        startTime: "22:00",
        endTime: "02:00",
    },
});
assert.equal(updated.changed, true);
assert.notEqual(updated.files, project.files);
assert.equal(project.files?.[0].extractedData?.data?.categories?.[0].timeSlots?.[0].startTime, "21:00");
assert.equal(updated.files?.[0].extractedData?.data?.categories?.[0].timeSlots?.[0].startTime, "22:00");
assert.deepEqual(updated.files?.[0].extractedData?.data?.categories?.[0].timeSlots?.[0].days, [5]);
assert.equal(updated.files?.[0].extractedData?.data?.categories?.[0].timeSlots?.[1].startTime, "08:00");

const removed = projectTimeSlotPresetReferences(project, { type: "remove", presetId: "late" });
assert.equal(removed.changed, true);
assert.deepEqual(
    removed.files?.[0].extractedData?.data?.categories?.[0].timeSlots,
    [{ presetId: "other", startTime: "08:00", endTime: "10:00" }],
);

const unchanged = projectTimeSlotPresetReferences(project, { type: "remove", presetId: "missing" });
assert.equal(unchanged.changed, false);
assert.equal(unchanged.files, project.files);

console.log("Time-slot data-flow tests passed.");
