/**
 * Email Domain Validation
 * 
 * Validates email domain format and blocks invalid patterns
 * that shouldn't be used for production accounts.
 * 
 * Updated: November 6, 2025
 */

import { isDisposableEmail, getEmailDomain } from './disposableEmailDomains';

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED_EMAIL_DOMAINS = [
    'localhost',
    'local',
    'test',
    'example.com',
    'example.org',
] as const;

function isReservedEmailDomain(domain: string): boolean {
    return RESERVED_EMAIL_DOMAINS.some((reservedDomain) => (
        domain === reservedDomain || domain.endsWith(`.${reservedDomain}`)
    ));
}

function hasCanonicalDomainSyntax(domain: string): boolean {
    if (domain.length > 253) return false;
    const labels = domain.split('.');
    return labels.length >= 2 && labels.every((label) => (
        label.length > 0
        && label.length <= 63
        && DOMAIN_LABEL_PATTERN.test(label)
    ));
}

/**
 * Email validation result
 */
export interface EmailValidationResult {
    valid: boolean;
    reason?: string;
    domain?: string;
}

/**
 * Validate email domain format
 * 
 * Checks:
 * 1. Domain must have a TLD (top-level domain)
 * 2. Not localhost or local domains
 * 3. Not IP addresses
 * 4. Not disposable/temporary email services
 * 
 * @param email - Email address to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * validateEmailDomain('user@gmail.com')      // { valid: true }
 * validateEmailDomain('user@localhost')      // { valid: false, reason: '...' }
 * validateEmailDomain('user@10minutemail.com') // { valid: false, reason: '...' }
 * ```
 */
export function validateEmailDomain(email: string): EmailValidationResult {
    // Basic format check
    if (!email || typeof email !== 'string') {
        return {
            valid: false,
            reason: 'Invalid email format'
        };
    }
    
    const trimmedEmail = email.toLowerCase().trim();
    
    // Must have @ symbol
    if (!trimmedEmail.includes('@')) {
        return {
            valid: false,
            reason: 'Invalid email format'
        };
    }
    
    const domain = getEmailDomain(trimmedEmail);
    
    if (!domain) {
        return {
            valid: false,
            reason: 'Invalid email domain'
        };
    }
    
    // Check 1: Must have a TLD (domain.com, not just "domain")
    if (!domain.includes('.')) {
        return {
            valid: false,
            reason: 'Email domain must have a valid top-level domain',
            domain
        };
    }
    
    // Check 2: Block exact reserved domains and their subdomains.
    if (isReservedEmailDomain(domain)) {
        return {
            valid: false,
            reason: 'Local or test email domains are not allowed',
            domain
        };
    }
    
    // Check 3: Block IP addresses (e.g., user@192.168.1.1)
    const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
    if (ipPattern.test(domain)) {
        return {
            valid: false,
            reason: 'IP address email domains are not allowed',
            domain
        };
    }
    
    // Check 4: Block disposable/temporary email services
    if (isDisposableEmail(trimmedEmail)) {
        return {
            valid: false,
            reason: 'Disposable or temporary email addresses are not allowed. Please use a permanent email address.',
            domain
        };
    }
    
    // Check 5: Enforce canonical DNS label and total-domain bounds.
    const domainParts = domain.split('.');
    if (!hasCanonicalDomainSyntax(domain)) {
        return {
            valid: false,
            reason: 'Invalid email domain format',
            domain
        };
    }
    
    // Check 6: TLD should be at least 2 characters
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || !/[a-z]/.test(tld)) {
        return {
            valid: false,
            reason: 'Invalid top-level domain',
            domain
        };
    }
    
    // All checks passed
    return {
        valid: true,
        domain
    };
}

/**
 * Validate email with detailed checks
 * 
 * Performs both format and domain validation
 * 
 * @param email - Email to validate
 * @returns Validation result with detailed reason
 */
export function validateEmail(email: string): EmailValidationResult {
    // Basic Zod-style format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const separatorIndex = typeof email === 'string' ? email.indexOf('@') : -1;
    if (
        !email
        || email.length > 254
        || separatorIndex <= 0
        || separatorIndex > 64
        || !emailRegex.test(email)
    ) {
        return {
            valid: false,
            reason: 'Invalid email format'
        };
    }
    
    // Domain validation
    return validateEmailDomain(email);
}

/**
 * Check if email is allowed for registration/login
 * 
 * This is the main function to use in auth flows
 * 
 * @param email - Email to check
 * @returns true if allowed, false otherwise
 * 
 * @example
 * ```typescript
 * if (!isEmailAllowed(email)) {
 *     throw new Error('Invalid or disposable email address');
 * }
 * ```
 */
export function isEmailAllowed(email: string): boolean {
    const result = validateEmail(email);
    return result.valid;
}

/**
 * Get user-friendly error message for email validation
 * 
 * @param email - Email that failed validation
 * @returns User-friendly error message
 */
export function getEmailValidationError(email: string): string {
    const result = validateEmail(email);
    
    if (result.valid) {
        return '';
    }
    
    return result.reason || 'Invalid email address';
}
