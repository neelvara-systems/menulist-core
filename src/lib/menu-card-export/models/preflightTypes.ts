import type { MenuCardExportWarning } from './warningTypes';

export type MenuCardPreflightResult = {
    status: 'passed' | 'warnings' | 'blocked';
    warningCount: number;
    blockerCount: number;
    warnings: MenuCardExportWarning[];
    checkedAt: string;
};
