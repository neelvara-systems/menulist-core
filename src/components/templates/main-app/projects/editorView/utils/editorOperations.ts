import {
    generateLocalCategoryId,
    generateLocalItemId,
} from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import { labelConfirmDialog } from "@lib/accessibility/antConfirmDialog";
import { Modal } from "antd";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
    ProjectFileType,
} from "../../types";

/**
 * Shared CRUD operations for editor views
 * These are pure functions that can be used by both useEditorLogic and TraditionalView
 */

// ============================
// CREATE OPERATIONS
// ============================

/**
 * Create a new category with appropriate ID
 * @param file - The file to add the category to
 * @param languages - Available languages
 * @param masterProjectId - If present, this is a linked store and we use L_C_ prefix
 */
export const createNewCategory = (
    file: ProjectFileType,
    languages: string[],
    masterProjectId?: string,
): ExtractedDataCategory => {
    let categoryId: string;

    if (masterProjectId) {
        // Linked store: use local-only prefix
        categoryId = generateLocalCategoryId();
    } else {
        // Standalone store: use file-based sequential ID
        const categories = file.extractedData?.data?.categories || [];
        const sequenceId =
            categories.length > 0
                ? Number(
                    categories[categories.length - 1]?.id?.split(`${file.uid}-c`)[1],
                ) + 1 || 1
                : 1;
        categoryId = `${file.uid}-c${sequenceId}`;
    }

    return {
        id: categoryId,
        name: Object.fromEntries(languages.map((lang) => [lang, ""])),
        active: true,
    };
};

/**
 * Create a new item with appropriate ID
 * @param file - The file to add the item to
 * @param categoryId - The category to add the item to
 * @param languages - Available languages
 * @param masterProjectId - If present, this is a linked store and we use L_I_ prefix
 */
export const createNewItem = (
    file: ProjectFileType,
    categoryId: string,
    languages: string[],
    masterProjectId?: string,
): ExtractedDataItem => {
    let itemId: string;

    if (masterProjectId) {
        // Linked store: use local-only prefix
        itemId = generateLocalItemId();
    } else {
        // Standalone store: use file-based sequential ID
        const items = file.extractedData?.data?.items || [];
        const sequenceId =
            items.length > 0
                ? Number(items[items.length - 1]?.id?.split(`${file.uid}-i`)[1]) + 1 || 1
                : 1;
        itemId = `${file.uid}-i${sequenceId}`;
    }

    return {
        id: itemId,
        description: Object.fromEntries(languages.map((lang) => [lang, ""])),
        name: Object.fromEntries(languages.map((lang) => [lang, ""])),
        category: categoryId,
        price: "",
        attributes: [],
        active: true,
        available: true, // Feature #2: Instant Availability - default to available
    };
};

// ============================
// DELETE OPERATIONS
// ============================

export const deleteCategory = (
    file: ProjectFileType,
    categoryId: string,
): any => {
    if (!file.extractedData?.data) {
        return file.extractedData;
    }
    const extractedData = removeObjRef(file.extractedData);
    extractedData.data.categories =
        extractedData.data.categories?.filter(
            (cat: ExtractedDataCategory) => cat.id !== categoryId,
        ) || [];
    extractedData.data.items =
        extractedData.data.items?.filter(
            (item: ExtractedDataItem) => item.category !== categoryId,
        ) || [];
    return extractedData;
};

export const deleteItem = (
    file: ProjectFileType,
    categoryId: string,
    itemId: string,
): any => {
    if (!file.extractedData?.data) {
        return file.extractedData;
    }
    const extractedData = removeObjRef(file.extractedData);
    extractedData.data.items =
        extractedData.data.items?.filter(
            (item: ExtractedDataItem) =>
                !(item.category === categoryId && item.id === itemId),
        ) || [];
    return extractedData;
};

export const deleteItemById = (file: ProjectFileType, itemId: string): any => {
    if (!file.extractedData?.data) {
        return file.extractedData;
    }
    const extractedData = removeObjRef(file.extractedData);
    extractedData.data.items =
        extractedData.data.items?.filter(
            (item: ExtractedDataItem) => item.id !== itemId,
        ) || [];
    return extractedData;
};

// ============================
// CONFIRMATION MODALS
// ============================

export { labelConfirmDialog };

interface ConfirmCategoryDeleteParams {
    category: ExtractedDataCategory;
    file: ProjectFileType;
    activeLanguage: string;
    onDelete: () => void;
}

export const confirmCategoryDelete = ({
    category,
    file,
    activeLanguage,
    onDelete,
}: ConfirmCategoryDeleteParams) => {
    const itemCount =
        file.extractedData?.data?.items?.filter(
            (item) => item.category === category.id,
        ).length || 0;
    const categoryName = category.name?.[activeLanguage] || "this category";

    Modal.confirm({
        title: "Delete Category?",
        modalRender: labelConfirmDialog("Delete Category?"),
        content: `Customers will no longer see "${categoryName}". ${itemCount > 0 ? `This also deletes ${itemCount} item${itemCount > 1 ? "s" : ""} in this category. ` : ""}This cannot be undone.`,
        okText:
            itemCount > 0
                ? `Delete Category & ${itemCount} Item${itemCount > 1 ? "s" : ""}`
                : "Delete Category",
        okType: "danger",
        cancelText: "Cancel",
        onOk: onDelete,
    });
};

interface ConfirmItemDeleteParams {
    item: ExtractedDataItem;
    activeLanguage: string;
    onDelete: () => void;
}

export const confirmItemDelete = ({
    item,
    activeLanguage,
    onDelete,
}: ConfirmItemDeleteParams) => {
    const itemName = item.name?.[activeLanguage] || "this item";

    Modal.confirm({
        title: "Delete Item?",
        modalRender: labelConfirmDialog("Delete Item?"),
        content: `Customers will no longer see "${itemName}". Delete this item? This cannot be undone.`,
        okText: "Delete item",
        okType: "danger",
        cancelText: "Cancel",
        onOk: onDelete,
    });
};

interface ConfirmAttributeDeleteParams {
    onDelete: () => void;
}

export const confirmAttributeDelete = ({
    onDelete,
}: ConfirmAttributeDeleteParams) => {
    Modal.confirm({
        title: "Delete Option?",
        modalRender: labelConfirmDialog("Delete Option?"),
        content: "Customers will no longer see this option on the item. Delete it? This cannot be undone.",
        okText: "Delete option",
        okType: "danger",
        cancelText: "Cancel",
        onOk: onDelete,
    });
};

// ============================
// ATTRIBUTE OPERATIONS
// ============================

export const deleteAttribute = (
    file: ProjectFileType,
    categoryId: string,
    itemId: string,
    attrId: string,
): any => {
    if (!file.extractedData?.data) {
        return file.extractedData;
    }
    const extractedData = removeObjRef(file.extractedData);
    const item = extractedData.data.items?.find(
        (i: ExtractedDataItem) => i.category === categoryId && i.id === itemId,
    );

    if (item?.attributes) {
        item.attributes = item.attributes.filter((attr: any) => attr.id !== attrId);
    }

    return extractedData;
};
