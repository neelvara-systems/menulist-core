/**
 * Reading time estimation utilities
 * Calculates estimated reading time based on content length
 */

const WORDS_PER_MINUTE = 225; // Average adult reading speed
const IMAGE_READ_TIME = 12; // Seconds per image (viewing time)
const CODE_BLOCK_TIME = 15; // Seconds per code block (scanning time)
const MAX_TIPTAP_NODES = 100_000;

const readOwnDataField = (value: unknown, key: string): unknown => {
    if (!value || typeof value !== 'object') return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
};

const snapshotArray = (value: unknown): unknown[] => {
    if (!Array.isArray(value)) return [];
    try {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        const length = lengthDescriptor && 'value' in lengthDescriptor
            ? lengthDescriptor.value
            : undefined;
        if (!Number.isSafeInteger(length) || length < 0 || length > MAX_TIPTAP_NODES) return [];
        const entries: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            if (descriptor && 'value' in descriptor) entries.push(descriptor.value);
        }
        return entries;
    } catch {
        return [];
    }
};

/**
 * Strips HTML tags and counts words in plain text
 */
const stripHtmlAndCountWords = (html: string): number => {
    if (!html) return 0;
    
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, ' ');
    
    // Remove extra whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Count words (split by whitespace)
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    
    return words.length;
};

/**
 * Counts images in HTML content
 */
const countImages = (html: string): number => {
    if (!html) return 0;
    const imageMatches = html.match(/<img[^>]*>/gi);
    return imageMatches ? imageMatches.length : 0;
};

/**
 * Counts code blocks in HTML content
 */
const countCodeBlocks = (html: string): number => {
    if (!html) return 0;
    const codeMatches = html.match(/<pre[^>]*>|<code[^>]*>/gi);
    return codeMatches ? codeMatches.length : 0;
};

/**
 * Calculates reading time from Tiptap JSON content
 */
export const calculateReadingTimeFromTiptap = (content: unknown): number => {
    if (!content) return 0;
    
    let wordCount = 0;
    let imageCount = 0;
    let codeBlockCount = 0;
    
    const pending: unknown[] = [content];
    const visited = new WeakSet<object>();
    let inspectedNodes = 0;
    while (pending.length && inspectedNodes < MAX_TIPTAP_NODES) {
        const node = pending.pop();
        if (!node || typeof node !== 'object' || visited.has(node)) continue;
        visited.add(node);
        inspectedNodes += 1;

        const type = readOwnDataField(node, 'type');
        const text = readOwnDataField(node, 'text');
        if (type === 'text' && typeof text === 'string') {
            wordCount += text.split(/\s+/).filter((word) => word.length > 0).length;
        }
        if (type === 'image') imageCount += 1;
        if (type === 'codeBlock') codeBlockCount += 1;

        const children = snapshotArray(readOwnDataField(node, 'content'));
        for (let index = children.length - 1; index >= 0; index -= 1) {
            pending.push(children[index]);
        }
    }
    
    // Calculate reading time
    const textTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
    const imageTime = Math.ceil((imageCount * IMAGE_READ_TIME) / 60);
    const codeTime = Math.ceil((codeBlockCount * CODE_BLOCK_TIME) / 60);
    
    return Math.max(1, textTime + imageTime + codeTime); // Minimum 1 minute
};

/**
 * Calculates reading time from HTML string
 */
export const calculateReadingTimeFromHtml = (html: string): number => {
    if (!html) return 0;
    
    const wordCount = stripHtmlAndCountWords(html);
    const imageCount = countImages(html);
    const codeBlockCount = countCodeBlocks(html);
    
    // Calculate reading time
    const textTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
    const imageTime = Math.ceil((imageCount * IMAGE_READ_TIME) / 60);
    const codeTime = Math.ceil((codeBlockCount * CODE_BLOCK_TIME) / 60);
    
    return Math.max(1, textTime + imageTime + codeTime); // Minimum 1 minute
};

/**
 * Formats reading time into human-readable string
 */
export const formatReadingTime = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes < 1) return '< 1 min read';
    const wholeMinutes = Math.ceil(minutes);
    if (wholeMinutes === 1) return '1 min read';
    return `${wholeMinutes} min read`;
};

/**
 * Main function: Calculate and format reading time from any content
 */
export const getReadingTime = (content: unknown): string => {
    let minutes = 0;
    
    if (typeof content === 'string') {
        // HTML string
        minutes = calculateReadingTimeFromHtml(content);
    } else if (content && typeof content === 'object') {
        // Tiptap JSON
        minutes = calculateReadingTimeFromTiptap(content);
    }
    
    return formatReadingTime(minutes);
};
