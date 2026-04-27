import { InheritanceBadge } from "@atoms/InheritanceBadge";
import { FEATURE_FLAGS } from "@config/features";
import GlobalLanguagesList from "@data/languages";
import { getProjectDefaultLanguage } from "@lib/localization/projectContent";
import type { InheritanceState } from "@type/multiOutlet.types";
import {
    Button,
    Card,
    Empty,
    Flex,
    Image,
    Space,
    Splitter,
    Switch,
    Tag,
    theme,
    Tooltip,
    Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    LuCheck,
    LuEyeOff,
    LuFolderOpen,
    LuGlobe,
    LuLock,
    LuPen,
    LuPlus,
    LuTrash2,
} from "react-icons/lu";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
    Project,
    ProjectFileType,
} from "../../types";
import EditCategoryModal from "../editCategoryModal";
import EditItemModal from "../editItemModal";
import {
    confirmCategoryDelete,
    confirmItemDelete,
    createNewCategory,
    createNewItem,
    deleteCategory,
    deleteItemById,
} from "../utils/editorOperations";
import {
    hasActiveFilters as checkHasActiveFilters,
    filterItemsWithFiles,
} from "../utils/itemFilters";

const { Text, Title } = Typography;

interface TraditionalViewProps {
    projectData: Project;
    searchTerm: string;
    filters: any;
    setIsImageModalOpen: (state: {
        active: boolean;
        item?: ExtractedDataItem;
        from?: string;
    }) => void;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    onImageUpload: (...args: any[]) => void;
    setPreviewFile: (file: ProjectFileType | null) => void;
    selectedItemId?: string | null;
    setSelectedItemId?: (id: string | null) => void;
    keyboardSelectedCategoryId?: string | null;
    // Multi-outlet props
    itemStates?: Record<string, InheritanceState>;
    isMasterLinked?: boolean;
}

export const TraditionalView = ({
    projectData,
    searchTerm,
    filters,
    setIsImageModalOpen,
    setProjectData,
    onImageUpload,
    setPreviewFile,
    selectedItemId,
    setSelectedItemId,
    keyboardSelectedCategoryId,
    // Multi-outlet props
    itemStates,
    isMasterLinked,
}: TraditionalViewProps) => {
    const { token } = theme.useToken();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null,
    );

    // Sync category selection when keyboard navigation changes category
    useEffect(() => {
        if (
            keyboardSelectedCategoryId &&
            keyboardSelectedCategoryId !== selectedCategoryId
        ) {
            setSelectedCategoryId(keyboardSelectedCategoryId);
        }
    }, [keyboardSelectedCategoryId]);
    const [activeLanguage, setActiveLanguage] = useState<string>(
        getProjectDefaultLanguage(projectData),
    );
    useEffect(() => {
        setActiveLanguage((currentLanguage) => (
            projectData.languages.includes(currentLanguage)
                ? currentLanguage
                : getProjectDefaultLanguage(projectData)
        ));
    }, [projectData.defaultLanguage, projectData.languages]);
    const [hideInactiveCategories, setHideInactiveCategories] =
        useState<boolean>(false);
    const [hideInactiveItems, setHideInactiveItems] = useState<boolean>(false);

    // Modal states for edit operations
    const [editCategoryModalState, setEditCategoryModalState] = useState<{
        active: boolean;
        category: ExtractedDataCategory | null;
        status: "edit" | "add";
        file: ProjectFileType | null;
    }>({ active: false, category: null, status: "edit", file: null });

    const [editItemModalState, setEditItemModalState] = useState<{
        active: boolean;
        item: ExtractedDataItem | null;
        status: "edit" | "add";
        file: ProjectFileType | null;
    }>({ active: false, item: null, status: "edit", file: null });

    // Helper to update file data in projectData
    const updateFileData = useCallback(
        (fileUid: string, newExtractedData: any) => {
            setProjectData((prev) => ({
                ...prev,
                files: prev.files.map((f) =>
                    f.uid === fileUid ? { ...f, extractedData: newExtractedData } : f,
                ),
            }));
        },
        [setProjectData],
    );

    // Confirm category deletion - uses shared utility
    const confirmCategoryDeletion = useCallback(
        (category: ExtractedDataCategory, file: ProjectFileType) => {
            confirmCategoryDelete({
                category,
                file,
                activeLanguage,
                onDelete: () =>
                    updateFileData(file.uid, deleteCategory(file, category.id)),
            });
        },
        [activeLanguage, updateFileData],
    );

    // Confirm item deletion - uses shared utility
    const confirmItemDeletion = useCallback(
        (item: ExtractedDataItem, file: ProjectFileType) => {
            confirmItemDelete({
                item,
                activeLanguage,
                onDelete: () => updateFileData(file.uid, deleteItemById(file, item.id)),
            });
        },
        [activeLanguage, updateFileData],
    );

    // Open edit category modal
    const openEditCategoryModal = useCallback(
        (category: ExtractedDataCategory, file: ProjectFileType) => {
            setEditCategoryModalState({
                active: true,
                category,
                status: "edit",
                file,
            });
        },
        [],
    );

    // Open edit item modal
    const openEditItemModal = useCallback(
        (item: ExtractedDataItem, file: ProjectFileType) => {
            setEditItemModalState({ active: true, item, status: "edit", file });
        },
        [],
    );

    // Add new category - opens modal with new category
    const handleAddCategory = useCallback(
        (file: ProjectFileType) => {
            const newCategory = createNewCategory(
                file,
                projectData.languages,
                projectData.masterProjectId,
            );
            setEditCategoryModalState({
                active: true,
                category: newCategory,
                status: "add",
                file,
            });
        },
        [projectData.languages, projectData.masterProjectId],
    );

    // Add new item - opens modal with new item
    const handleAddItem = useCallback(
        (categoryId: string, file: ProjectFileType) => {
            const newItem = createNewItem(
                file,
                categoryId,
                projectData.languages,
                projectData.masterProjectId,
            );
            setEditItemModalState({
                active: true,
                item: newItem,
                status: "add",
                file,
            });
        },
        [projectData.languages, projectData.masterProjectId],
    );

    // Handle file data update from modals
    const handleModalFileUpdate = useCallback(
        (updatedFile: ProjectFileType) => {
            setProjectData((prev) => ({
                ...prev,
                files: prev.files.map((f) =>
                    f.uid === updatedFile.uid ? updatedFile : f,
                ),
            }));
        },
        [setProjectData],
    );

    // Aggregate all categories from ALL files
    const allCategoriesWithFiles = useMemo(() => {
        const categories: {
            category: ExtractedDataCategory;
            file: ProjectFileType;
        }[] = [];
        projectData?.files?.forEach((file) => {
            file.extractedData?.data?.categories?.forEach((category) => {
                categories.push({ category, file });
            });
        });
        return categories;
    }, [projectData?.files]);

    // Aggregate all items from ALL files
    const allItemsWithFiles = useMemo(() => {
        const items: { item: ExtractedDataItem; file: ProjectFileType }[] = [];
        projectData?.files?.forEach((file) => {
            file.extractedData?.data?.items?.forEach((item) => {
                items.push({ item, file });
            });
        });
        return items;
    }, [projectData?.files]);

    const categoryActiveById = useMemo(() => {
        const map: Record<string, boolean> = {};
        allCategoriesWithFiles.forEach(({ category }) => {
            map[category.id] = category.active !== false;
        });
        return map;
    }, [allCategoriesWithFiles]);

    // Filter categories based on search/filters
    const filteredCategories = useMemo(() => {
        let categories = allCategoriesWithFiles;

        // Apply search term filter
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            categories = categories.filter(({ category }) => {
                const categoryName = category.name?.[activeLanguage]?.toLowerCase();
                return categoryName?.includes(term);
            });
        }

        // Hide inactive/empty categories if toggle is on
        if (hideInactiveCategories) {
            categories = categories.filter(({ category }) => {
                // Hide inactive categories
                if (category.active === false) return false;
                // Hide empty categories (no items)
                const itemCount = allItemsWithFiles.filter(
                    ({ item }) => item.category === category.id,
                ).length;
                return itemCount > 0;
            });
        }

        return categories;
    }, [
        allCategoriesWithFiles,
        allItemsWithFiles,
        searchTerm,
        activeLanguage,
        hideInactiveCategories,
    ]);

    // Shared filter options - used by all filtering operations
    const filterOptions = useMemo(
        () => ({
            searchTerm,
            filters,
            activeLanguage,
            hideInactiveItems,
            categoryActiveById,
        }),
        [searchTerm, filters, activeLanguage, hideInactiveItems, categoryActiveById],
    );

    // Filter items based on search/filters and selected category
    const filteredItems = useMemo(() => {
        return filterItemsWithFiles(allItemsWithFiles, {
            ...filterOptions,
            categoryId: selectedCategoryId || undefined,
        });
    }, [allItemsWithFiles, filterOptions, selectedCategoryId]);

    // Get selected category items for display
    const selectedCategoryItems = filteredItems;

    // Calculate total items in selected category (before filtering)
    const totalItemsInCategory = useMemo(() => {
        if (!selectedCategoryId) return 0;
        return allItemsWithFiles.filter(
            ({ item }) => item.category === selectedCategoryId,
        ).length;
    }, [allItemsWithFiles, selectedCategoryId]);

    const selectedCategoryIsActive = useMemo(() => {
        if (!selectedCategoryId) return true;
        const selected = allCategoriesWithFiles.find(({ category }) => category.id === selectedCategoryId);
        return selected?.category?.active !== false;
    }, [allCategoriesWithFiles, selectedCategoryId]);

    // Get filtered item count for a specific category (uses shared filter utility)
    const getFilteredItemCountForCategory = useMemo(() => {
        // Pre-compute counts for all categories to avoid recalculating on each render
        const counts = new Map<string, number>();
        allCategoriesWithFiles.forEach(({ category }) => {
            const filtered = filterItemsWithFiles(allItemsWithFiles, {
                ...filterOptions,
                categoryId: category.id,
            });
            counts.set(category.id, filtered.length);
        });
        return (categoryId: string) => counts.get(categoryId) || 0;
    }, [allCategoriesWithFiles, allItemsWithFiles, filterOptions]);

    // Check if any filters are active (uses shared utility)
    const hasActiveFilters = useMemo(() => {
        return checkHasActiveFilters(filterOptions);
    }, [filterOptions]);

    // Calculate language completion stats across ALL files
    const languageStats = useMemo(() => {
        return projectData.languages.map((lang) => {
            let totalCategories = 0;
            let totalItems = 0;
            let filled = 0;

            // Aggregate across all files
            projectData.files?.forEach((file) => {
                const categories = file.extractedData?.data?.categories || [];
                const items = file.extractedData?.data?.items || [];

                totalCategories += categories.length;
                totalItems += items.length;

                categories.forEach((cat) => {
                    if (cat.name?.[lang]?.trim()) filled++;
                });
                items.forEach((item) => {
                    if (item.name?.[lang]?.trim()) filled++;
                });
            });

            const total = totalCategories + totalItems;
            const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
            return { lang, filled, total, percentage };
        });
    }, [projectData.files, projectData.languages]);

    // Auto-clear selected category if it no longer exists or is filtered out
    useEffect(() => {
        if (
            selectedCategoryId &&
            !filteredCategories.some(
                ({ category }) => category.id === selectedCategoryId,
            )
        ) {
            setSelectedCategoryId(null);
        }
    }, [filteredCategories, selectedCategoryId]);

    // Early return if no files exist (after all hooks)
    if (!projectData?.files || projectData.files.length === 0) {
        return (
            <Card
                size="small"
                style={{ width: "100%", height: "calc(100vh - 180px)" }}
            >
                <Empty description="No files available" />
            </Card>
        );
    }

    return (
        <>
            <Card
                size="small"
                style={{ width: "100%", height: "calc(100vh - 180px)" }}
            >
                {/* Language Switcher Header - Chip-based UI */}
                {projectData.languages.length > 1 && (
                    <Flex
                        align="center"
                        gap={8}
                        style={{
                            padding: "10px 16px",
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            background: token.colorBgContainer,
                        }}
                    >
                        <LuGlobe
                            size={14}
                            style={{ color: token.colorTextSecondary, flexShrink: 0 }}
                        />
                        <Flex gap={6} wrap="wrap" align="center">
                            {projectData.languages.map((lang, idx) => {
                                const stats = languageStats.find((s) => s.lang === lang);
                                const langData = GlobalLanguagesList.find(
                                    (l) => l.code === lang,
                                );
                                const isPrimary = idx === 0;
                                const isSelected = activeLanguage === lang;
                                const percentage = stats?.percentage || 0;

                                // Determine icon based on state
                                const getIcon = () => {
                                    if (isPrimary) return <LuLock size={11} />;
                                    if (percentage === 100) return <LuCheck size={11} />;
                                    return null;
                                };

                                // Determine tag color
                                const getTagColor = () => {
                                    if (isSelected) return "blue";
                                    if (percentage === 100) return "success";
                                    if (percentage > 0) return "warning";
                                    return "default";
                                };

                                return (
                                    <Tooltip
                                        key={lang}
                                        title={
                                            <>
                                                <div style={{ fontWeight: 600 }}>
                                                    {isPrimary
                                                        ? "🔒 Primary Language"
                                                        : langData?.name || lang.toUpperCase()}
                                                </div>
                                                <div style={{ fontSize: 11, opacity: 0.8 }}>
                                                    {stats?.filled || 0} of {stats?.total || 0} translated
                                                </div>
                                                {isPrimary && (
                                                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                                                        Source for all translations
                                                    </div>
                                                )}
                                            </>
                                        }
                                    >
                                        <Tag
                                            color={getTagColor()}
                                            icon={getIcon()}
                                            onClick={() => setActiveLanguage(lang)}
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "14px",
                                                fontSize: 12,
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                margin: 0,
                                                fontWeight: isSelected ? 600 : 400,
                                                border: isSelected
                                                    ? `2px solid ${token.colorPrimary}`
                                                    : undefined,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {langData?.nativeName || lang.toUpperCase()}
                                            {isPrimary && (
                                                <span
                                                    style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}
                                                >
                                                    Primary
                                                </span>
                                            )}
                                            {!isPrimary && percentage < 100 && percentage > 0 && (
                                                <span
                                                    style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}
                                                >
                                                    {percentage}%
                                                </span>
                                            )}
                                            {!isPrimary && percentage === 0 && (
                                                <span
                                                    style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}
                                                >
                                                    Empty
                                                </span>
                                            )}
                                        </Tag>
                                    </Tooltip>
                                );
                            })}
                        </Flex>
                    </Flex>
                )}

                <Splitter
                    style={{
                        height:
                            projectData.languages.length > 1 ? "calc(100% - 49px)" : "100%",
                    }}
                >
                    {/* Left Side: Categories List */}
                    <Splitter.Panel
                        defaultSize={280}
                        min={240}
                        max={400}
                        style={{
                            height: "100%",
                            overflow: "auto",
                            paddingRight: 16,
                        }}
                    >
                        <Flex
                            justify="space-between"
                            align="center"
                            style={{
                                marginBottom: 12,
                                paddingBottom: 12,
                                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                minHeight: 40,
                            }}
                        >
                            <Flex
                                align="center"
                                gap={8}
                                wrap="nowrap"
                                style={{ minWidth: 0, flex: 1 }}
                            >
                                <Title
                                    level={5}
                                    style={{
                                        margin: 0,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Categories
                                </Title>
                                <Tag
                                    color="default"
                                    style={{ borderRadius: 12, fontSize: 11, flexShrink: 0 }}
                                >
                                    {filteredCategories.length}
                                </Tag>
                                {/* {projectData.files.length > 1 && (
                                    <Tag color="blue" style={{ borderRadius: 12, fontSize: 11, flexShrink: 0 }}>
                                        {projectData.files.length} files
                                    </Tag>
                                )} */}
                            </Flex>
                            <Flex align="center" gap={8}>
                                <Tooltip
                                    title={
                                        hideInactiveCategories
                                            ? "Show all categories"
                                            : "Hide inactive & empty"
                                    }
                                >
                                    <Flex
                                        align="center"
                                        gap={4}
                                        onClick={() =>
                                            setHideInactiveCategories(!hideInactiveCategories)
                                        }
                                        style={{
                                            cursor: "pointer",
                                            opacity: hideInactiveCategories ? 1 : 0.5,
                                        }}
                                    >
                                        <LuEyeOff size={14} />
                                        <Switch
                                            size="small"
                                            checked={hideInactiveCategories}
                                            onChange={setHideInactiveCategories}
                                        />
                                    </Flex>
                                </Tooltip>
                                <Tooltip title="Add new category">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<LuPlus size={14} />}
                                        onClick={() => {
                                            // Use selected category's file, or fall back to first file
                                            const selectedCategoryFile = selectedCategoryId
                                                ? filteredCategories.find(
                                                    ({ category }) =>
                                                        category.id === selectedCategoryId,
                                                )?.file
                                                : null;
                                            const targetFile =
                                                selectedCategoryFile || projectData.files[0];
                                            if (targetFile) {
                                                handleAddCategory(targetFile);
                                            }
                                        }}
                                        style={{ opacity: 0.7, flexShrink: 0 }}
                                    >
                                        Add Category
                                    </Button>
                                </Tooltip>
                            </Flex>
                        </Flex>

                        <Flex vertical gap={4} style={{ flex: 1, overflow: "auto" }}>
                            {filteredCategories.length === 0 ? (
                                <Empty
                                    description="No categories found"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            ) : (
                                filteredCategories.map(({ category, file }, index) => {
                                    // Get filtered item count (respects search/filters)
                                    const filteredItemCount = getFilteredItemCountForCategory(
                                        category.id,
                                    );

                                    // Hide categories with 0 filtered items when filters are active
                                    if (hasActiveFilters && filteredItemCount === 0) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={category.id}
                                            onClick={() => setSelectedCategoryId(category.id)}
                                            style={{
                                                cursor: "pointer",
                                                padding: "10px 12px",
                                                borderRadius: 8,
                                                background:
                                                    selectedCategoryId === category.id
                                                        ? token.colorPrimaryBg
                                                        : "transparent",
                                                border: `2px solid ${selectedCategoryId === category.id ? token.colorPrimary : "transparent"}`,
                                                borderLeft:
                                                    selectedCategoryId === category.id
                                                        ? `4px solid ${token.colorPrimary}`
                                                        : "4px solid transparent",
                                                transition: "all 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedCategoryId !== category.id) {
                                                    e.currentTarget.style.background =
                                                        token.colorFillTertiary;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedCategoryId !== category.id) {
                                                    e.currentTarget.style.background = "transparent";
                                                }
                                            }}
                                        >
                                            <Flex justify="space-between" align="center" gap={8}>
                                                <Flex
                                                    align="center"
                                                    gap={10}
                                                    style={{ flex: 1, minWidth: 0 }}
                                                >
                                                    <LuFolderOpen
                                                        size={18}
                                                        style={{
                                                            color:
                                                                selectedCategoryId === category.id
                                                                    ? token.colorPrimary
                                                                    : token.colorTextSecondary,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                                                        <Text
                                                            strong={selectedCategoryId === category.id}
                                                            style={{
                                                                fontSize: 14,
                                                                color:
                                                                    selectedCategoryId === category.id
                                                                        ? token.colorPrimary
                                                                        : token.colorTextSecondary,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {category.name?.[activeLanguage] ||
                                                                "Unnamed Category"}
                                                        </Text>
                                                        {/* {projectData.files.length > 1 && (
                                                            <Text
                                                                type="secondary"
                                                                style={{
                                                                    fontSize: 11,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {file.name}
                                                            </Text>
                                                        )} */}
                                                    </Flex>
                                                </Flex>
                                                <Flex align="center" gap={4}>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginRight: 4,
                                                        }}
                                                    >
                                                        {filteredItemCount}
                                                    </Text>
                                                    {category.active === false && (
                                                        <Tag
                                                            color="error"
                                                            style={{
                                                                borderRadius: 12,
                                                                fontSize: 10,
                                                                padding: "0 6px",
                                                            }}
                                                        >
                                                            Inactive
                                                        </Tag>
                                                    )}
                                                    <Tooltip title="Edit category">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<LuPen size={14} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditCategoryModal(category, file);
                                                            }}
                                                            style={{
                                                                padding: "2px 6px",
                                                                height: 24,
                                                                opacity: 0.6,
                                                            }}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Delete category">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<LuTrash2 size={14} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                confirmCategoryDeletion(category, file);
                                                            }}
                                                            style={{
                                                                padding: "2px 6px",
                                                                height: 24,
                                                                opacity: 0.6,
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </Flex>
                                            </Flex>
                                        </div>
                                    );
                                })
                            )}
                        </Flex>
                    </Splitter.Panel>

                    {/* Right Side: Items List */}
                    <Splitter.Panel style={{ paddingLeft: 16 }}>
                        <Flex
                            vertical
                            style={{
                                height: "100%",
                                overflow: "auto",
                            }}
                        >
                            {selectedCategoryId ? (
                                <>
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                        style={{
                                            marginBottom: 12,
                                            paddingBottom: 12,
                                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                            minHeight: 40,
                                        }}
                                    >
                                        <Flex
                                            align="center"
                                            gap={8}
                                            wrap="nowrap"
                                            style={{ minWidth: 0, flex: 1 }}
                                        >
                                            <Title
                                                level={5}
                                                style={{
                                                    margin: 0,
                                                    fontSize: 16,
                                                    fontWeight: 600,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                Items
                                            </Title>
                                            <Tag
                                                color="default"
                                                style={{
                                                    borderRadius: 12,
                                                    fontSize: 11,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {hasActiveFilters &&
                                                    selectedCategoryItems.length !== totalItemsInCategory
                                                    ? `${selectedCategoryItems.length} of ${totalItemsInCategory}`
                                                    : selectedCategoryItems.length}
                                            </Tag>
                                        </Flex>
                                        <Flex align="center" gap={8}>
                                            <Tooltip
                                                title={
                                                    hideInactiveItems
                                                        ? "Show all items"
                                                        : "Hide inactive items"
                                                }
                                            >
                                                <Flex
                                                    align="center"
                                                    gap={4}
                                                    onClick={() =>
                                                        setHideInactiveItems(!hideInactiveItems)
                                                    }
                                                    style={{
                                                        cursor: "pointer",
                                                        opacity: hideInactiveItems ? 1 : 0.5,
                                                    }}
                                                >
                                                    <LuEyeOff size={14} />
                                                    <Switch
                                                        size="small"
                                                        checked={hideInactiveItems}
                                                        onChange={setHideInactiveItems}
                                                    />
                                                </Flex>
                                            </Tooltip>
                                            <Tooltip title="Add item to selected category">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<LuPlus size={14} />}
                                                    onClick={() => {
                                                        const categoryWithFile = filteredCategories.find(
                                                            ({ category }) =>
                                                                category.id === selectedCategoryId,
                                                        );
                                                        if (categoryWithFile && selectedCategoryId) {
                                                            handleAddItem(
                                                                selectedCategoryId,
                                                                categoryWithFile.file,
                                                            );
                                                        }
                                                    }}
                                                    style={{ opacity: 0.7 }}
                                                >
                                                    Add Item
                                                </Button>
                                            </Tooltip>
                                        </Flex>
                                    </Flex>

                                    <Flex vertical gap={8} style={{ flex: 1, overflow: "auto" }}>
                                        {selectedCategoryItems.length === 0 ? (
                                            <Empty
                                                description="No items in this category"
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            />
                                        ) : (
                                            selectedCategoryItems.map(({ item, file }, index) => {
                                                const isSelected = selectedItemId === item.id;
                                                const ItemCard = () => {
                                                    const [isHovered, setIsHovered] = useState(false);

                                                    return (
                                                        <Card
                                                            key={item.id}
                                                            data-item-id={item.id}
                                                            size="small"
                                                            hoverable
                                                            onClick={() => setSelectedItemId?.(item.id)}
                                                            onMouseEnter={() => setIsHovered(true)}
                                                            onMouseLeave={() => setIsHovered(false)}
                                                            style={{
                                                                background: isSelected
                                                                    ? token.colorPrimaryBg
                                                                    : token.colorBgContainer,
                                                                border: isSelected
                                                                    ? `2px solid ${token.colorPrimary}`
                                                                    : `1px solid ${isHovered ? token.colorPrimary : token.colorBorderSecondary}`,
                                                                borderRadius: token.borderRadiusLG,
                                                                marginBottom: 12,
                                                                transition: "all 0.2s ease",
                                                                cursor: "pointer",
                                                                boxShadow: isSelected
                                                                    ? `0 0 0 2px ${token.colorPrimaryBg}`
                                                                    : undefined,
                                                            }}
                                                            styles={{
                                                                body: {
                                                                    padding: "14px 16px",
                                                                },
                                                            }}
                                                        >
                                                            <Flex vertical gap={12}>
                                                                {/* Item Header */}
                                                                <Flex justify="space-between" align="center">
                                                                    <Flex
                                                                        gap={8}
                                                                        align="center"
                                                                        style={{ flex: 1, minWidth: 0 }}
                                                                    >
                                                                        <Text
                                                                            type="secondary"
                                                                            style={{
                                                                                fontSize: 11,
                                                                                fontFamily: "monospace",
                                                                                opacity: 0.5,
                                                                            }}
                                                                        >
                                                                            #{index + 1}
                                                                        </Text>

                                                                        {/* Multi-outlet Badge */}
                                                                        {FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
                                                                            isMasterLinked &&
                                                                            itemStates?.[item.id] && (
                                                                                <InheritanceBadge
                                                                                    state={itemStates[item.id]}
                                                                                    compact
                                                                                />
                                                                            )}

                                                                        {/* Item Images */}
                                                                        {item.images && item.images.length > 0 && (
                                                                            <Flex
                                                                                gap={4}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {item.images
                                                                                    .slice(0, 2)
                                                                                    .map(
                                                                                        (
                                                                                            imageData: any,
                                                                                            imgIndex: number,
                                                                                        ) => (
                                                                                            <Image
                                                                                                key={imgIndex}
                                                                                                src={imageData.url}
                                                                                                alt={`Item image ${imgIndex + 1}`}
                                                                                                width={40}
                                                                                                height={40}
                                                                                                style={{
                                                                                                    objectFit: "cover",
                                                                                                    borderRadius:
                                                                                                        token.borderRadius,
                                                                                                    border: `2px solid ${token.colorBorder}`,
                                                                                                }}
                                                                                                preview
                                                                                            />
                                                                                        ),
                                                                                    )}
                                                                                {item.images.length > 2 && (
                                                                                    <Flex
                                                                                        align="center"
                                                                                        justify="center"
                                                                                        style={{
                                                                                            width: 40,
                                                                                            height: 40,
                                                                                            borderRadius: token.borderRadius,
                                                                                            background:
                                                                                                token.colorFillTertiary,
                                                                                            fontSize: 11,
                                                                                            color: token.colorTextSecondary,
                                                                                        }}
                                                                                    >
                                                                                        +{item.images.length - 2}
                                                                                    </Flex>
                                                                                )}
                                                                            </Flex>
                                                                        )}

                                                                        <Flex
                                                                            vertical
                                                                            style={{ flex: 1, minWidth: 0 }}
                                                                        >
                                                                            <Text strong style={{ fontSize: 14 }}>
                                                                                {item.name?.[activeLanguage] ||
                                                                                    "Unnamed Item"}
                                                                            </Text>
                                                                            {/* {projectData.files.length > 1 && (
                                                                                <Text
                                                                                    type="secondary"
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        whiteSpace: 'nowrap'
                                                                                    }}
                                                                                >
                                                                                    {file.name}
                                                                                </Text>
                                                                            )} */}
                                                                        </Flex>

                                                                        {item.price ? (
                                                                            <Tag
                                                                                color="success"
                                                                                style={{ borderRadius: 12 }}
                                                                            >
                                                                                {item.price}
                                                                            </Tag>
                                                                        ) : item.attributes &&
                                                                            item.attributes.length > 0 ? (
                                                                            <Tag
                                                                                color="success"
                                                                                style={{ borderRadius: 12 }}
                                                                            >
                                                                                Varies
                                                                            </Tag>
                                                                        ) : (
                                                                            <Tag
                                                                                color="default"
                                                                                style={{
                                                                                    borderRadius: 12,
                                                                                    opacity: 0.6,
                                                                                }}
                                                                            >
                                                                                No price
                                                                            </Tag>
                                                                        )}
                                                                        {item.active === false && (
                                                                            <Tag
                                                                                color="error"
                                                                                style={{ borderRadius: 12 }}
                                                                            >
                                                                                Inactive
                                                                            </Tag>
                                                                        )}
                                                                        {item.active !== false && !selectedCategoryIsActive && (
                                                                            <Tag
                                                                                color="error"
                                                                                style={{ borderRadius: 12 }}
                                                                            >
                                                                                Hidden by category
                                                                            </Tag>
                                                                        )}
                                                                    </Flex>

                                                                    <Flex
                                                                        align="center"
                                                                        gap={4}
                                                                        style={{
                                                                            opacity: isHovered ? 1 : 0.6,
                                                                            transition: "opacity 0.2s ease",
                                                                        }}
                                                                    >
                                                                        <Tooltip title="Edit item">
                                                                            <Button
                                                                                type="default"
                                                                                size="small"
                                                                                icon={<LuPen />}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    openEditItemModal(item, file);
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                        <Tooltip
                                                                            title={
                                                                                FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
                                                                                    isMasterLinked &&
                                                                                    itemStates?.[item.id] === "inherited"
                                                                                    ? "Cannot delete inherited item"
                                                                                    : "Delete item"
                                                                            }
                                                                        >
                                                                            <Button
                                                                                type="default"
                                                                                size="small"
                                                                                danger
                                                                                icon={<LuTrash2 />}
                                                                                disabled={
                                                                                    FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
                                                                                    isMasterLinked &&
                                                                                    itemStates?.[item.id] === "inherited"
                                                                                }
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    confirmItemDeletion(item, file);
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    </Flex>
                                                                </Flex>

                                                                {/* Item Description */}
                                                                {item.description?.[activeLanguage] && (
                                                                    <Text
                                                                        type="secondary"
                                                                        style={{
                                                                            fontSize: 13,
                                                                            lineHeight: 1.6,
                                                                            display: "block",
                                                                            paddingLeft: 4,
                                                                        }}
                                                                    >
                                                                        {item.description[activeLanguage]}
                                                                    </Text>
                                                                )}

                                                                {/* Item Attributes */}
                                                                {item.attributes &&
                                                                    item.attributes.length > 0 && (
                                                                        <Flex vertical gap={6}>
                                                                            <Text
                                                                                type="secondary"
                                                                                style={{
                                                                                    fontSize: 12,
                                                                                    fontWeight: 500,
                                                                                }}
                                                                            >
                                                                                Variations:
                                                                            </Text>
                                                                            <Flex
                                                                                gap={8}
                                                                                wrap="wrap"
                                                                                style={{ paddingLeft: 4 }}
                                                                            >
                                                                                {item.attributes.map((attr: any) => (
                                                                                    <Tag
                                                                                        key={attr.id}
                                                                                        style={{ borderRadius: 12 }}
                                                                                    >
                                                                                        {attr.name?.[activeLanguage] ||
                                                                                            "Unnamed"}{" "}
                                                                                        - {attr.price}
                                                                                    </Tag>
                                                                                ))}
                                                                            </Flex>
                                                                        </Flex>
                                                                    )}
                                                            </Flex>
                                                        </Card>
                                                    );
                                                };
                                                return <ItemCard key={item.id} />;
                                            })
                                        )}
                                    </Flex>
                                </>
                            ) : (
                                <Flex
                                    justify="center"
                                    align="center"
                                    style={{ flex: 1, height: "100%" }}
                                >
                                    <Empty
                                        description={
                                            <Space direction="vertical" align="center">
                                                <Text>Select a category to view its items</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Click on any category from the left panel
                                                </Text>
                                            </Space>
                                        }
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                </Flex>
                            )}
                        </Flex>
                    </Splitter.Panel>
                </Splitter>
            </Card>

            {/* Edit Category Modal */}
            {editCategoryModalState.file && (
                <EditCategoryModal
                    modalData={{
                        active: editCategoryModalState.active,
                        category: editCategoryModalState.category,
                        status: editCategoryModalState.status,
                    }}
                    onClose={() =>
                        setEditCategoryModalState({
                            active: false,
                            category: null,
                            status: "edit",
                            file: null,
                        })
                    }
                    selectedLanguages={projectData.languages}
                    setUpdatedFileData={handleModalFileUpdate}
                    fileData={editCategoryModalState.file}
                    projectData={projectData}
                    onPreviewFile={setPreviewFile}
                    // Multi-outlet governance props - categories use same pattern as items
                    inheritanceState={editCategoryModalState.category?.id ? itemStates?.[editCategoryModalState.category.id] : undefined}
                    isMasterLinked={isMasterLinked}
                />
            )}

            {/* Edit Item Modal */}
            {editItemModalState.file && (
                <EditItemModal
                    modalData={{
                        active: editItemModalState.active,
                        item: editItemModalState.item,
                        status: editItemModalState.status,
                    }}
                    onClose={() =>
                        setEditItemModalState({
                            active: false,
                            item: null,
                            status: "edit",
                            file: null,
                        })
                    }
                    selectedLanguages={projectData.languages}
                    projectData={projectData}
                    onImageUpload={onImageUpload}
                    openAddImageModal={(itemData) =>
                        setIsImageModalOpen({ active: true, item: itemData, from: "item" })
                    }
                    setUpdatedFileData={handleModalFileUpdate}
                    fileData={editItemModalState.file}
                    onPreviewFile={setPreviewFile}
                    // Multi-outlet governance props
                    inheritanceState={editItemModalState.item?.id ? itemStates?.[editItemModalState.item.id] : undefined}
                    isMasterLinked={isMasterLinked}
                />
            )}
        </>
    );
};
