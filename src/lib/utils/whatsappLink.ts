/**
 * WhatsApp Deep Link Generator
 * 
 * Generates WhatsApp deep links for guest recovery.
 * Works on both mobile (opens WhatsApp app) and desktop (opens WhatsApp Web).
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

/**
 * Generate WhatsApp deep link
 * 
 * @param phone - Phone number (will be cleaned of non-digits)
 * @param message - Optional pre-filled message
 * @returns WhatsApp deep link URL
 * 
 * @example
 * ```typescript
 * const link = generateWhatsAppLink('+91 98765 43210');
 * // Returns: https://wa.me/919876543210
 * 
 * const linkWithMessage = generateWhatsAppLink(
 *   '+91 98765 43210',
 *   'Hi, thank you for your feedback!'
 * );
 * // Returns: https://wa.me/919876543210?text=Hi%2C%20thank%20you%20for%20your%20feedback!
 * ```
 */
export function generateWhatsAppLink(
    phone: string,
    message?: string
): string {
    // Clean phone number (remove spaces, dashes, parentheses, plus signs, etc.)
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanPhone) {
        return '';
    }

    // Base WhatsApp URL (works on all platforms)
    const baseUrl = 'https://wa.me/';

    // Build URL with optional message
    let url = `${baseUrl}${cleanPhone}`;

    if (message) {
        url += `?text=${encodeURIComponent(message)}`;
    }

    return url;
}

/**
 * Check if a phone number is valid for WhatsApp
 * 
 * @param phone - Phone number to check
 * @returns True if phone has at least 10 digits
 */
export function isValidWhatsAppNumber(phone?: string): boolean {
    if (!phone) return false;
    
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
}

/**
 * Format phone number for display
 * 
 * @param phone - Phone number to format
 * @returns Formatted phone number or original if can't parse
 */
export function formatPhoneForDisplay(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Indian format: +91 XXXXX XXXXX
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        return `+91 ${cleanPhone.slice(2, 7)} ${cleanPhone.slice(7)}`;
    }
    
    // Indian without country code
    if (cleanPhone.length === 10) {
        return `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
    
    // Return original if can't parse
    return phone;
}
