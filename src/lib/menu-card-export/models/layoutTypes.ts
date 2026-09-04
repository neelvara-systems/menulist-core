import type { PrintCategory } from './printModel';

export type MenuCardLayoutMode =
    | 'single_column'
    | 'two_column_category_flow'
    | 'three_column_compact'
    | 'category_per_page'
    | 'mixed_adaptive'
    | 'photo_grid'
    | 'variant_table'
    | 'qr_insert';

export type MenuCardPreviewPage = {
    pageNumber: number;
    kind?: 'cover' | 'menu';
    categories: Array<{
        id: string;
        name: string;
        itemCount: number;
    }>;
    estimatedItems: number;
};

export type MenuCardLayoutPlan = {
    mode: MenuCardLayoutMode;
    pageCount: number;
    pages: MenuCardPreviewPage[];
    categories: PrintCategory[];
};
