import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '../../src/config/features';
import {
    applyCategoryIconDefaults,
    resolveCategoryIcon,
} from '../../src/data/shared/categoryIconSuggestions';
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
const desktopShare = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
const imageUploadModal = read('src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx');
const itemPhotoCapture = read('src/components/shared/media/ItemPhotoCaptureAssist.tsx');
const itemPhotoReadiness = read('src/lib/media/itemPhotoCaptureAssist.ts');
const visualCompletionSource = read('src/lib/visualProfile/visualProfileCompletion.ts');
const desktopOfficialPage = read('src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx');
const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');

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
assertCheck(ownerDashboard.includes('Official customer source is active'), 'Owner Dashboard carries current official-source guidance');
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
assertCheck(itemPhotoCapture.includes('navigator.mediaDevices.getUserMedia'), 'Capture assistance uses browser-managed camera permission');
assertCheck(itemPhotoCapture.includes('<Upload') === false, 'Capture assistance does not create a second upload subsystem');
assertCheck(!itemPhotoReadiness.toLowerCase().includes('firestore'), 'Item-photo readiness adds no Firestore path');
assertCheck(!itemPhotoReadiness.toLowerCase().includes('firebase'), 'Item-photo readiness adds no Firebase dependency');

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
