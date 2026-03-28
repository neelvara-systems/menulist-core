export type FontPresetsType = {
    name: string;
    code: string;
    blackTextUrl: string;
    whiteTextUrl: string;
    size: string;
    type: string;
    fileUrl: string;
    id?: string;
    index: number
}
export type AssetsCategoryType = {
    id?: any,
    active: boolean,
    name: string,
    preview: string,
    previewType: "jpeg" | "png" | "svg",
    tags: string,
    subCategories?: AssetsCategoryType[],
    items?: AssetsCategoryType[],
}

export type CraftBuilderAssetsTypesType = 'illustrations' | 'images' | 'graphics'