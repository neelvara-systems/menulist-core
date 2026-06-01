export type MenuCardWarningSeverity = 'info' | 'warning' | 'blocker';

export type MenuCardWarningCode =
    | 'missing_prices'
    | 'hidden_items_excluded'
    | 'long_text'
    | 'page_overflow'
    | 'qr_quiet_zone'
    | 'qr_too_dense'
    | 'low_photo_quality'
    | 'file_size_risk'
    | 'print_safe_area'
    | 'empty_menu';

export type MenuCardExportWarning = {
    code: MenuCardWarningCode;
    severity: MenuCardWarningSeverity;
    message: string;
    count?: number;
};
