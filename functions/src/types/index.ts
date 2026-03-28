/**
 * Firebase Functions Types - Central Export
 * 
 * This file re-exports all types from the types folder.
 * 
 * Usage:
 *   import { MenuImageProcessingJob, FileMessage, IngestionJob } from '../types';
 * 
 * File Structure:
 *   types/
 *   ├── index.ts                    - This file (central re-export)
 *   ├── constants.ts                - Collection names, AI config, file types
 *   ├── fileMessages.types.ts       - FileMessage, FileMessageStatus, etc.
 *   ├── menuProcessingJob.types.ts  - MenuImageProcessingJob, status types
 *   ├── menuExtraction.types.ts     - ExtractedMenuData, MenuItem, etc.
 *   └── knowledgeBase.types.ts      - IngestionJob, KB articles/categories
 */

// Constants (collection names, AI config, file types)
export * from './constants';

// File Messages (processing warnings/errors)
export * from './fileMessages.types';

// Menu Processing Job Queue
export * from './menuProcessingJob.types';

// Menu Extraction (AI extraction results)
export * from './menuExtraction.types';

// Knowledge Base (ingestion, articles, categories)
export * from './knowledgeBase.types';
