import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '../../src/config/features';
import {
    applyCategoryIconDefaults,
    resolveCategoryIcon,
} from '../../src/data/shared/categoryIconSuggestions';
import { isItemPhotoPreparationContextCurrent } from '../../src/lib/media/itemPhotoCaptureAssist';
import {
    appendItemImagesToProject,
    buildItemImageEditorTarget,
    buildItemImageTargetValue,
    getItemImagesSnapshot,
    parseItemImageTargetValue,
    removeItemImageFromProject,
    replaceItemImagesInProject,
    resolveUniqueItemImageTarget,
    toPersistedItemImage,
} from '../../src/lib/media/itemImageAssociationBoundary';
import { buildVisualProfileCompletion } from '../../src/lib/visualProfile/visualProfileCompletion';

const ROOT = path.resolve(__dirname, '..', '..');
const checks: string[] = [];

function read(relativePath: string): string {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertCheck(condition: unknown, message: string): void {
    if (!condition) throw new Error(message);
    checks.push(message);
}

const categoryPrimary = read('src/data/shared/categoryIconSuggestions.ts');
const categoryMirror = read('functions/src/sharedData/categoryIconSuggestions.ts');
const extractionWorker = read('functions/src/logic/processMenuImagesJob.ts');
const categoryRepair = read('src/lib/menu/categoryIconRepair.ts');
const categoryRenderer = read('src/components/atoms/CategoryIcon/index.tsx');
const desktopCategoryEditor = read('src/components/templates/main-app/projects/editorView/editCategoryModal.tsx');
const mobileCategoryEditor = read('src/components/mobile/sheets/MobileCategoryEditSheet.tsx');
const ownerDashboard = read('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx');
const ownerDashboardEnglish = read('public/locales/menulist.ai/en-GB.json');
const desktopShare = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
const imageUploadModal = read('src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx');
const itemImageAssociation = read('src/components/templates/main-app/projects/editorView/utils/associateItemImages.ts');
const uploadedImagesList = read('src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx');
const editImageModal = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx');
const editItemModal = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
const itemPhotoCapture = read('src/components/shared/media/ItemPhotoCaptureAssist.tsx');
const itemPhotoReadiness = read('src/lib/media/itemPhotoCaptureAssist.ts');
const visualCompletionSource = read('src/lib/visualProfile/visualProfileCompletion.ts');
const desktopOfficialPage = read('src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx');
const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');

assertCheck(FEATURE_FLAGS.ENABLE_CATEGORY_ICONS === true, 'Category icons remain enabled');
assertCheck(categoryPrimary === categoryMirror, 'Category icon resolver is byte-identical in app and Functions');
assertCheck(
    resolveCategoryIcon('Steaks', 'food')?.icon === 'lu:LuBeef',
    'Category icon matching does not treat the tea substring in Steaks as coffee',
);
assertCheck(
    resolveCategoryIcon('Tea', 'food')?.icon === 'lu:LuCoffee',
    'Category icon matching retains exact and plural-safe keyword matches',
);
assertCheck(
    resolveCategoryIcon('Party supplies', 'creative') === null,
    'Category icon matching does not treat the art substring in Party as art',
);
const preservedCategory = applyCategoryIconDefaults(
    [{ id: 'drinks', name: { en: 'Tea' }, icon: 'emoji:🫖' }],
    [],
    'food',
);
assertCheck(preservedCategory[0]?.icon === 'emoji:🫖', 'Category defaults preserve owner-selected icons');
assertCheck(extractionWorker.includes('applyCategoryIconDefaults('), 'Extraction applies deterministic category icons');
assertCheck(categoryRepair.includes('applyCategoryIconDefaults(categories, items'), 'Repair reuses the shared category resolver');
assertCheck(categoryRenderer.includes("normalizedIcon.startsWith('emoji:')"), 'Public category rendering preserves emoji icons');
assertCheck(desktopCategoryEditor.includes('<IconPicker'), 'Desktop category editing exposes the shared icon picker');
assertCheck(mobileCategoryEditor.includes('<IconPicker'), 'Mobile category editing exposes the shared icon picker');

assertCheck(FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES === true, 'Behavior-copy guidance remains enabled');
assertCheck(
    ownerDashboard.includes("t('publicTruthStatus.title.active')")
        && ownerDashboardEnglish.includes('"active": "Official customer source is active"'),
    'Owner Dashboard carries current localized official-source guidance',
);
assertCheck(desktopShare.includes('FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES'), 'Desktop share uses the behavior-copy gate');
assertCheck(mobileShare.includes('FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES'), 'Mobile share uses the behavior-copy gate');
assertCheck(
    !fs.existsSync(path.join(ROOT, 'src/components/templates/main-app/dashboard/OwnerDashboard/BehaviorNudgeCard.tsx')),
    'Duplicate unmounted dashboard behavior card stays removed',
);

assertCheck(FEATURE_FLAGS.ENABLE_ITEM_PHOTO_CAPTURE_ASSIST === true, 'Item Photo Capture Assist remains enabled');
assertCheck(imageUploadModal.includes('<ItemPhotoCaptureAssist'), 'Shared item-image modal mounts capture assistance');
assertCheck(imageUploadModal.includes("prepareMediaImage(file, 'menuItem')"), 'Captured item photos reuse menuItem preparation');
assertCheck(imageUploadModal.includes('assessItemPhotoReadiness(prepared)'), 'Captured item photos receive browser-local readiness feedback');
assertCheck(
    imageUploadModal.includes('isItemPhotoPreparationContextCurrent(startedContext, preparedUploadContextRef.current)'),
    'Prepared item photos are discarded after the selected-item context changes',
);
assertCheck(
    imageUploadModal.includes("key={selectedItem?.id || 'no-item'}"),
    'Capture camera and preview state reset when the selected item changes',
);
assertCheck(
    itemImageAssociation.includes('if (!appendItemImagesToProject(projectData, selectedItem, imagesToUpload))'),
    'Item image association validates target identity and image limits before Storage upload',
);
assertCheck(
    itemImageAssociation.includes('toPersistedItemImage(imageData, uploadedUrl)'),
    'Item image association projects uploaded media through the persistence-safe metadata boundary',
);
assertCheck(
    !itemImageAssociation.includes('imageData.url = uploadedUrl'),
    'Item image association does not mutate browser selection state after Storage upload',
);
assertCheck(
    uploadedImagesList.includes('if (disabled || deleteInFlightRef.current) return;')
        && uploadedImagesList.includes('deleteInFlightRef.current = true;'),
    'Item image deletion claims one confirmation/persistence flow synchronously',
);
assertCheck(
    uploadedImagesList.includes('removeItemImageFromProject(')
        && !uploadedImagesList.includes('.images.splice('),
    'Item image deletion uses the immutable exact-target projector',
);
assertCheck(
    uploadedImagesList.includes('buildItemImageEditorTarget(projectData, {')
        && uploadedImagesList.includes('selectedItem={itemForEditing}'),
    'Existing-photo editing receives a complete exact-file item DTO',
);
assertCheck(
    editImageModal.includes('if (uploadInFlightRef.current) return;')
        && editImageModal.includes('await onUploadGeneratedImage(imagesToUpload);')
        && editImageModal.indexOf('await onUploadGeneratedImage(imagesToUpload);')
            < editImageModal.indexOf('setUploadSuccess(true);'),
    'Edited-image success waits for one confirmed project-save settlement',
);
assertCheck(
    editImageModal.includes("logRuntimeFailure('menu_editor_edited_image_upload_failed'")
        && editImageModal.includes('Could not save edited image. Please try again.'),
    'Edited-image save rejection remains visible through bounded diagnostics and owner-safe copy',
);
assertCheck(
    editItemModal.includes('buildItemImageEditorTarget(projectData, {')
        && editItemModal.includes('fileId: fileData.uid,')
        && editItemModal.includes('await onImageUpload(itemForDropdown, imagesToUpload);')
        && !editItemModal.includes('fileId: itemData.id,'),
    'Direct item editing awaits persistence with the exact source-file target',
);
assertCheck(
    mobileMenu.includes('sourceProject.projectId !== target.projectId')
        && mobileMenu.includes('{ fileId: target.fileId, id: target.itemId }')
        && mobileMenu.includes('expectedCurrentImagesSnapshot'),
    'Mobile background image completion is bound to its originating project, file, item, and prior image state',
);
assertCheck(
    mobileMenu.includes('itemImageUploadRevisionRef.current.get(uploadKey) === revision')
        && mobileMenu.includes('await deleteFileByUrl(uploadedImage)'),
    'Mobile background image completion rejects superseded uploads and cleans their uploaded objects',
);
assertCheck(
    mobileMenu.includes('const imageInputChanged = updatedItem.image !== undefined;')
        && mobileMenu.includes('if (imageInputChanged) {')
        && mobileMenu.includes('outletPolicy?.imageOverride !== true'),
    'Linked-outlet image policy is enforced before both inline and data-URL image changes',
);
assertCheck(
    isItemPhotoPreparationContextCurrent(
        { itemId: 'item-a', revision: 4 },
        { itemId: 'item-a', revision: 4 },
    ),
    'Item photo preparation accepts an unchanged selected-item context',
);
assertCheck(
    !isItemPhotoPreparationContextCurrent(
        { itemId: 'item-a', revision: 4 },
        { itemId: 'item-b', revision: 5 },
    ),
    'Item photo preparation rejects completion after switching to another item',
);
assertCheck(
    !isItemPhotoPreparationContextCurrent(
        { itemId: 'item-a', revision: 4 },
        { itemId: 'item-a', revision: 6 },
    ),
    'Item photo preparation rejects stale completion after switching away and back',
);
assertCheck(itemPhotoCapture.includes('navigator.mediaDevices.getUserMedia'), 'Capture assistance uses browser-managed camera permission');
assertCheck(itemPhotoCapture.includes('<Upload') === false, 'Capture assistance does not create a second upload subsystem');
assertCheck(!itemPhotoReadiness.toLowerCase().includes('firestore'), 'Item-photo readiness adds no Firestore path');
assertCheck(!itemPhotoReadiness.toLowerCase().includes('firebase'), 'Item-photo readiness adds no Firebase dependency');

const duplicateIdItems = [
    {
        active: true,
        category: 'category',
        categoryName: 'Category',
        descriptionLine: '',
        fileId: 'file-a',
        id: 'shared-item',
        itemName: 'First item',
        name: { en: 'First item' },
    },
    {
        active: true,
        category: 'category',
        categoryName: 'Category',
        descriptionLine: '',
        fileId: 'file-b',
        id: 'shared-item',
        itemName: 'Second item',
        name: { en: 'Second item' },
    },
];
assertCheck(
    resolveUniqueItemImageTarget(duplicateIdItems, { id: 'shared-item' }) === null,
    'Image upload target resolution fails closed when an item ID is ambiguous across files',
);
assertCheck(
    resolveUniqueItemImageTarget(duplicateIdItems, { fileId: 'file-b', id: 'shared-item' })?.fileId === 'file-b',
    'Image upload target resolution honors the selected source file',
);
const exactTargetValue = buildItemImageTargetValue({ fileId: 'file-b', id: 'shared-item' });
assertCheck(
    exactTargetValue !== null
        && parseItemImageTargetValue(exactTargetValue)?.fileId === 'file-b'
        && parseItemImageTargetValue(exactTargetValue)?.id === 'shared-item',
    'Item selector values round-trip exact file and item identities',
);
assertCheck(
    parseItemImageTargetValue('not-json') === null
        && parseItemImageTargetValue('["file-b","shared-item","extra"]') === null,
    'Item selector target parsing rejects malformed and over-specified values',
);
const persistedPhoto = toPersistedItemImage(
    {
        blob: new Blob(['photo'], { type: 'image/jpeg' }),
        isSelected: true,
        mediaId: 'menuItem_checksum',
        name: 'photo.jpg',
        size: 5,
        type: 'image/jpeg',
        uid: 'photo-1',
        url: 'data:image/jpeg;base64,cGhvdG8=',
        source: 'capture-assist:topDown',
    },
    'https://storage.example.test/photo.webp',
);
assertCheck(
    persistedPhoto?.url === 'https://storage.example.test/photo.webp'
        && !Object.prototype.hasOwnProperty.call(persistedPhoto, 'blob')
        && !Object.prototype.hasOwnProperty.call(persistedPhoto, 'preparedMedia')
        && !Object.prototype.hasOwnProperty.call(persistedPhoto, 'isSelected')
        && !Object.prototype.hasOwnProperty.call(persistedPhoto, 'mediaId')
        && !Object.prototype.hasOwnProperty.call(persistedPhoto, 'source'),
    'Persisted item-image metadata excludes browser-only and internal selection/preparation state',
);
const duplicateIdProject = {
    projectId: 'tenant-file-store',
    files: [
        {
            uid: 'file-a',
            extractedData: {
                data: {
                    categories: [],
                    items: [duplicateIdItems[0]],
                    languages: [],
                },
            },
        },
        {
            uid: 'file-b',
            extractedData: {
                data: {
                    categories: [],
                    items: [duplicateIdItems[1]],
                    languages: [],
                },
            },
        },
    ],
};
const associatedProject = persistedPhoto
    ? appendItemImagesToProject(
        duplicateIdProject,
        { fileId: 'file-b', id: 'shared-item' },
        [persistedPhoto],
    )
    : null;
const exactEditTarget = buildItemImageEditorTarget(
    duplicateIdProject,
    { fileId: 'file-b', id: 'shared-item' },
);
assertCheck(
    exactEditTarget?.fileId === 'file-b'
        && exactEditTarget.itemName === 'Second item'
        && exactEditTarget.categoryName === 'Uncategorized'
        && exactEditTarget.descriptionLine === '',
    'Existing-photo editing projects the complete DTO from the exact file/item pair',
);
assertCheck(
    associatedProject?.files?.[0]?.extractedData?.data.items[0]?.images === undefined
        && associatedProject?.files?.[1]?.extractedData?.data.items[0]?.images?.[0]?.uid === 'photo-1'
        && !Object.prototype.hasOwnProperty.call(
            duplicateIdProject.files[1].extractedData.data.items[0],
            'images',
        ),
    'Item image association updates only the exact file/item pair without mutating source project state',
);
const projectAfterExactDelete = associatedProject
    ? removeItemImageFromProject(
        associatedProject,
        { fileId: 'file-b', id: 'shared-item' },
        'https://storage.example.test/photo.webp',
    )
    : null;
assertCheck(
    projectAfterExactDelete?.files?.[0]?.extractedData?.data.items[0]?.images === undefined
        && projectAfterExactDelete?.files?.[1]?.extractedData?.data.items[0]?.images?.length === 0
        && associatedProject?.files?.[1]?.extractedData?.data.items[0]?.images?.length === 1,
    'Item image deletion removes one exact file/item image without mutating source state',
);
assertCheck(
    associatedProject !== null
        && removeItemImageFromProject(
            associatedProject,
            { fileId: 'file-a', id: 'shared-item' },
            'https://storage.example.test/photo.webp',
        ) === null,
    'Item image deletion does not cross into another file that reuses the item ID',
);
const exactImageSnapshot = getItemImagesSnapshot(
    duplicateIdProject,
    { fileId: 'file-b', id: 'shared-item' },
);
const projectAfterExactReplacement = exactImageSnapshot === null
    ? null
    : replaceItemImagesInProject(
        duplicateIdProject,
        { fileId: 'file-b', id: 'shared-item' },
        [{ name: 'mobile.webp', url: 'https://storage.example.test/mobile.webp' }],
        exactImageSnapshot,
    );
assertCheck(
    projectAfterExactReplacement?.files?.[0]?.extractedData?.data.items[0]?.images === undefined
        && projectAfterExactReplacement?.files?.[1]?.extractedData?.data.items[0]?.images?.[0]?.url
            === 'https://storage.example.test/mobile.webp'
        && getItemImagesSnapshot(
            duplicateIdProject,
            { fileId: 'file-b', id: 'shared-item' },
        ) === '[]',
    'Mobile image replacement updates only the exact file/item pair without mutating source state',
);
assertCheck(
    exactImageSnapshot !== null
        && projectAfterExactReplacement !== null
        && replaceItemImagesInProject(
            projectAfterExactReplacement,
            { fileId: 'file-b', id: 'shared-item' },
            [{ name: 'stale.webp', url: 'https://storage.example.test/stale.webp' }],
            exactImageSnapshot,
        ) === null,
    'Mobile image replacement rejects a completion after the target image state changes',
);
const fullImageProject = {
    ...duplicateIdProject,
    files: duplicateIdProject.files.map((file) => (
        file.uid !== 'file-b'
            ? file
            : {
                ...file,
                extractedData: {
                    data: {
                        ...file.extractedData.data,
                        items: file.extractedData.data.items.map((item) => ({
                            ...item,
                            images: Array.from({ length: 20 }, (_, index) => ({
                                uid: `existing-${index}`,
                                url: `https://storage.example.test/existing-${index}.webp`,
                            })),
                        })),
                    },
                },
            }
    )),
};
assertCheck(
    persistedPhoto !== null
        && appendItemImagesToProject(
            fullImageProject,
            { fileId: 'file-b', id: 'shared-item' },
            [persistedPhoto],
        ) === null,
    'Item image association rejects an upload that would exceed the shared per-item image limit',
);

assertCheck(FEATURE_FLAGS.ENABLE_VISUAL_PROFILE_COMPLETION === true, 'Visual Profile Completion remains enabled');
const businessOnlyCompletion = buildVisualProfileCompletion({
    businessCategory: 'food',
    businessCover: 'cover.webp',
    photos: ['one.webp', 'two.webp', 'three.webp'],
});
assertCheck(
    businessOnlyCompletion.coverage === 'business-only'
        && businessOnlyCompletion.headline === 'Business photos are ready',
    'Desktop business-only evidence does not claim the entire visual profile is complete',
);
const fullCompletion = buildVisualProfileCompletion({
    businessCategory: 'food',
    businessCover: 'cover.webp',
    photos: ['one.webp', 'two.webp', 'three.webp'],
    projects: [{ active: true, projectImage: 'menu.webp' }],
});
assertCheck(
    fullCompletion.coverage === 'full'
        && fullCompletion.headline === 'Visual profile is complete',
    'Full visual evidence can claim completion',
);
assertCheck(desktopOfficialPage.includes('buildVisualProfileCompletion({'), 'Desktop Official Page owns visual completion');
assertCheck(mobileOfficialPage.includes('buildVisualProfileCompletion({'), 'Mobile Official Page owns visual completion');
assertCheck(!visualCompletionSource.toLowerCase().includes('firestore'), 'Visual completion adds no Firestore path');
assertCheck(!visualCompletionSource.toLowerCase().includes('firebase'), 'Visual completion adds no Firebase dependency');

console.log(`Embedded owner capabilities verified (${checks.length} checks).`);
