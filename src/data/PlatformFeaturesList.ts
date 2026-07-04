const PlatformFeaturesList = {
    "B2C": [
        {
            "id": "projects",
            "name": "Number of Projects",
            "category": "Core Platform",
            "description": "A project is a unique digital catalog. Each project can have its own set of items, design, and settings.",
            "valueLabel": "{value} Projects",
            "values": {
                "starter": 1,
                "pro": 5,
                "premium": 20
            }
        },
        {
            "id": "ai_data_extraction",
            "name": "AI Data Extraction (from PDF/Image)",
            "category": "AI Data Processing",
            "description": "Automatically extract items, categories, prices, and descriptions from any uploaded menu or price list.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_descriptions",
            "name": "AI Description Generation",
            "category": "AI Content Suite",
            "description": "Programmatically generate compelling, SEO-friendly descriptions for your items.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_multi_language",
            "name": "AI Multi-Language Translation",
            "category": "AI Content Suite",
            "description": "Translate your entire catalog into multiple languages with a single click.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_image_generator",
            "name": "AI Image Generator (with Batch Processing)",
            "category": "AI Content Suite",
            "description": "Generate stunning, on-brand visuals and photoshoots from a simple text prompt. Batch processing allows you to generate multiple images at once.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "ai_image_editor",
            "name": "AI Image Editor",
            "category": "AI Content Suite",
            "description": "Enhance your existing photos, remove backgrounds, or make smart edits with one-click industry presets.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "interactive_studio",
            "name": "Interactive Studio (Virtual Try-On)",
            "category": "AI Content Suite",
            "description": "Programmatically create hyper-realistic composite images like on-model photography or product-in-space visualizations.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "social_sharing",
            "name": "One-Click Social Sharing",
            "category": "Marketing & Growth",
            "description": "Directly share your catalog to WhatsApp, Facebook, and Instagram with tracked links.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "qr_code",
            "name": "Custom-Branded QR Code",
            "category": "Marketing & Growth",
            "description": "Generate print-ready QR codes with your brand's colors and logo.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "menu_kit",
            "name": "Menu Kit (Print-Ready Materials)",
            "category": "Marketing & Growth",
            "description": "Download a complete set of branded, print-ready materials (table tents, counter stickers, A-frame signs, wall posters) with your QR code.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "official_business_page",
            "name": "Official Business Page",
            "category": "Online Presence",
            "description": "A professional business page with your menu, hours, location, and current status. Link out to your existing booking and ordering platforms.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "business_attributes",
            "name": "Business Discovery Attributes",
            "category": "Online Presence",
            "description": "Mark your amenities (WiFi, parking, outdoor seating), dietary options, service modes, and payment methods to appear in search results.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "analytics_dashboard",
            "name": "Analytics Dashboard",
            "category": "Marketing & Growth",
            "description": "See menu sessions, engaged sessions, intent, action rate, top items, top categories, source quality, searches, and official-page actions.",
            "valueLabel": "{name} - {value}",
            "values": {
                "starter": "Core metrics",
                "pro": "Core + action summaries",
                "premium": "Core + action summaries"
            }
        },
        {
            "id": "analytics_action_summaries",
            "name": "Analytics Action Summaries",
            "category": "Marketing & Growth",
            "description": "Plain-language dashboard summaries and a short owner action list generated from settled menu and official-page analytics.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "seo_settings",
            "name": "Advanced SEO Settings",
            "category": "Marketing & Growth",
            "description": "Optimize your catalog for search engines with custom meta tags and sitemaps.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "google_pixel",
            "name": "Connect Google Analytics & Meta Pixel",
            "category": "Marketing & Growth",
            "description": "Connect your catalog to Google Analytics and Facebook Pixel for tracking and measurement.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "custom_domain",
            "name": "Connect Custom Domain",
            "category": "Marketing & Growth",
            "description": "Use your own domain name for your catalog (e.g., menu.yourbrand.com).",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "remove_branding",
            "name": "Remove MenulListAI Branding",
            "category": "Marketing & Growth",
            "description": "Remove MenulListAI branding from your catalog.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": false,
                "premium": true
            }
        },
        {
            "id": "support",
            "name": "Support",
            "category": "Support & Services",
            "description": "Get help from our team when you need it.",
            "valueLabel": "{value}",
            "values": {
                "starter": "Email Support",
                "pro": "Standard Email Support",
                "premium": "Priority Email Support"
            }
        }
    ],
    "B2B": [
        {
            "id": "projects",
            "name": "Monthly API Calls (Data Extraction)",
            "category": "API & Integrations",
            "description": "The number of times you can call our API to extract data from a document each month.",
            "valueLabel": "{value} Calls",
            "values": {
                "starter": 1000,
                "pro": 5000,
                "custom": "Custom"
            }
        },
        {
            "id": "webhooks",
            "name": "Webhooks",
            "category": "API & Integrations",
            "description": "Receive event notifications for supported account activity.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "file_exports",
            "name": "File Exports (JSON, XLS)",
            "category": "API & Integrations",
            "description": "Directly download the clean, structured data for use anywhere.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "ai_descriptions",
            "name": "AI Description Generation",
            "category": "AI Content Suite",
            "description": "Programmatically generate compelling, SEO-friendly descriptions for your items.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "custom": "Included"
            }
        },
        {
            "id": "ai_multi_language",
            "name": "AI Multi-Language Translation",
            "category": "AI Content Suite",
            "description": "Translate your entire catalog into multiple languages with a single click.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "custom": "Included"
            }
        },
        {
            "id": "ai_image_generator",
            "name": "AI Image Generator (with Batch Processing)",
            "category": "AI Content Suite",
            "description": "Generate stunning, on-brand visuals and photoshoots from a simple text prompt. Batch processing allows you to generate multiple images at once.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "ai_image_editor",
            "name": "AI Image Editor",
            "category": "AI Content Suite",
            "description": "Enhance your existing photos, remove backgrounds, or make smart edits with one-click industry presets.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "interactive_studio",
            "name": "Interactive Studio (Virtual Try-On)",
            "category": "AI Content Suite",
            "description": "Programmatically create hyper-realistic composite images like on-model photography or product-in-space visualizations.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "support",
            "name": "Developer Support",
            "category": "Support & Services",
            "description": "Access to our technical team for integration help and support.",
            "valueLabel": "{value}",
            "values": {
                "starter": "Email Support",
                "pro": "Priority Email Support",
                "custom": "Dedicated Support"
            }
        }
    ]
}

export default PlatformFeaturesList

export const StarterPlanFeaturesList = [
    "projects",
    "ai_data_extraction",
    "ai_descriptions",
    "ai_multi_language",
    "ai_image_generator",
    "ai_image_editor",
    "social_sharing",
    "qr_code",
    "analytics_dashboard",
    "support"
]

export const ProPlanFeaturesList = [
    "projects",
    "interactive_studio",
    "seo_settings",
    "analytics_dashboard",
    "google_pixel",
    "custom_domain",
    "support",
]

export const PremiumPlanFeaturesList = [
    "projects",
    "remove_branding",
    "support"
]

export const CustomPlanFeaturesList = [
    "projects",
    "support"
]

export const commonFeaturesList = {
    "B2C": [
        {
            "id": "verification_dashboard",
            "name": "Side-by-Side Verification Dashboard",
            "description": "Visually confirm and edit the extracted data next to your original document for 100% accuracy.",
            "category": "Platform Essentials",
            "valueLabel": "Included",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "creative_design_studio",
            "name": "Full Creative Design Studio",
            "description": "Complete control over your catalog's branding with custom layouts, colors, fonts, and backgrounds.",
            "category": "Platform Essentials",
            "valueLabel": "Included",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        }
    ],
    "B2B": [
        {
            "id": "verification_dashboard",
            "name": "Side-by-Side Verification Dashboard",
            "description": "Visually confirm and edit the extracted data next to your original document for 100% accuracy.",
            "category": "Platform Essentials",
            "valueLabel": "Included",
            "values": {
                "starter": true,
                "growth": true,
                "scale": true
            }
        },
        {
            "id": "visual_json_editor",
            "name": "Visual JSON Editor",
            "description": "The perfect workbench for developers to visually inspect and perfect the AI's data output before using it in an application.",
            "category": "Platform Essentials",
            "valueLabel": "Included",
            "values": {
                "starter": true,
                "growth": true,
                "scale": true
            }
        },
    ]
}
