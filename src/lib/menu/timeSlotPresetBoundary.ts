import type { Project } from "@template/main-app/projects/types";
import type { TimeSlotPreset, TimeSlotPresetCascadePending } from "@type/platform/store";

const CLOCK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PRESET_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const PRESET_COLOR_PATTERN = /^(?:#[0-9A-Fa-f]{3,8}|[A-Za-z]{1,20})$/;

export const MAX_TIME_SLOT_PRESETS = 64;

export const parseClockMinutes = (value: unknown): number | null => {
    if (typeof value !== "string" || !CLOCK_TIME_PATTERN.test(value)) return null;
    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60) + minutes;
};

export const isValidClockRange = (startTime: unknown, endTime: unknown): boolean => {
    const startMinutes = parseClockMinutes(startTime);
    const endMinutes = parseClockMinutes(endTime);
    return startMinutes !== null && endMinutes !== null && startMinutes !== endMinutes;
};

export const isMinuteWithinClockRange = (
    currentMinutes: number,
    startTime: unknown,
    endTime: unknown,
): boolean => {
    if (!Number.isInteger(currentMinutes) || currentMinutes < 0 || currentMinutes >= 24 * 60) return false;
    const startMinutes = parseClockMinutes(startTime);
    const endMinutes = parseClockMinutes(endTime);
    if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return false;
    if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

export const clockRangeAppliesOnDay = (
    currentDay: number,
    allowedDays: readonly number[] | undefined,
    currentMinutes: number,
    startTime: unknown,
    endTime: unknown,
): boolean => {
    if (!allowedDays?.length) return true;
    if (!Number.isInteger(currentDay) || currentDay < 0 || currentDay > 6) return false;
    const startMinutes = parseClockMinutes(startTime);
    const endMinutes = parseClockMinutes(endTime);
    if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return false;

    const allowed = new Set(allowedDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
    if (!allowed.size) return false;

    if (startMinutes < endMinutes || currentMinutes >= startMinutes) {
        return allowed.has(currentDay);
    }

    // The after-midnight portion of an overnight range belongs to the day on
    // which the range started (for example Friday 22:00 through Saturday 02:00).
    return allowed.has((currentDay + 6) % 7);
};

export const minutesUntilClockStart = (currentMinutes: number, startTime: unknown): number | null => {
    if (!Number.isInteger(currentMinutes) || currentMinutes < 0 || currentMinutes >= 24 * 60) return null;
    const startMinutes = parseClockMinutes(startTime);
    if (startMinutes === null) return null;
    const delta = (startMinutes - currentMinutes + (24 * 60)) % (24 * 60);
    return delta === 0 ? 24 * 60 : delta;
};

export const normalizeTimeSlotPresetId = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return PRESET_ID_PATTERN.test(normalized) ? normalized : null;
};

export const normalizeTimeSlotPreset = (value: unknown): TimeSlotPreset | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Partial<Record<keyof TimeSlotPreset, unknown>>;
    const id = normalizeTimeSlotPresetId(candidate.id);
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    const startTime = typeof candidate.startTime === "string" ? candidate.startTime.trim() : "";
    const endTime = typeof candidate.endTime === "string" ? candidate.endTime.trim() : "";
    if (!id || !label || label.length > 80 || !isValidClockRange(startTime, endTime)) {
        return null;
    }

    let color: string | undefined;
    if (candidate.color !== undefined) {
        if (typeof candidate.color !== "string") return null;
        color = candidate.color.trim();
        if (!PRESET_COLOR_PATTERN.test(color)) return null;
    }

    return {
        id,
        label,
        startTime,
        endTime,
        ...(color ? { color } : {}),
    };
};

export const normalizeTimeSlotPresets = (value: unknown): TimeSlotPreset[] => {
    if (!Array.isArray(value) || value.length > MAX_TIME_SLOT_PRESETS) {
        throw new Error("time_slot_presets_invalid");
    }

    const ids = new Set<string>();
    const labels = new Set<string>();
    return value.map((entry) => {
        const preset = normalizeTimeSlotPreset(entry);
        if (!preset) throw new Error("time_slot_preset_invalid");
        const normalizedLabel = preset.label.toLocaleLowerCase("en-US");
        if (ids.has(preset.id) || labels.has(normalizedLabel)) {
            throw new Error("time_slot_preset_duplicate");
        }
        ids.add(preset.id);
        labels.add(normalizedLabel);
        return preset;
    });
};

export type ProjectPresetReferenceMutation =
    | { type: "remove"; presetId: string }
    | { type: "update"; preset: TimeSlotPreset };

export const normalizeProjectPresetReferenceMutation = (
    value: unknown,
): ProjectPresetReferenceMutation | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as { type?: unknown; presetId?: unknown; preset?: unknown };
    if (candidate.type === "remove") {
        const presetId = normalizeTimeSlotPresetId(candidate.presetId);
        return presetId ? { type: "remove", presetId } : null;
    }
    if (candidate.type === "update") {
        const preset = normalizeTimeSlotPreset(candidate.preset);
        return preset ? { type: "update", preset } : null;
    }
    return null;
};

export const normalizeTimeSlotPresetCascadePending = (
    value: unknown,
): TimeSlotPresetCascadePending | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Partial<Record<keyof TimeSlotPresetCascadePending, unknown>>;
    const operationId = normalizeTimeSlotPresetId(candidate.operationId);
    const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt.trim() : "";
    const createdAtMs = Date.parse(createdAt);
    const mutation = normalizeProjectPresetReferenceMutation(candidate.mutation);
    if (!operationId || !createdAt || !Number.isFinite(createdAtMs) || !mutation) {
        return null;
    }
    return { operationId, createdAt, mutation };
};

export type ProjectPresetReferenceProjection = {
    changed: boolean;
    files: Project["files"];
};

export const projectReferencesTimeSlotPreset = (project: Pick<Project, "files">, presetId: string): boolean => (
    Array.isArray(project.files) && project.files.some((file) => (
        Array.isArray(file.extractedData?.data?.categories)
        && file.extractedData.data.categories.some((category) => (
            Array.isArray(category.timeSlots)
            && category.timeSlots.some((slot) => slot?.presetId === presetId)
        ))
    ))
);

export const projectTimeSlotPresetReferences = (
    project: Pick<Project, "files">,
    mutation: ProjectPresetReferenceMutation,
): ProjectPresetReferenceProjection => {
    if (!Array.isArray(project.files)) return { changed: false, files: project.files };
    const presetId = mutation.type === "remove" ? mutation.presetId : mutation.preset.id;
    let changed = false;

    const files = project.files.map((file) => {
        const categories = file.extractedData?.data?.categories;
        if (!Array.isArray(categories)) return file;
        let fileChanged = false;
        const nextCategories = categories.map((category) => {
            if (!Array.isArray(category.timeSlots)) return category;
            if (mutation.type === "remove") {
                const nextSlots = category.timeSlots.filter((slot) => slot?.presetId !== presetId);
                if (nextSlots.length === category.timeSlots.length) return category;
                changed = true;
                fileChanged = true;
                return { ...category, timeSlots: nextSlots };
            }

            let categoryChanged = false;
            const nextSlots = category.timeSlots.map((slot) => {
                if (slot?.presetId !== presetId) return slot;
                if (slot.startTime === mutation.preset.startTime && slot.endTime === mutation.preset.endTime) {
                    return slot;
                }
                categoryChanged = true;
                return {
                    ...slot,
                    startTime: mutation.preset.startTime,
                    endTime: mutation.preset.endTime,
                };
            });
            if (!categoryChanged) return category;
            changed = true;
            fileChanged = true;
            return { ...category, timeSlots: nextSlots };
        });

        if (!fileChanged) return file;
        return {
            ...file,
            extractedData: {
                ...file.extractedData,
                data: {
                    ...file.extractedData?.data,
                    categories: nextCategories,
                },
            },
        };
    });

    return { changed, files: changed ? files : project.files };
};
