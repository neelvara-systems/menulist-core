/**
 * Hours Module - Store hours computation and display
 * Feature #2A: Hours Status Display (P0)
 *
 * @see __docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md
 */

export {
    getMinutesUntilStoreStatusChange,
    getStoreStatus,
    useStoreStatus,
} from "./hoursEngine";
export type { StoreStatus } from "./hoursEngine";
export { logHoursUpdated } from "./hoursLogger";
