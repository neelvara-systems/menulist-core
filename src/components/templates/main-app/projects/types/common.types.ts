/**
 * Common Types
 * 
 * Shared utility types used across the projects feature.
 */

import { ExtractedDataItem } from "./extractedData.types";

export interface LanguageType {
    code: string;
    name: string;
    nativeName?: string;
    direction?: 'ltr' | 'rtl';
}

export interface ConvertedImageType {
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string;
    fileId: any;
}

export type ItemForDropdown = ExtractedDataItem & {
    itemName: string;
    categoryName: string;
    fileId: string;
    descriptionLine?: string;
    attributesList?: string[];
};
