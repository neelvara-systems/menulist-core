export type FontPresetsType = {
    name: string;
    code: string;
    blackTextUrl: string;
    whiteTextUrl: string;
    size: string | number;
    type: string;
    fileUrl: string;
    id?: string;
    index: number;
    fontSize?: number;
    width?: number;
    height?: number;
    uid?: string;
}
export type AssetsCategoryType = {
    id?: string | number,
    active: boolean,
    name: string,
    preview: string,
    previewType:
        | "gif"
        | "jpeg"
        | "png"
        | "svg"
        | "webp"
        | "image/gif"
        | "image/jpeg"
        | "image/png"
        | "image/svg+xml"
        | "image/webp",
    tags: string,
    subCategories?: AssetsCategoryType[],
    items?: AssetsCategoryType[],
}

export type CraftBuilderAssetsTypesType = 'illustrations' | 'images' | 'graphics'
