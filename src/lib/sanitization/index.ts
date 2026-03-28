/**
 * Sanitizes user-submitted text to prevent XSS attacks.
 * This should be used when displaying feedback comments or any user-generated content.
 * 
 * Note: For production use, consider using a library like DOMPurify for more robust sanitization.
 */

/**
 * Escapes HTML special characters to prevent XSS
 */
export const escapeHtml = (text: string): string => {
    if (!text) return '';
    
    const htmlEscapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
};

/**
 * Strips all HTML tags from text
 */
export const stripHtmlTags = (text: string): string => {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
};

/**
 * Sanitizes feedback comment text before storing or displaying
 * - Removes HTML tags
 * - Trims whitespace
 * - Limits length
 */
export const sanitizeFeedbackComment = (comment: string, maxLength: number = 500): string => {
    if (!comment) return '';
    
    // Remove HTML tags
    let sanitized = stripHtmlTags(comment);
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
};

/**
 * Safely renders user-submitted text by escaping HTML
 * Use this when displaying feedback comments in an admin panel
 */
export const safeRenderComment = (comment: string): string => {
    if (!comment) return '';
    return escapeHtml(comment);
};
