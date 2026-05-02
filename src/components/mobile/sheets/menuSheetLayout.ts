import type { CSSProperties } from 'react';

export const MENU_SHEET_AVAILABLE_HEIGHT = '92vh';

export const MENU_SHEET_BODY_STYLE: CSSProperties = {
    height: MENU_SHEET_AVAILABLE_HEIGHT,
    maxHeight: MENU_SHEET_AVAILABLE_HEIGHT,
    overflow: 'hidden',
    padding: 0,
};

export const MENU_SHEET_ROUNDED_BODY_STYLE: CSSProperties = {
    ...MENU_SHEET_BODY_STYLE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
};

export const MENU_SHEET_CONTAINER_STYLE: CSSProperties = {
    height: '100%',
    overflow: 'hidden',
};
