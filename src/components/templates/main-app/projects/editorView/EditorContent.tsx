import { InheritanceBadge } from "@atoms/InheritanceBadge";
import { FEATURE_FLAGS } from "@config/features";
import { UserUploadedFileType } from "@type/common";
import type { InheritanceState } from "@type/multiOutlet.types";
import {
    Alert,
    Button,
    Card,
    Collapse,
    Empty,
    Flex,
    Image,
    Input,
    Space,
    Tag,
    Tooltip,
    Typography,
    theme,
} from "antd";
import { memo, useState } from "react";
import {
    LuImagePlus,
    LuLock,
    LuPen,
    LuPlus,
    LuTrash2,
    LuX,
} from "react-icons/lu";
import {
    ExtractedDataItem,
    ItemForDropdown,
    Project,
    ProjectFileType,
} from "../types";
import EditCategoryModal from "./editCategoryModal";
import EditItemModal from "./editItemModal";
import { EditorFilters } from "./EditorFiltersPopover";
import { useEditorLogic } from "./hooks/useEditorLogic";
const { TextArea } = Input;

const { Text } = Typography;

interface EditorContentProps {
    file: ProjectFileType;
    setUpdatedFileData: any;
    selectedLanguages: string[];
    setIsImageModalOpen: (itemData: ExtractedDataItem & { fileId?: string }, from: string) => void;
    projectData: Project;
    onImageUpload: (
        selectedItem: ItemForDropdown,
        imagesToUpload: UserUploadedFileType[],
    ) => Promise<void>;
    searchTerm?: string;
    filters?: EditorFilters;
    selectedItemId?: string | null;
    setSelectedItemId?: (id: string | null) => void;
    // Multi-outlet props (optional - only passed when feature enabled)
    itemStates?: Record<string, InheritanceState>;
    isMasterLinked?: boolean;
}

const LanguageTag = memo(({ lang }: { lang: string }) => (
    <Tag
        style={{
            minWidth: 50,
            textAlign: "center",
            lineHeight: "26px",
            fontSize: 13,
            borderRadius: 13,
        }}
    >
        {lang}
    </Tag>
));

const EditableInput = memo(
    ({
        content,
        id,
        activeInput,
        setActiveInput,
        onChangeValue,
        token,
        isLocked,
    }: any) => {
        const isActive = activeInput === id;
        const isDescription = id.includes("desc");
        const InputComponent = isDescription ? TextArea : Input;
        const props = isDescription ? { autoSize: { minRows: 2, maxRows: 4 } } : {};

        const getPlaceholder = (id: string) => {
            if (id.includes("category")) return `Category Name`;
            if (id.includes("item") && id.includes("attr") && id.includes("price"))
                return `A. Price`;
            if (id.includes("item") && id.includes("attr")) return `Attribute`;
            if (id.includes("item") && id.includes("price")) return `Price`;
            if (id.includes("item") && id.includes("desc")) return `Description`;
            if (id.includes("item")) return `Item Name`;
            return "";
        };

        // If field is locked (inherited item, brand-critical field), show locked state
        if (isLocked) {
            return (
                <Tooltip title="This field is controlled by master menu and cannot be edited">
                    <Input
                        value={content}
                        placeholder={getPlaceholder(id)}
                        disabled
                        suffix={<LuLock size={12} style={{ opacity: 0.5 }} />}
                        style={{
                            width: "100%",
                            background: token.colorFillAlter,
                            borderColor: token.colorBorderSecondary,
                            cursor: "not-allowed",
                            ...(isDescription ? { height: "auto" } : { height: 32 }),
                        }}
                    />
                </Tooltip>
            );
        }

        return (
            <InputComponent
                value={content}
                placeholder={getPlaceholder(id)}
                onChange={(e) => onChangeValue(id, e.target.value)}
                onFocus={(e) => {
                    setActiveInput(id);
                    e.stopPropagation();
                }}
                onBlur={() => setActiveInput(null)}
                {...props}
                style={{
                    width: "100%",
                    cursor: "text",
                    background: isActive ? token.colorBgContainer : token.colorFillAlter,
                    borderColor: isActive
                        ? token.colorPrimary
                        : token.colorBorderSecondary,
                    ...(isDescription ? { height: "auto" } : { height: 32 }),
                }}
            />
        );
    },
);

const EditorItem = memo(
    ({
        item,
        index,
        categoryId,
        selectedLanguages,
        token,
        activeInput,
        setActiveInput,
        onChangeValue,
        setEditItemModalState,
        setIsImageModalOpen,
        confirmItemDeletion,
        handleAddAttribute,
        confirmAttributeDeletion,
        isSelected,
        onSelect,
        categoryActive,
        // Multi-outlet props
        inheritanceState,
        isMasterLinked,
    }: any) => {
        const [isHovered, setIsHovered] = useState(false);

        // Determine if fields should be locked (inherited items have locked brand-critical fields)
        const isInheritedItem =
            inheritanceState === "inherited" || inheritanceState === "overridden";
        const isLockedField = (field: string) => {
            if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET || !isMasterLinked) return false;
            if (!isInheritedItem) return false;
            // Lock brand-critical fields for inherited items
            return ["name", "desc", "description", "images", "category"].some((f) =>
                field.includes(f),
            );
        };

        // Check if delete should be disabled (can't delete inherited items)
        const canDelete = !isInheritedItem;

        return (
            <Card
                size="small"
                hoverable
                key={item.id}
                data-item-id={item.id}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onSelect}
                style={{
                    width: "100%",
                    background: isSelected
                        ? token.colorPrimaryBg
                        : token.colorBgContainer,
                    border: isSelected
                        ? `2px solid ${token.colorPrimary}`
                        : `1px solid ${isHovered ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    marginBottom: 12,
                    transition: "all 0.2s ease",
                    boxShadow: isSelected
                        ? `0 0 0 2px ${token.colorPrimaryBg}`
                        : undefined,
                }}
            >
                <Flex vertical style={{ width: "100%" }} gap={8}>
                    <Flex
                        gap={8}
                        justify="space-between"
                        align="center"
                        style={{ width: "100%" }}
                    >
                        <Flex align="center" gap={8}>
                            <Typography.Text
                                strong
                                style={{
                                    fontSize: 13,
                                    color: token.colorTextSecondary,
                                    fontFamily: "monospace",
                                }}
                            >
                                #{index + 1}
                            </Typography.Text>
                            {/* Multi-outlet: Show inheritance badge */}
                            {FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
                                isMasterLinked &&
                                inheritanceState && (
                                    <InheritanceBadge state={inheritanceState} compact />
                                )}
                            {item.images && item.images.length > 0 && (
                                <Flex gap={4} wrap="wrap">
                                    {item.images.map((imageData: any, imgIndex: number) => (
                                        <Image
                                            key={imgIndex}
                                            src={imageData.url}
                                            alt={`Item image ${imgIndex + 1}`}
                                            width={40}
                                            height={40}
                                            style={{
                                                objectFit: "cover",
                                                borderRadius: token.borderRadius,
                                                border: `2px solid ${token.colorBorder}`,
                                            }}
                                            preview
                                        />
                                    ))}
                                </Flex>
                            )}
                            {item.active === false && (
                                <Tag color="error" style={{ margin: 0 }}>
                                    Inactive
                                </Tag>
                            )}
                            {item.active !== false && categoryActive === false && (
                                <Tag color="error" style={{ margin: 0 }}>
                                    Hidden by category
                                </Tag>
                            )}
                        </Flex>

                        {/* Action Buttons - Always visible but more prominent on hover */}
                        <Flex
                            align="center"
                            gap={4}
                            style={{
                                opacity: isHovered ? 1 : 0.6,
                                transition: "opacity 0.2s ease",
                            }}
                        >
                            <Tooltip title="Edit Item">
                                <Button
                                    aria-label={`Edit ${item.name?.[selectedLanguages[0]] || 'item'}`}
                                    type="default"
                                    size="small"
                                    icon={<LuPen />}
                                    onClick={() =>
                                        setEditItemModalState({
                                            active: true,
                                            item: item,
                                            status: "edit",
                                        })
                                    }
                                />
                            </Tooltip>

                            <Tooltip title="Add/Manage Images">
                                <Button
                                    aria-label={`Manage images for ${item.name?.[selectedLanguages[0]] || 'item'}`}
                                    type="default"
                                    size="small"
                                    icon={<LuImagePlus />}
                                    onClick={() => setIsImageModalOpen(item, "item")}
                                />
                            </Tooltip>

                            <Tooltip
                                title={
                                    canDelete ? "Delete item" : "Cannot delete inherited item"
                                }
                            >
                                <Button
                                    aria-label={`Delete ${item.name?.[selectedLanguages[0]] || 'item'}`}
                                    type="default"
                                    size="small"
                                    danger
                                    disabled={!canDelete}
                                    icon={<LuTrash2 />}
                                    onClick={() =>
                                        canDelete && confirmItemDeletion(categoryId, item.id)
                                    }
                                />
                            </Tooltip>
                        </Flex>
                    </Flex>

                    <Space direction="vertical" style={{ width: "100%" }} size={4}>
                        {selectedLanguages.map((lang: string) => {
                            const name = item.name?.[lang] || "";
                            return Boolean(item.attributes?.length) ? (
                                <Card
                                    key={lang}
                                    size="small"
                                    style={{ background: token.colorFillAlter }}
                                >
                                    <Flex key={lang} align="flex-start" gap={8}>
                                        {selectedLanguages.length > 1 && (
                                            <LanguageTag lang={lang} />
                                        )}
                                        <Flex
                                            gap={12}
                                            style={{ flex: 1 }}
                                            align="flex-start"
                                            justify="space-between"
                                        >
                                            <Flex vertical gap={4} style={{ flex: 1, width: "100%" }}>
                                                <Flex>
                                                    <EditableInput
                                                        content={name}
                                                        id={`item-${categoryId}-${item.id}-name-${lang}`}
                                                        activeInput={activeInput}
                                                        setActiveInput={setActiveInput}
                                                        onChangeValue={onChangeValue}
                                                        token={token}
                                                        isLocked={isLockedField("name")}
                                                    />
                                                </Flex>
                                                <Flex>
                                                    <EditableInput
                                                        content={item.description?.[lang] || ""}
                                                        id={`item-${categoryId}-${item.id}-desc-${lang}`}
                                                        activeInput={activeInput}
                                                        setActiveInput={setActiveInput}
                                                        onChangeValue={onChangeValue}
                                                        token={token}
                                                        isLocked={isLockedField("desc")}
                                                    />
                                                </Flex>
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Flex
                                                    gap={8}
                                                    vertical
                                                    style={{ width: "auto", maxWidth: "max-content" }}
                                                >
                                                    {item.attributes.map((attr: any) => (
                                                        <Flex
                                                            key={attr.id}
                                                            gap={4}
                                                            style={{ width: "100%" }}
                                                        >
                                                            <div
                                                                style={{
                                                                    flex: 1,
                                                                    width: 100,
                                                                    maxWidth: 100,
                                                                    minWidth: 100,
                                                                }}
                                                            >
                                                                <EditableInput
                                                                    content={attr.name?.[lang] || ""}
                                                                    id={`item-${categoryId}-${item.id}-attr-${attr.id}-${lang}`}
                                                                    activeInput={activeInput}
                                                                    setActiveInput={setActiveInput}
                                                                    onChangeValue={onChangeValue}
                                                                    token={token}
                                                                />
                                                            </div>
                                                            <Flex align="center" gap={4}>
                                                                <div
                                                                    style={{
                                                                        flex: 1,
                                                                        width: "auto",
                                                                        maxWidth: 120,
                                                                        minWidth: 80,
                                                                    }}
                                                                >
                                                                    <EditableInput
                                                                        content={attr.price}
                                                                        id={`item-${categoryId}-${item.id}-attr-${attr.id}-price`}
                                                                        activeInput={activeInput}
                                                                        setActiveInput={setActiveInput}
                                                                        onChangeValue={onChangeValue}
                                                                        token={token}
                                                                    />
                                                                </div>
                                                                <Button
                                                                    aria-label={`Delete attribute ${attr.name?.[lang] || ''}`.trim()}
                                                                    type="text"
                                                                    size="small"
                                                                    danger
                                                                    icon={<LuX />}
                                                                    onClick={() =>
                                                                        confirmAttributeDeletion(
                                                                            categoryId,
                                                                            item.id,
                                                                            attr.id,
                                                                        )
                                                                    }
                                                                />
                                                            </Flex>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </Flex>
                                        </Flex>
                                    </Flex>
                                </Card>
                            ) : (
                                <Flex key={lang} align="flex-start" gap={8}>
                                    {selectedLanguages.length > 1 && <LanguageTag lang={lang} />}
                                    <Flex
                                        gap={12}
                                        style={{ flex: 1 }}
                                        align="flex-start"
                                        justify="space-between"
                                    >
                                        <Flex vertical gap={4} style={{ flex: 1 }}>
                                            <Flex>
                                                <EditableInput
                                                    content={name}
                                                    id={`item-${categoryId}-${item.id}-name-${lang}`}
                                                    activeInput={activeInput}
                                                    setActiveInput={setActiveInput}
                                                    onChangeValue={onChangeValue}
                                                    token={token}
                                                    isLocked={isLockedField("name")}
                                                />
                                            </Flex>
                                            <Flex>
                                                <EditableInput
                                                    content={item.description?.[lang] || ""}
                                                    id={`item-${categoryId}-${item.id}-desc-${lang}`}
                                                    activeInput={activeInput}
                                                    setActiveInput={setActiveInput}
                                                    onChangeValue={onChangeValue}
                                                    token={token}
                                                    isLocked={isLockedField("desc")}
                                                />
                                            </Flex>
                                        </Flex>
                                        <Flex
                                            style={{
                                                width: "max-content",
                                                minWidth: 80,
                                                maxWidth: 120,
                                            }}
                                        >
                                            <EditableInput
                                                content={item.price || ""}
                                                id={`item-${categoryId}-${item.id}-price`}
                                                activeInput={activeInput}
                                                setActiveInput={setActiveInput}
                                                onChangeValue={onChangeValue}
                                                token={token}
                                            />
                                        </Flex>
                                    </Flex>
                                </Flex>
                            );
                        })}
                    </Space>
                    <Flex
                        justify="flex-end"
                        style={{
                            width: "auto",
                            maxWidth: "max-content",
                            minWidth: Boolean(item.attributes?.length)
                                ? "100%"
                                : "min-content",
                        }}
                    >
                        <Button
                            block
                            type="dashed"
                            icon={<LuPlus />}
                            onClick={() => handleAddAttribute(categoryId, item.id)}
                            style={{ width: "max-content", height: "auto", minHeight: 32 }}
                        >
                            {" "}
                            Attribute
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        );
    },
);

EditorItem.displayName = "EditorItem";
EditableInput.displayName = "EditableInput";
LanguageTag.displayName = "LanguageTag";

export function EditorContent({
    file,
    setUpdatedFileData,
    selectedLanguages,
    setIsImageModalOpen,
    projectData,
    onImageUpload,
    searchTerm = "",
    filters,
    selectedItemId,
    setSelectedItemId,
    // Multi-outlet props
    itemStates,
    isMasterLinked,
}: EditorContentProps) {
    const { token } = theme.useToken();
    const showItemPrices = projectData?.config?.design?.menu?.showItemPrices ?? true;

    // Use shared editor logic hook
    const editorLogic = useEditorLogic({
        file,
        setUpdatedFileData,
        selectedLanguages,
        searchTerm,
        filters,
        showItemPrices,
        masterProjectId: projectData.masterProjectId,
    });

    const {
        activeInput,
        setActiveInput,
        editItemModalState,
        setEditItemModalState,
        editCategoryModalState,
        setEditCategoryModalState,
        filteredCategories,
        filteredItems,
        totalItems,
        onChangeValue,
        handleAddAttribute,
        handleAddCategory,
        handleAddItem,
        confirmItemDeletion,
        confirmCategoryDeletion,
        confirmAttributeDeletion,
    } = editorLogic;

    return (
        <>
            <Card
                styles={{ body: { padding: 0 } }}
                style={{
                    border: "unset",
                    width: "100%",
                    background: token.colorBgContainer,
                }}
            >
                {file.extractedData ? (
                    <Flex vertical gap={10}>
                        {file.extractedData?.message && (
                            <>
                                <Alert message={file.extractedData.message} type={"warning"} />
                            </>
                        )}

                        {/* Item Count Display */}
                        {(searchTerm ||
                            filters?.category ||
                            (showItemPrices && filters?.priceRange?.min) ||
                            (showItemPrices && filters?.priceRange?.max) ||
                            filters?.hasImage !== null ||
                            filters?.activeStatus !== null) && (
                                <Alert
                                    message={
                                        <Text>
                                            Showing <Text strong>{filteredItems.length}</Text> of{" "}
                                            <Text strong>{totalItems}</Text> items
                                            {filteredCategories.length <
                                                (file.extractedData?.data?.categories?.length || 0) && (
                                                    <Text type="secondary">
                                                        {" "}
                                                        in {filteredCategories.length}{" "}
                                                        {filteredCategories.length === 1
                                                            ? "category"
                                                            : "categories"}
                                                    </Text>
                                                )}
                                        </Text>
                                    }
                                    type="info"
                                    showIcon
                                    closable
                                    style={{ marginBottom: 8 }}
                                />
                            )}

                        {filteredCategories.length === 0 ? (
                            <Empty
                                description={
                                    <Space direction="vertical" align="center">
                                        <Text>No items match your search or filters</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Try adjusting your search term or removing some filters
                                        </Text>
                                    </Space>
                                }
                                style={{ padding: "40px 20px" }}
                            />
                        ) : (
                            <Collapse
                                defaultActiveKey={filteredCategories.map((cat) => cat.id)}
                                style={{ width: "100%" }}
                                items={filteredCategories.map((category) => {
                                    const categoryItems = filteredItems.filter(
                                        (item) => item.category === category.id,
                                    );
                                    return {
                                        key: category.id,
                                        label: (
                                            <Flex
                                                justify="space-between"
                                                align="center"
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    background: token.colorFillQuaternary,
                                                    borderRadius: token.borderRadius,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                <Flex align="center" gap={12} style={{ flex: 1 }}>
                                                    <Typography.Title
                                                        level={5}
                                                        style={{
                                                            margin: 0,
                                                            fontSize: 16,
                                                            fontWeight: 600,
                                                            color: token.colorText,
                                                        }}
                                                    >
                                                        {category.name?.[selectedLanguages[0]] ||
                                                            "Unnamed Category"}
                                                    </Typography.Title>
                                                    <Tag
                                                        color="default"
                                                        style={{
                                                            borderRadius: 12,
                                                            fontSize: 12,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {categoryItems.length}{" "}
                                                        {categoryItems.length === 1 ? "item" : "items"}
                                                    </Tag>
                                                    {!category.active && (
                                                        <Tag color="error" style={{ borderRadius: 12 }}>
                                                            Inactive
                                                        </Tag>
                                                    )}
                                                </Flex>
                                                <Flex align="center" gap={4}>
                                                    <Tooltip title="Edit Category">
                                                        <Button
                                                            aria-label={`Edit category ${category.name?.[selectedLanguages[0]] || ''}`.trim()}
                                                            type="default"
                                                            size="small"
                                                            icon={<LuPen />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                editorLogic.handleEditCategory(category);
                                                            }}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Add Item">
                                                        <Button
                                                            aria-label={`Add item to ${category.name?.[selectedLanguages[0]] || 'category'}`}
                                                            type="default"
                                                            size="small"
                                                            icon={<LuPlus />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddItem(category.id);
                                                            }}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Delete Category">
                                                        <Button
                                                            aria-label={`Delete category ${category.name?.[selectedLanguages[0]] || ''}`.trim()}
                                                            type="default"
                                                            size="small"
                                                            danger
                                                            icon={<LuTrash2 />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                confirmCategoryDeletion(category.id);
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </Flex>
                                            </Flex>
                                        ),
                                        children: (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {categoryItems.map((item, index) => (
                                                    <EditorItem
                                                        key={item.id}
                                                        item={item}
                                                        index={index}
                                                        categoryId={category.id}
                                                        selectedLanguages={selectedLanguages}
                                                        token={token}
                                                        activeInput={activeInput}
                                                        setActiveInput={setActiveInput}
                                                        onChangeValue={onChangeValue}
                                                        setEditItemModalState={setEditItemModalState}
                                                        setIsImageModalOpen={setIsImageModalOpen}
                                                        confirmItemDeletion={confirmItemDeletion}
                                                        handleAddAttribute={handleAddAttribute}
                                                        confirmAttributeDeletion={confirmAttributeDeletion}
                                                        isSelected={selectedItemId === item.id}
                                                        onSelect={() => setSelectedItemId?.(item.id)}
                                                        categoryActive={category.active !== false}
                                                        // Multi-outlet props
                                                        inheritanceState={itemStates?.[item.id]}
                                                        isMasterLinked={isMasterLinked}
                                                    />
                                                ))}
                                            </Space>
                                        ),
                                    };
                                })}
                            />
                        )}

                        <Button
                            size="large"
                            type="dashed"
                            icon={<LuPlus />}
                            onClick={handleAddCategory}
                            style={{ width: "100%" }}
                        >
                            Add Category
                        </Button>
                    </Flex>
                ) : (
                    <Empty description="No model response available" />
                )}
            </Card>

            <EditItemModal
                modalData={editItemModalState}
                onClose={() =>
                    setEditItemModalState({ active: false, item: null, status: "edit" })
                }
                selectedLanguages={selectedLanguages}
                projectData={projectData}
                onImageUpload={onImageUpload}
                openAddImageModal={(itemData) => setIsImageModalOpen(
                    { ...itemData, fileId: file.uid },
                    "item",
                )}
                setUpdatedFileData={setUpdatedFileData}
                fileData={file}
            />
            <EditCategoryModal
                modalData={editCategoryModalState}
                onClose={() =>
                    setEditCategoryModalState({
                        active: false,
                        category: null,
                        status: "edit",
                    })
                }
                selectedLanguages={selectedLanguages}
                setUpdatedFileData={setUpdatedFileData}
                fileData={file}
                projectData={projectData}
            />
        </>
    );
}

export default EditorContent;
