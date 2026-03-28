import { useKeyboardShortcuts } from "@hook/useKeyboardShortcuts";
import { removeObjRef } from "@util/utils";
import { message } from "antd";
import { useCallback, useState } from "react";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
    Project,
    ProjectFileType,
} from "../../types";
import { EDITOR_SHORTCUTS } from "../editorShortcuts.config";
import {
    confirmItemDelete,
    createNewCategory,
    createNewItem,
    deleteItemById,
} from "../utils/editorOperations";

// ============================
// TYPES
// ============================

interface EditCategoryModalState {
    active: boolean;
    category: ExtractedDataCategory | null;
    status: "edit" | "add";
    file: ProjectFileType | null;
}

interface EditItemModalState {
    active: boolean;
    item: ExtractedDataItem | null;
    status: "edit" | "add";
    file: ProjectFileType | null;
}

/** Pre-filtered item with file reference for keyboard navigation */
export interface NavigableItem {
    item: ExtractedDataItem;
    file: ProjectFileType;
}

interface UseEditorKeyboardShortcutsProps {
    /** Enable/disable keyboard shortcuts via feature flag */
    enabled?: boolean;
    projectData: Project;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    isSaving: boolean;
    syncChanges: () => Promise<void>;
    searchInputRef: React.RefObject<any>;
    // View switching
    editorView: "advanced" | "traditional" | "focus";
    setEditorView: (view: "advanced" | "traditional" | "focus") => void;
    // Pre-filtered items for navigation (from view's existing filtered data)
    filteredItems?: NavigableItem[];
    // Modal setters
    setIsLanguageModalOpen: (open: boolean) => void;
    setIsDescModalOpen: (state: {
        active: boolean;
        sourceFile?: ProjectFileType;
    }) => void;
    setIsImageModalOpen: (state: {
        active: boolean;
        item: ExtractedDataItem | null;
        from?: string;
    }) => void;
    setIsBulkStatusModalOpen: (open: boolean) => void;
    setIsReorderModalOpen: (open: boolean) => void;
    setIsShortcutsHelpOpen: (open: boolean) => void;
}

interface UseEditorKeyboardShortcutsReturn {
    // Selection state
    selectedFileId: string | null;
    setSelectedFileId: (id: string | null) => void;
    selectedCategoryId: string | null;
    setSelectedCategoryId: (id: string | null) => void;
    selectedItemId: string | null;
    setSelectedItemId: (id: string | null) => void;
    // Modal state
    editCategoryModalState: EditCategoryModalState;
    setEditCategoryModalState: React.Dispatch<
        React.SetStateAction<EditCategoryModalState>
    >;
    editItemModalState: EditItemModalState;
    setEditItemModalState: React.Dispatch<
        React.SetStateAction<EditItemModalState>
    >;
    // Helper function for modal updates
    handleModalFileUpdate: (updatedFile: ProjectFileType) => void;
}

// ============================
// HOOK
// ============================

export const useEditorKeyboardShortcuts = ({
    enabled = true,
    projectData,
    setProjectData,
    isSaving,
    syncChanges,
    searchInputRef,
    editorView,
    setEditorView,
    filteredItems = [],
    setIsLanguageModalOpen,
    setIsDescModalOpen,
    setIsImageModalOpen,
    setIsBulkStatusModalOpen,
    setIsReorderModalOpen,
    setIsShortcutsHelpOpen,
}: UseEditorKeyboardShortcutsProps): UseEditorKeyboardShortcutsReturn => {
    // ============================
    // SELECTION STATE
    // ============================
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null,
    );
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // ============================
    // EDIT MODAL STATE
    // ============================
    const [editCategoryModalState, setEditCategoryModalState] =
        useState<EditCategoryModalState>({
            active: false,
            category: null,
            status: "edit",
            file: null,
        });

    const [editItemModalState, setEditItemModalState] =
        useState<EditItemModalState>({
            active: false,
            item: null,
            status: "edit",
            file: null,
        });

    // ============================
    // HELPER FUNCTIONS
    // ============================

    // Get selected item with its file reference
    const getSelectedItemWithFile = useCallback(() => {
        if (!selectedItemId) return null;
        for (const file of projectData?.files || []) {
            const item = file.extractedData?.data?.items?.find(
                (i) => i.id === selectedItemId,
            );
            if (item) return { item, file };
        }
        return null;
    }, [projectData, selectedItemId]);

    // Handle file data update from modals
    const handleModalFileUpdate = useCallback(
        (updatedFile: ProjectFileType) => {
            setProjectData((prev) => ({
                ...prev,
                files: prev.files?.map((f) =>
                    f.uid === updatedFile.uid ? updatedFile : f,
                ),
            }));
        },
        [setProjectData],
    );

    // Navigate to next/previous item (only through filtered/visible items)
    const navigateItems = useCallback(
        (direction: "next" | "previous") => {
            if (filteredItems.length === 0) {
                message.info("No items to navigate");
                return;
            }

            const currentIndex = selectedItemId
                ? filteredItems.findIndex(({ item }) => item.id === selectedItemId)
                : -1;

            let newIndex: number;
            if (direction === "next") {
                newIndex =
                    currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
            } else {
                newIndex =
                    currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
            }

            const { item, file } = filteredItems[newIndex];
            setSelectedItemId(item.id);
            setSelectedCategoryId(item.category);
            setSelectedFileId(file.uid);

            // Scroll selected item into view
            setTimeout(() => {
                const element = document.querySelector(`[data-item-id="${item.id}"]`);
                element?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
        },
        [filteredItems, selectedItemId],
    );

    // Toggle active status for selected item
    const toggleSelectedItemActive = useCallback(() => {
        const selected = getSelectedItemWithFile();
        if (!selected) {
            message.info("Select an item first (use ↑↓ arrows)");
            return;
        }

        const { item, file } = selected;
        const extractedData = removeObjRef(file.extractedData);
        extractedData.data.items = extractedData.data.items.map(
            (i: ExtractedDataItem) =>
                i.id === item.id ? { ...i, active: !i.active } : i,
        );

        handleModalFileUpdate({ ...file, extractedData });
        message.success(`Item ${item.active ? "deactivated" : "activated"}`);
    }, [getSelectedItemWithFile, handleModalFileUpdate]);

    // Delete selected item with confirmation
    const deleteSelectedItem = useCallback(() => {
        const selected = getSelectedItemWithFile();
        if (!selected) {
            message.info("Select an item first (use ↑↓ arrows)");
            return;
        }

        const { item, file } = selected;
        confirmItemDelete({
            item,
            activeLanguage: projectData.languages?.[0] || "en",
            onDelete: () => {
                const extractedData = deleteItemById(file, item.id);
                handleModalFileUpdate({ ...file, extractedData });
                setSelectedItemId(null); // Clear selection after delete
            },
        });
    }, [getSelectedItemWithFile, handleModalFileUpdate, projectData.languages]);

    // ============================
    // KEYBOARD SHORTCUTS
    // ============================

    useKeyboardShortcuts(
        [
            // ADD_ITEM (Ctrl+N)
            {
                ...EDITOR_SHORTCUTS.ADD_ITEM,
                action: () => {
                    // Determine which file to add to
                    let file: ProjectFileType | null = null;
                    const filesCount = projectData?.files?.length || 0;

                    if (filesCount === 0) {
                        message.info("No file available. Upload a file first.");
                        return;
                    }

                    if (selectedFileId) {
                        // User has selected an item, use that file (context is clear)
                        file =
                            projectData?.files?.find((f) => f.uid === selectedFileId) || null;
                    } else if (filesCount === 1) {
                        // Only one file, no ambiguity
                        file = projectData.files[0];
                    } else {
                        // Multiple files but no selection - ask user to establish context
                        message.info(
                            "Multiple files detected. Select an item first (↑↓) to set file context.",
                        );
                        return;
                    }

                    if (!file) {
                        message.info("No file available. Upload a file first.");
                        return;
                    }

                    const categoryId =
                        selectedCategoryId || file.extractedData?.data?.categories?.[0]?.id;

                    if (!categoryId) {
                        message.info(
                            "No category available. Add a category first (Ctrl+Shift+N).",
                        );
                        return;
                    }

                    const newItem = createNewItem(
                        file,
                        categoryId,
                        projectData.languages || ["en"],
                        projectData.masterProjectId,
                    );
                    setEditItemModalState({
                        active: true,
                        item: newItem,
                        status: "add",
                        file,
                    });
                },
            },
            // ADD_CATEGORY (Ctrl+Shift+N)
            {
                ...EDITOR_SHORTCUTS.ADD_CATEGORY,
                action: () => {
                    // Determine which file to add to
                    let file: ProjectFileType | null = null;
                    const filesCount = projectData?.files?.length || 0;

                    if (filesCount === 0) {
                        message.info("No file available. Upload a file first.");
                        return;
                    }

                    if (selectedFileId) {
                        // User has selected an item, use that file (context is clear)
                        file =
                            projectData?.files?.find((f) => f.uid === selectedFileId) || null;
                    } else if (filesCount === 1) {
                        // Only one file, no ambiguity
                        file = projectData.files[0];
                    } else {
                        // Multiple files but no selection - ask user to establish context
                        message.info(
                            "Multiple files detected. Select an item first (↑↓) to set file context.",
                        );
                        return;
                    }

                    if (!file) {
                        message.info("No file available. Upload a file first.");
                        return;
                    }

                    const newCategory = createNewCategory(
                        file,
                        projectData.languages || ["en"],
                        projectData.masterProjectId,
                    );
                    setEditCategoryModalState({
                        active: true,
                        category: newCategory,
                        status: "add",
                        file,
                    });
                },
            },
            // EDIT_ITEM (E)
            {
                ...EDITOR_SHORTCUTS.EDIT_ITEM,
                action: () => {
                    const selected = getSelectedItemWithFile();
                    if (!selected) {
                        message.info("Select an item first (use ↑↓ arrows)");
                        return;
                    }
                    setEditItemModalState({
                        active: true,
                        item: selected.item,
                        status: "edit",
                        file: selected.file,
                    });
                },
            },
            // SAVE_CHANGES (Ctrl+S)
            {
                ...EDITOR_SHORTCUTS.SAVE_CHANGES,
                action: () => {
                    if (!isSaving) {
                        void syncChanges();
                        message.success("Changes saved");
                    }
                },
            },
            // TOGGLE_ACTIVE (Ctrl+I)
            {
                ...EDITOR_SHORTCUTS.TOGGLE_ACTIVE,
                action: toggleSelectedItemActive,
            },
            // FOCUS_SEARCH (Ctrl+F)
            {
                ...EDITOR_SHORTCUTS.FOCUS_SEARCH,
                action: () => {
                    searchInputRef.current?.focus();
                },
            },
            // SELECT_PREVIOUS (↑)
            {
                ...EDITOR_SHORTCUTS.SELECT_PREVIOUS,
                action: () => navigateItems("previous"),
            },
            // SELECT_NEXT (↓)
            {
                ...EDITOR_SHORTCUTS.SELECT_NEXT,
                action: () => navigateItems("next"),
            },
            // DELETE_ITEM (Delete)
            {
                ...EDITOR_SHORTCUTS.DELETE_ITEM,
                action: deleteSelectedItem,
            },
            // CLOSE_MODAL / BLUR_SEARCH / CLEAR_SELECTION (Escape)
            {
                ...EDITOR_SHORTCUTS.CLOSE_MODAL,
                action: () => {
                    // Priority 1: If modals are open, let them handle Escape
                    if (editItemModalState.active || editCategoryModalState.active) {
                        return;
                    }

                    // Priority 2: If search is focused, blur it (keep query)
                    if (document.activeElement === searchInputRef.current?.input) {
                        searchInputRef.current?.blur();
                        return;
                    }

                    // Priority 3: Clear item selection
                    if (selectedItemId) {
                        setSelectedItemId(null);
                        setSelectedCategoryId(null);
                        setSelectedFileId(null);
                        message.info("Selection cleared");
                    }
                },
            },
            // TOGGLE_VIEW (Ctrl+\)
            {
                ...EDITOR_SHORTCUTS.TOGGLE_VIEW,
                action: () => {
                    const newView =
                        editorView === "advanced" ? "traditional" : "advanced";
                    setEditorView(newView);
                    message.info(
                        `Switched to ${newView === "advanced" ? "Advanced" : "Traditional"} View`,
                    );
                },
            },

            // ═══════════════════════════════════════════════════
            // BATCH ACTIONS
            // ═══════════════════════════════════════════════════
            {
                ...EDITOR_SHORTCUTS.LANGUAGE_MODAL,
                action: () => setIsLanguageModalOpen(true),
            },
            {
                ...EDITOR_SHORTCUTS.DESCRIPTION_MODAL,
                action: () => setIsDescModalOpen({ active: true }),
            },
            {
                ...EDITOR_SHORTCUTS.IMAGES_MODAL,
                action: () => setIsImageModalOpen({ active: true, item: null }),
            },
            {
                ...EDITOR_SHORTCUTS.BULK_STATUS_MODAL,
                action: () => setIsBulkStatusModalOpen(true),
            },
            {
                ...EDITOR_SHORTCUTS.REORDER_MODAL,
                action: () => setIsReorderModalOpen(true),
            },
            {
                ...EDITOR_SHORTCUTS.SHOW_SHORTCUTS,
                action: () => setIsShortcutsHelpOpen(true),
            },
        ],
        enabled,
    ); // Controlled by FEATURE_FLAGS.ENABLE_EDITOR_KEYBOARD_SHORTCUTS

    return {
        // Selection state
        selectedFileId,
        setSelectedFileId,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedItemId,
        setSelectedItemId,
        // Modal state
        editCategoryModalState,
        setEditCategoryModalState,
        editItemModalState,
        setEditItemModalState,
        // Helper
        handleModalFileUpdate,
    };
};
