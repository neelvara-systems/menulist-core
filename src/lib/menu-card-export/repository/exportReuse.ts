import type { MenuCardLocalHistoryRecord } from '../models/exportTypes';

export function findReusableExport(records: MenuCardLocalHistoryRecord[], sourceHash: string): MenuCardLocalHistoryRecord | null {
    return records.find((record) => record.sourceHash === sourceHash) || null;
}
