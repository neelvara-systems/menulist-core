/**
 * Reading time estimation utilities
 * Calculates estimated reading time based on content length
 */

const WORDS_PER_MINUTE = 225; // Average adult reading speed
const IMAGE_READ_TIME = 12; // Seconds per image (viewing time)
const CODE_BLOCK_TIME = 15; // Seconds per code block (scanning time)

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
export const calculateReadingTimeFromTiptap = (content: any): number => {
    if (!content) return 0;
    
    let wordCount = 0;
    let imageCount = 0;
    let codeBlockCount = 0;
    
    const traverseNode = (node: any) => {
        if (!node) return;
        
        // Count text content
        if (node.type === 'text' && node.text) {
            const words = node.text.split(/\s+/).filter((word: string) => word.length > 0);
            wordCount += words.length;
        }
        
        // Count images
        if (node.type === 'image') {
            imageCount++;
        }
        
        // Count code blocks
        if (node.type === 'codeBlock') {
            codeBlockCount++;
        }
        
        // Traverse child nodes
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach(traverseNode);
        }
    };
    
    traverseNode(content);
    
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
    if (minutes < 1) return '< 1 min read';
    if (minutes === 1) return '1 min read';
    return `${minutes} min read`;
};

/**
 * Main function: Calculate and format reading time from any content
 */
export const getReadingTime = (content: any): string => {
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
