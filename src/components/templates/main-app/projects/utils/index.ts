/**
 * Projects Utils - Barrel Export
 * 
 * This file re-exports utilities for backwards compatibility.
 * For optimal bundle size, import directly from specific files:
 * 
 * - Styling: import { getBackgroundStyles } from './utils/styleUtils'
 * - PDF: const { convertPdfToImages } = await import('./utils/pdfUtils')
 * - Excel: const { handleDownload } = await import('./utils/excelUtils')
 */

// Re-export lightweight styling utilities (always safe to import)
export {
    getBackgroundStyles,
    getBorderStyles, getResponsiveFontSize, getTextStyles, makeLighterColor
} from './styleUtils';

// Re-export Excel utilities (will lazy load ExcelJS when used)
export { getOutputJson, handleDownload } from './excelUtils';

// Note: PDF utilities should be dynamically imported to avoid loading pdfjs-dist
// Use: const { convertPdfToImages } = await import('./utils/pdfUtils')
