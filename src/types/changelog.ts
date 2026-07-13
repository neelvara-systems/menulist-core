import { Timestamp } from 'firebase/firestore';
import { UserUploadedFileType } from './common';

export interface ChangelogEntry {
    id: string;
    title: string;
    description: any; // Tiptap JSON content
    tags: string[];
    releasedOn: Timestamp;
    createdOn: Timestamp;
    createdBy: string;
    modifiedOn: Timestamp | null;
    modifiedBy: string | null;
    published?: boolean;
    version?: string;
    likes?: number;
    dislikes?: number;
    files?: UserUploadedFileType[],
    kbSources: { categoryId: string, sectionId?: string, articleId?: string }[],
    contextKeys?: string[],
    entityChanges?: string[];
    releaseId?: string;
    youtubeLinks?: string[];
}

export interface ChangelogPage {
    id: string;
    pageNumber: number;
    createdOn: Timestamp;
    createdBy: string;
    modifiedOn: Timestamp;
    modifiedBy: string;
    nextPageId: string | null;
    approxSizeBytes?: number;
    entries: ChangelogEntry[];
    entryIds: string[];
}
