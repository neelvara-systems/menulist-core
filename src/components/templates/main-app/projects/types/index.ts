/**
 * Projects Feature Types - Central Export
 * 
 * Usage:
 *   import { Project, ExtractedData, FileMessage } from './types';
 *   import { Project } from '@template/main-app/projects/types';
 * 
 * File Structure:
 *   types/
 *   ├── index.ts                 - This file (central re-export)
 *   ├── theme.types.ts           - ThemeConfig, PageThemeType
 *   ├── extractedData.types.ts   - ExtractedData, Category, Item, Language
 *   ├── fileMessages.types.ts    - FileMessage, FileMessageStatus, etc.
 *   ├── project.types.ts         - Project, ProjectMetadata, ProjectFileType
 *   ├── common.types.ts          - LanguageType, ConvertedImageType
 *   ├── api.types.ts             - API request/response types
 *   ├── imageGeneration.types.ts - Image generation config types
 *   └── batchJob.types.ts        - Batch job types
 */

// Theme & Configuration
export * from './theme.types';

// Extracted Data (AI extraction results)
export * from './extractedData.types';

// File Messages (processing warnings/errors)
export * from './fileMessages.types';

// Project Structure
export * from './project.types';

// Common Utilities
export * from './common.types';

// API Request/Response Types
export * from './api.types';

// Image Generation
export * from './imageGeneration.types';

// Batch Jobs
export * from './batchJob.types';

// Decision Blocks Types
export * from './decisionBlocks.types';

// Owner Dashboard Types
export * from './ownerDashboard.types';

// Command Center Types (Bulk Operations)
export * from './commandCenter.types';
