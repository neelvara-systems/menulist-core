import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLoadingProgress } from '../../src/components/antdComponent/loadingMessage';
import { normalizeAnimatedBubbleCount, normalizeAnimationDimension } from '../../src/components/atoms/animationPresentation';
import { normalizeStarRating } from '../../src/components/atoms/feedbackPresentation';
import { normalizeLiveIndicatorTimestamp } from '../../src/components/atoms/LiveIndicator';
import {
  normalizeEmojiSearchResult,
  normalizeLucideIconName,
  normalizeSuggestedLucideIcons,
} from '../../src/components/atoms/IconPicker/iconPickerContracts';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

assert.equal(normalizeLoadingProgress(undefined), null);
assert.equal(normalizeLoadingProgress(Number.NaN), null);
assert.equal(normalizeLoadingProgress(Number.POSITIVE_INFINITY), null);
assert.equal(normalizeLoadingProgress(-4), 0);
assert.equal(normalizeLoadingProgress(42.6), 43);
assert.equal(normalizeLoadingProgress(180), 100);
assert.equal(normalizeAnimatedBubbleCount(Number.NaN), 0);
assert.equal(normalizeAnimatedBubbleCount(-3), 0);
assert.equal(normalizeAnimatedBubbleCount(4.8), 4);
assert.equal(normalizeAnimatedBubbleCount(1_000), 100);
assert.equal(normalizeAnimationDimension(Number.POSITIVE_INFINITY), 0);
assert.equal(normalizeAnimationDimension(-1), 0);
assert.equal(normalizeAnimationDimension(640), 640);
assert.equal(normalizeAnimationDimension(20_000), 10_000);
assert.equal(normalizeStarRating(Number.NaN), 0);
assert.equal(normalizeStarRating(-1), 0);
assert.equal(normalizeStarRating(4.5), 4.5);
assert.equal(normalizeStarRating(8), 5);
const liveNow = Date.parse('2026-08-01T12:00:00.000Z');
assert.equal(normalizeLiveIndicatorTimestamp('invalid', liveNow), null);
assert.equal(normalizeLiveIndicatorTimestamp('2026-08-01T12:00:01.000Z', liveNow), null);
assert.equal(normalizeLiveIndicatorTimestamp('2026-08-01T11:59:00.000Z', liveNow)?.toISOString(), '2026-08-01T11:59:00.000Z');
const lucideNames = new Set(['LuCoffee', 'LuPizza']);
assert.equal(normalizeLucideIconName('lu:LuCoffee', lucideNames), 'LuCoffee');
assert.equal(normalizeLucideIconName(' LuPizza ', lucideNames), 'LuPizza');
assert.equal(normalizeLucideIconName('emoji:🍕', lucideNames), null);
assert.deepEqual(
  normalizeSuggestedLucideIcons(['lu:LuCoffee', 'LuCoffee', 'LuPizza', 'LuMissing'], lucideNames),
  ['LuCoffee', 'LuPizza'],
);
assert.deepEqual(
  normalizeEmojiSearchResult({ id: 'pizza', name: 'Pizza', skins: [{ native: '🍕' }] }),
  { id: 'pizza', name: 'Pizza', native: '🍕' },
);
assert.equal(normalizeEmojiSearchResult({ id: 'pizza', skins: [] }), null);

const checkbox = read('src/components/antdComponent/checkboxElement/index.tsx');
const drawer = read('src/components/antdComponent/drawerElement/index.tsx');
const loadingMessage = read('src/components/antdComponent/loadingMessage/index.tsx');
const slider = read('src/components/antdComponent/sliderElement/index.tsx');
const text = read('src/components/antdComponent/textElement/index.tsx');
const tooltip = read('src/components/antdComponent/tolltipElement/index.tsx');
const aiButtonIcon = read('src/components/atoms/aiButtonIcon/index.tsx');
const editCategoryModal = read('src/components/templates/main-app/projects/editorView/editCategoryModal.tsx');
const confetti = read('src/components/atoms/Confetti/index.tsx');
const dateTimeDisplay = read('src/components/atoms/DateTimeDisplay.tsx');
const dynamicIcon = read('src/components/atoms/DynamicIcon/index.tsx');
const fileIcon = read('src/components/atoms/FileIcon/index.tsx');
const imageRenderer = read('src/components/atoms/imageRenderer/index.tsx');
const kbSourceFile = read('src/components/atoms/KbSourceFile/index.tsx');
const multiSelectPicker = read('src/components/atoms/multiSelectPicker/index.tsx');
const proUserIcon = read('src/components/atoms/proUserIcon/index.tsx');
const segment = read('src/components/atoms/segment/index.tsx');
const scrollToBottom = read('src/components/atoms/ScrollToBottomButton/ScrollToBottomButton.tsx');
const emojiGrid = read('src/components/atoms/IconPicker/EmojiGrid.tsx');
const lucideIconGrid = read('src/components/atoms/IconPicker/LucideIconGrid.tsx');

for (const [label, source] of Object.entries({ checkbox, drawer, slider, text, tooltip })) {
  assert.doesNotMatch(source, /\bany\b/, `${label} props must retain their authoritative UI types`);
}
assert.doesNotMatch(checkbox, /defaultChecked=/, 'controlled checkbox must not also carry a default value');
assert.doesNotMatch(slider, /defaultValue=/, 'controlled slider must not also carry a default value');
assert.match(loadingMessage, /onCancelRef\.current\?\.\(\)/, 'cancel activation must use the latest callback');
assert.match(loadingMessage, /const contentKey = `\$\{content\}:\$\{Boolean\(onCancel\)\}`;/, 'cancel visibility must participate in message identity');
assert.doesNotMatch(aiButtonIcon, /\bany\b/, 'AI button props must retain Ant Design and React contracts');
assert.doesNotMatch(aiButtonIcon, /react-icons\/ri/, 'AI button must use the repository icon library');
assert.match(aiButtonIcon, /size = "middle", shape = 'default'/, 'AI button defaults must be admitted Ant Design values');
assert.match(editCategoryModal, /icon=\{<LuSparkles \/>\}/, 'menu category caller must use the canonical icon prop');
assert.match(confetti, /const nextParticle = \{ \.\.\.p \};/, 'confetti frames must not mutate React state objects');
assert.match(confetti, /\[resolvedHeight, resolvedWidth\]/, 'confetti burst must track current dimensions');
assert.doesNotMatch(dateTimeDisplay, /value as any/, 'date display must retain the shared DateLike contract');
assert.doesNotMatch(dynamicIcon, /react-icons\/fa|\bany\b/, 'dynamic icons must use typed Lucide components');
assert.doesNotMatch(fileIcon, /react-icons\/tb/, 'file icons must use the repository icon library');
assert.doesNotMatch(imageRenderer, /\bany\b|styles\.nextImageElement/, 'image wrapper must separate typed inline style and class name');
assert.match(kbSourceFile, /file\.downloadURL \|\| file\.url/, 'KB source activation must retain both stored URL variants');
assert.doesNotMatch(kbSourceFile, /\bany\b/, 'KB source records must retain their bounded display contract');
assert.doesNotMatch(multiSelectPicker, /@ant-design\/icons|values as string\[\]/, 'multi-select must use Lucide and runtime-narrow checkbox values');
assert.doesNotMatch(proUserIcon, /react-icons\/pi/, 'plan badge must use the repository icon library');
assert.doesNotMatch(segment, /\bany\b|defaultValue=|option\.value/, 'segment options must retain one typed controlled value authority');
assert.match(segment, /value === option/, 'string segment active state must compare the actual option value');
assert.match(scrollToBottom, /handleScroll\(\);\s*container\.addEventListener/, 'scroll visibility must initialize before the first scroll event');
assert.doesNotMatch(emojiGrid, /\bany\b|as unknown as/, 'emoji search and picker boundaries must be runtime-narrowed');
assert.match(lucideIconGrid, /normalizeSuggestedLucideIcons/, 'Lucide suggestions must admit canonical prefixed values');

console.log('Ant Design component boundary tests passed.');
