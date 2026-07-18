import DrawerElement from "@antdComponent/drawerElement";
import ImageRenderer from "@atoms/imageRenderer";
import { BUSINESS_TYPES } from "@data/shared/businessTypes";
import { addAssetsCategory, addAssetsItem, addAssetsSubCategory, deleteAssetsCategory, deleteAssetsItem, deleteAssetsSubCategory, updateAssetsCategory, updateAssetsItem, updateAssetsSubCategory } from "@database/static/static";
import { useAppDispatch } from "@hook/useAppDispatch";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { isResponseBodyTooLargeError, readResponseUint8ArrayWithLimit } from "@lib/security/boundedResponseBody";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { AssetsCategoryType } from "@type/assets";
import { getBase64, getBase64Length, removeObjRef } from "@util/utils";
import { Button, Flex, Input, Popconfirm, Select, Switch, Tag, Typography, Upload } from "antd";
import { useEffect, useState } from "react";
import { LuPen, LuRefreshCcw, LuSave, LuUpload, LuX } from "react-icons/lu";
import { MdOutlineDelete } from "react-icons/md";
import { emptyDetailsData } from ".";
import styles from './styles.module.scss';
const { Text } = Typography;
const { Search } = Input;

const emptyFileData = { textContent: "", name: "", size: 0, type: "", src: null, compressed: { size: 0, src: "" } }
const PLATFORM_ASSET_REMOTE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const PLATFORM_ASSET_REMOTE_IMAGE_ALLOWED_MIME_TYPES = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
]);
const PLATFORM_ASSET_REMOTE_IMAGE_FAILED_MESSAGE = "Unable to fetch image. Please check the URL and try again.";
const PLATFORM_ASSET_REMOTE_IMAGE_TOO_LARGE_MESSAGE = "Image is too large. Use an image under 4 MB.";
const PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE = "Only HTTPS image URLs with PNG, JPG, WebP, GIF, or SVG files are supported.";

const normalizeSelectedAssetPreviewType = (
    value: string,
    fallback: AssetsCategoryType['previewType'],
): AssetsCategoryType['previewType'] => {
    const normalized = value.trim().toLowerCase().replace('image/jpg', 'image/jpeg');
    if (
        normalized === 'image/gif'
        || normalized === 'image/jpeg'
        || normalized === 'image/png'
        || normalized === 'image/svg+xml'
        || normalized === 'image/webp'
    ) {
        return normalized;
    }
    return fallback;
};

const normalizePlatformAssetRemoteImageMimeType = (value?: string | null) => {
    return (value || "").split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
};

const isLocalDevImageHost = (hostname: string) => {
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
};

const resolvePlatformAssetRemoteImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Platform asset image URL is required.");

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        throw new Error(PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE);
    }

    if (parsed.protocol === "https:") return parsed;
    if (parsed.protocol === "http:" && process.env.NODE_ENV !== "production" && isLocalDevImageHost(parsed.hostname)) {
        return parsed;
    }

    throw new Error(PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE);
};

const assertPlatformAssetRemoteImageMimeType = (mimeType: string) => {
    if (!PLATFORM_ASSET_REMOTE_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new Error(PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE);
    }
};

const bytesToBase64 = (bytes: Uint8Array) => {
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.byteLength; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        let chunkBinary = "";
        for (let chunkIndex = 0; chunkIndex < chunk.byteLength; chunkIndex += 1) {
            chunkBinary += String.fromCharCode(chunk[chunkIndex]);
        }
        binary += chunkBinary;
    }
    return btoa(binary);
};

const getPlatformAssetRemoteImageErrorMessage = (error: unknown) => {
    if (isResponseBodyTooLargeError(error)) return PLATFORM_ASSET_REMOTE_IMAGE_TOO_LARGE_MESSAGE;
    if (error instanceof Error && error.message === PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE) {
        return PLATFORM_ASSET_REMOTE_IMAGE_UNSUPPORTED_MESSAGE;
    }
    return PLATFORM_ASSET_REMOTE_IMAGE_FAILED_MESSAGE;
};

function DetailsModal({ activeAssetsType, modalData, onClose, onSubmit, activeCategory, activeSubCategory }) {

    const [activeDetails, setActiveDetails] = useState<AssetsCategoryType>(emptyDetailsData)
    const [tagValue, setTagValue] = useState('')
    const [selectedFile, setSelectedFile] = useState(emptyFileData) //"type:image/png"
    const dispatch = useAppDispatch()
    const [showSVGModal, setShowSVGModal] = useState(false);
    const [deployedUrl, setDeployedUrl] = useState('');

    useEffect(() => {
        setTagValue("");
        setSelectedFile(emptyFileData)
        setDeployedUrl("")
        setActiveDetails(modalData.data || emptyDetailsData)
    }, [modalData])

    const onChangeValue = (from, value) => {
        const categoryDataCopy = removeObjRef(activeDetails);
        categoryDataCopy[from] = value;
        setTagValue("")
        setActiveDetails(categoryDataCopy)
    }

    const onClickTag = (tag) => {
        const tags = activeDetails.tags.split(',');
        let index = tags.findIndex((t) => tag == t);
        if (index != -1) {
            tags.splice(index, 1)
        } else {
            tags.push(tag)
        }
        onChangeValue('tags', tags.join(","))
    }

    const isSvg = () => {
        return selectedFile.type.includes("svg")
    }
    const onSaveCategory = async () => {
        dispatch(startLoader("onSaveCategory"))
        try {
            if (Boolean(activeDetails?.id)) {
                const changedData: any = {};
                if (activeDetails.active !== modalData.data.active) changedData.active = activeDetails.active;
                if (activeDetails.name !== modalData.data.name) changedData.name = activeDetails.name;
                if (activeDetails.tags !== modalData.data.tags) changedData.tags = activeDetails.tags;
                if (selectedFile.src) {
                    changedData.newPreview = selectedFile.src;
                    changedData.preview = activeDetails.preview
                    changedData.previewType = normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType)
                };
                const updateResult = await updateAssetsCategory(activeAssetsType, changedData, String(activeDetails.id))
                onSubmit({ ...activeDetails, preview: updateResult.preview || activeDetails.preview })
                dispatch(showSuccessToast("Category updated !"))
            } else {
                const addResult = await addAssetsCategory(activeAssetsType, {
                    ...activeDetails,
                    newPreview: selectedFile.src,
                    previewType: normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType),
                })
                onSubmit(addResult)
                dispatch(showSuccessToast("Category added !"))
            }
        } catch (error) {
            logRuntimeFailure('platform_asset_category_save_failed', error, {
                ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                hasEntityId: activeDetails.id !== undefined,
            });
        } finally {
            dispatch(stopLoader("onSaveCategory"))
        }
    }

    const onSaveSubCategory = async () => {
        let updatedData = activeDetails;
        dispatch(startLoader("onSaveSubCategory"))
        try {
            if (!Boolean(activeCategory?.id)) throw new Error('platform_asset_parent_missing');

            const changedData: any = activeDetails;
            if (selectedFile.src) {
                changedData.newPreview = selectedFile.src;
                changedData.preview = activeDetails.preview
                changedData.previewType = normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType)
            };
            if (activeDetails.id) {
                updatedData = await updateAssetsSubCategory(activeAssetsType, changedData, activeCategory)
                const newCats = activeCategory.subCategories;
                const subcategoryIndex = activeCategory.subCategories.findIndex(subcategory => subcategory.id === activeDetails.id);
                newCats[subcategoryIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview, previewType: updatedData?.previewType || activeDetails.previewType }
                onSubmit({ ...activeCategory, subCategories: newCats });
                dispatch(showSuccessToast("Sub Category updated !"))
            } else {
                updatedData = await addAssetsSubCategory(activeAssetsType, {
                    ...changedData,
                    id: new Date().getTime(),
                    previewType: normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType),
                }, String(activeCategory.id))
                onSubmit({ ...activeCategory, subCategories: [...activeCategory.subCategories, updatedData] });
                dispatch(showSuccessToast("Sub Category added !"))
            }
        } catch (error) {
            logRuntimeFailure('platform_asset_subcategory_save_failed', error, {
                ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                hasEntityId: activeDetails.id !== undefined,
                hasParentId: activeCategory.id !== undefined,
            });
        } finally {
            dispatch(stopLoader("onSaveSubCategory"))
        }
    }

    const onSaveItem = async () => {
        let updatedData = activeDetails;
        const changedData: any = activeDetails;
        dispatch(startLoader("onSaveItem"))
        try {
            if (selectedFile.src) {
                changedData.newPreview = selectedFile.src;
                changedData.preview = activeDetails.preview
            changedData.previewType = normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType)
            };
            const activeCategoryCpy = removeObjRef(activeCategory);
            if (activeDetails.id) {
                updatedData = await updateAssetsItem(activeAssetsType, changedData, activeCategory, activeSubCategory)
                if (Boolean(activeSubCategory?.id)) {
                    const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                    const iIndex = activeCategoryCpy.subCategories[subcategoryIndex].items.findIndex(i => i.id == activeDetails.id)
                    activeCategoryCpy.subCategories[subcategoryIndex].items[iIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview }
                } else {
                    const iIndex = activeCategoryCpy.items.findIndex(i => i.id == activeDetails.id)
                    activeCategoryCpy.items[iIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview, previewType: updatedData?.previewType || activeDetails.previewType }
                }
                onSubmit({ ...activeCategoryCpy });
                dispatch(showSuccessToast("Item updated !"))
            } else {
                updatedData = await addAssetsItem(activeAssetsType, {
                    ...changedData,
                    id: new Date().getTime(),
                    previewType: normalizeSelectedAssetPreviewType(selectedFile.type, activeDetails.previewType),
                }, activeCategory, activeSubCategory)
                if (Boolean(activeSubCategory?.id)) {
                    const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                    activeCategoryCpy.subCategories[subcategoryIndex].items.push(updatedData)
                } else {
                    activeCategoryCpy.items.push(updatedData)
                }
                onSubmit({ ...activeCategoryCpy });
                dispatch(showSuccessToast("Item added !"))
            }
        } catch (error) {
            logRuntimeFailure('platform_asset_item_save_failed', error, {
                ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                hasEntityId: activeDetails.id !== undefined,
                hasParentId: activeCategory.id !== undefined,
                hasSubcategoryId: activeSubCategory.id !== undefined,
            });
        } finally {
            dispatch(stopLoader("onSaveItem"))
        }
    }

    const onSave = async () => {
        if (modalData.type == 'Category') await onSaveCategory()
        else if (modalData.type == 'Sub Category') await onSaveSubCategory()
        else if (modalData.type == 'Item') await onSaveItem()
    }

    const onDelete = async () => {
        dispatch(startLoader("onDelete"))
        try {
            if (modalData.type == 'Category') {
                await deleteAssetsCategory(activeAssetsType, activeDetails);
                onSubmit({ type: "deleted", catId: activeCategory.id, subCatId: activeSubCategory.id });
                dispatch(showSuccessToast("Category deleted !"))
            } else if (modalData.type == 'Sub Category') {
                await deleteAssetsSubCategory(activeAssetsType, activeDetails, activeCategory);
                let scId = activeCategory.subCategories.findIndex(c => c.id == activeDetails.id);
                activeCategory.subCategories.splice(scId, 1);
                onSubmit({ ...activeCategory });
                dispatch(showSuccessToast("Category deleted !"))
            } else if (modalData.type == 'Item') {
                await deleteAssetsItem(activeAssetsType, activeDetails, activeCategory, activeSubCategory);
                const activeCategoryCpy = removeObjRef(activeCategory);
                if (Boolean(activeSubCategory?.id)) {
                    const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                    const iIndex = activeCategoryCpy.subCategories[subcategoryIndex].items.findIndex(i => i.id == activeDetails.id)
                    activeCategoryCpy.subCategories[subcategoryIndex].items.splice(iIndex, 1)
                } else {
                    const iIndex = activeCategoryCpy.items.findIndex(i => i.id == activeDetails.id)
                    activeCategoryCpy.items.splice(iIndex, 1)
                }
                onSubmit({ ...activeCategoryCpy });
                dispatch(showSuccessToast("Item deleted !"))
            }
        } catch (error) {
            logRuntimeFailure('platform_asset_delete_failed', error, {
                ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                ...getBoundedRuntimeStringContext('entityType', modalData.type),
                hasEntityId: activeDetails.id !== undefined,
            });
        } finally {
            dispatch(stopLoader("onDelete"))
        }
    }

    const onAddTag = () => {
        const tag = tagValue.trim()
        if (Boolean(tag) && (!activeDetails.tags.includes(tag))) {
            onChangeValue('tags', (activeDetails.tags + `${activeDetails.tags.length ? "," : ""}${tag}`))
        }
    }

    const onCloseSvgModal = (data: any) => {
        if (data) {
            const { src, textContent } = data;
            if (src) {
                setSelectedFile({ ...selectedFile, src, size: getBase64Length(src), textContent })
            }
        }
        setShowSVGModal(false)
    }

    const handleFileChange = (info: any) => {
        const file = info.file;
        if (file.status === 'done') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const { originFileObj } = file;
                const content = e.target?.result as string;
                const base64 = await getBase64(originFileObj);
                const data = {
                    name: originFileObj.name,
                    size: originFileObj.size,
                    type: originFileObj.type.includes("svg") ? 'image/svg+xml' : originFileObj.type,
                    src: base64,
                    textContent: content,
                    compressed: {
                        size: getBase64Length(base64),
                        src: base64
                    }
                }
                setSelectedFile(data)
            };
            reader.readAsText(file.originFileObj);
        }
    };

    const getBase64FromUrl = async () => {
        if (!deployedUrl) {
            dispatch(showErrorToast("Please enter a deployed URL"));
            return;
        }

        dispatch(startLoader("fetchingBase64"));
        let statusCode: number | undefined;
        let responseContentType = "";
        try {
            const imageUrl = resolvePlatformAssetRemoteImageUrl(deployedUrl);
            const response = await fetch(imageUrl.toString());
            statusCode = response.status;
            responseContentType = response.headers.get("content-type") || "";
            if (!response.ok) {
                throw new Error("Platform asset image fetch rejected.");
            }

            const mimeType = normalizePlatformAssetRemoteImageMimeType(responseContentType);
            assertPlatformAssetRemoteImageMimeType(mimeType);

            const imageBytes = await readResponseUint8ArrayWithLimit(response, PLATFORM_ASSET_REMOTE_IMAGE_MAX_BYTES);
            if (!imageBytes.byteLength) throw new Error("Platform asset image response was empty.");
            const base64 = bytesToBase64(imageBytes);
            const dataUrl = `data:${mimeType};base64,${base64}`;
            const content = mimeType === "image/svg+xml" ? new TextDecoder().decode(imageBytes) : null;


            setSelectedFile({
                ...selectedFile,
                src: dataUrl,
                size: imageBytes.byteLength,
                type: mimeType,
                name: imageUrl.pathname.split('/').pop() || 'fetchedImage',
                textContent: content,
                compressed: {
                    size: getBase64Length(dataUrl),
                    src: dataUrl
                }
            });
            dispatch(showSuccessToast("Image fetched successfully!"));
        } catch (error) {
            logRuntimeFailure('platform_asset_fetch_image_failed', error, {
                ...getBoundedRuntimeStringContext('deployedUrl', deployedUrl),
                ...getBoundedRuntimeStringContext('responseContentType', responseContentType),
                statusCode,
                maxBytes: isResponseBodyTooLargeError(error) ? error.maxBytes : undefined,
                receivedBytes: isResponseBodyTooLargeError(error) ? error.receivedBytes : undefined,
            });
            dispatch(showErrorToast(statusCode === 404 ? "Image not found. Please check the URL." : getPlatformAssetRemoteImageErrorMessage(error)));
        }
        dispatch(stopLoader("fetchingBase64"));
    };


    const ImageUploader = ({ icon, text }) => {
        return <Upload
            accept="image/*"
            onChange={handleFileChange}
            showUploadList={false}
        >
            <Button icon={icon} size="large" type="primary">
                {text}
            </Button>
        </Upload>
    }

    const FetchFromUrl = () => {
        return <Flex gap={10}>
            <Input
                placeholder="Enter deployed URL"
                value={deployedUrl}
                onChange={(e) => setDeployedUrl(e.target.value)}
            />
            <Button onClick={getBase64FromUrl} icon={<LuRefreshCcw />}>
                Fetch from URL
            </Button>
        </Flex>
    }

    return (
        <DrawerElement
            title={`${activeDetails.id ? "Update" : "Add"} ${modalData.type}`}
            open={Boolean(modalData.active)}
            onClose={() => onClose({ active: false, data: null, type: "" })}
            footerActions={[
                <Button key="Cancel" icon={<LuX />} type="default" onClick={() => onClose({ active: false, data: null, type: "" })}>Cancel</Button>,
                <>
                    {activeDetails.id && <Popconfirm title="Are you sure to delete" onConfirm={onDelete}>
                        <Button icon={<MdOutlineDelete />} ghost danger type="primary">Dalete</Button>
                    </Popconfirm>}
                </>,
                <Button key="Save" icon={<LuSave />} type="primary" onClick={onSave}>Save</Button>
            ]}
            width={500}
        >
            <Flex vertical gap={20}>
                <Flex gap={20}>
                    <Flex vertical gap={10} style={{ width: "100%" }}>
                        <Text strong>Name</Text>
                        <Input size="large" placeholder={`${modalData.type} name`} value={activeDetails.name} onChange={(e) => onChangeValue('name', e.target.value)} />
                    </Flex>
                    <Flex vertical gap={10} style={{ width: 70 }} >
                        <Text strong>Active</Text>
                        <Switch checked={activeDetails.active} onChange={(checked) => onChangeValue('active', checked)} />
                    </Flex>
                </Flex>
                {modalData.type == 'Category' ? <>
                    <Flex vertical gap={10} style={{ width: "100%" }}>
                        <Text strong>Business Types</Text>
                        <Select
                            mode="multiple"
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Select business types"
                            options={BUSINESS_TYPES}
                            value={activeDetails.tags ? activeDetails.tags.split(',') : []}
                            onChange={(values) => onChangeValue('tags', values.join(','))}
                            size="large"
                        />
                    </Flex>
                </> :
                    <Flex vertical gap={10} style={{ width: "100%" }}  >
                        <Text strong>Tags</Text>
                        {Boolean(activeDetails.tags) && <Flex gap={5} wrap="wrap">
                            {activeDetails.tags.split(",").map((tag) => {
                                return <Tag onClick={() => onClickTag(tag)} style={{ fontSize: 14, lineHeight: 2 }} key={tag} >{tag}</Tag>
                            })}
                        </Flex>}
                        <Flex>
                            <Search size="large" onPressEnter={onAddTag} onSearch={onAddTag}
                                defaultValue={tagValue} value={tagValue} onChange={(e) => setTagValue(e.target.value)} enterButton="Add Tag" />
                        </Flex>
                    </Flex>}
                <Flex vertical gap={10} style={{ width: "100%" }}>
                    <Text strong>Preview</Text>
                    {(selectedFile.src || activeDetails.preview) ? <>
                        <Flex className={styles.previewImageWrap} vertical gap={10} align="center" justify="center" style={{ position: "relative" }}>
                            <ImageRenderer src={(selectedFile.src || activeDetails.preview)} width={200} height={200} />
                            {Boolean(selectedFile.src) ? <>
                                <Flex gap={10}>
                                    <Button icon={<LuX />} onClick={() => setSelectedFile(emptyFileData)} >Revert Image</Button>
                                    {selectedFile.type.includes("svg") && <Button icon={<LuPen />} onClick={() => setShowSVGModal(true)} >Edit SVG</Button>}
                                </Flex>
                                <Flex gap={10} vertical>
                                    <Text>File Name: {selectedFile.name}</Text>
                                    <Text>File Size: {(Number(selectedFile.size) / 1024).toFixed()} KB || {selectedFile.type}</Text>
                                </Flex>
                            </> :
                                <Flex vertical gap={10}>
                                    <ImageUploader icon={<LuRefreshCcw />} text="Replace Preview Image" />
                                    {/* <FetchFromUrl /> */}
                                </Flex>
                            }
                        </Flex>
                    </> :
                        <Flex vertical gap={10}>
                            <ImageUploader icon={<LuUpload />} text="Select Preview Image" />
                            {/* <FetchFromUrl /> */}
                        </Flex>
                    }
                </Flex>
            </Flex>
            {/* {Boolean(showSVGModal) && <SVGEditor active={showSVGModal} svgSrc={selectedFile.textContent} onCloseModal={onCloseSvgModal} />} */}
        </DrawerElement>
    )
}

export default DetailsModal
