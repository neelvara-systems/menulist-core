import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import { APP_THEME_COLOR } from '@constant/common';
import { FEATURE_FLAGS } from '@config/features';
import { addImageBatchProcessingJob, assertImageBatchJobCreateSucceeded } from '@database/imageBatchProcessing';
import { normalizeImageBatchGenerationConfig } from '@lib/ai/imageBatchClientBoundary';
import { IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS, type ImageBatchProjectSelection } from '@lib/ai/imageBatchProjectSelection';
import { applyProjectImagePreferencesToGenerationConfig, extractImagePreferencePatch, mergeProjectAIPreferences } from '@lib/ai/projectAIPreferences';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import { loadImageGenPreferences, saveImageGenPreferences } from '@lib/imageGenPreferences';
import {
    assessItemPhotoReadiness,
    isItemPhotoPreparationContextCurrent,
    type ItemPhotoCaptureMode,
    type ItemPhotoPreparationContext,
    type ItemPhotoReadinessResult,
} from '@lib/media/itemPhotoCaptureAssist';
import {
    buildItemImageTargetValue,
    parseItemImageTargetValue,
    resolveUniqueItemImageTarget,
} from '@lib/media/itemImageAssociationBoundary';
import { getMediaProfileAcceptAttribute, getSafeMediaAspectRatio } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName } from '@lib/media/prepareMediaImage';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import triggerBatchImageGenerationApi from '@services/ai/image/triggerBatchImageGenerationApi';
import { UserUploadedFileType } from '@type/common';
import { InheritanceState } from '@type/multiOutlet.types';
import { getISOStringDate } from '@util/dateTime';
import { removeObjRef } from '@util/utils';
import type { UploadProps } from 'antd';
import { Button, Flex, App, Modal, Select, Tabs, theme, Typography, Upload } from 'antd';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuSave, LuSparkles, LuUploadCloud, LuX } from 'react-icons/lu';
import ItemPhotoCaptureAssist from '../../../../shared/media/ItemPhotoCaptureAssist';
import { NavBar, Popup } from '../../../../mobile/antd';
import { BatchImageGenerationJobType, ExtractedDataCategory, ExtractedDataItem, GenerateImageViaApiPayloadBatchType, GenerateImageViaApiPayloadGenerationConfiType, GenerateImageViaApiPayloadItemDetailsType, ImageGenerationConfigType, ItemForDropdown, Project, ProjectFileType } from '../types'; // Assuming Project structure
import AiImageGenerator from './AiImageGenerator';
import BatchSetupView from './AiImageGenerator/batchImageGeneration';
import BatchImageGenerationResultView from './AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView';
import BatchImageGenerationView from './AiImageGenerator/batchImageGeneration/BatchImageGenerationView';
import UploadedImagesList from './uploadedImagesList';
import {
    getBoundedMenuEditorStringContext,
    getMenuEditorProjectLogContext,
    logMenuEditorFailure,
} from '../utils/editorDiagnostics';

const { Text } = Typography;

const EMPTY_INITIAL_BATCH_ITEM_IDS: string[] = [];

interface ImageUploadModalProps {
    open: boolean;
    onClose: () => void;
    projectData: Project;
    onProjectDataUpdate?: (updatedProject: Project) => Promise<void> | void;
    onBatchImagesPersist: (selections: ImageBatchProjectSelection[]) => Promise<void>;
    itemToUpdate: (ExtractedDataItem & { fileId?: string }) | null;
    onImageUpload: (item: ItemForDropdown, imagesToUse: UserUploadedFileType[]) => Promise<void>;
    from?: string;
    preferredInitialTab?: 'upload' | 'generate';
    initialBatchItemIds?: string[];
    /** Multi-outlet: Item inheritance states for governance filtering */
    itemStates?: Record<string, InheritanceState>;
    /** Multi-outlet: Whether this store is linked to a master */
    isMasterLinked?: boolean;
    /** Multi-outlet: Whether inherited item images may be locally overridden */
    allowInheritedImageOverride?: boolean;
}

export const DefaultGenerationConfig: ImageGenerationConfigType = {
    prompt: "",
    referanceImages: [],
    aspectRatio: '1:1',
    referanceImage: null,
    loading: false,
    generatedImages: [],
    stylesCategory: "Photorealism",
    styles: ["Natural Light"],
    agreeToTerms: false
}

function normalizeReferenceImages(images: unknown): UserUploadedFileType[] {
    return Array.isArray(images) ? images : [];
}

function toDropdownItem(
    item: ExtractedDataItem,
    file: ProjectFileType,
    language: string
): ItemForDropdown {
    return {
        ...item,
        attributesList: Array.isArray(item.attributes) ? item.attributes.map(attr => attr.name?.[language] || attr.id || '') : [],
        categoryName: (file.extractedData?.data?.categories ?? []).find(cat => cat.id === item.category)?.name?.[language] || 'Uncategorized',
        descriptionLine: item.description?.[language] || '',
        fileId: file.uid,
        id: item.id,
        itemName: item.name?.[language] || item.id || '',
    };
}

function areDropdownItemsEqual(
    prevItem: ItemForDropdown | null | undefined,
    nextItem: ItemForDropdown | null | undefined
): boolean {
    if (prevItem === nextItem) return true;
    if (!prevItem || !nextItem) return false;

    return prevItem.id === nextItem.id &&
        prevItem.fileId === nextItem.fileId &&
        prevItem.itemName === nextItem.itemName &&
        prevItem.categoryName === nextItem.categoryName &&
        prevItem.descriptionLine === nextItem.descriptionLine &&
        JSON.stringify(prevItem.attributesList || []) === JSON.stringify(nextItem.attributesList || []) &&
        JSON.stringify(normalizeReferenceImages(prevItem.images)) === JSON.stringify(normalizeReferenceImages(nextItem.images));
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
    open,
    onClose,
    projectData,
    onProjectDataUpdate,
    onBatchImagesPersist,
    itemToUpdate,
    onImageUpload,
    from,
    preferredInitialTab = 'upload',
    initialBatchItemIds: initialBatchItemIdsProp,
    itemStates,
    isMasterLinked = false,
    allowInheritedImageOverride = false
}) => {
    const { message: messageApi } = App.useApp();

    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const [modalView, setModalView] = useState<'initialChoice' | 'singleItemSetup' | 'batchSetup' | 'batchAIConfig' | 'batchResult'>('initialChoice');
    const [selectedItem, setSelectedItem] = useState<ItemForDropdown | null>(null);
    const [activeTab, setActiveTab] = useState<string>('upload');
    const [selectedImages, setSelectedImages] = useState<UserUploadedFileType[]>([]);
    const [generationConfig, setGenerationConfig] = useState<ImageGenerationConfigType>(DefaultGenerationConfig);
    const [selectedItemsForBatch, setSelectedItemsForBatch] = useState<string[]>([]); // Store IDs of selected items
    const [isUploadingSingleItem, setIsUploadingSingleItem] = useState(false);
    const { activeProject, activeBatchImageJob, setActiveBatchImageJob } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [batchGenerationConfig, setBatchGenerationConfig] = useState<GenerateImageViaApiPayloadGenerationConfiType>(DefaultGenerationConfig);
    const batchStartInFlightRef = useRef(false);
    const preparedUploadContextRef = useRef<ItemPhotoPreparationContext>({ itemId: null, revision: 0 });
    const dispatch = useAppDispatch()
    const initialBatchItemIds = initialBatchItemIdsProp ?? EMPTY_INITIAL_BATCH_ITEM_IDS;
    const initialBatchItemIdsKey = useMemo(() => initialBatchItemIds.join('|'), [initialBatchItemIds]);
    const initialBatchItemIdSet = useMemo(() => new Set(initialBatchItemIds), [initialBatchItemIdsKey]);

    const persistProjectImagePreferences = useCallback(async (config: Partial<ImageGenerationConfigType>) => {
        const updatedProject = mergeProjectAIPreferences(projectData, {
            image: extractImagePreferencePatch(config),
        });

        await onProjectDataUpdate?.(updatedProject);
    }, [onProjectDataUpdate, projectData]);

    const advancePreparedUploadContext = useCallback((itemId: string | null) => {
        preparedUploadContextRef.current = {
            itemId,
            revision: preparedUploadContextRef.current.revision + 1,
        };
    }, []);

    // Debug logging removed for production

    const resetGenerateState = useCallback(() => {
        advancePreparedUploadContext(null);
        const savedPrefs = storeDetails?.tenantId && storeDetails?.storeId
            ? loadImageGenPreferences(storeDetails.tenantId, storeDetails.storeId)
            : null;
        const configWithPrefs: ImageGenerationConfigType = projectData?.aiPreferences?.image
            ? applyProjectImagePreferencesToGenerationConfig(DefaultGenerationConfig, projectData, storeDetails?.businessType, storeDetails?.businessCategory)
            : savedPrefs
                ? {
                    ...DefaultGenerationConfig,
                    stylesCategory: savedPrefs.stylesCategory || DefaultGenerationConfig.stylesCategory,
                    styles: savedPrefs.styles?.length ? savedPrefs.styles : DefaultGenerationConfig.styles,
                    aspectRatio: savedPrefs.aspectRatio || DefaultGenerationConfig.aspectRatio,
                    backgroundColor: savedPrefs.backgroundColor ?? null,
                    environments: savedPrefs.environments,
                    foregroundColor: savedPrefs.foregroundColor ?? null,
                    lighting: savedPrefs.lighting,
                    colors: savedPrefs.colors,
                    moods: savedPrefs.moods,
                    compositions: savedPrefs.compositions,
                    negativePrompt: savedPrefs.negativePrompt || '',
                    transparentBg: savedPrefs.transparentBg || false,
                    isMultiMode: savedPrefs.isMultiMode,
                }
                : applyProjectImagePreferencesToGenerationConfig(DefaultGenerationConfig, projectData, storeDetails?.businessType, storeDetails?.businessCategory);
        configWithPrefs.referanceImages = normalizeReferenceImages(configWithPrefs.referanceImages);
        configWithPrefs.aspectRatio = getSafeMediaAspectRatio('menuItem', configWithPrefs.aspectRatio);
        setGenerationConfig(configWithPrefs);
        setBatchGenerationConfig(configWithPrefs);
        setActiveTab(FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? preferredInitialTab : 'upload');
        setSelectedImages([]);
        setSelectedItemsForBatch([]);
    }, [advancePreparedUploadContext, preferredInitialTab, projectData, storeDetails?.businessType, storeDetails?.tenantId, storeDetails?.storeId]);

    const closeModal = useCallback(() => {
        if (generationConfig.loading) return;
        onClose();
        resetGenerateState();
        setModalView('initialChoice');
    }, [generationConfig.loading, onClose, resetGenerateState]);

    const extractMenuData = useCallback((files?: ProjectFileType[]) => {
        const categoriesForDropdown: { id: string; name: string }[] = [];
        const itemsForDropdown: ItemForDropdown[] = [];
        const categoryMap: { [id: string]: string } = {};
        const language = projectData?.languages?.[0] || 'en';
        files?.forEach(file => {
            const data = file.extractedData?.data;
            if (data && data.categories && data.items) {
                (data.categories as ExtractedDataCategory[]).forEach(cat => {
                    const categoryId = cat.id;
                    const category = cat.name?.[language] || categoryId || 'Unknown Category';
                    if (categoryId) {
                        categoryMap[categoryId] = category;
                        categoriesForDropdown.push({ id: categoryId, name: category });
                    }
                });

                (data.items as ExtractedDataItem[]).forEach(itm => {
                    const itemId = itm.id;
                    const itemName = itm.name?.[language] || itemId || '';
                    const categoryName = categoryMap[itm.category] || 'Uncategorized';
                    const description = itm.description?.[language] || '';
                    if (itemId) {
                        itemsForDropdown.push({
                            ...itm,
                            id: itemId,
                            itemName,
                            categoryName,
                            attributesList: Array.isArray(itm.attributes) ? itm.attributes.map(attr => attr.name?.[language] || attr.id || '') : [],
                            descriptionLine: description,
                            fileId: file.uid
                        });
                    }
                });
            }
        });

        const result = { items: itemsForDropdown, categories: categoriesForDropdown };
        return result;
    }, [projectData?.languages]);

    const items: ItemForDropdown[] = useMemo(() => {
        if (!projectData?.files) return [];
        let allItems = extractMenuData(projectData.files).items;

        // Multi-outlet: Filter out inherited/overridden items for outlets
        // Outlets can only generate images for local-only items
        if (isMasterLinked && itemStates && !allowInheritedImageOverride) {
            allItems = allItems.filter(item => itemStates[item.id] === 'local-only');
        }

        return allItems;
    }, [allowInheritedImageOverride, extractMenuData, projectData?.files, isMasterLinked, itemStates]);

    useEffect(() => {
        if (open) {
            resetGenerateState();
            if (Boolean(activeBatchImageJob)) {
                setModalView('batchResult');
            } else {
                if (itemToUpdate) {
                    setModalView('singleItemSetup');
                } else if (FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && initialBatchItemIdSet.size > 0) {
                    setModalView('batchAIConfig');
                    const nextSelectedItems = items
                        .filter((item) => initialBatchItemIdSet.has(item.id))
                        .map((item) => item.id)
                        .slice(0, IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS);
                    if (initialBatchItemIdSet.size > IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS) {
                        messageApi.info(`You can generate photos for up to ${IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS} items at a time.`);
                    }
                    setSelectedItemsForBatch((previous) => (
                        previous.length === nextSelectedItems.length &&
                        previous.every((id, index) => id === nextSelectedItems[index])
                            ? previous
                            : nextSelectedItems
                    ));
                } else {
                    setModalView('initialChoice');
                    setSelectedItem(null);
                }
            }
        } else {
            advancePreparedUploadContext(null);
            setModalView('initialChoice');
            setSelectedItem(null);
            setSelectedItemsForBatch([]);
        }
    }, [activeBatchImageJob, advancePreparedUploadContext, initialBatchItemIdSet, itemToUpdate, items, open, resetGenerateState]);

    useEffect(() => {
        if (activeProject && selectedItem) {
            const file = (activeProject.files ?? []).find(file => {
                return file.extractedData?.data?.items?.some(item => item.id === selectedItem.id);
            });
            if (file) {
                const item = file.extractedData?.data?.items?.find(item => item.id === selectedItem.id)
                if (!item) return;
                const language = projectData?.languages?.[0] || 'en';
                const nextSelectedItem = toDropdownItem(item, file, language);
                setSelectedItem((prev) => areDropdownItemsEqual(prev, nextSelectedItem) ? prev : nextSelectedItem);
            }
        }
    }, [activeProject, projectData?.languages, selectedItem])

    useEffect(() => {
        if (!open) return;

        if (itemToUpdate?.id) {
            const matchedItem = resolveUniqueItemImageTarget(items, itemToUpdate);
            advancePreparedUploadContext(matchedItem?.id || null);
            setSelectedItem((prev) => areDropdownItemsEqual(prev, matchedItem || undefined) ? prev : (matchedItem ? removeObjRef(matchedItem) : null));
            setGenerationConfig((prev) => ({
                ...prev,
                referanceImages: normalizeReferenceImages(matchedItem?.images),
                referanceImage: null,
            }));
            return;
        }

        if (selectedItem?.id) {
            const refreshedItem = items.find((item) => item.id === selectedItem.id) || null;
            if (refreshedItem) {
                setSelectedItem((prev) => areDropdownItemsEqual(prev, refreshedItem) ? prev : removeObjRef(refreshedItem));
            }
        }
    }, [advancePreparedUploadContext, itemToUpdate?.fileId, itemToUpdate?.id, items, open, selectedItem?.id]);

    const onSelectItem = (value: string) => {
        const target = parseItemImageTargetValue(value);
        const nextSelectedItem = target
            ? resolveUniqueItemImageTarget(items, target)
            : null;
        advancePreparedUploadContext(nextSelectedItem?.id || null);
        setSelectedItem(nextSelectedItem);
        setSelectedImages([]);
        setGenerationConfig((prev) => ({
            ...prev,
            referanceImages: normalizeReferenceImages(nextSelectedItem?.images),
            referanceImage: null,
        }));
    };

    const onUploadGeneratedImage = async (imagesToUse?: UserUploadedFileType[]) => {
        let imagesToUpload: UserUploadedFileType[] = [];

        if (imagesToUse && imagesToUse.length > 0) {
            imagesToUpload = imagesToUse;
        } else if (activeTab === 'upload' && selectedImages.length > 0) {
            imagesToUpload = selectedImages;
        } else {
            messageApi.info('No images selected for upload.');
            return;
        }

        if (!selectedItem || imagesToUpload.length === 0) {
            messageApi.error('Please select an item and ensure images are ready for upload.');
            return;
        }

        setIsUploadingSingleItem(true);
        dispatch(startLoader("Uploading image"));
        try {
            await onImageUpload(selectedItem, imagesToUpload);
            if (storeDetails?.tenantId && storeDetails?.storeId) {
                saveImageGenPreferences(storeDetails.tenantId, storeDetails.storeId, generationConfig);
            }
            await persistProjectImagePreferences(generationConfig);
            setGenerationConfig({ ...generationConfig, generatedImages: [] });
            resetGenerateState();
        } finally {
            dispatch(stopLoader("Uploading image"));
            setIsUploadingSingleItem(false);
        }
    };

    const createAndTriggerBatchGeneration = async (
        requestedItemIds: string[],
        config: GenerateImageViaApiPayloadGenerationConfiType,
        source: 'new' | 'retry',
    ): Promise<void> => {
        if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) {
            messageApi.info('Image generation is currently unavailable.');
            return;
        }
        if (batchStartInFlightRef.current) {
            messageApi.info('Image generation is already starting.');
            return;
        }

        batchStartInFlightRef.current = true;
        let createdJobId: string | null = null;
        try {
            dispatch(startLoader("Starting batch image generation"));
            const projectId = activeProject?.projectId;
            if (!projectId) throw new Error('image_upload_batch_project_missing');
            const uniqueItemIds = Array.from(new Set(requestedItemIds));
            if (!uniqueItemIds.length || uniqueItemIds.length > IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS) {
                throw new Error('image_upload_batch_item_count_invalid');
            }
            const canonicalConfig = normalizeImageBatchGenerationConfig(config);
            if (!canonicalConfig) throw new Error('image_upload_batch_generation_config_invalid');
            const payloadItems = uniqueItemIds.map((id) => {
                const item = items.find((candidate) => candidate.id === id);
                if (!item) throw new Error('image_upload_batch_item_missing');
                return {
                    attributes: item.attributesList,
                    category: item.categoryName,
                    description: item.descriptionLine,
                    id: item.id,
                    name: item.itemName,
                } satisfies GenerateImageViaApiPayloadItemDetailsType;
            });

            const newJob: BatchImageGenerationJobType = {
                enqueueFailedItemIds: [],
                failedItemIds: [],
                generatedCount: 0,
                generationConfig: canonicalConfig,
                itemExecutions: {},
                itemsList: [],
                projectId,
                requestedItemIds: uniqueItemIds,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
                statusHistory: [
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
                        reason: source === 'retry' ? 'Retry created as a new job' : 'Job created successfully',
                        createdOn: getISOStringDate(),
                    },
                ],
                totalImages: uniqueItemIds.length,
            };
            const jobId = await addImageBatchProcessingJob(newJob);
            assertImageBatchJobCreateSucceeded(jobId, 'image_upload_batch_job_create_rejected');
            createdJobId = jobId;
            const createdJobSnapshot: BatchImageGenerationJobType = {
                ...newJob,
                id: jobId,
            };
            setActiveBatchImageJob?.(createdJobSnapshot);

            const payload: GenerateImageViaApiPayloadBatchType = {
                generationConfig: canonicalConfig,
                projectId,
                businessType: storeDetails?.businessType || '',
                itemsList: payloadItems,
                jobId,
            };

            const triggerResult = await triggerBatchImageGenerationApi(payload);
            if (storeDetails?.tenantId && storeDetails?.storeId) {
                saveImageGenPreferences(storeDetails.tenantId, storeDetails.storeId, canonicalConfig);
            }
            await persistProjectImagePreferences(canonicalConfig);
            if (triggerResult.partial) {
                messageApi.warning(`${triggerResult.failedItemIds.length} item${triggerResult.failedItemIds.length === 1 ? '' : 's'} could not start. The remaining images are being generated.`);
            } else {
                messageApi.success(source === 'retry' ? 'A new retry job has started.' : 'Batch image generation started successfully');
            }

        } catch (error: unknown) {
            if (error instanceof AICapacityError) {
                messageApi.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                logMenuEditorFailure('menu_editor_batch_image_generation_start_failed', error, {
                    ...getMenuEditorProjectLogContext(activeProject?.projectId, activeProject?.masterProjectId),
                    ...getBoundedMenuEditorStringContext('jobId', createdJobId),
                    batchItemCount: requestedItemIds.length,
                    source,
                });
                messageApi.error('We could not confirm that image generation started. Check this job before trying again.');
            }
            throw error;
        } finally {
            batchStartInFlightRef.current = false;
            dispatch(stopLoader("Starting batch image generation"));
            dispatch(stopLoader("Triggering batch image generation"));
        }
    };

    const onStartBatchGeneration = async (): Promise<void> => {
        try {
            await createAndTriggerBatchGeneration(selectedItemsForBatch, batchGenerationConfig, 'new');
        } catch {
            // Owner-safe messaging and diagnostics are handled by the shared boundary.
        }
    };

    const onRetryBatchGeneration = async (failedJob: BatchImageGenerationJobType): Promise<void> => {
        const retryItemIds = failedJob.failedItemIds?.length
            ? failedJob.failedItemIds
            : failedJob.requestedItemIds || [];
        await createAndTriggerBatchGeneration(retryItemIds, failedJob.generationConfig, 'retry');
    };

    const addPreparedUploadFile = useCallback(async (
        file: File & { uid?: string },
        source: string,
    ): Promise<ItemPhotoReadinessResult | null> => {
        const startedContext = { ...preparedUploadContextRef.current };
        const prepared = await prepareMediaImage(file, 'menuItem');
        if (!isItemPhotoPreparationContextCurrent(startedContext, preparedUploadContextRef.current)) {
            return null;
        }
        const uid = file.uid || `${source}-${Date.now()}-${file.name}`;
        const newImage: UserUploadedFileType = {
            blob: prepared.blob,
            mediaChecksum: prepared.checksum,
            mediaId: prepared.mediaId,
            mediaProfile: 'menuItem',
            mediaVariant: prepared.primaryVariant,
            mediaVersion: prepared.version,
            name: toPreparedUploadName(file.name, prepared.mimeType, 'item-image'),
            preparedMedia: prepared,
            size: prepared.sizeBytes,
            source,
            type: prepared.mimeType,
            uid,
            url: prepared.dataUrl,
        };

        setSelectedImages((prevImages) => {
            if (prevImages.some((image) => image.uid === newImage.uid)) {
                return prevImages;
            }
            return [...prevImages, newImage];
        });
        setGenerationConfig((prev) => {
            const existingImages = normalizeReferenceImages(prev.referanceImages);
            if (existingImages.some((image) => image.uid === newImage.uid)) {
                return prev;
            }
            return { ...prev, referanceImages: [...existingImages, newImage] };
        });

        return assessItemPhotoReadiness(prepared);
    }, []);

    const handleCaptureAssistPhoto = useCallback((
        file: File,
        mode: ItemPhotoCaptureMode,
    ) => addPreparedUploadFile(file, `capture-assist:${mode}`), [addPreparedUploadFile]);

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        accept: getMediaProfileAcceptAttribute('menuItem'),
        listType: 'picture-card',
        maxCount: 10,
        className: 'upload-list-inline',
        fileList: selectedImages.map((image, index) => ({
            uid: image.uid || image.mediaId || image.url || `selected-image-${index}`,
            name: image.name || 'Image',
            status: 'done' as const,
            url: image.url,
        })),
        showUploadList: selectedImages.length > 0 ? { showPreviewIcon: false } : false,
        style: { width: '100%', backgroundColor: token.colorBgContainer },
        onRemove: (file) => {
            const uid = String(file.uid);
            setSelectedImages(prevImages => prevImages.filter(image => image.uid !== uid));
            setGenerationConfig(prev => ({
                ...prev,
                referanceImages: normalizeReferenceImages(prev.referanceImages).filter(image => image.uid !== uid)
            }));
            return true;
        },
        beforeUpload: async (file) => {
            try {
                await addPreparedUploadFile(file as File & { uid?: string }, 'device-upload');
            } catch (error) {
                logMenuEditorFailure('menu_editor_item_image_prepare_failed', error, {
                    ...getMenuEditorProjectLogContext(activeProject?.projectId, activeProject?.masterProjectId),
                    ...getBoundedMenuEditorStringContext('fileName', file.name),
                    ...getBoundedMenuEditorStringContext('selectedItemId', selectedItem?.id),
                });
                messageApi.error('Could not process this image. Please try another image.');
            }

            // Keep this as a local preview flow. Actual upload happens only on the final save action.
            return Upload.LIST_IGNORE;
        }
    };

    const imageUploadView = (_source: 'device' | 'ai') => {
        // Remove the custom preview logic, rely on Upload's listType='picture'
        return (
            <Flex vertical gap={12}>
                {FEATURE_FLAGS.ENABLE_ITEM_PHOTO_CAPTURE_ASSIST ? (
                    <ItemPhotoCaptureAssist
                        disabled={isUploadingSingleItem || !selectedItem?.id}
                        itemName={selectedItem?.itemName}
                        key={selectedItem?.id || 'no-item'}
                        onCapture={handleCaptureAssistPhoto}
                    />
                ) : null}
                <Upload.Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                        <LuUploadCloud size={48} color={token.colorPrimary} />
                    </p>
                    <p className="ant-upload-text">Click or drag file(s) to this area to upload</p>
                    <p className="ant-upload-hint">
                        Support for single or bulk upload. Max 10 images. JPG, PNG, or WebP.
                    </p>
                </Upload.Dragger>
            </Flex>
        );
    };

    const handleSingleItemFlow = () => {
        advancePreparedUploadContext(null);
        setModalView('singleItemSetup');
        setSelectedItem(null);
    };

    const handleBatchFlow = () => {
        advancePreparedUploadContext(null);
        setModalView('batchSetup');
        setSelectedItem(null);
        setSelectedImages([]);
        setSelectedItemsForBatch([]);
    };

    const handleBackToChoicesFromBatch = () => {
        setModalView('initialChoice');
        setSelectedItemsForBatch([]); // Clear selection when leaving batch setup
    };

    const handleSingleItemBack = useCallback(() => {
        resetGenerateState();
        if (itemToUpdate || from === 'item') {
            closeModal();
            return;
        }
        setModalView('initialChoice');
    }, [closeModal, from, itemToUpdate, resetGenerateState]);

    const renderInitialChoice = () => (
        <Flex
            vertical
            gap="large"
            align={isMobile ? 'stretch' : 'center'}
            style={{ paddingBottom: 20, marginTop: isMobile ? 0 : 20, width: '100%' }}
        >
            {!isMobile ? (
                <Typography.Title level={4} style={{ margin: 0 }}>How would you like to add images?</Typography.Title>
            ) : null}
            <Button
                size="large"
                block
                onClick={handleSingleItemFlow}
                icon={<LuUploadCloud size={24} />}
                style={{ height: 'auto', padding: '15px 20px', whiteSpace: 'normal' }}
            >
                <Flex vertical gap={4} align='start' justify='flex-start' >
                    <Typography.Text strong>For Single Item</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 10, textAlign: 'left' }}>
                        {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION
                            ? 'Upload from your device or generate a photo for one specific menu item.'
                            : 'Upload a photo from your device for one specific menu item.'}
                    </Typography.Text>
                </Flex>
            </Button>
            {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? (
                <Button
                    size="large"
                    block
                    onClick={handleBatchFlow}
                    icon={<LuSparkles color={APP_THEME_COLOR} size={24} />}
                    style={{ height: 'auto', padding: '15px 20px', whiteSpace: 'normal' }}
                >
                    <Flex vertical gap={4} align='start' justify='flex-start'>
                        <Typography.Text strong>For Multiple Items</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 10, textAlign: 'left' }}>
                            Select multiple items and generate photos for all of them at once.
                        </Typography.Text>
                    </Flex>
                </Button>
            ) : null}
        </Flex>
    );

    const renderSingleItemSetup = () => (
        <Flex gap={24} vertical style={{ width: '100%' }}>
            {!(itemToUpdate || from === 'item') && <Flex vertical gap={0}>
                <Typography.Text type='secondary'>Select Item:</Typography.Text>
                <Select
                    showSearch
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Select an item"
                    value={selectedItem ? buildItemImageTargetValue(selectedItem) || undefined : undefined}
                    onChange={onSelectItem}
                    filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={items.map(i => ({
                        value: buildItemImageTargetValue(i) || '',
                        label: <Text>{i.itemName} <Text type='secondary'>({i.categoryName})</Text></Text>,
                    }))}
                    disabled={Boolean(itemToUpdate)}
                />
            </Flex>}

            {/* Display previously uploaded images */}
            {selectedItem && (
                <Flex vertical gap={16}>
                    {selectedItem.images && selectedItem.images.length > 0 && <Flex vertical gap={8}>
                        <Typography.Text type='secondary'>Uploaded Images:</Typography.Text>
                        <UploadedImagesList
                            item={selectedItem}
                            onProjectDataUpdate={onProjectDataUpdate}
                            projectData={projectData}
                            onUploadGeneratedImage={onUploadGeneratedImage}
                        />
                    </Flex>}
                    {selectedItem?.descriptionLine && <Flex vertical gap={8}>
                        <Typography.Text type='secondary'>Description: {selectedItem?.descriptionLine}</Typography.Text>
                    </Flex>}
                </Flex>
            )}

            {/* uploaded images selectedItem.images */}
            {Boolean(selectedItem?.id) && (
                <Flex vertical gap={16} style={{ width: '100%' }}>
                    {/* <Typography.Text type='secondary'>Add Image:</Typography.Text> */}
                    <Tabs
                        type='line'
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        style={{ margin: "0" }}
                        items={[
                            {
                                icon: <LuUploadCloud />,
                                key: 'upload',
                                label: 'Upload from Device',
                                children: imageUploadView('device')
                            },
                            ...(FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? [{
                                icon: <LuSparkles color={APP_THEME_COLOR} />,
                                key: 'generate',
                                label: 'Generate Photo',
                                children: <AiImageGenerator
                                    selectedItem={selectedItem}
                                    generationConfig={generationConfig}
                                    setGenerationConfig={setGenerationConfig}
                                    uploadProps={uploadProps}
                                    onPreferencesUsed={persistProjectImagePreferences}
                                    onUploadGeneratedImage={onUploadGeneratedImage}
                                />
                            }] : []),
                        ]}
                    />
                </Flex>
            )}
        </Flex>
    );

    const renderBatchSetup = () => (
        <BatchSetupView
            allItemsForBatch={removeObjRef(items)}
            selectedItemsForBatch={selectedItemsForBatch}
            setSelectedItemsForBatch={setSelectedItemsForBatch}
            onProceedToConfig={() => setModalView('batchAIConfig')}
            onBackToChoices={handleBackToChoicesFromBatch}
        />
    );

    const renderBatchAIConfig = () => (
        <BatchImageGenerationView
            generationConfig={batchGenerationConfig}
            setGenerationConfig={setBatchGenerationConfig}
        />
    )

    const renderBatchResult = () => {
        if (!activeBatchImageJob) return null;
        return (
            <BatchImageGenerationResultView
                activeBatchImageJob={activeBatchImageJob}
                projectData={projectData}
                onBatchImagesPersist={onBatchImagesPersist}
                onComplete={onClose}
                onRetry={onRetryBatchGeneration}
            />
        );
    };

    const getModalTitle = () => {
        let titleText = '';
        let onBack: (() => void) | null = null;

        if (modalView === 'singleItemSetup') {
            titleText = `Add Image for ${selectedItem?.itemName || 'Item'}`;
            onBack = handleSingleItemBack;
        } else if (modalView === 'batchSetup') {
            titleText = '';
            onBack = () => {
                resetGenerateState();
                setModalView('initialChoice');
            };
        } else if (modalView === 'batchAIConfig') {
            titleText = 'Configure Batch Photo Generation';
            onBack = () => setModalView('batchSetup');
        } else {
            return ''; // Default for initialChoice, no back button
        }

        if (onBack) {
            return (
                <Flex align="center" gap={8} style={{ width: '100%' }}>
                    <Button
                        aria-label="Back to image options"
                        icon={<LuArrowLeft />}
                        shape="circle"
                        onClick={onBack}
                        disabled={generationConfig.loading}
                        style={{ marginRight: 8 }}
                    />
                    {titleText}
                </Flex>
            );
        }
        return titleText;
    };

    const getModalFooter = () => {

        if (modalView === 'singleItemSetup' && activeTab === 'upload' && selectedImages.length > 0) {
            return (
                <Flex style={{ width: '100%', marginTop: 8 }} gap={12} justify="space-between">
                    <Button size='large' icon={<LuX />} block disabled={isUploadingSingleItem} onClick={() => { onClose(); resetGenerateState(); }}>
                        Cancel
                    </Button>
                    <Button
                        size='large'
                        type="primary"
                        icon={<LuSave />}
                        block
                        loading={isUploadingSingleItem}
                        disabled={isUploadingSingleItem}
                        onClick={(e) => { e.stopPropagation(); void onUploadGeneratedImage(); }}
                    >
                        {`Upload ${selectedImages.length > 0 ? selectedImages.length : ''} Image(s)`}
                    </Button>
                </Flex>
            );
        }
        // No footer for initialChoice or batchSetup (item selection part) for now
        if (modalView === 'initialChoice' || modalView === 'batchSetup') {
            return null;
        }

        if (modalView === 'batchAIConfig') {
            const isGenerateDisabled = selectedItemsForBatch.length === 0 || !batchGenerationConfig.agreeToTerms;

            return (
                <Flex vertical style={{ width: '100%', marginTop: 8 }} gap={8}>
                    {!batchGenerationConfig.agreeToTerms && selectedItemsForBatch.length > 0 && (
                        <Text type="danger" style={{ fontSize: 12, textAlign: 'center' }}>
                            Please accept the Content Policy Agreement to proceed
                        </Text>
                    )}
                    <Flex style={{ width: '100%' }} gap={12} justify="space-between" vertical={isMobile}>
                        <Button size='large' icon={<LuArrowLeft />} block onClick={() => setModalView('batchSetup')} disabled={generationConfig.loading}>
                            Back to Item Selection
                        </Button>
                        <Button
                            size='large'
                            type="primary"
                            icon={<LuSparkles />}
                            block
                            onClick={onStartBatchGeneration}
                            disabled={isGenerateDisabled}
                        >
                            {`Generate for ${selectedItemsForBatch.length} Item(s)`}
                        </Button>
                    </Flex>
                </Flex>
            );
        }

        return null;
    };

    const getMobileHeaderTitle = () => {
        if (modalView === 'singleItemSetup') {
            return itemToUpdate || from === 'item'
                ? (selectedItem?.itemName || 'Add Images')
                : 'Add Images';
        }
        if (modalView === 'batchSetup') return 'Add Images';
        if (modalView === 'batchAIConfig') return 'Generate Images';
        if (modalView === 'batchResult') return 'Generated Images';
        return 'Add Images';
    };

    const getMobileBackHandler = () => {
        if (modalView === 'singleItemSetup') return handleSingleItemBack;
        if (modalView === 'batchSetup') return handleBackToChoicesFromBatch;
        if (modalView === 'batchAIConfig') return () => setModalView('batchSetup');
        if (modalView === 'batchResult') return closeModal;
        return closeModal;
    };

    const renderModalContent = () => (
        <>
            {modalView === 'initialChoice' && renderInitialChoice()}
            {modalView === 'singleItemSetup' && renderSingleItemSetup()}
            {modalView === 'batchSetup' && renderBatchSetup()}
            {modalView === 'batchAIConfig' && renderBatchAIConfig()}
            {modalView === 'batchResult' && renderBatchResult()}
        </>
    );

    return (
        <> {/* Wrap in fragment to fix JSX parent error */}
            {isMobile ? (
                <Popup
                    bodyStyle={{ minHeight: '68vh', maxHeight: '90vh', overflowX: 'hidden', padding: 0 }}
                    destroyOnClose
                    onMaskClick={generationConfig.loading ? undefined : closeModal}
                    visible={open}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <NavBar
                            onBack={getMobileBackHandler()}
                        >
                            {getMobileHeaderTitle()}
                        </NavBar>
                        <div
                            style={{
                                flex: 1,
                                overflowX: 'hidden',
                                overflowY: 'auto',
                                padding: '12px 16px 20px',
                            }}
                        >
                            {renderModalContent()}
                        </div>
                        {getModalFooter() ? (
                            <div
                                style={{
                                    backgroundColor: token.colorBgContainer,
                                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                                }}
                            >
                                {getModalFooter()}
                            </div>
                        ) : null}
                    </div>
                </Popup>
            ) : (
                <Modal
                    destroyOnHidden
                    maskClosable={false}
                    title={getModalTitle()}
                    open={open}
                    onCancel={generationConfig.loading ? undefined : closeModal}
                    footer={getModalFooter()}
                    style={{ top: activeTab === 'generate' ? 20 : 48 }}
                    width={modalView === 'initialChoice' ? 500 : (activeTab === 'generate' ? 1040 : 640)}
                    styles={{
                        body: {
                            maxHeight: activeTab === 'generate' ? 'calc(100vh - 180px)' : 'calc(100vh - 250px)',
                            padding: activeTab === 'generate' ? '12px 18px 18px' : '10px 10px 5px',
                            overflowY: activeTab === 'generate' ? 'hidden' : 'auto',
                            overflowX: 'hidden',
                            position: 'relative',
                            bottom: activeTab === 'generate' ? 0 : 10,
                        },
                    }}
                >
                    {renderModalContent()}
                </Modal>
            )}

        </>
    );
};

export default ImageUploadModal;
