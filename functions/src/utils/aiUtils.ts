import { GenerateContentResponse } from "@google/genai";
import * as admin from "firebase-admin";
import * as functions from 'firebase-functions';
import * as fs from 'fs'; // Import the 'fs' module
import { normalizeProcessedKBData, normalizeVector } from ".";
import { AI_ADVANCED_MODEL, AI_EMBEDDING_MODEL } from "../constants/ai";
import { firestoreAdmin } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import { KB_ARTICLES_COLLECTION } from "../types";
import { buildSafeTempFilePath } from "./safeTempFile";
import { tiptapToText } from "./tiptapUtils";

const EMBEDDING_MODEL = AI_EMBEDDING_MODEL;
const GENERATIVE_MODEL = AI_ADVANCED_MODEL;
const KB_SOURCE_GENERATION_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_GENERATION_FAILED';
const KB_SOURCE_FILE_UPLOAD_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_FILE_UPLOAD_FAILED';
const KB_SOURCE_FILE_CLEANUP_FAILED_CODE = 'ANSWERLATTICE_KB_SOURCE_FILE_CLEANUP_FAILED';
const ARTICLE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_ARTICLE_EMBEDDING_FAILED';
const SIMILAR_ARTICLE_LOOKUP_FAILED_CODE = 'ANSWERLATTICE_SIMILAR_ARTICLE_LOOKUP_FAILED';
const KB_SOURCE_GENERATION_FAILED_MESSAGE = 'Knowledge base generation failed';
const ARTICLE_EMBEDDING_FAILED_MESSAGE = 'Embedding generation failed';
const SIMILAR_ARTICLE_LOOKUP_FAILED_MESSAGE = 'Similar article lookup failed';
const KB_SOURCE_STORAGE_PATH_REJECTED_CODE = 'ANSWERLATTICE_KB_SOURCE_STORAGE_PATH_REJECTED';
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
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
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
    const normalized = String(value).trim();
    return /^[a-zA-Z0-9_-]+$/.test(normalized) ? normalized : '';
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

function getArticleEmbeddingContext(article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Record<string, string | number | boolean> {
    return {
        articleIdLength: article.id?.length || 0,
        categoryTitleLength: article.categoryTitle?.length || 0,
        sectionTitleLength: article.sectionTitle?.length || 0,
        titleLength: article.title?.length || 0,
        hasContent: Boolean(article.content),
    };
}

export const getKBFromSource = async (prompt: string, sourceFiles: SourceFile[], scope: KnowledgeSourceScope): Promise<any> => {
    return await generateKbFromSourceUsingGenAi(prompt, sourceFiles, scope);
}

export const genrateEmbedding = async (article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Promise<number[]> => {
    return await generateArticleEmbeddingUsingGenAi(article);
}

export const generateArticleEmbeddingUsingGenAi = async (article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Promise<number[]> => {

    const logger = functions.logger;
    // 1. Construct the full, context-rich text for embedding.
    // This correctly follows our final architectural plan.
    const textToEmbed = [article.categoryTitle, article.sectionTitle, article.title, tiptapToText(article.content)].filter(Boolean).join('\n\n'); // filter(Boolean) removes any empty/null titles.
    if (!textToEmbed || textToEmbed.trim().length === 0) throw new Error('Article content is empty, cannot generate embedding.');

    try {
        // 2. Call the Gemini embedding model.
        const response: any = await genAIClient.models.embedContent({ model: EMBEDDING_MODEL, contents: textToEmbed });
        const embedding = response.embeddings[0];
        if (!embedding?.values) throw new Error('Unexpected Gemini embedding response shape');
        const embeddingValues = embedding.values;
        if (!embeddingValues || embeddingValues.length === 0) throw new Error('Gemini returned an empty embedding.')
        // 3. Return the embedding as a Firestore Vector object.
        return normalizeVector(embedding.values); // ✅ return raw float array
        // return admin.firestore.FieldValue.vector(embeddingValues);
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

async function uploadToGemini(file: SourceFile, scope: KnowledgeSourceScope): Promise<any> {
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
        const fileBuffer = await admin.storage().bucket().file(file.storagePath).download();

        // Create a Uint8Array view of the ArrayBuffer
        const uint8Array = new Uint8Array(fileBuffer[0]);

        // Write the Uint8Array to the temporary file
        fs.writeFileSync(tempFilePath, uint8Array);

        const document = await genAIClient.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type },
        });

        logger.info('uploadToGemini:Uploaded source file to Gemini', getSourceFileContext(file));
        return document;
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

export const generateKbFromSourceUsingGenAi = async (textPrompt: string, files: SourceFile[], scope: KnowledgeSourceScope): Promise<any> => {
    const logger = functions.logger;
    const uploadedFiles = await Promise.all(files.map(async (file) => uploadToGemini(file, scope)));
    const newPromptParts = [
        { text: textPrompt },
        // ...uploadedFiles.map(file => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri } }))
        ...uploadedFiles.map((file, i) => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri, name: file.name, originalurl: files[i].downloadURL } }))
    ];

    logger.info(`generateKbFromSourceUsingGenAi:Generated prompt parts:`,);
    try {
        logger.info(`generateKbFromSourceUsingGenAi:Generating knowledge base content from source using GenAI.`);;

        const result: GenerateContentResponse = await genAIClient.models.generateContent({ model: GENERATIVE_MODEL, contents: newPromptParts, config: { responseMimeType: "application/json" }, });
        logger.info('generateKbFromSourceUsingGenAi:Generated knowledge base content from source using GenAI.', {
            sourceFileCount: files.length,
            candidateCount: result.candidates?.length || 0,
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        logger.info('generateKbFromSourceUsingGenAi:Generated knowledge base text.', {
            sourceFileCount: files.length,
            responseTextLength: responseText?.length || 0,
        });

        if (!responseText) throw new Error("AI response was empty or in an unexpected format.");
        logger.info('generateKbFromSourceUsingGenAi:Successfully generated and parsed knowledge base data using GenAI.', {
            sourceFileCount: files.length,
            responseTextLength: responseText.length,
        });

        return normalizeProcessedKBData(responseText);
    } catch (error: any) {
        logger.error('generateKbFromSourceUsingGenAi:Critical error during knowledge base generation using GenAI', {
            failureCode: KB_SOURCE_GENERATION_FAILED_CODE,
            sourceFileCount: files.length,
            ...getAiUtilsErrorContext(error),
        });
        throw new Error(KB_SOURCE_GENERATION_FAILED_MESSAGE);
    }
};

export const findSimilarArticles = async (embeddingVector: any, limit: number = 12) => {
    const SIMILARITY_THRESHOLD = 0.6;
    const logger = functions.logger;
    try {
        const collectionRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION) as any;
        const neighborsSnapshot = await collectionRef
            .findNearest({
                vectorField: 'embedding',
                queryVector: normalizeVector(embeddingVector),
                limit: limit,
                distanceMeasure: 'COSINE',
                distanceResultField: 'distance',
            }).get();

        logger.info(`[findSimilarArticles] neighborsSnapshot:`, { empty: neighborsSnapshot.empty, size: neighborsSnapshot.size });

        const documentsFound = neighborsSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            const score = 1 - doc.get('distance');
            const document = {
                ...data,
                id: doc.id,
                score: score
            };
            delete document.embedding;
            return document;
        });

        return documentsFound.filter((doc: any) => doc.score > SIMILARITY_THRESHOLD);
    } catch (error: any) {
        logger.error('[findSimilarArticles] Error finding similar articles', {
            failureCode: SIMILAR_ARTICLE_LOOKUP_FAILED_CODE,
            limit,
            ...getAiUtilsErrorContext(error),
        });
        throw new Error(SIMILAR_ARTICLE_LOOKUP_FAILED_MESSAGE);
    }
};
