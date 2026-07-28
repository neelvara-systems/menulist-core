import * as functions from 'firebase-functions';
import * as fs from 'fs'; // Import the 'fs' module
import { normalizeProcessedKBData, normalizeVector } from ".";
import {
    AI_ADVANCED_MODEL,
} from "../constants/ai";
import { storageAdmin } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import {
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG,
    buildAnswerlatticeEmbeddingRequest,
} from '../sharedData/answerlatticeEmbedding';
import { ProcessedKBMap } from "../types";
import { buildSafeTempFilePath } from "./safeTempFile";
import { tiptapToText } from "./tiptapUtils";
import { getBoundedFunctionsErrorContext } from './boundedErrorContext';

const GENERATIVE_MODEL = AI_ADVANCED_MODEL;
const KB_SOURCE_GENERATION_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_GENERATION_FAILED';
const KB_SOURCE_FILE_UPLOAD_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_FILE_UPLOAD_FAILED';
const KB_SOURCE_FILE_CLEANUP_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_FILE_CLEANUP_FAILED';
const ARTICLE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_ARTICLE_EMBEDDING_FAILED';
const KB_SOURCE_GENERATION_FAILED_MESSAGE = 'Knowledge base generation failed';
const ARTICLE_EMBEDDING_FAILED_MESSAGE = 'Embedding generation failed';
const KB_SOURCE_STORAGE_PATH_REJECTED_CODE = 'ANSWERLATTICE_KB_SOURCE_STORAGE_PATH_REJECTED';
const KB_SOURCE_FILE_REJECTED_CODE = 'ANSWERLATTICE_KB_SOURCE_FILE_REJECTED';
const KB_PROVIDER_FILE_CLEANUP_FAILED_CODE = 'ANSWERLATTICE_KB_PROVIDER_FILE_CLEANUP_FAILED';
const MAX_SOURCE_FILES = 8;
const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_TOTAL_BYTES = 40 * 1024 * 1024;
const ALLOWED_SOURCE_MIME_TYPES = new Set([
    'application/json',
    'application/msword',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/xml',
    'text/csv',
    'text/html',
    'text/markdown',
    'text/plain',
    'text/xml',
]);
/**
 * Interface for the source files provided to the prompt constructor.
 */
interface SourceFile {
    downloadURL: string;
    storagePath: string;
    fileName: string;
    type: string;
    gsUri: string;
}

interface ValidatedSourceFile extends SourceFile {
    byteSize: number;
}

interface UploadedProviderFile {
    mimeType: string;
    name: string;
    uri: string;
}

interface KnowledgeSourceScope {
    sId?: string | number | null;
    tId?: string | number | null;
}

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getAiUtilsErrorContext(error: unknown): Record<string, string | number | null> {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        sourceErrorName: context.sourceErrorName || typeof error,
        sourceErrorCode: context.sourceErrorCode ?? null,
        sourceErrorStatus: context.sourceStatusCode ?? null,
    };
}

function getSourceFileContext(file: SourceFile): Record<string, string | number | boolean | null> {
    return {
        fileNameLength: file.fileName?.length || 0,
        storagePathLength: file.storagePath?.length || 0,
        mimeType: boundedDiagnosticValue(file.type),
        hasGsUri: Boolean(file.gsUri),
        hasDownloadUrl: Boolean(file.downloadURL),
    };
}

function cleanStoragePathSegment(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return '';
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && String(parsed) === raw ? raw : '';
}

function isAllowedKnowledgeSourceStoragePath(file: SourceFile, scope: KnowledgeSourceScope): boolean {
    const tId = cleanStoragePathSegment(scope.tId);
    const sId = cleanStoragePathSegment(scope.sId);
    const storagePath = typeof file.storagePath === 'string' ? file.storagePath.trim() : '';
    if (!tId || !sId || !storagePath) return false;
    if (storagePath.includes('..') || storagePath.includes('\\') || storagePath.startsWith('/')) return false;

    const pathParts = storagePath.split('/');
    return pathParts.length === 4
        && storagePath.startsWith(`ingestion_source_files/${tId}/${sId}/`)
        && Boolean(pathParts[3]);
}

function isAllowedKnowledgeSourceMimeType(mimeType: string): boolean {
    return ALLOWED_SOURCE_MIME_TYPES.has(mimeType)
        || mimeType.startsWith('image/')
        || mimeType.startsWith('audio/')
        || mimeType.startsWith('video/');
}

async function validateKnowledgeSourceFiles(
    files: unknown,
    scope: KnowledgeSourceScope,
): Promise<ValidatedSourceFile[]> {
    if (!Array.isArray(files) || files.length === 0 || files.length > MAX_SOURCE_FILES) {
        throw new Error(KB_SOURCE_FILE_REJECTED_CODE);
    }
    const bucket = storageAdmin.bucket();
    const validated: ValidatedSourceFile[] = [];
    let totalBytes = 0;
    for (const value of files) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(KB_SOURCE_FILE_REJECTED_CODE);
        }
        const record = value as Record<string, unknown>;
        const file: SourceFile = {
            downloadURL: typeof record.downloadURL === 'string' ? record.downloadURL.trim() : '',
            storagePath: typeof record.storagePath === 'string' ? record.storagePath.trim() : '',
            fileName: typeof record.fileName === 'string' ? record.fileName.trim().slice(0, 180) : '',
            type: typeof record.type === 'string' ? record.type.trim().toLowerCase().slice(0, 120) : '',
            gsUri: typeof record.gsUri === 'string' ? record.gsUri.trim().slice(0, 1024) : '',
        };
        if (!file.fileName || !isAllowedKnowledgeSourceStoragePath(file, scope)) {
            throw new Error(KB_SOURCE_FILE_REJECTED_CODE);
        }
        const [metadata] = await bucket.file(file.storagePath).getMetadata();
        const byteSize = Number(metadata.size);
        const mimeType = String(metadata.contentType || file.type).trim().toLowerCase().slice(0, 120);
        if (
            !Number.isSafeInteger(byteSize)
            || byteSize <= 0
            || byteSize > MAX_SOURCE_FILE_BYTES
            || !isAllowedKnowledgeSourceMimeType(mimeType)
        ) {
            throw new Error(KB_SOURCE_FILE_REJECTED_CODE);
        }
        totalBytes += byteSize;
        if (totalBytes > MAX_SOURCE_TOTAL_BYTES) throw new Error(KB_SOURCE_FILE_REJECTED_CODE);
        validated.push({ ...file, byteSize, type: mimeType });
    }
    return validated;
}

function getArticleEmbeddingContext(article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Record<string, string | number | boolean> {
    return {
        articleIdLength: article.id?.length || 0,
        categoryTitleLength: article.categoryTitle?.length || 0,
        sectionTitleLength: article.sectionTitle?.length || 0,
        titleLength: article.title?.length || 0,
        hasContent: Boolean(article.content),
    };
}

export const getKBFromSource = async (
    prompt: string,
    sourceFiles: unknown,
    scope: KnowledgeSourceScope,
): Promise<ProcessedKBMap> => {
    const validatedSourceFiles = await validateKnowledgeSourceFiles(sourceFiles, scope);
    return await generateKbFromSourceUsingGenAi(prompt, validatedSourceFiles, scope);
}

type AnswerlatticeEmbeddingArticle = { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any, sId?: number, source?: string, tId?: number };

export const genrateEmbedding = async (article: AnswerlatticeEmbeddingArticle): Promise<number[]> => {
    return await generateArticleEmbeddingUsingGenAi(article);
}

export const generateArticleEmbeddingUsingGenAi = async (
    article: AnswerlatticeEmbeddingArticle,
): Promise<number[]> => {

    const logger = functions.logger;
    // 1. Construct the full, context-rich text for embedding.
    // This correctly follows our final architectural plan.
    const rawTextToEmbed = [article.categoryTitle, article.sectionTitle, article.title, tiptapToText(article.content)].filter(Boolean).join('\n\n'); // filter(Boolean) removes any empty/null titles.
    if (!rawTextToEmbed || rawTextToEmbed.trim().length === 0) throw new Error('Article content is empty, cannot generate embedding.');

    try {
        const embeddingConfig = ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG;
        const request = buildAnswerlatticeEmbeddingRequest({
            content: rawTextToEmbed,
            purpose: 'document',
            title: article.title,
        });
        // 2. Call the Gemini embedding model.
        const response = await genAIClient.models.embedContent(request);
        const embeddingValues = response.embeddings?.[0]?.values;
        if (
            !embeddingValues
            || embeddingValues.length !== embeddingConfig.outputDimensionality
            || !embeddingValues.some((value: unknown) => typeof value === 'number' && Number.isFinite(value) && value !== 0)
        ) {
            throw new Error('Unexpected Gemini embedding response shape');
        }
        // 3. Return the embedding as a Firestore Vector object.
        return normalizeVector(embeddingValues);
    } catch (error: any) {
        logger.error('generateArticleEmbeddingUsingGenAi:Critical error during embedding generation', {
            failureCode: ARTICLE_EMBEDDING_FAILED_CODE,
            ...getArticleEmbeddingContext(article),
            ...getAiUtilsErrorContext(error),
        });
        // Re-throw the error so the calling function can handle it (e.g., fail the job).
        throw new Error(ARTICLE_EMBEDDING_FAILED_MESSAGE);
    }
};

async function uploadToGemini(file: ValidatedSourceFile, scope: KnowledgeSourceScope): Promise<UploadedProviderFile> {
    const logger = functions.logger;
    const tempFilePath = buildSafeTempFilePath(file.fileName, 'source-file');
    try {
        // // Create a Blob from the downloaded data
        // const response = await fetch(file.downloadURL);
        // const blob = await response.blob();

        // // Convert the Blob to an ArrayBuffer
        // const arrayBuffer = await blob.arrayBuffer();
        if (!isAllowedKnowledgeSourceStoragePath(file, scope)) {
            const rejectedPathError = new Error(KB_SOURCE_STORAGE_PATH_REJECTED_CODE) as Error & { code?: string };
            rejectedPathError.code = KB_SOURCE_STORAGE_PATH_REJECTED_CODE;
            throw rejectedPathError;
        }
        const fileBuffer = await storageAdmin.bucket().file(file.storagePath).download();

        // Create a Uint8Array view of the ArrayBuffer
        const uint8Array = new Uint8Array(fileBuffer[0]);

        // Write the Uint8Array to the temporary file
        fs.writeFileSync(tempFilePath, uint8Array);

        const document = await genAIClient.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type, displayName: file.fileName },
        });
        if (!document.name || !document.uri || !document.mimeType) {
            throw new Error(KB_SOURCE_FILE_UPLOAD_FAILED_CODE);
        }

        logger.info('uploadToGemini:Uploaded source file to Gemini', getSourceFileContext(file));
        return { name: document.name, uri: document.uri, mimeType: document.mimeType };
    } catch (error) {
        logger.error('uploadToGemini:Failed to upload source file to Gemini', {
            failureCode: KB_SOURCE_FILE_UPLOAD_FAILED_CODE,
            ...getSourceFileContext(file),
            ...getAiUtilsErrorContext(error),
        });
        throw new Error(KB_SOURCE_GENERATION_FAILED_MESSAGE);
    } finally {
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                logger.info('uploadToGemini:Deleted temporary file', getSourceFileContext(file));
            }
        } catch (cleanupError) {
            logger.error('uploadToGemini:Failed to delete temporary file', {
                failureCode: KB_SOURCE_FILE_CLEANUP_FAILED_CODE,
                ...getSourceFileContext(file),
                ...getAiUtilsErrorContext(cleanupError),
            });
        }
    }
}

export const generateKbFromSourceUsingGenAi = async (
    textPrompt: string,
    files: ValidatedSourceFile[],
    scope: KnowledgeSourceScope,
): Promise<ProcessedKBMap> => {
    const logger = functions.logger;
    const uploadedFiles: UploadedProviderFile[] = [];
    try {
        for (let index = 0; index < files.length; index += 2) {
            const results = await Promise.allSettled(
                files.slice(index, index + 2).map(file => uploadToGemini(file, scope)),
            );
            for (const result of results) {
                if (result.status === 'fulfilled') uploadedFiles.push(result.value);
            }
            const failed = results.find(result => result.status === 'rejected');
            if (failed?.status === 'rejected') throw failed.reason;
        }
        const newPromptParts = [
            { text: textPrompt },
            ...uploadedFiles.map(file => ({
                fileData: { mimeType: file.mimeType, fileUri: file.uri },
            })),
        ];
        logger.info('generateKbFromSourceUsingGenAi:Generating knowledge base content from source using GenAI.');

        const result = await genAIClient.models.generateContent({
            model: GENERATIVE_MODEL,
            contents: newPromptParts,
            config: {
                responseMimeType: 'application/json',
                maxOutputTokens: 32_768,
            },
        });
        logger.info('generateKbFromSourceUsingGenAi:Generated knowledge base content from source using GenAI.', {
            sourceFileCount: files.length,
            candidateCount: result.candidates?.length || 0,
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        logger.info('generateKbFromSourceUsingGenAi:Generated knowledge base text.', {
            sourceFileCount: files.length,
            responseTextLength: responseText?.length || 0,
        });
        if (!responseText) throw new Error('AI response was empty or in an unexpected format.');
        return normalizeProcessedKBData(responseText);
    } catch (error: unknown) {
        logger.error('generateKbFromSourceUsingGenAi:Critical error during knowledge base generation using GenAI', {
            failureCode: KB_SOURCE_GENERATION_FAILED_CODE,
            sourceFileCount: files.length,
            ...getAiUtilsErrorContext(error),
        });
        throw new Error(KB_SOURCE_GENERATION_FAILED_MESSAGE);
    } finally {
        const cleanupResults = await Promise.allSettled(
            uploadedFiles.map(file => genAIClient.files.delete({ name: file.name })),
        );
        const failedCleanupCount = cleanupResults.filter(result => result.status === 'rejected').length;
        if (failedCleanupCount > 0) {
            logger.error('generateKbFromSourceUsingGenAi:Provider file cleanup failed', {
                failureCode: KB_PROVIDER_FILE_CLEANUP_FAILED_CODE,
                attemptedCount: uploadedFiles.length,
                failedCount: failedCleanupCount,
            });
        }
    }
};
