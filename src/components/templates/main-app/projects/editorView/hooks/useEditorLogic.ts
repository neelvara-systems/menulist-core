import { removeObjRef } from "@util/utils";
import { useCallback, useRef, useState } from "react";
import {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
    ProjectFileType,
} from "../../types";
import { handleUpdateValue } from "../../utils";
import { EditorFilters } from "../EditorFiltersPopover";
import {
    confirmAttributeDelete,
    confirmCategoryDelete,
    confirmItemDelete,
    createNewCategory,
    createNewItem,
    deleteAttribute,
    deleteCategory,
    deleteItem,
} from "../utils/editorOperations";

interface EditItemModalState {
    active: boolean;
    item: ExtractedDataItem | null;
    status: "edit" | "add";
}

interface EditCategoryModalState {
    active: boolean;
    category: ExtractedDataCategory | null;
    status: "edit" | "add";
}

interface UseEditorLogicProps {
    file: ProjectFileType;
    setUpdatedFileData: (data: ProjectFileType) => void;
    selectedLanguages: string[];
    searchTerm?: string;
    filters?: EditorFilters;
    masterProjectId?: string; // For linked stores, use L_I_/L_C_ prefix
}

export const useEditorLogic = ({
    file,
    setUpdatedFileData,
    selectedLanguages,
    searchTerm = "",
    filters,
    masterProjectId,
}: UseEditorLogicProps) => {
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const [editItemModalState, setEditItemModalState] =
        useState<EditItemModalState>({
            active: false,
            item: null,
            status: "edit",
        });
    const [editCategoryModalState, setEditCategoryModalState] =
        useState<EditCategoryModalState>({
            active: false,
            category: null,
            status: "edit",
        });

    const fileRef = useRef(file);
    fileRef.current = file;

    // ============================
    // FILTERING LOGIC
    // ============================

    /**
     * Filter items based on search term and filters
     * Searches across: item names, descriptions, category names, attribute names
     */
    const filterItems = useCallback(
        (items: ExtractedDataItem[], categories: ExtractedDataCategory[]) => {
            let filtered = [...items];
            const activeLang = selectedLanguages[0] || "en";

            // 1. Search Term Filter (searches across multiple fields)
            if (searchTerm && searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                filtered = filtered.filter((item) => {
                    // Search in item name
                    const nameMatch = item.name?.[activeLang]
                        ?.toLowerCase()
                        .includes(term);

                    // Search in item description
                    const descMatch = item.description?.[activeLang]
                        ?.toLowerCase()
                        .includes(term);

                    // Search in attributes
                    const attrMatch = item.attributes?.some(
                        (attr: ExtractedDataAttribute) =>
                            attr.name?.[activeLang]?.toLowerCase().includes(term),
                    );

                    // Search in category name
                    const category = categories.find((cat) => cat.id === item.category);
                    const categoryMatch = category?.name?.[activeLang]
                        ?.toLowerCase()
                        .includes(term);

                    return nameMatch || descMatch || attrMatch || categoryMatch;
                });
            }

            // 2. Category Filter
            if (filters?.category) {
                filtered = filtered.filter(
                    (item) => item.category === filters.category,
                );
            }

            // 3. Price Range Filter
            if (filters?.priceRange) {
                const { min, max } = filters.priceRange;
                filtered = filtered.filter((item) => {
                    const price = parseFloat(
                        String(item.price || "0").replace(/[^0-9.-]+/g, ""),
                    );

                    if (min !== null && max !== null) {
                        return price >= min && price <= max;
                    } else if (min !== null) {
                        return price >= min;
                    } else if (max !== null) {
                        return price <= max;
                    }

                    return true;
                });
            }

            // 4. Has Image Filter
            if (filters?.hasImage !== null && filters?.hasImage !== undefined) {
                filtered = filtered.filter((item) => {
                    const hasImages = Boolean(item.images && item.images.length > 0);
                    return hasImages === filters.hasImage;
                });
            }

            // 5. Active Status Filter
            if (
                filters?.activeStatus !== null &&
                filters?.activeStatus !== undefined
            ) {
                filtered = filtered.filter(
                    (item) => item.active === filters.activeStatus,
                );
            }

            return filtered;
        },
        [searchTerm, filters, selectedLanguages],
    );

    /**
     * Get categories that have at least one matching item
     * This ensures we only show categories with filtered items
     */
    const getFilteredCategoriesAndItems = useCallback(() => {
        const categories = file.extractedData?.data?.categories || [];
        const items = file.extractedData?.data?.items || [];

        // Apply filters to items
        const filteredItems = filterItems(items, categories);

        // Get categories that have at least one filtered item
        const categoryIdsWithItems = new Set(
            filteredItems.map((item) => item.category),
        );
        const filteredCategories = categories.filter((cat) =>
            categoryIdsWithItems.has(cat.id),
        );

        return {
            categories: filteredCategories,
            items: filteredItems,
            totalItems: items.length,
        };
    }, [file.extractedData, filterItems]);

    // Get filtered data
    const {
        categories: filteredCategories,
        items: filteredItems,
        totalItems,
    } = getFilteredCategoriesAndItems();

    // ============================
    // CRUD HANDLERS
    // ============================

    const onChangeValue = useCallback(
        (id: string, newValue: string) => {
            const updated = handleUpdateValue(fileRef.current, id, newValue);
            setUpdatedFileData(updated);
        },
        [setUpdatedFileData],
    );

    const handleAddAttribute = useCallback(
        (categoryId: string, itemId: string) => {
            // Deep clone to ensure immutability (handles Timestamps properly)
            const extractedData = removeObjRef(fileRef.current.extractedData);
            const item = extractedData.data.items.find(
                (item: ExtractedDataItem) =>
                    item.category === categoryId && item.id === itemId,
            );

            if (!item) return;

            // Initialize attributes array if it doesn't exist
            if (!item.attributes) {
                item.attributes = [];
            }

            // Calculate next sequence ID
            const sequenceId =
                item.attributes.length > 0
                    ? Number(
                        item.attributes[item.attributes.length - 1]?.id?.split(
                            `${item.id}a`,
                        )[1],
                    ) + 1 || 1
                    : 1;

            const newAttribute: ExtractedDataAttribute = {
                id: `${item.id}a${sequenceId}`,
                name: Object.fromEntries(selectedLanguages.map((lang) => [lang, ""])),
                price: "",
                active: true,
            };

            item.attributes.push(newAttribute);

            setUpdatedFileData({ ...fileRef.current, extractedData });
        },
        [selectedLanguages, setUpdatedFileData],
    );

    const handleAddCategory = useCallback(() => {
        // Use shared utility for creating new category
        const newCategory = createNewCategory(
            fileRef.current,
            selectedLanguages,
            masterProjectId,
        );
        setEditCategoryModalState({
            active: true,
            category: newCategory,
            status: "add",
        });
    }, [selectedLanguages, masterProjectId]);

    const handleAddItem = useCallback(
        (categoryId: string) => {
            // Use shared utility for creating new item
            const newItem = createNewItem(
                fileRef.current,
                categoryId,
                selectedLanguages,
                masterProjectId,
            );
            setEditItemModalState({ active: true, item: newItem, status: "add" });
        },
        [selectedLanguages, masterProjectId],
    );

    const handleDeleteAttribute = useCallback(
        (categoryId: string, itemId: string, attrId: string) => {
            // Use shared utility for attribute deletion
            const extractedData = deleteAttribute(
                fileRef.current,
                categoryId,
                itemId,
                attrId,
            );
            setUpdatedFileData({ ...fileRef.current, extractedData });
        },
        [setUpdatedFileData],
    );

    const handleDeleteCategory = useCallback(
        (categoryId: string) => {
            // Use shared utility for category deletion
            const extractedData = deleteCategory(fileRef.current, categoryId);
            setUpdatedFileData({ ...fileRef.current, extractedData });
        },
        [setUpdatedFileData],
    );

    const handleDeleteItem = useCallback(
        (categoryId: string, itemId: string) => {
            // Use shared utility for item deletion
            const extractedData = deleteItem(fileRef.current, categoryId, itemId);
            setUpdatedFileData({ ...fileRef.current, extractedData });
        },
        [setUpdatedFileData],
    );

    const handleEditCategory = useCallback((category: ExtractedDataCategory) => {
        setEditCategoryModalState({ active: true, category, status: "edit" });
    }, []);

    const handleEditItem = useCallback((item: ExtractedDataItem) => {
        setEditItemModalState({ active: true, item, status: "edit" });
    }, []);

    // ============================
    // CONFIRMATION MODALS (using shared utilities)
    // ============================

    const confirmItemDeletion = useCallback(
        (categoryId: string, itemId: string) => {
            const item = fileRef.current.extractedData?.data?.items?.find(
                (i) => i.category === categoryId && i.id === itemId,
            );

            if (item) {
                confirmItemDelete({
                    item,
                    activeLanguage: selectedLanguages[0] || "en",
                    onDelete: () => handleDeleteItem(categoryId, itemId),
                });
            }
        },
        [handleDeleteItem, selectedLanguages],
    );

    const confirmCategoryDeletion = useCallback(
        (categoryId: string) => {
            const category = fileRef.current.extractedData?.data?.categories?.find(
                (cat) => cat.id === categoryId,
            );

            if (category) {
                confirmCategoryDelete({
                    category,
                    file: fileRef.current,
                    activeLanguage: selectedLanguages[0] || "en",
                    onDelete: () => handleDeleteCategory(categoryId),
                });
            }
        },
        [handleDeleteCategory, selectedLanguages],
    );

    const confirmAttributeDeletion = useCallback(
        (categoryId: string, itemId: string, attributeId: string) => {
            confirmAttributeDelete({
                onDelete: () => handleDeleteAttribute(categoryId, itemId, attributeId),
            });
        },
        [handleDeleteAttribute],
    );

    return {
        // State
        activeInput,
        setActiveInput,
        editItemModalState,
        setEditItemModalState,
        editCategoryModalState,
        setEditCategoryModalState,

        // Filtered data
        filteredCategories,
        filteredItems,
        totalItems,

        // Handlers
        onChangeValue,
        handleAddAttribute,
        handleAddCategory,
        handleAddItem,
        handleEditCategory,
        handleEditItem,
        confirmItemDeletion,
        confirmCategoryDeletion,
        confirmAttributeDeletion,
    };
};
