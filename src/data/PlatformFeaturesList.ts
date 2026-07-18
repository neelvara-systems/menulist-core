const PlatformFeaturesList = {
    "B2C": [
        {
            "id": "projects",
            "name": "Customer lists",
            "category": "Core Platform",
            "description": "Each list has its own items, design, customer link, and settings.",
            "valueLabel": "{value} lists",
            "values": {
                "starter": 1,
                "pro": 5,
                "premium": 20
            }
        },
        {
            "id": "ai_data_extraction",
            "name": "Menu and list import",
            "category": "Content preparation",
            "description": "Prepare items, categories, prices, and available descriptions from a supported photo, image, PDF, or owned public source.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_descriptions",
            "name": "Prepared item descriptions",
            "category": "Content preparation",
            "description": "Prepare clear item descriptions for the owner to review before publishing.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_multi_language",
            "name": "Menu translations",
            "category": "Content preparation",
            "description": "Prepare supported customer-language versions for the owner to review before publishing.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "premium": "Included"
            }
        },
        {
            "id": "ai_image_generator",
            "name": "Generated item images",
            "category": "Content preparation",
            "description": "Generate one or more item-image options from an owner prompt, then keep only the approved results.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "ai_image_editor",
            "name": "Photo editing",
            "category": "Content preparation",
            "description": "Prepare supported photo improvements, background removal, and preset edits for owner review.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "interactive_studio",
            "name": "Composite image studio",
            "category": "Content preparation",
            "description": "Prepare composite product-image options, such as an item in a selected setting, for owner review.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "social_sharing",
            "name": "Shareable customer link",
            "category": "Marketing & Growth",
            "description": "Copy or share the approved customer link through the apps already available on your device.",
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
            "description": "Add amenities, dietary options, service modes, and payment methods to your Official Business Page.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "analytics_dashboard",
            "name": "Customer activity",
            "category": "Marketing & Growth",
            "description": "See visits, popular items and categories, searches, and customer actions from the menu and Official Business Page.",
            "valueLabel": "{name} - {value}",
            "values": {
                "starter": "Core metrics",
                "pro": "Core + action summaries",
                "premium": "Core + action summaries"
            }
        },
        {
            "id": "analytics_action_summaries",
            "name": "Owner action summaries",
            "category": "Marketing & Growth",
            "description": "Get a plain-language summary and a short action list from settled customer activity.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "seo_settings",
            "name": "Search page settings",
            "category": "Marketing & Growth",
            "description": "Set supported page titles and descriptions and use the generated sitemap for your customer pages.",
            "valueLabel": "{name}",
            "values": {
                "starter": false,
                "pro": true,
                "premium": true
            }
        },
        {
            "id": "google_pixel",
            "name": "Connect Google Analytics and Meta Pixel",
            "category": "Marketing & Growth",
            "description": "Connect your own supported analytics IDs for additional measurement on customer pages.",
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
            "name": "Remove MenuList branding",
            "category": "Marketing & Growth",
            "description": "Remove MenuList branding from your customer pages.",
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
            "name": "Prepared item descriptions",
            "category": "Content preparation",
            "description": "Prepare clear item descriptions for review before downstream use.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "custom": "Included"
            }
        },
        {
            "id": "ai_multi_language",
            "name": "Prepared translations",
            "category": "Content preparation",
            "description": "Prepare supported-language versions for review before downstream use.",
            "valueLabel": "{name}",
            "values": {
                "starter": "Included",
                "pro": "Included",
                "custom": "Included"
            }
        },
        {
            "id": "ai_image_generator",
            "name": "Generated item images",
            "category": "Content preparation",
            "description": "Generate one or more item-image options from a prompt and keep the approved results.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "ai_image_editor",
            "name": "Photo editing",
            "category": "Content preparation",
            "description": "Prepare supported photo improvements, background removal, and preset edits for review.",
            "valueLabel": "{name}",
            "values": {
                "starter": true,
                "pro": true,
                "custom": true
            }
        },
        {
            "id": "interactive_studio",
            "name": "Composite image studio",
            "category": "Content preparation",
            "description": "Prepare composite product-image options, such as an item in a selected setting, for review.",
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
            "description": "Review and edit prepared data beside the original source before publishing.",
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
            "name": "Design studio",
            "description": "Choose supported layouts, colors, fonts, and backgrounds for customer pages.",
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
            "description": "Review and edit prepared data beside the original source before downstream use.",
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
            "description": "Inspect and edit prepared structured data before using it in another application.",
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
