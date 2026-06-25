import { GenerateContentResponse } from "@google/genai";
import * as admin from "firebase-admin";
import * as functions from 'firebase-functions';
import * as fs from 'fs'; // Import the 'fs' module
import { normalizeProcessedKBData, normalizeVector } from ".";
import { AI_ADVANCED_MODEL, AI_EMBEDDING_MODEL } from "../constants/ai";
import { firestoreAdmin, vertexAIClient } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import { AI_TYPE, KB_ARTICLES_COLLECTION } from "../types";
import { tiptapToText } from "./tiptapUtils";

const EMBEDDING_MODEL = AI_EMBEDDING_MODEL;
const GENERATIVE_MODEL = AI_ADVANCED_MODEL;
/**
 * Calls Vertex AI to generate a structured knowledge base from source files.
 * @param {any[]} prompt - The constructed prompt parts for the AI model.
 * @returns {Promise<any>} The parsed JSON object from the AI's response.
 */

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

export const getKBFromSource = async (prompt: string, sourceFiles: SourceFile[]): Promise<any> => {
    if (AI_TYPE === "gemini") {
        return await generateKbFromSourceUsingGenAi(prompt, sourceFiles);
    } else {
        return await generateKbFromSource(prompt, sourceFiles);
    }
}

export const genrateEmbedding = async (article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Promise<number[]> => {
    if (AI_TYPE === "gemini") {
        return await generateArticleEmbeddingUsingGenAi(article);
    } else {
        return await generateArticleEmbedding(article);
    }
}

export const generateKbFromSource = async (textPrompt: string, sourceFiles: SourceFile[]): Promise<any> => {
    const logger = functions.logger;
    const fileParts: any[] = sourceFiles.map(file => {
        return {
            fileData: {
                mimeType: file.type,
                fileUri: file.gsUri,
            },
        };
    });


    try {
        logger.info(`generateKbFromSource:Generating knowledge base content from source.`);
        const generativeModel = vertexAIClient.getGenerativeModel({ model: GENERATIVE_MODEL });
        const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: textPrompt }, ...fileParts] }] });
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("AI response was empty or in an unexpected format.");
        const cleanedJsonString = responseText.replace(/```json|```/g, '').trim();
        const generatedData = JSON.parse(cleanedJsonString);
        logger.info(`Successfully generated and parsed knowledge base data.`);
        return generatedData;

    } catch (error: any) {
        logger.error(`generateKbFromSource:Critical error during knowledge base generation:`, error);
        throw new Error(`generateKbFromSource:Knowledge base generation failed. message: ${error.message}`);
    }
};

/**
 * Generates a vector embedding for a given knowledge base article.
 * This is the definitive, reusable function for all server-side embedding tasks.
 *
 * @param {{id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any}} article - The full article object.
 * @returns {Promise<number[]>} A Firestore Vector object ready for database operations.
 */
export const generateArticleEmbedding = async (article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Promise<number[]> => {

    const logger = functions.logger;
    // 1. Construct the full, context-rich text for embedding.
    // This correctly follows our final architectural plan.
    const textToEmbed = [article.categoryTitle, article.sectionTitle, article.title, tiptapToText(article.content)].filter(Boolean).join('\n\n'); // filter(Boolean) removes any empty/null titles.
    if (!textToEmbed || textToEmbed.trim().length === 0) throw new Error('Article content is empty, cannot generate embedding.');

    try {
        // 2. Call the Vertex AI embedding model.
        const embeddingModel = vertexAIClient.getGenerativeModel({ model: EMBEDDING_MODEL });
        const request = { contents: [{ parts: [{ text: textToEmbed }] }] };
        const response = await (embeddingModel as any).embedContents(request);
        const embeddingValues = response.embeddings[0].values;
        if (!embeddingValues || embeddingValues.length === 0) throw new Error('Vertex AI returned an empty embedding.');
        // 3. Return the embedding as a Firestore Vector object.
        return embeddingValues;
    } catch (error: any) {
        logger.error(`[${article.id}] Critical error during embedding generation:`, error);
        // Re-throw the error so the calling function can handle it (e.g., fail the job).
        throw new Error(`Embedding generation failed for article ${article.id}. message : ${error.message}`);
    }
};

export const generateArticleEmbeddingUsingGenAi = async (article: { id: string, categoryTitle: string, sectionTitle?: string, title: string, content: any }): Promise<number[]> => {

    const logger = functions.logger;
    // 1. Construct the full, context-rich text for embedding.
    // This correctly follows our final architectural plan.
    const textToEmbed = [article.categoryTitle, article.sectionTitle, article.title, tiptapToText(article.content)].filter(Boolean).join('\n\n'); // filter(Boolean) removes any empty/null titles.
    if (!textToEmbed || textToEmbed.trim().length === 0) throw new Error('Article content is empty, cannot generate embedding.');

    try {
        // 2. Call the Vertex AI embedding model.;
        const response: any = await genAIClient.models.embedContent({ model: EMBEDDING_MODEL, contents: textToEmbed });
        const embedding = response.embeddings[0];
        if (!embedding?.values) throw new Error('Unexpected Gemini embedding response shape');
        const embeddingValues = embedding.values;
        if (!embeddingValues || embeddingValues.length === 0) throw new Error('Vertex AI returned an empty embedding.')
        // 3. Return the embedding as a Firestore Vector object.
        return normalizeVector(embedding.values); // ✅ return raw float array
        // return admin.firestore.FieldValue.vector(embeddingValues);
    } catch (error: any) {
        logger.error(`[${article.id}] Critical error during embedding generation:`, error);
        // Re-throw the error so the calling function can handle it (e.g., fail the job).
        throw new Error(`Embedding generation failed for article ${article.id}. message : ${error.message}`);
    }
};

async function uploadToGemini(file: SourceFile): Promise<any> {
    const logger = functions.logger;
    try {
        // // Create a Blob from the downloaded data
        // const response = await fetch(file.downloadURL);
        // const blob = await response.blob();

        // // Create a temporary file on your system
        const tempFilePath = `/tmp/${file.fileName}`; // Replace with your desired temporary file path

        // // Convert the Blob to an ArrayBuffer
        // const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = await admin.storage().bucket().file(file.storagePath).download();

        // Create a Uint8Array view of the ArrayBuffer
        const uint8Array = new Uint8Array(fileBuffer[0]);

        // Write the Uint8Array to the temporary file
        fs.writeFileSync(tempFilePath, uint8Array);

        const document = await genAIClient.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type },
        });

        try {
            fs.unlinkSync(tempFilePath);
            logger.info(`Deleted temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
            logger.error(`Failed to delete temporary file ${tempFilePath}:`, cleanupError);
        }
        logger.info("gemini uploadResult", document)
        return document;
    } catch (error) {
        logger.error("errrr", error)
    }
}

export const generateKbFromSourceUsingGenAi = async (textPrompt: string, files: any[]): Promise<any> => {
    const logger = functions.logger;
    const uploadedFiles = await Promise.all(files.map(async (file) => uploadToGemini(file)));
    const newPromptParts = [
        { text: textPrompt },
        // ...uploadedFiles.map(file => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri } }))
        ...uploadedFiles.map((file, i) => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri, name: file.name, originalurl: files[i].url } }))
    ];

    logger.info(`generateKbFromSourceUsingGenAi:Generated prompt parts:`,);
    try {
        logger.info(`generateKbFromSourceUsingGenAi:Generating knowledge base content from source using GenAI.`);;

        const result: GenerateContentResponse = await genAIClient.models.generateContent({ model: GENERATIVE_MODEL, contents: newPromptParts, config: { responseMimeType: "application/json" }, });
        logger.info(`generateKbFromSourceUsingGenAi:Generated knowledge base content from source using GenAI.`, result);

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        logger.info(`generateKbFromSourceUsingGenAi:Generated knowledge base content from source using GenAI:text generated.`, responseText);

        if (!responseText) throw new Error("AI response was empty or in an unexpected format.");
        logger.info(`generateKbFromSourceUsingGenAi:Successfully generated and parsed knowledge base data using GenAI.`, responseText);

        return normalizeProcessedKBData(responseText);
    } catch (error: any) {
        logger.error(`generateKbFromSourceUsingGenAi:Critical error during knowledge base generation using GenAI:`, error);
        throw new Error(`generateKbFromSourceUsingGenAi:Knowledge base generation failed using GenAI. message: ${error.message}`);
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
        logger.error(`[findSimilarArticles] Error finding similar articles:`, error);
        throw new Error(`[findSimilarArticles] failed. message: ${error.message}`);
    }
};
