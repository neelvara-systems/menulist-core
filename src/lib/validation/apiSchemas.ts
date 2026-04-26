/**
 * API Request Validation Schemas
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A03: Injection Prevention
 * Use these schemas in API routes to validate incoming requests
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// LANGUAGE & TRANSLATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const languageCodeSchema = z.string()
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Invalid language code format')
    .max(6);

// Language object schema for FileUploadRequestSchema
const languageObjectSchema = z.object({
    code: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Invalid language code format').max(6),
    name: z.string().max(100),
    nativeName: z.string().max(100).optional(),
    direction: z.enum(['ltr', 'rtl']).optional(),
});

const contentLengthSchema = z.enum(['Standard', 'Detailed']);

const actionSchema = z.enum(['generate', 'translate', 'describe']);

// ═══════════════════════════════════════════════════════════
// DESCRIPTION API
// ═══════════════════════════════════════════════════════════

// Item object schema for description generation
const descriptionItemSchema = z.object({
    id: z.string().max(100),
    name: z.string().max(500),
    category: z.string().max(200).optional(),
    attributes: z.string().max(500).optional(),
    description: z.string().max(2000).optional()
});

const toneSchema = z.enum(['Professional']); // Locked to Professional per doctrine — infrastructure = deterministic output

export const DescriptionRequestSchema = z.object({
    itemsList: z.array(descriptionItemSchema).min(1).max(100),
    targetLang: z.array(languageObjectSchema).min(1).max(20),
    sourceLang: languageObjectSchema,
    action: z.enum(['add_description', 'rewrite_description']),
    projectId: z.string().max(100).optional(),
    fileId: z.string().max(100).optional(),
    contentLength: contentLengthSchema,
    tone: toneSchema.optional().default('Professional')
    // keywords removed per ChatGPT doctrine review - reintroduces prompting behavior
});

export type DescriptionRequest = z.infer<typeof DescriptionRequestSchema>;

// ═══════════════════════════════════════════════════════════
// SEO / AEO GENERATION API
// ═══════════════════════════════════════════════════════════

const shortStringSchema = z.string().max(500).optional();

export const SeoGenerationRequestSchema = z.object({
    store: z.object({
        name: z.string().min(1).max(120),
        businessCategory: shortStringSchema,
        businessType: shortStringSchema,
        city: shortStringSchema,
        state: shortStringSchema,
        country: shortStringSchema,
        description: z.string().max(2000).optional(),
        addressLine: z.string().max(300).optional(),
        tagline: z.string().max(200).optional(),
        socialMedia: z.array(z.string().max(200)).max(20).optional(),
        publicPresence: z.object({
            accentColor: z.string().max(50).optional(),
            descriptor: z.string().max(120).optional(),
            displayName: z.string().max(120).optional(),
            establishedYear: z.number().int().min(1800).max(3000).optional(),
            googleMapsUrl: z.string().max(500).optional(),
            knownFor: z.string().max(120).optional(),
            orderUrl: z.string().max(500).optional(),
            reservationUrl: z.string().max(500).optional(),
            whatsappNumber: z.string().max(100).optional(),
        }).optional(),
    }),
    menu: z.object({
        projectName: shortStringSchema,
        projectDescription: z.string().max(1000).optional(),
        categories: z.array(z.string().max(100)).max(25).optional(),
        items: z.array(z.string().max(120)).max(40).optional(),
    }).optional(),
});

export type SeoGenerationRequest = z.infer<typeof SeoGenerationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// BUSINESS COPY GENERATION API
// ═══════════════════════════════════════════════════════════

export const BusinessCopyGenerationRequestSchema = z.object({
    store: z.object({
        name: z.string().min(1).max(120),
        businessCategory: shortStringSchema,
        businessType: shortStringSchema,
        city: shortStringSchema,
        state: shortStringSchema,
        country: shortStringSchema,
        description: z.string().max(2000).optional(),
        addressLine: z.string().max(300).optional(),
        tagline: z.string().max(200).optional(),
        socialMedia: z.array(z.string().max(200)).max(20).optional(),
        businessAttributes: z.array(z.string().max(100)).max(20).optional(),
        pwaShortName: z.string().max(40).optional(),
        publicPresence: z.object({
            accentColor: z.string().max(50).optional(),
            descriptor: z.string().max(120).optional(),
            displayName: z.string().max(120).optional(),
            establishedYear: z.number().int().min(1800).max(3000).optional(),
            googleMapsUrl: z.string().max(500).optional(),
            googleReviewUrl: z.string().max(500).optional(),
            knownFor: z.string().max(120).optional(),
            orderUrl: z.string().max(500).optional(),
            reservationUrl: z.string().max(500).optional(),
            whatsappNumber: z.string().max(100).optional(),
        }).optional(),
    }),
    menu: z.object({
        projectName: shortStringSchema,
        projectDescription: z.string().max(1000).optional(),
        categories: z.array(z.string().max(100)).max(25).optional(),
        items: z.array(z.string().max(120)).max(40).optional(),
    }).optional(),
});

export type BusinessCopyGenerationRequest = z.infer<typeof BusinessCopyGenerationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// TRANSLATION API
// ═══════════════════════════════════════════════════════════

export const TranslationRequestSchema = z.object({
    inputJson: z.record(z.string(), z.string()).refine(
        obj => Object.keys(obj).length <= 1000,
        'Too many items to translate'
    ),
    targetLang: languageObjectSchema,  // Language object with code and name
    sourceLang: languageObjectSchema,  // Language object with code and name
    action: z.enum(['language_addition', 'image_translation', 'item_translation']),  // Match AI_ACTIONS_TYPES
    projectId: z.string().max(100).optional(),
    fileId: z.string().max(100).optional()
});

export type TranslationRequest = z.infer<typeof TranslationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// NEW ITEM METADATA API
// ═══════════════════════════════════════════════════════════

export const NewItemMetadataRequestSchema = z.object({
    item: z.object({
        id: z.string().max(100),
        name: z.string().max(500),
        category: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
        attributes: z.array(z.object({
            id: z.string().max(100),
            name: z.string().max(500).optional(),
            price: z.union([z.string(), z.number()]).optional()
        })).optional()
    }),
    targetLang: z.array(languageObjectSchema).min(1).max(20),  // Array of language objects
    sourceLang: languageObjectSchema,  // Single language object
    projectId: z.string().max(100).optional(),
    fileId: z.string().max(100).optional(),
    contentLength: contentLengthSchema.optional(),
    businessType: z.string().max(100).optional()
});

export type NewItemMetadataRequest = z.infer<typeof NewItemMetadataRequestSchema>;

// ═══════════════════════════════════════════════════════════
// IMAGE GENERATION API
// ═══════════════════════════════════════════════════════════

export const ImageGenerationRequestSchema = z.object({
    generationConfig: z.object({
        prompt: z.string().min(1).max(2000),
        negativePrompt: z.string().max(2000).optional(),
        aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
        numberOfImages: z.number().int().min(1).max(4).optional()
    }),
    projectId: z.string().max(100),
    fileId: z.string().max(100).optional(),
    itemDetails: z.record(z.string(), z.any()).optional(),
    businessType: z.string().max(100).optional()
});

export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// IMAGE EDITING API
// ═══════════════════════════════════════════════════════════

export const ImageEditingRequestSchema = z.object({
    generationConfig: z.object({
        prompt: z.string().min(1).max(2000),
        maskImageUrl: z.string().url().max(2000).optional(),
        mode: z.enum(['edit', 'inpaint', 'outpaint']).optional()
    }),
    projectId: z.string().max(100),
    fileId: z.string().max(100),
    itemDetails: z.record(z.string(), z.any()).optional(),
    businessType: z.string().max(100).optional()
});

export type ImageEditingRequest = z.infer<typeof ImageEditingRequestSchema>;

// ═══════════════════════════════════════════════════════════
// PAYMENT API SCHEMAS
// ═══════════════════════════════════════════════════════════

export const CreateSubscriptionRequestSchema = z.object({
    planId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    interval: z.enum(['MONTH', 'YEAR']),
    currency: z.enum(['INR', 'USD']),
    userType: z.enum(['B2C', 'B2B']).optional()
});

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;

// Onboarding + Subscription (for new users)
export const OnboardingSubscriptionSchema = z.object({
    businessName: z.string().min(1, 'Business name is required').max(100, 'Business name too long'),
    businessIndustry: z.string().min(1, 'Industry is required').max(100, 'Industry name too long'),
    planId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid plan ID'),
    interval: z.enum(['MONTH', 'YEAR']),
    currency: z.enum(['INR', 'USD']),
    userType: z.enum(['B2C', 'B2B'])
});

export type OnboardingSubscriptionRequest = z.infer<typeof OnboardingSubscriptionSchema>;

export const VerifyPaymentRequestSchema = z.object({
    razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
    razorpay_subscription_id: z.string().regex(/^sub_[a-zA-Z0-9]+$/).optional(),
    razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/).optional(),
    razorpay_signature: z.string().optional()
});

export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;

export const CancelSubscriptionRequestSchema = z.object({
    subscriptionId: z.string().regex(/^sub_[a-zA-Z0-9]+$/),
    reason: z.string().min(1).max(500),
    otherReason: z.string().max(500).optional(),
    consent: z.boolean()
});

export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;

export const PauseSubscriptionRequestSchema = z.object({
    subscriptionId: z.string().regex(/^sub_[a-zA-Z0-9]+$/).optional(),
    reason: z.string().max(500).optional()
});

export type PauseSubscriptionRequest = z.infer<typeof PauseSubscriptionRequestSchema>;

export const ResumeSubscriptionRequestSchema = z.object({
    subscriptionId: z.string().regex(/^sub_[a-zA-Z0-9]+$/).optional()
});

export type ResumeSubscriptionRequest = z.infer<typeof ResumeSubscriptionRequestSchema>;

// ═══════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════

export const BatchImageGenerationRequestSchema = z.object({
    generationConfig: z.object({
        prompt: z.string().min(1).max(2000),
        negativePrompt: z.string().max(2000).optional(),
        numberOfImages: z.number().int().min(1).max(4).optional()
    }),
    projectId: z.string().max(100),
    itemsList: z.array(z.record(z.string(), z.any())).min(1).max(50),
    businessType: z.string().max(100).optional(),
    jobId: z.string().max(100)
});

export type BatchImageGenerationRequest = z.infer<typeof BatchImageGenerationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// FILE UPLOAD
// ═══════════════════════════════════════════════════════════

export const FileUploadRequestSchema = z.object({
    files: z.array(z.object({
        uid: z.string().max(100).optional(),
        name: z.string().max(255).regex(/^[a-zA-Z0-9._\- ]+$/), // Allow spaces in filenames
        size: z.number().max(50 * 1024 * 1024), // 50MB (for PDFs)
        type: z.string().regex(/^[a-z]+\/[a-z0-9+.-]+$/),
        url: z.string().max(5000).refine(
            url => url.startsWith('https://') || url.startsWith('data:image/') || url.startsWith('data:application/'),
            'URL must be HTTPS or a valid data URI'
        )
    })).min(1).max(10),
    targetLanguages: z.array(languageObjectSchema).optional(), // Changed from languageCodeSchema to languageObjectSchema
    projectId: z.string().max(100).optional(),
    fileId: z.string().max(100).optional(),
    action: z.string().max(50).optional()
});

export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CAPTION GENERATION
// ═══════════════════════════════════════════════════════════

const campaignTypeSchema = z.enum([
    'todays_special',
    'weekend_pick',
    'now_available',
    'menu_highlight',
    'meal_push',
    'bestseller_boost',
    'slow_item_rescue',
    'festival',
    'new_item'
]);

const executionSurfaceSchema = z.enum([
    'whatsapp_status',
    'whatsapp_message',
    'print_poster',
    'qr_tent',
    'digital_screen'
]);

export const CampaignCaptionRequestSchema = z.object({
    itemName: z.string().min(1).max(200),
    itemDescription: z.string().max(1000).optional(),
    itemPrice: z.string().max(50).optional(),
    categoryName: z.string().max(100).optional(),
    businessName: z.string().max(200).optional(),
    campaignType: campaignTypeSchema,
    surface: executionSurfaceSchema,
    language: z.string().max(50).default('en'),
    projectId: z.string().max(100).optional()
});

export type CampaignCaptionRequest = z.infer<typeof CampaignCaptionRequestSchema>;

// ═══════════════════════════════════════════════════════════
// CAMPAIGN GENERATION (Get today's campaigns)
// ═══════════════════════════════════════════════════════════

export const CampaignGenerateRequestSchema = z.object({
    projectId: z.string().max(100),
    forceRefresh: z.boolean().optional().default(false)
});

export type CampaignGenerateRequest = z.infer<typeof CampaignGenerateRequestSchema>;

// ═══════════════════════════════════════════════════════════
// GUEST FEEDBACK (Internal Feedback System)
// @see __docs__/projects/internal-feedback-system/
// ═══════════════════════════════════════════════════════════

/**
 * Guest feedback submission schema
 * Used by: POST /api/public/feedback/submit
 * 
 * NOTE: This is a PUBLIC endpoint - no auth required.
 * Rate limiting and honeypot are handled at the API layer.
 */
export const guestFeedbackSubmitSchema = z.object({
    // Required fields
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
    projectId: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    source: z.enum(['menu_footer', 'feedback_qr', 'direct_link']),

    // Optional fields
    message: z.string().max(300).optional(),
    customerName: z.string().max(60).optional(),
    customerPhone: z.string().max(20).optional(),
    customerEmail: z.string().email().max(120).optional(),

    // Honeypot field (for bot detection)
    // Must be empty - bots often fill hidden fields
    website: z.string().max(0).optional(),
});

export type GuestFeedbackSubmitRequest = z.infer<typeof guestFeedbackSubmitSchema>;

/**
 * Guest feedback update schema (for owner actions)
 * Used by: PATCH /api/feedback/[id]
 */
export const guestFeedbackUpdateSchema = z.object({
    status: z.enum(['new', 'resolved']),
    ownerNote: z.string().max(300).optional(),
});

export type GuestFeedbackUpdateRequest = z.infer<typeof guestFeedbackUpdateSchema>;
