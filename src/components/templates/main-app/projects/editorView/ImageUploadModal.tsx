import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import { APP_THEME_COLOR } from '@constant/common';
import { addImageBatchProcessingJob } from '@database/imageBatchProcessing';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import { loadImageGenPreferences, saveImageGenPreferences } from '@lib/imageGenPreferences';
import { validateImageQuality } from '@lib/imageQualityGuard';
import { logger } from '@lib/monitoring/logger';
import { calculateTotalImageWeight, validateImageUpload } from '@lib/performanceBudget';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import triggerBatchImageGenerationApi from '@services/ai/image/triggerBatchImageGenerationApi';
import { UserUploadedFileType } from '@type/common';
import { InheritanceState } from '@type/multiOutlet.types';
import { getISOStringDate } from '@util/dateTime';
import { getBase64, removeObjRef } from '@util/utils';
import type { UploadProps } from 'antd';
import { Button, Flex, message, Modal, Select, Tabs, theme, Typography, Upload } from 'antd';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuSave, LuSparkles, LuUploadCloud, LuX } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../mobile/antd';
import { BatchImageGenerationJobType, ExtractedDataCategory, ExtractedDataItem, GenerateImageViaApiPayloadBatchType, GenerateImageViaApiPayloadGenerationConfiType, GenerateImageViaApiPayloadItemDetailsType, ImageGenerationConfigType, ItemForDropdown, Project, ProjectFileType } from '../types'; // Assuming Project structure
import AiImageGenerator from './AiImageGenerator';
import BatchSetupView from './AiImageGenerator/batchImageGeneration';
import BatchImageGenerationResultView from './AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView';
import BatchImageGenerationView from './AiImageGenerator/batchImageGeneration/BatchImageGenerationView';
import EditImageModal from './AiImageGenerator/EditImageModal';
import UploadedImagesList from './uploadedImagesList';

const { Text } = Typography;

interface ImageUploadModalProps {
    open: boolean;
    onClose: () => void;
    projectData: Project;
    itemToUpdate: ExtractedDataItem | null;
    onImageUpload: (item: ItemForDropdown, imagesToUse?: UserUploadedFileType[]) => Promise<void>;
    from: string;
    /** Multi-outlet: Item inheritance states for governance filtering */
    itemStates?: Record<string, InheritanceState>;
    /** Multi-outlet: Whether this store is linked to a master */
    isMasterLinked?: boolean;
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

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ open, onClose, projectData, itemToUpdate, onImageUpload, from, itemStates, isMasterLinked = false }) => {

    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const [modalView, setModalView] = useState<'initialChoice' | 'singleItemSetup' | 'batchSetup' | 'batchAIConfig' | 'batchResult'>('initialChoice');
    const [selectedItem, setSelectedItem] = useState<ItemForDropdown | null>();
    const [activeTab, setActiveTab] = useState<string>('upload');
    const [selectedImages, setSelectedImages] = useState<UserUploadedFileType[]>([]);
    const [generationConfig, setGenerationConfig] = useState<ImageGenerationConfigType>(DefaultGenerationConfig);
    const [imageEditModal, setImageEditModal] = useState<{ active: boolean, imageData: UserUploadedFileType | null }>({ active: false, imageData: null });
    const [selectedItemsForBatch, setSelectedItemsForBatch] = useState<string[]>([]); // Store IDs of selected items
    const { activeProject, activeBatchImageJob } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [batchGenerationConfig, setBatchGenerationConfig] = useState<GenerateImageViaApiPayloadGenerationConfiType>(DefaultGenerationConfig);
    const dispatch = useAppDispatch()

    // Debug logging removed for production

    const resetGenerateState = useCallback(() => {
        const savedPrefs = storeDetails?.tenantId && storeDetails?.storeId
            ? loadImageGenPreferences(storeDetails.tenantId, storeDetails.storeId)
            : null;
        const configWithPrefs: ImageGenerationConfigType = savedPrefs
            ? {
                ...DefaultGenerationConfig,
                stylesCategory: savedPrefs.stylesCategory || DefaultGenerationConfig.stylesCategory,
                styles: savedPrefs.styles?.length ? savedPrefs.styles : DefaultGenerationConfig.styles,
                aspectRatio: savedPrefs.aspectRatio || DefaultGenerationConfig.aspectRatio,
                environments: savedPrefs.environments,
                lighting: savedPrefs.lighting,
                colors: savedPrefs.colors,
                moods: savedPrefs.moods,
                compositions: savedPrefs.compositions,
                isMultiMode: savedPrefs.isMultiMode,
            }
            : DefaultGenerationConfig;
        setGenerationConfig(configWithPrefs);
        setBatchGenerationConfig(configWithPrefs);
        setActiveTab('upload');
        setSelectedImages([]);
    }, [storeDetails?.tenantId, storeDetails?.storeId]);

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
                    const description = itm.description?.[language] || itemId || '';
                    if (itemId) {
                        const itemObj: ItemForDropdown = {
                            ...itm,
                            id: itemId,
                            itemName,
                            categoryName,
                            attributesList: Array.isArray(itm.attributes) ? itm.attributes.map(attr => attr.name?.[language] || attr.id || '') : [],
                            descriptionLine: description,
                            fileId: file.uid
                        };

                        itemsForDropdown.push(itemObj);
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
        if (isMasterLinked && itemStates) {
            allItems = allItems.filter(item => itemStates[item.id] === 'local-only');
        }

        return allItems;
    }, [extractMenuData, projectData?.files, isMasterLinked, itemStates]);

    useEffect(() => {
        if (open) {
            if (Boolean(activeBatchImageJob)) {
                setModalView('batchResult');
            } else {
                if (itemToUpdate) {
                    setModalView('singleItemSetup');
                } else {
                    setModalView('initialChoice');
                    setSelectedItem(null);
                }
            }
            resetGenerateState();
        } else {
            setModalView('initialChoice');
            setSelectedItem(null);
        }
    }, [open, itemToUpdate, activeBatchImageJob]);

    useEffect(() => {
        if (activeProject && selectedItem) {
            const file = activeProject.files.find(file => {
                return file.extractedData.data.items.find(item => item.id === selectedItem.id);
            });
            if (file) {
                const item = file.extractedData.data.items.find(item => item.id === selectedItem.id)
                const language = projectData?.languages?.[0] || 'en';
                const itemName = item.name?.[language] || item.id || '';
                const categoryName = file.extractedData.data.categories.find(cat => cat.id === item.category)?.name?.[language] || 'Uncategorized';
                const description = item.description?.[language] || item.id || '';
                setSelectedItem({
                    ...item,
                    itemName,
                    categoryName,
                    attributesList: item.attributes ? item.attributes?.map(attr => attr.name?.[language] || attr.id || '') || [] : [],
                    descriptionLine: description,
                    fileId: file.uid
                });
            }
        }
    }, [activeProject])

    useEffect(() => {
        if (!open) return;

        if (itemToUpdate?.id) {
            const matchedItem = items.find((item) => item.id === itemToUpdate.id) || null;
            setSelectedItem(matchedItem ? removeObjRef(matchedItem) : null);
            setGenerationConfig((prev) => ({
                ...prev,
                referanceImages: matchedItem?.images || [],
                referanceImage: null,
            }));
            return;
        }

        if (selectedItem?.id) {
            const refreshedItem = items.find((item) => item.id === selectedItem.id) || null;
            if (refreshedItem) {
                setSelectedItem(removeObjRef(refreshedItem));
            }
        }
    }, [itemToUpdate?.id, items, open, selectedItem?.id]);

    const onSelectItem = (value: string) => {
        const nextSelectedItem = items.find(i => i.id === value) || null;
        setSelectedItem(nextSelectedItem);
        setSelectedImages([]);
        setGenerationConfig((prev) => ({
            ...prev,
            referanceImages: nextSelectedItem?.images || [],
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
            message.info('No images selected for upload.');
            return;
        }

        if (!selectedItem || imagesToUpload.length === 0) {
            message.error('Please select an item and ensure images are ready for upload.');
            return;
        }

        onImageUpload(selectedItem, imagesToUpload).then(() => {
            logger.debug('Image uploaded successfully after onImageUpload');
            if (storeDetails?.tenantId && storeDetails?.storeId) {
                saveImageGenPreferences(storeDetails.tenantId, storeDetails.storeId, generationConfig);
            }
            setGenerationConfig({ ...generationConfig, generatedImages: [] });
            resetGenerateState();
        });
    };

    const onStartBatchGeneration = async (): Promise<void> => {
        try {
            dispatch(startLoader("Starting batch image generation"));

            const newJob: Omit<BatchImageGenerationJobType, 'id'> = {
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
                statusHistory: [
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
                        reason: 'Job Created Successfully',
                        createdOn: getISOStringDate(),
                    },
                ],
                totalImages: selectedItemsForBatch.length,
                generatedCount: 0,
                generationConfig: batchGenerationConfig,
                projectId: activeProject?.projectId || '',
                itemsList: []//initially its empty and whene image is generated via task queue it will be pushed to this array on by one
            };
            const jobId = await addImageBatchProcessingJob(newJob);

            const payload: GenerateImageViaApiPayloadBatchType = {
                generationConfig: batchGenerationConfig,
                projectId: activeProject?.projectId || '',
                businessType: storeDetails?.businessType || '',
                itemsList: selectedItemsForBatch.map(id => items.find(item => item.id === id)).map(item => {
                    if (item) {
                        const itemData: GenerateImageViaApiPayloadItemDetailsType = {
                            id: item.id,
                            name: item.itemName,
                            category: item.categoryName,
                            description: item.descriptionLine,
                            attributes: item.attributesList,
                        }
                        return itemData;
                    }
                }).filter(item => item !== undefined),
                jobId: jobId
            }

            await triggerBatchImageGenerationApi(payload);
            if (storeDetails?.tenantId && storeDetails?.storeId) {
                saveImageGenPreferences(storeDetails.tenantId, storeDetails.storeId, batchGenerationConfig);
            }
            message.success('Batch image generation started successfully');

        } catch (error: any) {
            if (error instanceof AICapacityError) {
                message.info('Get more AI enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                message.error(`Image generation failed: ${error.message}`);
                logger.error('Batch generation error', error);
            }
        } finally {
            dispatch(stopLoader("Starting batch image generation"));
            dispatch(stopLoader("Triggering batch image generation"));
        }
    }

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        accept: 'image/png, image/jpeg, image/webp',
        listType: 'picture-card',
        maxCount: 10,
        className: 'upload-list-inline',
        showUploadList: selectedImages.length > 0 ? { showPreviewIcon: false } : false,
        style: { width: '100%', backgroundColor: token.colorBgContainer },
        // Refactor onChange to use async/await with getBase64 Promise
        onChange: async (info) => { // Make handler async
            const { status, originFileObj, uid, name, type, size } = info.file;
            if (status === 'done' && originFileObj) {
                try {
                    // Await the Promise from getBase64
                    const url = await getBase64(originFileObj as any);
                    const newImage: UserUploadedFileType = {
                        uid: uid, // Use custom ID
                        url: url,
                        name: name,
                        type: type,
                        size: size
                    };
                    // Add the new file to the array, preventing duplicates by uid
                    setSelectedImages(prevImages => {
                        if (prevImages.some(img => img.uid === uid)) {
                            return prevImages; // Already exists
                        }
                        return [...prevImages, newImage];
                    });
                    setGenerationConfig(prev => ({ ...prev, referanceImages: [...prev.referanceImages, newImage] }))

                } catch (error) {
                    logger.error('Error getting base64', error);
                    message.error(`Error processing file ${name}`);
                    // Optionally remove the file if conversion failed (depends on desired UX)
                    setSelectedImages(prevImages => prevImages.filter(image => image.uid !== uid));
                    setGenerationConfig(prev => ({ ...prev, referanceImages: prev.referanceImages.filter(image => image.uid !== uid) }))
                }
            } else if (status === 'removed') {
                // Remove the specific file from the array using uid
                setSelectedImages(prevImages => prevImages.filter(image => image.uid !== uid));
                setGenerationConfig(prev => ({ ...prev, referanceImages: prev.referanceImages.filter(image => image.uid !== uid) }))
            } else if (status === 'error') {
                message.error(`${name} file upload failed.`);
                // Remove the failed file from the list
                setSelectedImages(prevImages => prevImages.filter(image => image.uid !== uid));
                setGenerationConfig(prev => ({ ...prev, referanceImages: prev.referanceImages.filter(image => image.uid !== uid) }))
            }
        },
        beforeUpload: async (file) => {
            // Check 1: File type validation
            const isJpgOrPngOrWebp = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
            if (!isJpgOrPngOrWebp) {
                message.error('You can only upload JPG/PNG/WEBP file!');
                return false;
            }

            // Check 2: Individual file size (legacy check)
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('Image must smaller than 2MB!');
                return false;
            }

            // Check 3: Constitutional Performance Budget (G03) - Global Image Weight
            const existingImagesKB = calculateTotalImageWeight(
                selectedImages.map(img => ({ size: img.size || 0 }))
            );

            const budgetValidation = validateImageUpload(file, existingImagesKB, 'item');

            if (!budgetValidation.allowed) {
                message.error(budgetValidation.reason);
                return false;
            }

            // Check 4: Constitutional Image Quality (G04) - Resolution & Aspect Ratio
            const qualityValidation = await validateImageQuality(file);

            if (!qualityValidation.allowed) {
                message.error(qualityValidation.reason);
                return false;
            }

            // All checks passed
            return true;
        }
    };

    const imageUploadView = (source: 'device' | 'ai') => {
        // Remove the custom preview logic, rely on Upload's listType='picture'
        return <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
                <LuUploadCloud size={48} color={token.colorPrimary} />
            </p>
            <p className="ant-upload-text">Click or drag file(s) to this area to upload</p>
            <p className="ant-upload-hint">
                Support for single or bulk upload. Max 10 images, 2MB per image. Allowed types: PNG, JPG, WEBP.
            </p>
        </Upload.Dragger>;
    };

    const handleSingleItemFlow = () => {
        setModalView('singleItemSetup');
        setSelectedItem(null);
    };

    const handleBatchFlow = () => {
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
        <Flex vertical gap="large" align="center" style={{ paddingBottom: 20, marginTop: 20 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>How would you like to add images?</Typography.Title>
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
                        Upload from your device or generate with AI for one specific menu item.
                    </Typography.Text>
                </Flex>
            </Button>
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
                        Select multiple items and let AI generate images for all of them at once.
                    </Typography.Text>
                </Flex>
            </Button>
        </Flex>
    );

    const renderSingleItemSetup = () => (
        <Flex gap={24} vertical style={{ width: '100%' }}>
            {!Boolean(from) && <Flex vertical gap={0}>
                <Typography.Text type='secondary'>Select Item:</Typography.Text>
                <Select
                    showSearch
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Select an item"
                    value={selectedItem?.id}
                    onChange={onSelectItem}
                    filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={items.map(i => ({ value: i.id, label: <Text>{i.itemName} <Text type='secondary'>({i.categoryName})</Text></Text> }))}
                    disabled={Boolean(itemToUpdate)}
                />
            </Flex>}

            {/* Display previously uploaded images */}
            {selectedItem && (
                <Flex vertical gap={16}>
                    {selectedItem.images && selectedItem.images.length > 0 && <Flex vertical gap={8}>
                        <Typography.Text type='secondary'>Uploaded Images:</Typography.Text>
                        <UploadedImagesList item={selectedItem} projectData={projectData} onUploadGeneratedImage={onUploadGeneratedImage} />
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
                            {
                                icon: <LuSparkles color={APP_THEME_COLOR} />,
                                key: 'generate',
                                label: 'Generate with AI',
                                children: <AiImageGenerator
                                    selectedItem={selectedItem}
                                    generationConfig={generationConfig}
                                    setGenerationConfig={setGenerationConfig}
                                    uploadProps={uploadProps}
                                    onUploadGeneratedImage={onUploadGeneratedImage}
                                />
                            },
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

    const renderBatchResult = () => (
        <BatchImageGenerationResultView
            activeBatchImageJob={activeBatchImageJob}
            projectData={projectData}
            onComplete={onClose}
        />
    )

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
            titleText = 'Configure Batch AI Generation';
            onBack = () => setModalView('batchSetup');
        } else {
            return ''; // Default for initialChoice, no back button
        }

        if (onBack) {
            return (
                <Flex align="center" gap={8} style={{ width: '100%' }}>
                    <Button
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
                <Flex style={{ width: '100%', marginTop: 8 }} gap={12} justify="space-between" vertical={isMobile}>
                    <Button size='large' icon={<LuX />} block onClick={() => { onClose(); resetGenerateState() }}>
                        Cancel
                    </Button>
                    <Button size='large' type="primary" icon={<LuSave />} block onClick={(e) => { e.stopPropagation(); onUploadGeneratedImage() }}>
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
                    bodyStyle={{ height: '100vh', maxHeight: '100vh', padding: 0 }}
                    destroyOnClose
                    onMaskClick={generationConfig.loading ? undefined : closeModal}
                    visible={open}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <NavBar
                            onBack={getMobileBackHandler()}
                            right={(
                                <Button
                                    icon={<LuX size={18} />}
                                    onClick={closeModal}
                                    style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                                    type="text"
                                />
                            )}
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
                    width={modalView === 'initialChoice' ? 500 : (activeTab === 'generate' ? 800 : 600)}
                    styles={{
                        body: {
                            maxHeight: 'calc(100vh - 250px)',
                            padding: '10px 10px 5px',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            position: 'relative',
                            bottom: 10,
                        },
                    }}
                >
                    {renderModalContent()}
                </Modal>
            )}

            <EditImageModal
                selectedItem={selectedItem}
                open={imageEditModal.active}
                onClose={() => setImageEditModal({ active: false, imageData: null })}
                imageData={imageEditModal.imageData}
                onUploadGeneratedImage={onUploadGeneratedImage}
            />
        </>
    );
};

export default ImageUploadModal;
