import type { MenuCardLocalHistoryRecord } from '../models/exportTypes';

export function getFreshnessState(record: MenuCardLocalHistoryRecord, currentHash: string): 'Current' | 'Menu changed' | 'Create again' {
    if (!record.sourceHash) return 'Create again';
    return record.sourceHash === currentHash ? 'Current' : 'Menu changed';
}
