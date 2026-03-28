# Project & Menu Management Guide

This guide explains how to use the Projects section of our platform to manage your digital menus. This powerful feature allows you to upload your existing menu files (images or PDFs), extract information automatically, and organize your offerings efficiently.

## Feature Summary

The Projects section offers a comprehensive suite of tools for managing your digital menus:

*   **Project Management:** View, select, and organize your menu projects.
*   **File Upload & Processing:**
    *   Upload menu files (JPG, PNG, PDF) via drag & drop or browsing.
    *   Automatic processing of images and PDF-to-image conversion.
*   **Multi-Language Support:** Select languages for AI-powered data extraction.
*   **Data Editing & Refinement:**
    *   Review and edit extracted menu items (names, descriptions, prices) directly.
    *   **AI-Powered Multi-Language Menus:** Instantly translate your entire menu—including all category names, item names, descriptions, and attribute names—into any supported language. Simply select your desired language and MenuListAI's AI will handle all translation and localization, with no manual work required.
    *   **Detailed Item Editing (`EditItemModal`):** Granular control over individual items, including multi-lingual fields, pricing, categories, custom attributes, and item-specific images. Includes AI translation assistance and instant language switching.
    *   **Image Management (`ImageUploadModal`):
        *   Upload images directly from your device.
        *   **AI Image Generation (`AiImageGenerator`):** Create unique images using text prompts, style selection, reference images, aspect ratio controls, and advanced settings (color, negative prompts).
    *   **AI Description Management (`DescriptionGenerationModal`):** Automatically create or rewrite menu item descriptions with selectable length options (Small, Medium, Large).
*   **Digital Menu Viewing:** View your finalized menu/catalogue tailored to B2B or B2C needs.

## Detailed Feature Descriptions

### 1. Managing Your Projects

### AI-Powered Multi-Language Menus (Unique Feature)

MenuListAI offers instant, AI-driven translation for your entire menu. At any stage, simply select a language using the Language Selector Modal. The AI will translate all menu content—categories, items, descriptions, attributes—across your project instantly and accurately. No manual translation or copy-paste required. This feature is available for both digital menu catalogues (B2C) and structured data export (B2B).


-   **View Existing Projects:** When you navigate to the Projects page, you'll see a list of all your current projects. 
-   **Select a Project:** Click on a project from the list to start working on it. The system will then load all associated menu files and data for that project.

### 2. Uploading and Processing Menu Files

This is where you bring your menu into the digital world.

-   **Upload Your Menu:** You can upload your menu files in common image formats (like JPG, PNG) or as PDF documents.
    -   **Drag & Drop:** Simply drag your menu file(s) onto the designated upload area.
    -   **Browse Files:** Alternatively, click the upload area to browse and select files from your computer.
-   **Supported File Types:** We support standard image files and PDF documents.
-   **File Size:** Please ensure your files are no larger than 10MB each.
-   **Single or Multiple Files:** You can upload a single file or multiple files at once (e.g., if your menu spans several pages or image files).
-   **Automatic Processing:** Once uploaded, our system automatically processes these files:
    -   Images are prepared for data extraction.
    -   If you upload a PDF, each page is converted into an image for easier processing.
-   **View Uploaded Files:** You'll see a list of all files you've uploaded for the selected project. You can remove any file if needed.

### 3. Selecting Languages for Extraction

If your menu is in multiple languages, or you want to extract information in specific languages:

-   **Choose Languages:** Before processing, you can select one or more languages. Our AI will then focus on extracting menu items (names, descriptions, prices) in your chosen languages.

### 4. The Main Menu Editor Interface (`Editor.tsx`)

Once files are uploaded and initial processing (like language selection) is done, you are taken to the main Menu Editor. This interface, primarily managed by the `src/components/templates/main-app/projects/Editor.tsx` component, is the central workspace for visually and contextually refining your menu's digital content, primarily geared towards preparing a B2C (Business-to-Consumer) digital menu catalogue.

**Key Aspects of the Main Editor:**

*   **Layout and Structure:**
    *   **File Display:** Typically, the editor displays a visual representation of your uploaded menu file (e.g., an image of the menu page via `ZoomableImage`) alongside the extracted data.
    *   **Content Editing Area (`EditorContent`):** For each uploaded file, an `EditorContent` component renders the list of extracted menu items (categories, items, descriptions, prices). Users can directly interact with this area to make changes.
    *   **Split View:** A splitter may be used to allow users to resize the file preview and data editing areas.
*   **Core Functionality:**
    *   **Data Management:** Loads the active project's data (`projectData`) and allows modifications.
    *   **Change Tracking:** Monitors for unsaved changes (`hasChanges`) and will warn users if they try to navigate away with unsaved work.
    *   **Saving and Publishing:**
        *   `syncChanges()`: Persists modifications to the database.
        *   "Publish Changes" button: Finalizes and saves the current state of the menu data.
    *   **Reset Changes:** A "Reset Changes" button allows users to discard any modifications made since the last save.
    *   **Navigation:**
        *   "Preview" (or "Save & Continue"): Saves current data and typically navigates the user to the B2C Menu Catalogue preview/view.
        *   Back navigation to leave the editor.
*   **Integrated Tools and Modals:** The main editor serves as the launch point for more specialized editing tasks, often through dedicated modals:
    *   **Language Management (`LanguageSelectorModal`):** Allows toggling active languages for the project, which can trigger re-translation of menu content (`translateFile` utility).
    *   **Item Image Management (`ImageUploadModal`):** Triggered when adding images to a specific menu item. The `Editor.tsx`'s `onImageUpload` function handles the logic of receiving uploaded/generated image data from this modal and associating it with the correct item in `projectData`. This includes uploading image files to storage in production environments.
    *   **AI Description Generation (`DescriptionGenerationModal`):** For creating or rewriting item descriptions using AI.
    *   **Detailed Item Editing (`EditItemModal`):** While not directly instantiated by `Editor.tsx` in the provided outline, the workflow implies that `EditorContent` or similar would launch this for in-depth changes to a single item (as described later).
*   **User Feedback:** Provides loading indicators and messages for ongoing operations.
*   **AI Disclaimer:** Often includes an `AiDisclaimerAlert` if AI tools are used.

This central editor orchestrates the various pieces of the menu data refinement process, providing a comprehensive environment for users to manage their digitized menu content before it's presented to their customers.

### 5. Reviewing and Editing Extracted Menu Data

After your files are processed, the system presents the extracted information within the Main Menu Editor interface (as detailed above).

-   **View Extracted Items:** See all the menu items, descriptions, and prices that our AI has identified from your uploaded files.
-   **Edit and Refine:** Within the `EditorContent` section of the Main Menu Editor, review the extracted data for accuracy. You can easily make corrections, add missing information, or refine details. This includes editing text inline for quick changes or using dedicated modals (launched from the editor) for more complex modifications as described below.
-   **Add More Menus:** If you need to add more menu pages or files during this stage, you can do so directly from the editor view.

#### 4.1. Detailed Item Editing (`EditItemModal`)

This modal (`src/components/templates/main-app/projects/editItemModal.tsx`) is launched when you need to make detailed changes to a specific menu item, typically from the `EditorContent` area within the Main Menu Editor. It provides granular control over all aspects of an individual item:

*   **Multi-Lingual Content Management:**
    *   Edit the item's **name, description, and attribute names** in all selected project languages. 
    *   For projects with multiple languages, the modal typically uses a **collapsible or tabbed interface**, presenting each language's fields in a dedicated section for clear and focused editing.
    *   Includes an **AI Translation Retry** feature, allowing users to specifically re-translate the item's textual content (name, description, attributes) for a chosen language if the initial automated translation requires improvement.
*   **Pricing and Categories:**
    *   Set or modify the item's base **price**.
    *   Assign or change the item's **category** by selecting from a list of categories defined within the project.
*   **Custom Attributes/Modifiers:**
    *   Flexibility to add, edit, or remove item-specific attributes (e.g., "Size: Large", "Spice Level: Hot", "Choice of Protein: Chicken").
    *   Each attribute can have its own **multi-lingual name** and an associated **price adjustment** (e.g., "Large +$2.00").
*   **Dedicated Image Management:**
    *   A distinct section or tab within the modal is dedicated to managing images for the current item.
    *   Displays currently associated images via the `UploadedImagesList` component.
    *   Provides an "Add Image" button that triggers the `ImageUploadModal`, allowing users to upload new images from their device or generate them using the `AiImageGenerator` for this specific item.
*   **Change Tracking and Saving:** The modal tracks changes made to the item and enables a "Save" button only when modifications have occurred, ensuring intentional updates to the project data.

#### 4.2. Managing Item Images (`ImageUploadModal`)

The `ImageUploadModal` is your central hub for adding images to menu items. It can be accessed from the `EditItemModal` or directly from other parts of the editor when an image needs to be associated with an item.

-   **Target Item Selection:** If not opened for a specific item, you can select the target menu item from a dropdown.
-   **Dual Image Sourcing:** The modal features two main tabs for sourcing images:
    1.  **Upload from Device:** Allows you to browse and upload standard image files (JPG, PNG, etc.) from your computer. It includes file type and size validation.
    2.  **Generate with AI:** This tab integrates the `AiImageGenerator` (detailed below) to create new images from scratch.
-   **View Existing Images:** Often displays images already associated with the selected item using the `UploadedImagesList` component.
-   **Confirmation:** After uploading or selecting generated images, you confirm to associate them with the item.

##### 4.2.1. AI Image Generation (`AiImageGenerator`)

Accessed via the "Generate with AI" tab in the `ImageUploadModal`, the `AiImageGenerator` provides powerful tools to create unique visuals:

-   **Text Prompt:** Describe the image you want (e.g., "Steaming hot espresso in a white cup"). The system may pre-fill this based on the item's name/description.
-   **Style Selection:** Choose from various artistic styles (e.g., "Photorealistic," "Vintage," "Illustration") to define the image's aesthetic.
-   **Reference Images:** Upload your own images to guide the AI's style or subject matter.
-   **Aspect Ratio:** Select the desired image proportions (e.g., 1:1, 16:9).
-   **Advanced Controls (Often Collapsible):**
    -   **Color Control:** Specify background or foreground color hints.
    -   **Negative Prompts:** List elements to exclude (e.g., "no text," "blurry").
-   **Image Generation & Selection:** The AI produces image options based on your settings. You can select the ones you like best.
-   **Retry:** If unsatisfied, adjust settings and regenerate.
-   **Loading & Feedback:** The interface provides loading indicators and messages during the generation process.

#### 4.3. AI-Powered Description Management (`DescriptionGenerationModal`)

To further assist with content creation, the `DescriptionGenerationModal` allows you to use AI to automatically generate or rewrite descriptions for your menu items. This modal can be accessed from the main editor, typically through an action button related to descriptions.

-   **Scope of Operation:** The modal can operate on a single selected file or all files within the current project, depending on where it's launched from.
-   **Description Length Control:** You can choose the desired length for the AI-generated or rewritten descriptions:
    -   **Small (15-25 words):** For concise descriptions.
    -   **Medium (25-40 words):** (Default) For balanced detail.
    -   **Large (50+ words):** For more elaborate descriptions.
-   **Core AI Actions:**
    -   **Create Descriptions:** If your menu items lack descriptions, this option uses AI to generate new ones based on item names and the selected length.
    -   **Rewrite Descriptions:** If items already have descriptions, this option uses AI to enhance or rephrase them according to the selected length and current best practices.
-   **User-Friendly Interface:** The modal clearly presents the options and provides feedback on the selected description length.

### 5. B2B Data View & Integration (`b2bView.tsx`)

For users, such as software companies or developers, who need direct access to the structured JSON data extracted from the menu files, the platform provides a dedicated B2B (Business-to-Business) view. This interface, managed by `src/components/templates/main-app/projects/b2bView.tsx`, focuses on data accessibility and integration rather than visual menu presentation.

**Key Features of the B2B Data View:**

*   **Direct JSON Viewing & Editing:**
    *   The core of this view is the `JsonView` component, which displays the raw JSON data extracted from each uploaded file.
    *   Users can directly edit the JSON structure and content within this view. This is useful for correcting extraction errors at a granular level or for tailoring the data schema to specific integration needs.
*   **Data Download Options:**
    *   **Download JSON:** Allows users to download the (potentially edited) project data as a `.json` file.
    *   **Download XLS:** Provides an option to download the data in an Excel (`.xlsx`) format, which can be useful for users who prefer to work with spreadsheet software.
*   **Data Sharing/Integration (API Endpoint):**
    *   The "Share" functionality in this context is designed for data integration.
    *   It opens a modal where users can enter their own API endpoint URL.
    *   Upon confirmation, the system will POST the current project's JSON data to the specified endpoint, enabling seamless integration with external systems or custom workflows.

This B2B view empowers technical users to leverage the extracted menu data programmatically, fitting it into their existing software ecosystems or using it for custom analytics and applications.

### 6. Viewing Your Digital Menu/Catalogue (B2C Focus)

Once you're satisfied with the extracted and edited data, you can proceed to view your digital menu or catalogue.

-   **B2B/B2C Specific Views:** Depending on your business type (Business-to-Business or Business-to-Consumer), the platform will display your menu in a format tailored to your needs.

## Overall Workflow Summary

The project and menu management process follows a three-stage approach, with the first two stages being common for all users, and the third stage diverging based on user needs (B2C visual catalogue vs. B2B data integration).

**Common Stages:**

1.  **Stage 1: File Upload & Data Extraction**
    *   **Project Selection/Creation:** Access the Projects page to select an existing project or start a new one.
    *   **File Upload:** Upload menu files (JPG, PNG, PDF) via drag & drop or file browser.
    *   **Language Selection:** Choose the languages for AI-powered data extraction if needed.
    *   **System Processing:** The platform processes uploaded files, converting PDFs to images and preparing data for the editor.

2.  **Stage 2: Content Editing & Refinement (`Editor.tsx`)**
    *   **Access Main Editor:** After processing, users work within the **Main Menu Editor (`Editor.tsx`)**.
    *   **Review & Modify Data:** This is the primary interface to review and correct extracted data—item names, descriptions, prices, categories.
    *   **Utilize Editing Tools:** Leverage specialized modals for detailed adjustments:
        *   `EditItemModal`: For granular, multi-lingual editing of individual items, attributes, and categories.
        *   `ImageUploadModal`: To add or generate images for items (using `AiImageGenerator`).
        *   `DescriptionGenerationModal`: To create or rewrite item descriptions with AI.
    *   **Save Changes:** Periodically use the "Publish Changes" (or equivalent save function) in the `Editor.tsx` to persist all content refinements.
    *   This stage is crucial for both B2C and B2B users to ensure data accuracy and completeness.

**Stage 3: Output Generation & Utilization (Diverging Paths)**

Once content is refined in `Editor.tsx` (Stage 2), users proceed based on their primary objective:

*   **For B2C Users (e.g., Restaurants, Salons - Digital Menu Catalogue):**
    1.  **Navigate to B2C Customizer:** From `Editor.tsx`, typically by clicking "Preview" or "Save & Continue," users transition to the **B2C Menu Catalogue View (`B2CView.tsx`)**.
    2.  **Customize Appearance:** Within `B2CView.tsx`, use the **Customization Sidebar (`B2CSidebar.tsx`)** to adjust visual aspects: themes, layouts, colors, fonts, backgrounds, etc. (Full details in the `menu-catalogue-guide.md`).
    3.  **Publish Visual Customizations:** Make the styled B2C menu live and visible to customers.
    4.  **Share Digital Menu:** Use the sharing options within `B2CView.tsx` (via `ShareModal`) to distribute the public link to the interactive digital menu.

*   **For B2B Users (e.g., Software Companies, Developers - JSON Data):**
    1.  **Navigate to B2B Data View:** Access the **B2B Data View (`b2bView.tsx`)** for the project.
    2.  **Inspect & Edit JSON:** Directly view and, if necessary, edit the raw JSON data for each file using the `JsonView` component.
    3.  **Download Data:** Use the "Download JSON" or "Download XLS" buttons to obtain local copies of the structured data.
    4.  **Integrate Data (Share to API):** Use the "Share" button within `b2bView.tsx` to open a modal where an API endpoint can be specified. The project's JSON data will then be POSTed to this endpoint for seamless integration with external systems.

**Iteration:**
Users can iterate within any stage or switch between the B2C and B2B output paths as needed. For instance, a user might refine content heavily in `Editor.tsx`, then customize the B2C view, and also export the final JSON via `b2bView.tsx` for backup or other integrations.

## Additional Considerations

-   **Active Subscription:** Access to the full suite of project and menu management features requires an active subscription. If you don't have one, you'll see a notification.
-   **Processing Time:** Please allow a few moments for files to upload and process, especially for larger files or multi-page PDFs. You'll see status indicators during these operations.

We hope this guide helps you make the most of our menu management features! If you have any questions, please don't hesitate to reach out to our support team.
