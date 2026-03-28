# 🎯 Projects Feature - Complete Overview

**Last Updated:** November 20, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features Overview](#features-overview)
5. [Data Flow](#data-flow)
6. [File Structure](#file-structure)
7. [Navigation](#navigation)

---

## Introduction

The **Projects** feature is MenuListAi's core functionality that allows restaurants to digitize their physical menus into structured, multi-language digital formats. It combines AI-powered OCR, image processing, translation, and visual customization tools.

### **Business Purpose:**

- Convert physical menu images/PDFs into structured JSON/Excel data
- Support multi-language menu management
- Generate professional food images using AI
- Create customizable B2C (customer-facing) digital menus
- Export data for API integration (B2B)

### **Target Users:**

- Restaurant Owners (create/manage menus)
- Platform Admins (access all features)
- API Consumers (B2B integrations)

---

## Architecture

### **Multi-Tenant Architecture**

```
Firestore Structure (Updated Dec 2025):
├── platformSummary/
│   └── projects_{sId}        // Summary document (1 read for listing)
│       └── { projects: { [projectId]: { name, description, active, isDefault } } }
│
└── projects/
    └── {tId}/
        └── {sId}/
            └── {projectId}   // Full project data + lifecycle flags
```

**Why Summary Document Pattern?**

- **Summary**: Single document read for project listing (90%+ fewer reads)
- **Projects Collection**: Full data + lifecycle flags for Cloud Functions

### **State Management**

```typescript
// Context Provider Pattern
<ProjectsDataProvider>
  // Global state shared across all views - activeProject: Project -
  currentView: 1 | 2 | 3 - selectedProject: ProjectMetadata -
  metadataProjectsList: ProjectMetadata[]
</ProjectsDataProvider>
```

**Views:**

1. **Upload View** - File upload & processing
2. **Editor View** - Data editing & management
3. **Preview View** - B2B (JSON) or B2C (Visual)

---

## Tech Stack

### **Frontend**

- **Framework**: Next.js 14 (App Router)
- **UI**: Ant Design 5.x
- **State**: React Context + useState
- **PDF Processing**: pdfjs-dist
- **Excel Export**: xlsx
- **JSON Viewer**: react18-json-view
- **Image Editing**: Compressor.js, React Cropper, Fabric.js

### **Backend**

- **API Routes**: Next.js API Routes (App Router)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI**: Google Gemini 2.5 Flash
  - OCR/Data Extraction
  - Image Generation (Gemini 2.0 Flash Preview)
  - Translation
  - Description Generation

### **Middleware**

- **Auth**: withAuth() wrapper (all routes protected)
- **Rate Limiting**: checkExpensiveAILimit() (5 req/min)
- **Input Validation**: Zod schemas
- **Security Logging**: Sentry integration

---

## Features Overview

| Feature                    | Description                      | AI-Powered    | Multi-tenant |
| -------------------------- | -------------------------------- | ------------- | ------------ |
| **File Upload**            | PDF/Image upload with preview    | ❌            | ✅           |
| **PDF Conversion**         | Convert PDF pages to images      | ❌            | ✅           |
| **Data Extraction**        | OCR menu text extraction         | ✅ Gemini 2.5 | ✅           |
| **Multi-Language**         | Add/translate languages          | ✅ Gemini     | ✅           |
| **Data Editor**            | Edit categories/items/attributes | ❌            | ✅           |
| **AI Image Generation**    | Generate food images             | ✅ Gemini 2.0 | ✅           |
| **Batch Image Generation** | Generate multiple images         | ✅ Gemini 2.0 | ✅           |
| **Image Editing**          | AI-powered image editing         | ✅ Gemini     | ✅           |
| **Description Generation** | AI-generated descriptions        | ✅ Gemini     | ✅           |
| **B2B Export**             | JSON/Excel export                | ❌            | ✅           |
| **B2C Builder**            | Visual menu customization        | ❌            | ✅           |
| **Theme Customization**    | Colors, fonts, layouts           | ❌            | ✅           |

---

## Data Flow

### **1. Upload → Process Flow**

```
User uploads PDF/Image
  ↓
Convert PDF to images (if PDF)
  ↓
Upload to Firebase Storage
  ↓
POST /api/image-processor
  ↓
Gemini 2.5 Flash OCR
  ↓
Extract: categories, items, prices, languages
  ↓
Transform IDs (add tenant/store prefixes)
  ↓
Save to Firestore (projectsData)
  ↓
Display in Editor
```

### **2. Language Addition Flow**

```
User selects new language
  ↓
For each file in project:
  POST /api/image-translations
  ↓
  Gemini translates:
    - Category names
    - Item names
    - Item descriptions
    - Attribute names
  ↓
  Update file.extractedData
  ↓
Save to Firestore
```

### **3. Image Generation Flow**

```
User configures generation settings
  ↓
POST /api/image-generation
  ↓
Build prompt from:
  - Item details (name, description, category)
  - Style selections (mood, composition, colors)
  - Reference images (optional)
  ↓
Gemini 2.0 Flash Image Generation
  ↓
Return base64 images
  ↓
Upload to Firebase Storage
  ↓
Attach to item
```

### **4. B2C Preview Flow**

```
User opens B2C view
  ↓
Load project config (theme, layout, colors)
  ↓
Render in device frame (mobile/tablet/desktop)
  ↓
Real-time theme editing
  ↓
Save config to Firestore
  ↓
Preview in modal (full-screen simulation)
```

---

## File Structure

```
src/
├── components/templates/main-app/projects/
│   ├── index.tsx                          # Main entry point
│   ├── type.ts                            # TypeScript types
│   ├── utils.ts                           # Helper functions
│   ├── data.ts                            # Dummy data (dev mode)
│   ├── getProcessedFile.ts               # API caller
│   │
│   ├── FileList.tsx                       # File grid display
│   ├── LanguageSelector.tsx              # Language selection
│   ├── PdfViewer.tsx                      # PDF preview
│   ├── ShareModal.tsx                     # Export/share dialog
│   │
│   ├── ProjectDetails/
│   │   ├── ProjectSelector.tsx            # Project dropdown
│   │   ├── ProjectEditModal.tsx           # Edit project metadata
│   │   └── ProjectConfirmModal.tsx        # Delete confirmation
│   │
│   ├── editorView/
│   │   ├── Editor.tsx                     # Main editor container
│   │   ├── EditorContent.tsx              # Category/item editor
│   │   ├── ImageUploadModal.tsx           # Image management
│   │   ├── DescriptionGenerationModal.tsx # AI descriptions
│   │   ├── LanguageSelectorModal.tsx      # Add languages
│   │   ├── ZoomableImage.tsx              # Image viewer
│   │   ├── editCategoryModal.tsx          # Edit categories
│   │   ├── editItemModal.tsx              # Edit items
│   │   ├── uploadedImagesList.tsx         # Image gallery
│   │   ├── AiDisclaimerAlert.tsx          # AI warning
│   │   └── AiImageGenerator/
│   │       └── [30+ files for image generation UI]
│   │
│   ├── b2bView.tsx                        # JSON editor view
│   │
│   └── b2cView/
│       ├── index.tsx                      # B2C main
│       ├── b2CViewHeader.tsx              # Device switcher
│       ├── deviceFrame.tsx                # Mobile/tablet frame
│       ├── sidebar.tsx                    # Theme settings
│       ├── previewModal.tsx               # Full preview
│       ├── types.ts                       # B2C types
│       │
│       ├── homePage/
│       │   ├── homePage.tsx               # Home page builder
│       │   ├── homePageSettings.tsx       # Home customization
│       │   ├── homePageCards.tsx          # Card components
│       │   ├── homeFrameDrawer.tsx        # Frame selector
│       │   └── homeFrameTemplates.ts      # Frame definitions
│       │
│       └── menuPage/
│           ├── MenuPageHeader.tsx         # Menu header
│           ├── backgroundSettings.tsx     # Background config
│           ├── borderSettings.tsx         # Border config
│           ├── colorPresetsDrawer.tsx     # Color palettes
│           ├── GradientPicker.tsx         # Gradient tool
│           ├── imageGalleryDrawer.tsx     # Background images
│           ├── colorPalettes.ts           # Predefined colors
│           ├── galleryImagesData.ts       # Image library
│           ├── gradientUtils.ts           # Gradient helpers
│           │
│           ├── components/
│           │   ├── CategoryPopup.tsx      # Category modal
│           │   ├── MenuFilters.tsx        # Search/filter
│           │   ├── PDPModal.tsx           # Product details
│           │   └── PriceFilterModal.tsx   # Price range
│           │
│           └── layouts/
│               └── menuLayoutTemplates.ts # Layout definitions

├── database/projects/
│   └── index.ts                           # Database layer (DAL)

├── app/api/
│   ├── image-processor/
│   │   ├── route.ts                       # OCR extraction API
│   │   └── prompt.ts                      # Gemini prompts
│   │
│   ├── image-generation/
│   │   ├── route.ts                       # Image generation API
│   │   ├── batch-generation/route.ts      # Batch generation
│   │   ├── batch-trigger/route.ts         # Batch trigger
│   │   └── prompt.ts                      # Image prompts
│   │
│   ├── image-editing/
│   │   ├── route.ts                       # Image editing API
│   │   └── promptsList/                   # Editing prompts
│   │
│   ├── descriptions/
│   │   └── route.ts                       # Description generation
│   │
│   └── new-item-metadata/
│       ├── route.ts                       # New item processing
│       └── prompt.ts                      # Item prompts

└── app/(main)/projects/
    └── page.tsx                           # Page wrapper
```

---

## Navigation

### **Documentation Structure:**

This documentation is organized by features for easy navigation:

```
__docs__/projects/
├── 00-overview.md                         # ← You are here
├── 01-UPLOAD-FILE-PROCESSING.md           # File upload & PDF conversion
├── 02-AI-DATA-EXTRACTION.md               # OCR & menu processing
├── 03-MULTI-LANGUAGE.md                   # Translation features
├── 04-DATA-EDITOR.md                      # Editing interface
├── 05-AI-IMAGE-GENERATION.md              # Image generation
├── 06-IMAGE-EDITING-UPLOAD.md             # Image management
├── 07-DESCRIPTION-GENERATION.md           # AI descriptions
├── 08-B2B-VIEW.md                         # JSON export/edit
├── 09-B2C-VIEW.md                         # Visual builder
├── 10-PROJECT-MANAGEMENT.md               # CRUD operations
├── 11-database-layer.md                   # Firestore patterns
├── 12-api-routes.md                       # API documentation
├── 13-types-interfaces.md                 # TypeScript definitions
└── 14-utilities.md                        # Helper functions
```

### **Quick Links by Role:**

**For Developers:**

- Start with: [01-UPLOAD-FILE-PROCESSING.md](./01-UPLOAD-FILE-PROCESSING.md)
- Then: [04-DATA-EDITOR.md](./04-DATA-EDITOR.md)
- Reference: [13-types-interfaces.md](./13-types-interfaces.md)

**For Backend Engineers:**

- Start with: [12-api-routes.md](./12-api-routes.md)
- Then: [11-database-layer.md](./11-database-layer.md)
- Reference: [02-AI-DATA-EXTRACTION.md](./02-AI-DATA-EXTRACTION.md)

**For UI/UX:**

- Start with: [09-B2C-VIEW.md](./09-B2C-VIEW.md)
- Then: [06-IMAGE-EDITING-UPLOAD.md](./06-IMAGE-EDITING-UPLOAD.md)

---

## Key Concepts

### **Project Lifecycle**

```
1. CREATE PROJECT
   ↓
2. UPLOAD FILES (PDF/Images)
   ↓
3. AI PROCESSING (Extract data)
   ↓
4. EDIT DATA (Categories, items, prices)
   ↓
5. ADD LANGUAGES (AI translation)
   ↓
6. GENERATE IMAGES (AI)
   ↓
7. CUSTOMIZE THEME (B2C)
   ↓
8. EXPORT/PUBLISH (B2B/B2C)
```

### **Data Model**

```typescript
Project {
  projectId: string
  files: ProjectFileType[]
  languages: string[]
  config: ThemeConfig
}

ProjectFileType {
  uid: string
  url: string
  extractedData: {
    categories: Category[]
    items: Item[]
    languages: Language[]
  }
}

Category {
  id: string
  name: { [langCode]: string }
  active: boolean
}

Item {
  id: string
  category: string (category ID)
  name: { [langCode]: string }
  description: { [langCode]: string }
  price: string
  attributes: Attribute[]
  images: Image[]
  active: boolean
}
```

### **Multi-Tenant Isolation**

All data is scoped by:

- **tId**: Tenant ID (business/organization)
- **sId**: Store ID (location/branch)

Example paths:

- Summary: `platformSummary/projects_{sId}`
- Data: `projects/{tId}/{sId}/{projectId}`
- Storage: `MenuListAi/project/files/{projectId}/{fileId}`

---

## Next Steps

1. **Read Feature Docs**: Start with [01-UPLOAD-FILE-PROCESSING.md](./01-UPLOAD-FILE-PROCESSING.md)
2. **Understand Data Flow**: Review [02-AI-DATA-EXTRACTION.md](./02-AI-DATA-EXTRACTION.md)
3. **Study Types**: Check [13-types-interfaces.md](./13-types-interfaces.md)
4. **Review APIs**: See [12-api-routes.md](./12-api-routes.md)

---

## Support & Maintenance

**For Questions:**

- Review relevant feature documentation
- Check [13-types-interfaces.md](./13-types-interfaces.md) for type definitions
- See [12-api-routes.md](./12-api-routes.md) for API contracts

**For Updates:**

- All changes must update corresponding documentation
- Follow existing patterns in code
- Test with both dev and prod modes

---

**End of Overview** | [Next: File Upload →](./01-UPLOAD-FILE-PROCESSING.md)
