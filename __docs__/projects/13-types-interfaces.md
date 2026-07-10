# 📐 Types & Interfaces

**Complete TypeScript Type Definitions**  
**File**: `src/components/templates/main-app/projects/type.ts`  
**Lines**: 313 total

---

## Core Types

### **ProjectMetadata**

Lightweight project information for listing.

```typescript
// DEPRECATED: Use ProjectSummaryData for listing
export interface ProjectMetadata {
  projectId?: string; // Unique ID: {tId}-{timestamp}-{sId}
  name: string; // Project display name
  description?: string; // Optional description
  createdOn?: Timestamp;
  modifiedOn?: Timestamp;
  isDefault?: boolean; // Show at root URL
}
```

### **ProjectSummaryData** (NEW - Dec 2025)

Summary data stored in `platformSummary/projects_{sId}` document.

```typescript
export interface ProjectSummaryData {
  name: string; // Project display name
  description?: string; // Optional description
  active: boolean; // Is project active?
  isDefault?: boolean; // Show at root URL
}
```

**Firestore Path**: `platformSummary/projects_{sId}.projects[projectId]`

**Usage**:

```typescript
// Listing projects (1 read)
const { projects } = await getProjectsList();

// Creating project (auto-syncs to summary)
await addProject({
  name: "Summer Menu 2024",
  description: "Seasonal offerings",
});
```

---

### **Project**

Full project data including files, configuration, and lifecycle flags.

```typescript
export interface Project {
  projectId?: string; // Unique ID: {tId}-{timestamp}-{sId}
  files?: ProjectFileType[]; // Uploaded/processed files
  languages?: string[]; // Language codes ["en", "es", "fr"]
  config?: ThemeConfig; // B2C theme configuration
  active: boolean; // Lifecycle flag (for Cloud Functions)
  deleted: boolean; // Lifecycle flag (soft delete)
  deletedAt?: Timestamp; // Deletion timestamp
  createdOn?: Timestamp;
  modifiedOn?: Timestamp;
}
```

**Firestore Path**: `projects/{tId}/{sId}/{projectId}`

**Usage**:

```typescript
// Load full project
const project: Project = await getProjectData(projectId);

// Update project
await updateProject({
  projectId,
  languages: ["en", "es", "fr"],
  files: [...updatedFiles],
});
```

---

### **ProjectFileType**

Individual file (image/PDF page) with extracted data.

```typescript
export interface ProjectFileType {
  uid?: any; // Unique file ID
  active?: boolean; // Is file active?
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // Deletion timestamp
  index?: number; // Display order
  name?: string; // Filename
  size?: number; // File size (bytes)
  type?: string; // MIME type
  url?: string; // Firebase Storage URL or base64
  extractedData?: ExtractedData; // AI-extracted menu data
  inputToken?: any; // Gemini input tokens
  ouputToken?: any; // Gemini output tokens (typo in original)
  charges?: any; // AI cost
  chargePerToken?: any; // Cost per token
  processingTime?: number; // Processing duration (ms)
}
```

**Lifecycle**:

```typescript
// 1. Upload (base64)
{
    uid: "file-001",
    name: "menu-page-1.jpg",
    type: "image/jpeg",
    url: "data:image/jpeg;base64,...",  // Base64
    active: true
}

// 2. Uploaded to Storage
{
    url: "https://storage.googleapis.com/...",  // Firebase URL
    processingTime: 2500
}

// 3. After AI Processing
{
    extractedData: { /* menu data */ },
    inputToken: 1500,
    outputToken: 800,
    charges: 0.0023
}
```

---

## Extracted Data Types

### **ExtractedData**

Complete AI extraction result.

```typescript
export interface ExtractedData {
  message: string; // "success" or error message
  data: {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
    languages: ExtractedDataLanguage[];
  };
}
```

### **ExtractedDataCategory**

Menu category (section).

```typescript
export interface ExtractedDataCategory {
  id: string; // Category ID (transformed: {fileId}c{originalId})
  active: boolean; // Display in menu?
  name: { [key: string]: string }; // Multi-language names
  images?: UserUploadedFileType[]; // Category images (optional)
}
```

**Example**:

```typescript
{
    id: "file001c1",
    active: true,
    name: {
        "en": "Main Course",
        "es": "Plato Principal",
        "fr": "Plat Principal"
    },
    images: [
        { url: "https://...", type: "image/jpeg" }
    ]
}
```

### **ExtractedDataItem**

Menu item (dish/product).

```typescript
export interface ExtractedDataItem {
  id: string; // Item ID (transformed: {fileId}i{originalId})
  attributes?: ExtractedDataAttribute[]; // Sizes/variations
  category: string; // Category ID reference
  name: { [key: string]: string }; // Multi-language names
  description?: { [key: string]: string }; // Multi-language descriptions
  price?: string; // Base price (if no attributes)
  images?: UserUploadedFileType[]; // Item images
  tags?: string[]; // Search tags
  active: boolean; // Display in menu?
}
```

**Example**:

```typescript
{
    id: "file001i5",
    category: "file001c1",  // Main Course
    active: true,
    name: {
        "en": "Margherita Pizza",
        "es": "Pizza Margherita",
        "fr": "Pizza Margherita"
    },
    description: {
        "en": "Classic pizza with mozzarella and basil",
        "es": "Pizza clásica con mozzarella y albahaca"
    },
    price: "12.99",  // Used if no attributes
    images: [
        { url: "https://...", type: "image/jpeg" }
    ],
    tags: ["vegetarian", "popular"]
}
```

### **ExtractedDataAttribute**

Item variation (size, option).

```typescript
export interface ExtractedDataAttribute {
  name: { [key: string]: string }; // Multi-language names
  id: string; // Attribute ID (transformed: {itemId}a{originalId})
  price: string; // Price for this variation
  active: boolean; // Available?
}
```

**Example**:

```typescript
// Pizza sizes
{
    id: "file001i5a1",
    active: true,
    name: {
        "en": "Small (9 inch)",
        "es": "Pequeña (9 pulgadas)"
    },
    price: "10.99"
}
```

### **ExtractedDataLanguage**

Detected language in menu.

```typescript
export interface ExtractedDataLanguage {
  name: string; // Language name
  code: string; // ISO code (en, es, fr, etc.)
}
```

---

## Theme Configuration Types

### **ThemeConfig**

Complete B2C theme configuration.

```typescript
export interface ThemeConfig {
  homePage: {
    container: {
      background?: string; // Solid color or gradient
      backgroundImage?: string; // Image URL
      backgroundStyle?: StyleObject; // CSS properties
    };
    border: StyleObject; // Border styles
    text: StyleObject; // Text styles
    themeType: PageThemeType; // Preset theme
    frameType: HomeFrameType; // Frame layout
  };
  menuPage: {
    themeType: PageThemeType;
    layoutType: MenuLayoutType;
    showMenuImages: boolean; // Show item images?
    viewType: "grid" | "list" | "card"; // Display mode
    categoryStyle: {
      text: TextStyle;
      container?: ContainerStyle;
    };
    itemStyle: {
      container?: ContainerStyle;
      text: TextStyle;
    };
    background?: string;
    backgroundImage?: string;
    backgroundStyle?: StyleObject;
  };
}
```

### **PageThemeType**

Predefined theme names.

```typescript
export type PageThemeType = "modern" | "classic" | "elegant" | "minimal";
```

### **StyleObject**

Generic style properties.

```typescript
export interface StyleObject {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  backgroundColor?: string;
  background?: string;
  backgroundImage?: string;
  border?: string;
  borderRadius?: number;
  // ... any CSS property
}
```

---

## Image Generation Types

### **ImageGenerationConfigType**

UI state for image generation modal.

```typescript
export interface ImageGenerationConfigType {
  prompt?: string; // Custom prompt
  referanceImages?: any[]; // Reference images (typo in original)
  referanceImage?: UserUploadedFileType | null; // Single reference
  loading?: boolean; // Generation in progress
  generatedImages?: UserUploadedFileType[]; // Generated results
  stylesCategory?: string; // Style category selected
  styles: string[]; // Selected styles
  aspectRatio: string; // "1:1", "16:9", etc.
  environments?: string[]; // ["restaurant", "studio"]
  lighting?: string[]; // ["natural", "warm"]
  colors?: string[]; // ["vibrant", "muted"]
  moods?: string[]; // ["elegant", "casual"]
  compositions?: string[]; // ["close-up", "overhead"]
  backgroundColor?: string; // Hex color
  negativePrompt?: string; // What to avoid
  transparentBg?: boolean; // Remove background
  foregroundColor?: string; // Foreground color
  selectedImageTypes?: string[]; // ["food", "drink"]
  isMultiMode?: boolean; // Generate multiple
}
```

### **GenerateImageViaApiPayloadType**

API request for image generation.

```typescript
export type GenerateImageViaApiPayloadType = {
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  fileId?: string;
  businessType: string;
  itemDetails: GenerateImageViaApiPayloadItemDetailsType;
};

export type GenerateImageViaApiPayloadGenerationConfiType = {
  prompt?: string;
  referanceImage?: UserUploadedFileType | null;
  stylesCategory?: string;
  styles?: string[];
  aspectRatio?: string;
  environments?: string[];
  lighting?: string[];
  colors?: string[];
  moods?: string[];
  compositions?: string[];
  backgroundColor?: string;
  transparentBg?: boolean;
  negativePrompt?: string;
  foregroundColor?: string;
  selectedImageTypes?: string[];
  isMultiMode?: boolean;
  numberOfImages?: number;
};

export type GenerateImageViaApiPayloadItemDetailsType = {
  id?: string;
  name?: string;
  description?: string;
  attributes?: string[];
  category?: string;
};
```

### **BatchImageGenerationJobType**

Batch generation job tracking.

```typescript
export type BatchImageGenerationJobType = {
  modifiedOn?: string | number | Date;
  createdOn?: string | number | Date;
  id?: string; // Job ID
  status: BatchImageGenerationJobStatusType; // "pending", "processing", "completed", "failed"
  totalImages: number; // Total to generate
  generatedCount: number; // Completed count
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  itemsList: {
    // Items to process
    id: string;
    name: string;
    images: UserUploadedFileType[];
  }[];
  statusHistory: {
    // Audit trail
    status: BatchImageGenerationJobStatusType;
    reason?: string;
    createdOn: string | number | Date;
  }[];
  error?: string; // Error message if failed
};
```

---

## Translation Types

### **TranslationAPIParams**

Translation request.

```typescript
export interface TranslationAPIParams {
  inputJson: any; // Data to translate
  targetLang: LanguageType; // Target language
  sourceLang: LanguageType; // Source language
  action: keyof typeof languageActionType; // "IMAGE_TRANSLATION" or "LANGUAGE_ADDITION"
  projectId: string;
  fileId: string;
}

export interface LanguageType {
  code: string; // ISO code (en, es, fr)
  name: string; // Display name
}

export const languageActionType = {
  IMAGE_TRANSLATION: AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
  LANGUAGE_ADDITION: AI_ACTIONS_TYPES.LANGUAGE_ADDITION,
};
```

---

## Description Generation Types

### **DescriptionAPIParams**

Description generation request.

```typescript
export interface DescriptionAPIParams {
  itemsList: ExtractedDataItem[];
  targetLang: LanguageType[]; // Languages to generate
  sourceLang: LanguageType; // Source language
  action: keyof typeof descriptionActionType;
  projectId: string;
  fileId: string;
  contentLength: "Small" | "Medium" | "Large";
}

export const descriptionActionType = {
  ADD_DESCRIPTION: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
  REWRITE_DESCRIPTION: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
};
```

---

## Helper Types

### **ConvertedImageType**

PDF page converted to image.

```typescript
export interface ConvertedImageType {
  uid: string; // Unique ID
  name: string; // Filename
  size: number; // File size (bytes)
  type: string; // "image/jpeg"
  url: string; // Base64 data URL
  fileId: any; // Parent PDF file ID
}
```

### **ItemForDropdown**

Item with flattened data for dropdowns.

```typescript
export type ItemForDropdown = ExtractedDataItem & {
  itemName: string; // Name in current language
  categoryName: string; // Category name in current language
  fileId: string; // Source file ID
  descriptionLine?: string; // First line of description
  attributesList?: string[]; // Attribute names
};
```

---

## Type Guards

### **Checking Processed Files**

```typescript
function isProcessed(file: ProjectFileType): boolean {
  return Boolean(file.extractedData);
}

function hasImages(item: ExtractedDataItem): boolean {
  return Boolean(item.images && item.images.length > 0);
}

function hasAttributes(item: ExtractedDataItem): boolean {
  return Boolean(item.attributes && item.attributes.length > 0);
}
```

---

## Usage Examples

### **Type-Safe Project Creation**

```typescript
import {
  Project,
  ProjectMetadata,
  ExtractedDataCategory,
  ExtractedDataItem,
} from "./type";

// Create metadata
const metadata: ProjectMetadata = {
  projectId: `${tId}-${Date.now()}-${sId}`,
  name: "New Menu",
  active: true,
  deleted: false,
};

// Create project
const project: Project = {
  projectId: metadata.projectId,
  languages: ["en"],
  files: [],
  config: {
    homePage: {
      /* ... */
    },
    menuPage: {
      /* ... */
    },
  },
};
```

### **Type-Safe Data Extraction**

```typescript
const extractedData: ExtractedData = {
  message: "success",
  data: {
    categories: [
      {
        id: "file001c1",
        active: true,
        name: { en: "Appetizers" },
      },
    ],
    items: [
      {
        id: "file001i1",
        category: "file001c1",
        active: true,
        name: { en: "Spring Rolls" },
        price: "8.99",
      },
    ],
    languages: [{ code: "en", name: "English" }],
  },
};
```

---

## Constants

### **AI Action Types**

```typescript
import { AI_ACTIONS_TYPES } from "@constant/common";

// Used in API calls
action: AI_ACTIONS_TYPES.IMAGE_PROCESSING;
action: AI_ACTIONS_TYPES.IMAGE_TRANSLATION;
action: AI_ACTIONS_TYPES.LANGUAGE_ADDITION;
action: AI_ACTIONS_TYPES.ADD_DESCRIPTION;
action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION;
```

---

**[← Back to Overview](./00-overview.md)** | **[Next: Utilities →](./14-utilities.md)**
