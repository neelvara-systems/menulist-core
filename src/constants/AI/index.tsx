
export const AI_OPERATIONS_LIST = {
    BACKGROUND_REMOVAL: "Background_Removal",
    IMAGE_GENERATION: "Image_Generation",
    IMAGE_COMPRESSION: "Image_Compression",
    TEXT_SUGGESTIONS_GENERATOR: "Design_Text_Suggestions",
}

export const OPENAI_ENDPOINT = "https://api.openai.com/v1/"

export const TEXT_SUGESTIONS_API = {
    MODAL: "gpt-3.5-turbo-instruct"
};

export const IMAGE_GENRATION_API = {
    MODAL: "dall-e-3",
    STYLES: "natural",
    QUALITY: "standard",
    IMAGE_SIZES: {
        "dall-e-2": "512x512",
        "dall-e-3": "1024x1024",
    }
}

export type BatchImageGenerationJobStatusType = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'finished' | 'discarded';

export const BATCH_IMAGE_GENERATION_JOB_STATUS: Record<string, BatchImageGenerationJobStatusType> = {
    QUEUED: "queued",//this is when batch job is scheduled and added to google task queue
    PROCESSING: "processing",//this is when batch job is processing
    COMPLETED: "completed",//this is when batch job is completed successfully
    FAILED: "failed",//this is when batch job fails to generate images or naything wrong happens on server
    CANCELLED: "cancelled",//this is when user cancels the batch job which is in processing or queued
    FINISHED: "finished",//this is when user uploads the images after batch job is completed
    DISCARDED: "discarded",//this is when user discards the batch job which is already in completed
}

export const IMAGE_GENERATION_STYLES = [
    {
        "category": "Photorealism",
        "styles": [
            {
                "name": "Natural Light",
                "description": "Soft, realistic lighting mimicking sunlight, often creating a gentle and authentic feel. Ideal for food, portraits, and lifestyle shots."
            },
            {
                "name": "Studio Lighting",
                "description": "Controlled, artificial lighting typical of professional studios. Creates sharp details and defined shadows. Great for product catalogs, portraits, and polished food shots."
            },
            {
                "name": "Cinematic Lighting",
                "description": "Dramatic lighting with high contrast, deep shadows, and often a specific color grade, mimicking a scene from a film. Adds mood and atmosphere."
            },
            {
                "name": "Macro Photography",
                "description": "Extreme close-up shots revealing intricate details and textures. Perfect for food ingredients, skin textures, tattoo details, or small products."
            },
            {
                "name": "Shallow Depth of Field / Bokeh",
                "description": "Sharp focus on the main subject with a beautifully blurred background (bokeh). Directs attention and adds an artistic, professional look."
            },
            {
                "name": "High Detail / Sharp Focus",
                "description": "Everything in the image is sharp and in focus, emphasizing clarity and detail across the entire scene. Suitable for technical shots or landscapes."
            },
            {
                "name": "Food Photography",
                "description": "Specifically styled to make food look delicious and appealing, often using techniques like selective focus, good lighting, and props."
            },
            {
                "name": "Product Photography",
                "description": "Clean, well-lit shots focused on showcasing a product clearly, often against a simple or isolated background. Essential for catalogs."
            }
        ]
    },
    {
        "category": "Camera & Viewpoint",
        "styles": [
            {
                "name": "Top-Down / Flat Lay",
                "description": "Shot directly from above, showing objects arranged on a flat surface. Popular for food, products, and organized layouts."
            },
            {
                "name": "Isometric View",
                "description": "A 3D representation viewed from an angle where parallel lines remain parallel (no perspective distortion). Common in technical illustration and games."
            },
            {
                "name": "Low Angle Shot",
                "description": "Camera looks up at the subject, making it appear powerful, imposing, or large."
            },
            {
                "name": "High Angle Shot",
                "description": "Camera looks down on the subject, potentially making it seem smaller, vulnerable, or providing an overview of a scene."
            },
            {
                "name": "Wide Angle Shot",
                "description": "Captures a broad field of view, often used for landscapes, interiors, or establishing shots. Can introduce perspective distortion."
            },
            {
                "name": "Dutch Angle / Tilted",
                "description": "The camera is tilted off the horizontal axis, creating a sense of unease, dynamism, or disorientation."
            }
        ]
    },
    {
        "category": "Illustration & Art",
        "styles": [
            {
                "name": "Digital Painting",
                "description": "Art created digitally that mimics traditional painting techniques (oil, acrylic, watercolor) but with a smooth, often vibrant digital finish."
            },
            {
                "name": "Concept Art",
                "description": "Stylized illustrations used to convey an idea or design before final creation. Often painterly and atmospheric."
            },
            {
                "name": "Vector Art",
                "description": "Clean, flat graphics with sharp lines and scalable shapes, often used for logos, icons, and infographics. Lacks photographic texture."
            },
            {
                "name": "Cartoon / Cel Shaded",
                "description": "Simplified, non-realistic style with bold outlines and flat areas of color, similar to traditional animation cels."
            },
            {
                "name": "Watercolor",
                "description": "Mimics traditional watercolor painting with soft edges, transparent layers, and often visible paint bleed effects. Creates a light, artistic feel."
            },
            {
                "name": "Anime / Manga Style",
                "description": "Distinctive Japanese animation/comic style characterized by large eyes, expressive features, and often dynamic compositions."
            },
            {
                "name": "Fantasy Art",
                "description": "Imaginative style depicting magical elements, mythical creatures, or otherworldly scenes, often with rich detail and dramatic lighting."
            },
            {
                "name": "Pop Art",
                "description": "Bright, bold colors and imagery inspired by comic books and advertising, often featuring repetition or iconic subjects."
            }
        ]
    },
    {
        "category": "Drawing & Sketch",
        "styles": [
            {
                "name": "Pencil Sketch",
                "description": "Simulates a drawing made with graphite pencils, showing texture, shading, and linework. Can range from rough to highly detailed."
            },
            {
                "name": "Ink Drawing",
                "description": "Mimics art created with pen and ink, featuring strong lines, hatching, or stippling for shading. Good for clear outlines and technical looks."
            },
            {
                "name": "Charcoal Drawing",
                "description": "Emulates the soft, smudged, and deep black look of charcoal art, often used for expressive portraits or atmospheric scenes."
            },
            {
                "name": "Blueprint Style",
                "description": "Technical drawing look with white or light lines on a blue background, showing schematic views or plans."
            },
            {
                "name": "Tattoo Flash Style",
                "description": "Mimics traditional tattoo designs, often featuring bold black outlines, limited color palettes, and specific motifs (e.g., American Traditional)."
            },
            {
                "name": "Line Art / Outline",
                "description": "Simplified style using only lines to define shapes, with minimal or no shading or color. Clean and graphic."
            },
            {
                "name": "Chalkboard Art",
                "description": "Looks like drawings made with chalk on a dark chalkboard surface, often used for menus or rustic signage."
            }
        ]
    },
    {
        "category": "Atmospheric & Mood",
        "styles": [
            {
                "name": "Minimalist",
                "description": "Clean, simple compositions with uncluttered space, limited color palettes, and focus on essential elements. Conveys elegance and modernity."
            },
            {
                "name": "Dark & Moody",
                "description": "Utilizes low-key lighting, deep shadows, and often muted or rich colors to create a sense of drama, mystery, or intimacy."
            },
            {
                "name": "Bright & Airy",
                "description": "Features high-key lighting, light colors, and an open feel, conveying freshness, cleanliness, and positivity. Great for spas and healthy food."
            },
            {
                "name": "Vintage / Retro",
                "description": "Evokes the style of a specific past era (e.g., 1950s, 1970s) through color palettes, filters, subject matter, or composition."
            },
            {
                "name": "Cyberpunk",
                "description": "Futuristic, neon-lit urban environments, often with a gritty, high-tech, dystopian feel. Features blues, purples, and pinks."
            },
            {
                "name": "Steampunk",
                "description": "Combines Victorian-era aesthetics with retrofuturistic steam-powered technology. Features brass, copper, gears, and intricate mechanics."
            },
            {
                "name": "Surreal / Dreamlike",
                "description": "Bizarre, illogical scenes combining elements in unexpected ways, often creating a mysterious or subconscious atmosphere."
            }
        ]
    }
]