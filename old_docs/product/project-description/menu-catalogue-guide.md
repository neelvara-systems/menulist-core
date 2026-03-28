# Menu Catalogue Customization & Viewing Guide

This guide explains how to customize and view the B2C (Business-to-Consumer) Menu Catalogue. This is the final output that your customers will see, showcasing your menu items in an interactive and visually appealing way.

## Overview

The B2C Menu Catalogue provides a dynamic and customizable interface for users to browse your menu. It's designed to be responsive and adaptable to various branding and layout preferences. Key aspects include real-time preview of changes, device-specific views, and a range of customization options managed through a dedicated sidebar.

## Global Controls & Preview Options (`B2CViewHeader`)

The header area of the B2C Menu Catalogue view provides global navigation and device preview options:

*   **Back Navigation:** A prominent "Back" button (typically an arrow icon) allows you to easily return to the previous screen or the main project editing interface.
*   **Device Preview Toggles:**
    *   Quickly switch the live preview of your menu between different device formats:
        *   **Desktop View:** See how your menu appears on a desktop computer.
        *   **Tablet View:** Preview the menu on a tablet-sized screen.
        *   **Mobile View:** (Often the default) Check the appearance on a mobile phone.
    *   The active device view is highlighted, and the main content area updates instantly to reflect the selected device, ensuring your menu is responsive and looks great on all screen sizes.

## Menu Customization Sidebar (`B2CSidebar`)

The sidebar is the primary control panel for tailoring the appearance and functionality of your B2C Menu Catalogue. It provides tools to manage changes, share your menu, and access detailed settings for different pages.

### Key Actions in the Sidebar:

*   **Preview (`LuEye` icon):** Opens a modal for a full-scale, interactive preview of your menu as it will appear to customers. This allows you to check your customizations in real-time.
*   **Share (`LuShare` icon):** Opens a modal that provides options to get a shareable link to your live menu catalogue. This is useful for sharing with stakeholders or for marketing purposes.
*   **Publish (`LuUploadCloud` icon):
    *   Makes all your recent customizations live and visible to your customers.
    *   **Change Detection:** The button is intelligently enabled only when there are unpublished changes. The system compares the current state of your menu configuration with the last published version.
    *   **Asset Handling:** If you've uploaded new background images (for home page, menu page, categories, or items) directly in the customizer, these images are automatically uploaded to cloud storage during the publishing process, and their URLs are updated in your menu's configuration.
    *   **Feedback:** Provides clear loading indicators and success messages upon completion.

### Page-Specific Customization:

The sidebar features a main card area titled "Customise your menu" where you can fine-tune different sections of your catalogue:

*   **Page Selector:** A segmented control allows you to switch between customizing different primary views:
    *   **Home Page:** Select this to access settings specific to your menu's landing/home page (managed by `HomePageSettings`).
    *   **Menu Page:** Select this to configure the layout and style of your main menu listing (managed by `MenuPageSettings`).
*   **Dynamic Settings Area:** The content within the card changes based on whether you've selected "Home Page" or "Menu Page," displaying the relevant set of customization options.

### Customizing the Home Page (`HomePageSettings`)

When "Home Page" is selected in the sidebar's page selector, the following customization options become available, managed by the `HomePageSettings` component:

*   **Entry Points (`HomePageCards`):** The initial view often presents cards or buttons that act as quick links to open drawers for more detailed settings like "Page Theme" or "Frame Layout".

*   **Page Theme Selection (`PageThemeDrawer`):
    *   Choose an overall theme for your home page (e.g., Modern, Classic, Minimalist). 
    *   Themes provide a baseline set of styles for text, borders, and backgrounds, ensuring a cohesive look.
    *   This selection is typically made within a dedicated drawer.

*   **Frame Layout (`HomeFrameDrawer`):
    *   Select a structural layout or "frame" for your home page content.
    *   Different frames offer various arrangements for elements like banners, welcome messages, and navigation to menu sections (e.g., "Double Square" layout).
    *   This is also usually configured in a separate drawer.

*   **Detailed Styling Controls:**
    *   **Text Styles (`StylesSettings`):** 
        *   Customize font families, sizes, colors, and weights for various text elements on the home page.
        *   These settings can override or build upon the defaults provided by the selected Page Theme.
    *   **Border Styles (`BorderSettings`):
        *   Adjust border colors, widths, styles (solid, dashed), and corner roundness for containers or sections on the home page.
        *   These also integrate with or override theme defaults.
    *   **Background Styles (`BackgroundSettings`):
        *   Configure the background of the home page. Options can include solid colors, gradients, or uploaded background images.
        *   Theme defaults are considered but can be fully customized.

Essentially, you can pick a broad theme, choose a content structure (frame), and then dive deep into styling every visual aspect of your menu's home page.

### Customizing the Menu Page (`MenuPageSettings`)

When "Menu Page" is selected in the sidebar, you gain access to a comprehensive set of tools to style the core of your digital menu—the categories and items listing. These are managed by the `MenuPageSettings` component:

*   **Entry Points (`MenuPageCards`):** Like the home page settings, this area usually provides quick access buttons/cards to open drawers for selecting "Page Theme" or "Layouts" for the menu page.

*   **Page Theme Selection (`PageThemeDrawer`):
    *   Apply an overall theme (e.g., Modern, Elegant, Minimal) specifically to your menu listing page.
    *   This theme sets the default appearance for the menu page background, category titles, item text, and their respective containers.

*   **Menu Layout (`LayoutsDrawer`):
    *   Choose from various predefined layouts for how your categories and items are structured and displayed (e.g., "List View", "Grid View", "Accordion Style", "Modern Compact").
    *   This is a fundamental choice that significantly impacts the user's browsing experience.

*   **Main Menu Background (`BackgroundSettings`):
    *   Set a custom background for the entire menu page area where categories and items are listed. This can be a solid color, a gradient, or an uploaded image, overriding the theme's default background if desired.

*   **Category Styling (`StylesSettings` for "Category"):
    *   Fine-tune the visual presentation of your menu categories.
    *   Customize text (font, color, size for category titles), background colors/images for category headers, and border styles.
    *   These settings allow categories to stand out or blend seamlessly with your overall design, building upon or overriding theme defaults.

*   **Menu Item Styling (`StylesSettings` for "Item"):
    *   Control the appearance of individual menu items within each category.
    *   Customize text (font, color, size for item names, descriptions, prices), background colors/images for item cards, and border styles.
    *   This ensures your items are presented clearly and attractively, consistent with your branding and chosen theme.

By combining these options, you can create a unique and engaging menu presentation, from the overall layout and theme down to the specific styling of each category and item.

## Common Styling Components

Several components are reused across `HomePageSettings` and `MenuPageSettings` to provide consistent and detailed styling capabilities. These are key to fine-tuning the visual details of your B2C menu catalogue.

### Text and Container Styles (`StylesSettings`)

This versatile component is used to control typography and, for some entities, their container's border and background. It's typically invoked for specific parts of your menu, such as "Home" (for general home page text), "Category" (for category titles and their containers), and "Item" (for menu item details and their containers).

**Key Features:**

*   **Entity-Specific Context:** It's configured with an `entity` name (e.g., "Home", "Category", "Item") to clarify what is being styled.

*   **Comprehensive Text Styling:**
    *   **Font Family:** Choose from a list of available fonts.
    *   **Text Color:** Select any color using a color picker.
    *   **Font Size:** Set a specific font size in pixels.
    *   **Text Alignment:** Align text to the left, center, or right.
    *   **Emphasis & Decoration:**
        *   **Bold:** Toggle bold text.
        *   **Italic:** Toggle italicized text.
        *   **Underline:** Toggle underlined text.
        *   **Case:** Transform text to uppercase.
    *   **Text Shadow:** Apply or remove a predefined text shadow effect.
    *   **Writing Mode (Mainly for Categories):** For category titles, you can switch between standard horizontal text and vertical (sideways) text, which also adjusts the layout flow of associated elements.

*   **Integrated Container Styling (for Categories & Items):**
    *   When styling entities like "Category" or "Item" (i.e., not the general "Home" page text), `StylesSettings` also incorporates controls for their surrounding containers:
        *   **Border Settings:** Access detailed border customization (covered by `BorderSettings` component).
        *   **Background Settings:** Access detailed background customization (covered by `BackgroundSettings` component).
    *   These settings are intelligently merged with any defaults provided by an active Page Theme.

### Background Customization (`BackgroundSettings`)

This powerful component is used to define the background appearance of various containers, such as the entire Home Page, the Menu Page, or the individual cards for Categories and Items. It offers a flexible choice between solid colors, gradients, or image backgrounds.

**Key Features:**

*   **Background Type Selector:** Users can typically choose their preferred background type via tabs or a segmented control:
    *   **Solid Color:** For a simple, uniform background.
    *   **Gradient:** To create smooth transitions between multiple colors.
    *   **Image:** To use a picture as the background.

*   **Solid Color Options:**
    *   **Color Picker:** Select any desired color with opacity controls.
    *   **Color Presets:** Often, a drawer (`ColorPresetsDrawer`) provides a palette of predefined solid colors for quick and consistent selection.

*   **Gradient Options:**
    *   **Gradient Editor (`GradientPicker`):** A dedicated interface allows for:
        *   Creating linear gradients.
        *   Adding, removing, and modifying color stops (choosing color and position for each).
        *   Adjusting the angle of the gradient.
    *   **Gradient Presets:** The `ColorPresetsDrawer` may also offer a selection of pre-designed gradients.
    *   *Note:* If an image background is active, it usually needs to be removed for the gradient to become visible.

*   **Image Background Options:**
    *   **Direct Upload:**
        *   Upload an image file (e.g., PNG, JPG, typically with a size limit like 2MB) directly from your device.
        *   The system often provides a preview of the uploaded image.
    *   **Image Gallery (`ImageGalleryDrawer`):
        *   Browse and select from a collection of pre-supplied stock images or previously uploaded images relevant to restaurant themes or general textures.
    *   **Image Management:**
        *   **Replace:** Easily swap out the current background image with a new one.
        *   **Remove:** Clear the background image, reverting to a color/gradient or theme default.

*   **Smart Initialization:** The component intelligently detects existing background settings (e.g., if an image is already set, it defaults to the 'Image' tab).
*   **Clear All Backgrounds:** A dedicated option (e.g., a "Remove Background" button) often exists to completely clear all background styling (color, gradient, and image), reverting to transparent or theme-defined defaults.

### Border Customization (`BorderSettings`)

This component provides granular control over the borders of various containers within your B2C Menu Catalogue, such as the main home page container, menu page sections, or individual category/item cards.

**Key Features:**

*   **Border Style Selector (`Select` control):
    *   Choose the visual style of the border. Common options include:
        *   `None` (to have no border)
        *   `Solid`
        *   `Dashed`
        *   `Dotted`
        *   And other CSS border styles like `Double`, `Groove`, `Ridge`, `Inset`, `Outset`.

*   **Conditional Border Properties:** The following options typically appear only if a border style other than `None` is selected:
    *   **Border Radius (`InputNumber`):
        *   Controls the roundness of the container's corners. You can set a pixel value (e.g., 0px for sharp corners, 8px for slightly rounded, etc.).
    *   **Border Width (`InputNumber`):
        *   Defines the thickness of the border in pixels.
    *   **Border Color (`ColorPicker`):
        *   Select the color of the border using a standard color picker.

*   **Smart Configuration Handling:**
    *   The component can parse existing border configurations, whether they are set as individual CSS properties (e.g., `borderWidth`, `borderStyle`, `borderColor`) or as a shorthand `border` CSS string.
    *   When you modify a border property, it intelligently updates the individual properties in your configuration, ensuring precise control and avoiding conflicts with shorthand CSS.
    *   Setting the border style to `None` typically clears out other border-specific properties like width and color, effectively removing the border (though border radius might be preserved depending on the design).

This allows for precise definition of how framed or separated different elements on your menu catalogue appear.

### Theme Selection (`PageThemeDrawer`)

This component, typically invoked from `HomePageSettings` or `MenuPageSettings`, allows users to apply a pre-designed visual theme to either the Home Page or the Menu Page. It appears as a `Drawer` sliding from the side.

**Key Features:**

*   **Drawer Interface:** Provides a clean, focused interface for browsing and selecting themes.
*   **Contextual Title:** The drawer's title dynamically reflects whether it's for "Home Page Styles" or "Menu Page Styles."
*   **Theme Templates:**
    *   Displays a list of available themes as clickable `Card` components.
    *   Each theme card shows a `label` (e.g., "Modern Elegance"), a `description`, and a mini visual preview (often by applying the theme's background and font to the card itself).
    *   Themes come with pre-packaged style configurations, including `fontFamily`, text `color`, `background` (color or image), and potentially `borderColor` and other specific settings defined in `PageThemeTypes`.
*   **Active Theme Indication:** The currently applied theme is clearly marked (e.g., with a checkmark icon).
*   **Applying a Theme:**
    *   When a user selects a theme, the component updates the relevant part of the `projectData` configuration.
    *   For the Home Page, it typically sets `config.homePage.themeType` and applies associated styles to `config.homePage.container` and `config.homePage.text`.
    *   For the Menu Page, it sets `config.menuPage.themeType` and applies styles to `config.menuPage.background`, `config.menuPage.categoryStyle`, and `config.menuPage.itemStyle`.
    *   These theme styles serve as a base, which can be further customized using the more granular `StylesSettings`, `BackgroundSettings`, and `BorderSettings` components.

This provides a quick way to establish an overall look and feel before diving into finer details.

### Home Page Frame Selection (`HomeFrameDrawer`)

Accessed from the `HomePageSettings`, this drawer allows users to choose a specific decorative frame or structural style for the Home Page.

**Key Features:**

*   **Drawer Interface:** Presents options in a drawer titled "Choose Home Frame Style."
*   **Frame Options (`FrameOptions`):
    *   Displays a list of pre-defined frame styles as clickable `Card` components (e.g., "Classic Border," "Modern Full Width Image Background").
    *   Each option has a `label` for display and a `value` for internal identification.
*   **Selection Feedback:** The currently active frame is visually highlighted in the drawer (e.g., with a border color change or a slight zoom effect on the card).
*   **Updating Configuration:** Selecting a frame updates the `projectData` by setting a property like `config.homePage.frameType` to the chosen frame's value. The actual visual rendering of this frame is handled by the Home Page component based on this selected `frameType`.

This allows for an additional layer of structural styling on top of the selected theme for the home page.

### Menu Page Layout Selection (`LayoutsDrawer`)

Invoked from `MenuPageSettings`, this drawer component is dedicated to choosing the structural layout for how categories and items are displayed on the Menu Page.

**Key Features:**

*   **Drawer Interface:** Options are presented in a drawer titled "Choose Layout Style."
*   **Layout Options (`layoutOptions`):
    *   Displays a list of pre-defined menu layouts (e.g., "Classic List," "Modern Grid," "Compact Two-Column") as clickable `Card` components.
    *   Each option has a `label` for display and a `value` (of type `MenuLayoutType`) for internal identification, sourced from `menuLayoutTemplates.ts`.
    *   The UI might support image previews for each layout to help users visualize the structure (though this part was commented out in the reviewed code, it indicates a potential feature).
*   **Selection Feedback:** The currently active layout is visually highlighted in the drawer (e.g., with a border color change or a slight zoom effect on its card).
*   **Updating Configuration:** Selecting a layout updates `projectData` by setting a property like `config.menuPage.layoutType` to the chosen layout's value. The Menu Page then uses this `layoutType` to render categories and items accordingly.

This component allows users to fundamentally change the arrangement and presentation of their menu content.

### Main Content Preview (`MainContentRenderer`)

This vital component, located at `src/components/templates/website/mainContentRenderer/index.tsx`, serves as the live preview area within the B2C Menu Catalogue editor. It's what shows the user how their Home Page or Menu Page will look based on their selected device and customizations.

**Key Features & Functionality:**

*   **Receives Critical Props:**
    *   `activeDeviceType`: Dictates the simulated device (mobile, tablet, desktop) for the preview.
    *   `projectData`: The complete configuration object holding all styles, content, and settings.
    *   `activePage`: Determines whether to render the `HomePage` or the `MenuLayout` (for the menu page).
    *   `setActivePage`: Allows internal navigation within the preview (e.g., a button in the home page preview might switch to the menu page preview).
    *   `activeLanguage`, `setActiveLanguage`: For multi-language support in the preview.
    *   `fromPage`: Indicates the context (e.g., "b2c-editor"), which can subtly alter preview behavior.

*   **Device Simulation (`DeviceFrame`):
    *   The entire rendered content is wrapped within a `DeviceFrame` component.
    *   `DeviceFrame` uses the `activeDeviceType` to visually simulate the chosen device's screen size and appearance.

*   **Conditional Page Rendering:**
    *   **Home Page (`PageType.HOME`):
        *   Renders the `HomePage` component.
        *   Passes down relevant props like `activeDeviceType`, `frameType` (from `projectData.config.homePage.frameType`), and a `styleTemplate`.
        *   The `styleTemplate` is intelligently constructed by merging the base styles from the selected Home Page theme (`PageThemeTypes`) with any specific customizations made by the user (stored in `projectData.config.homePage`).
    *   **Menu Page (`PageType.MENU`):
        *   Renders the `MenuLayout` component.
        *   Passes down props like `activeDeviceType`, `layoutType` (from `projectData.config.menuPage.layoutType`), `projectData` (for menu content), and a `styleTemplate`.
        *   Similar to the Home Page, the `styleTemplate` for the Menu Page merges the selected Menu Page theme styles with user-specific customizations from `projectData.config.menuPage`.

*   **Live Update:** As users change settings in the `B2CSidebar` (e.g., themes, colors, text, layouts), the `projectData` is updated, and this component re-renders to reflect those changes immediately in the preview area.

Essentially, `MainContentRenderer` is the engine that brings all the user's configurations to life, providing an accurate, interactive preview of their B2C Menu Catalogue.

### Immersive Preview (`PreviewModal`)

Triggered typically by a "Preview" button in the `B2CSidebar`, this component provides a full-screen modal overlay for an immersive preview of the B2C Menu Catalogue.

**Key Features:**

*   **Full-Screen Modal:** Uses an Ant Design `Modal` configured to take up the entire viewport, offering a distraction-free preview environment.
*   **Internal Device and Page Navigation:**
    *   The modal maintains its own internal state for `activeDeviceType` (desktop, tablet, mobile) and `activePage` (Home or Menu).
    *   A device switcher (using icons for desktop, tablet, and mobile) is embedded in the modal's header, allowing users to change the device context directly within this full-screen preview.
*   **Renders via `MainContentRenderer`:
    *   The actual preview content within the modal is rendered by the `MainContentRenderer` component.
    *   It passes its internally managed `activeDeviceType` and `activePage`, along with `projectData` and language settings, to `MainContentRenderer`.
    *   The `fromPage` prop for `MainContentRenderer` is typically set to a value like "b2c" or "b2c-preview-modal" to indicate the context.
*   **Dedicated Preview Experience:** Allows users to see and interact with their menu catalogue as an end-user would, across different screen sizes, without the main editor UI elements being visible.

This offers a more realistic test environment before publishing.

### Sharing the Menu (`ShareModal`)

Accessed via the "Share" button in the `B2CSidebar`, the `ShareModal` (located at `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`) provides users with multiple ways to distribute their B2C Menu Catalogue.

**Key Features:**

*   **Modal Interface:** Presents sharing options within a modal titled "Share Menu."
*   **Dynamic Share URL:** Automatically constructs the public, shareable URL for the current menu using the `projectId` (e.g., `yourdomain.com/menu/projectId`).
*   **Tabbed Sharing Methods:** Offers a clear, tabbed interface for different sharing approaches:
    *   **Share Link Tab (`LinkView`):
        *   Displays the full shareable URL.
        *   Typically includes a "Copy Link" button for easy copying to the clipboard.
    *   **QR Code Tab (`QRCodeView`):
        *   Generates and displays a QR code that, when scanned, directs to the `shareUrl`.
        *   May offer an option to download the QR code image.
    *   **Social Media Tab (`SocialShareView`):
        *   Provides convenient buttons or links to share the menu directly on popular social media platforms.
*   **Informational Alert:** Includes an `Alert` to inform users that the shared link, QR code, or social media post will make the menu publicly accessible.
*   **Encapsulated Logic:** The specific UI and functionality for each sharing method (link copying, QR generation, social sharing buttons) are handled by dedicated sub-components (`LinkView`, `QRCodeView`, `SocialShareView`), keeping the main `ShareModal` organized.

This component is crucial for enabling users to easily make their customized menus available to their customers.

---

This concludes the detailed breakdown of the primary components involved in creating, customizing, previewing, and sharing a B2C Menu Catalogue using this system. The combination of these components provides a rich and user-friendly experience for menu management.
