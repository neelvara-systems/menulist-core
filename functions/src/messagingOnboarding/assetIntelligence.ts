/**
 * Asset Intelligence — Gemini Validation + Business Info Extraction
 *
 * Single Gemini call per session to validate uploaded files and extract
 * business information before sending to the extraction pipeline.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.4
 */

import * as functions from "firebase-functions";
import { promises as fs } from "fs";
import { AI_MODEL } from "../constants/ai";
import { storageAdmin } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import {
  buildMenuIntakeIdentityPrompt,
} from "../sharedData/menuIntakeIdentity";
import { UPLOAD_LIMITS } from "./constants";
import { buildSafeTempFilePath } from "../utils/safeTempFile";
import { AssetValidationResult, SessionUpload } from "../types/messagingOnboarding.types";
import { normalizeAssetValidationResult } from "./assetValidationResult";
import {
  validateMessagingStoredUploadBytes,
  validateMessagingStoredUploadRecord,
} from "./assetStorageBoundary";
import { shouldInlineAssetValidationFiles } from "./assetModelInputBoundary";
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorName,
  getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

const logger = functions.logger;
const ASSET_VALIDATION_UPLOAD_FETCH_FAILED = "ASSET_VALIDATION_UPLOAD_FETCH_FAILED";
const ASSET_VALIDATION_UPLOAD_INTEGRITY_REJECTED = "ASSET_VALIDATION_UPLOAD_INTEGRITY_REJECTED";
const ASSET_VALIDATION_UPLOAD_RECORD_REJECTED = "ASSET_VALIDATION_UPLOAD_RECORD_REJECTED";
const ASSET_VALIDATION_PROVIDER_FILE_CLEANUP_FAILED = "ASSET_VALIDATION_PROVIDER_FILE_CLEANUP_FAILED";
const ASSET_VALIDATION_PROVIDER_FILE_UPLOAD_FAILED = "ASSET_VALIDATION_PROVIDER_FILE_UPLOAD_FAILED";
const ASSET_VALIDATION_TEMP_FILE_CLEANUP_FAILED = "ASSET_VALIDATION_TEMP_FILE_CLEANUP_FAILED";
const ASSET_VALIDATION_RESPONSE_PARSE_FAILED = "ASSET_VALIDATION_RESPONSE_PARSE_FAILED";
const ASSET_VALIDATION_UPLOAD_TIMEOUT_MS = 15_000;
const ASSET_VALIDATION_MODEL_TIMEOUT_MS = 90_000;
const ASSET_VALIDATION_DOWNLOAD_CONCURRENCY = 3;
const ASSET_VALIDATION_PROVIDER_UPLOAD_CONCURRENCY = 3;
const ASSET_VALIDATION_PROVIDER_UPLOAD_TIMEOUT_MS = 60_000;
const ASSET_VALIDATION_PROVIDER_DELETE_TIMEOUT_MS = 15_000;
const ASSET_VALIDATION_MODEL_RESPONSE_ATTEMPTS = 2;
const ASSET_VALIDATION_OPERATION_DEADLINE_MS = 7 * 60_000;

type AssetValidationModelPart =
  | { fileData: { fileUri: string; mimeType: string } }
  | { inlineData: { data: string; mimeType: string } }
  | { text: string };

type LoadedAssetValidationFile = {
  bytes: Buffer;
  index: number;
  mimeType: string;
};

type UploadedAssetValidationFile = {
  index: number;
  mimeType: string;
  providerName: string;
  uri: string;
};

function getAssetIntelligenceErrorName(error: unknown): string {
    return getBoundedFunctionsErrorName(error) || 'Error';
}

function getAssetIntelligenceErrorCode(error: Error): string | undefined {
    return getBoundedFunctionsErrorCode(error);
}

function getAssetIntelligenceStatusCode(error: Error): number | undefined {
  return getBoundedFunctionsErrorStatus(error);
}

function getAssetIntelligenceErrorContext(error: unknown): {
  sourceErrorName: string;
  sourceErrorCode?: string;
  sourceStatusCode?: number;
} {
  if (error instanceof Error) {
    return {
      sourceErrorName: getAssetIntelligenceErrorName(error),
      sourceErrorCode: getAssetIntelligenceErrorCode(error),
      sourceStatusCode: getAssetIntelligenceStatusCode(error),
    };
  }

  return { sourceErrorName: getAssetIntelligenceErrorName(error) };
}

function getUploadDiagnosticContext(upload: SessionUpload, uploadIndex: number, uploadCount: number) {
  return {
    uploadIndex,
    uploadCount,
    uploadIdLength: upload.id.length,
    storageUrlPresent: Boolean(upload.storageUrl),
    storageUrlLength: upload.storageUrl.length,
    mimeTypePresent: Boolean(upload.mimeType),
    mimeTypeLength: upload.mimeType.length,
    fileSize: upload.fileSize,
  };
}

function getProjectStorageBucketFallback(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `${projectId}.appspot.com` : "";
}

function getAllowedStorageBucket(): string {
  return process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || getProjectStorageBucketFallback();
}

async function readMessagingStorageObject(storagePath: string): Promise<Buffer> {
  const stream = storageAdmin.bucket(getAllowedStorageBucket() || undefined).file(storagePath).createReadStream({
    validation: "crc32c",
  });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    let settled = false;
    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stream.destroy();
      reject(error);
    };
    const timeout = setTimeout(() => {
      finishWithError(new Error("ASSET_VALIDATION_UPLOAD_TIMEOUT"));
    }, ASSET_VALIDATION_UPLOAD_TIMEOUT_MS);
    timeout.unref?.();

    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += buffer.length;
      if (byteLength > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
        finishWithError(new Error("ASSET_VALIDATION_UPLOAD_TOO_LARGE"));
        return;
      }
      chunks.push(buffer);
    });
    stream.once("error", (error) => {
      finishWithError(error instanceof Error ? error : new Error("ASSET_VALIDATION_UPLOAD_READ_FAILED"));
    });
    stream.once("end", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks, byteLength));
    });
  });
}

async function uploadAssetValidationFiles(
  files: readonly LoadedAssetValidationFile[],
  abortSignal: AbortSignal,
): Promise<{
  files: UploadedAssetValidationFile[];
  firstError: unknown | null;
  providerNames: string[];
}> {
  const uploaded: Array<UploadedAssetValidationFile | undefined> = new Array(files.length);
  const providerNames: Array<string | undefined> = new Array(files.length);
  let firstError: unknown;
  let nextIndex = 0;
  const workerCount = Math.min(ASSET_VALIDATION_PROVIDER_UPLOAD_CONCURRENCY, files.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      if (firstError !== undefined) return;
      const fileIndex = nextIndex++;
      if (fileIndex >= files.length) return;
      const file = files[fileIndex];
      const tempPath = buildSafeTempFilePath(`messaging-asset-${file.index}`, "messaging-asset");
      try {
        await fs.writeFile(tempPath, file.bytes);
        const providerFile = await genAIClient.files.upload({
          config: {
            abortSignal,
            httpOptions: { timeout: ASSET_VALIDATION_PROVIDER_UPLOAD_TIMEOUT_MS },
            mimeType: file.mimeType,
          },
          file: tempPath,
        });
        const providerName = typeof providerFile?.name === "string" ? providerFile.name : "";
        if (providerName) providerNames[fileIndex] = providerName;
        const uri = typeof providerFile?.uri === "string" ? providerFile.uri : "";
        const mimeType = typeof providerFile?.mimeType === "string"
          ? providerFile.mimeType
          : file.mimeType;
        if (!providerName || !uri || mimeType !== file.mimeType) {
          throw new Error(ASSET_VALIDATION_PROVIDER_FILE_UPLOAD_FAILED);
        }
        uploaded[fileIndex] = {
          index: file.index,
          mimeType,
          providerName,
          uri,
        };
      } catch (error) {
        firstError ??= error;
      } finally {
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          const cleanupCode = cleanupError instanceof Error
            ? Reflect.get(cleanupError, "code")
            : undefined;
          if (cleanupCode !== "ENOENT") {
            logger.warn("[AssetIntelligence] Temporary provider file cleanup failed", {
              failureCode: ASSET_VALIDATION_TEMP_FILE_CLEANUP_FAILED,
              tempPathLength: tempPath.length,
              ...getAssetIntelligenceErrorContext(cleanupError),
            });
          }
        }
      }
    }
  }));

  const completedFiles = uploaded.filter(
    (file): file is UploadedAssetValidationFile => file !== undefined,
  );
  return {
    files: completedFiles,
    providerNames: providerNames.filter((name): name is string => Boolean(name)),
    firstError: firstError
      ?? (completedFiles.length === files.length
        ? null
        : new Error(ASSET_VALIDATION_PROVIDER_FILE_UPLOAD_FAILED)),
  };
}

async function cleanupAssetValidationProviderFiles(
  providerNames: readonly string[],
): Promise<void> {
  const names = Array.from(new Set(providerNames));
  const results = await Promise.allSettled(
    names.map((name) => genAIClient.files.delete({
      config: { httpOptions: { timeout: ASSET_VALIDATION_PROVIDER_DELETE_TIMEOUT_MS } },
      name,
    })),
  );
  const failedCount = results.filter((result) => result.status === "rejected").length;
  if (failedCount > 0) {
    logger.warn("[AssetIntelligence] Provider file cleanup partially failed", {
      attemptedCount: names.length,
      failedCount,
      failureCode: ASSET_VALIDATION_PROVIDER_FILE_CLEANUP_FAILED,
    });
  }
}

/**
 * Validate uploaded files and extract business info using Gemini
 *
 * @param uploads - Array of session uploads to validate
 * @returns Validation result with valid/invalid files, business info, and business type
 */
export async function validateAssets(
  sessionId: string,
  uploads: SessionUpload[],
): Promise<AssetValidationResult> {
  const prompt = buildMenuIntakeIdentityPrompt(uploads.length);
  const operationAbortSignal = AbortSignal.timeout(ASSET_VALIDATION_OPERATION_DEADLINE_MS);

  // Download with bounded concurrency, then restore source order before the
  // model call so file indexes remain deterministic.
  const loadedFiles: Array<LoadedAssetValidationFile | null> =
    Array.from({ length: uploads.length }, () => null);
  let nextUploadIndex = 0;
  const workerCount = Math.min(ASSET_VALIDATION_DOWNLOAD_CONCURRENCY, uploads.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = nextUploadIndex++;
      if (i >= uploads.length) return;
      const upload = uploads[i];
      try {
        const recordValidation = validateMessagingStoredUploadRecord(upload, sessionId);
        if (recordValidation.valid === false) {
          logger.warn("[AssetIntelligence] Rejected invalid stored upload record", {
            failureCode: ASSET_VALIDATION_UPLOAD_RECORD_REJECTED,
            ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
            reason: recordValidation.reason,
          });
          continue;
        }

        const responseBytes = await readMessagingStorageObject(recordValidation.storagePath);
        const bytesValidation = validateMessagingStoredUploadBytes(upload, responseBytes);
        if (bytesValidation.valid === false) {
          logger.warn("[AssetIntelligence] Rejected stored upload integrity mismatch", {
            failureCode: ASSET_VALIDATION_UPLOAD_INTEGRITY_REJECTED,
            ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
            reason: bytesValidation.reason,
          });
          continue;
        }

        loadedFiles[i] = {
          bytes: responseBytes,
          index: i + 1,
          mimeType: upload.mimeType,
        };
      } catch (err) {
        logger.warn("[AssetIntelligence] Error fetching upload", {
          failureCode: ASSET_VALIDATION_UPLOAD_FETCH_FAILED,
          ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
          ...getAssetIntelligenceErrorContext(err),
        });
      }
    }
  }));

  const readableFiles = loadedFiles.filter(
    (loaded): loaded is LoadedAssetValidationFile => loaded !== null,
  );
  const readableFileIndexes = readableFiles.map((loaded) => loaded.index);

  if (readableFileIndexes.length === 0) {
    throw new Error("ASSET_VALIDATION_NO_READABLE_UPLOADS");
  }

  let uploadedProviderFiles: UploadedAssetValidationFile[] = [];
  let uploadedProviderFileNames: string[] = [];
  try {
    const imageParts: AssetValidationModelPart[] = [{ text: prompt }];
    if (shouldInlineAssetValidationFiles(prompt, readableFiles.map((file) => file.bytes.length))) {
      for (const file of readableFiles) {
        imageParts.push({ text: `File ${file.index}` });
        imageParts.push({
          inlineData: {
            data: file.bytes.toString("base64"),
            mimeType: file.mimeType,
          },
        });
      }
    } else {
      const providerUpload = await uploadAssetValidationFiles(readableFiles, operationAbortSignal);
      uploadedProviderFiles = providerUpload.files;
      uploadedProviderFileNames = providerUpload.providerNames;
      if (providerUpload.firstError) throw providerUpload.firstError;
      for (const file of uploadedProviderFiles) {
        imageParts.push({ text: `File ${file.index}` });
        imageParts.push({
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          },
        });
      }
    }

    // The gateway owns transport retries. Only a semantically malformed model
    // response is retried here, reusing the same already-prepared inputs.
    for (let attempt = 1; attempt <= ASSET_VALIDATION_MODEL_RESPONSE_ATTEMPTS; attempt++) {
      const geminiResult = await genAIClient.models.generateContent({
        model: AI_MODEL,
        contents: [{ role: "user", parts: imageParts }],
        config: {
          abortSignal: operationAbortSignal,
          httpOptions: { timeout: ASSET_VALIDATION_MODEL_TIMEOUT_MS },
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });
      const responseText = geminiResult?.text || "";

      try {
        return parseAssetValidationModelResponse(
          responseText,
          uploads.length,
          readableFileIndexes,
        );
      } catch (parseErr) {
        logger.error("[AssetIntelligence] Failed to parse Gemini response", {
          attempt,
          failureCode: ASSET_VALIDATION_RESPONSE_PARSE_FAILED,
          responseTextLength: responseText.length,
          uploadCount: uploads.length,
          readableUploadCount: readableFileIndexes.length,
          ...getAssetIntelligenceErrorContext(parseErr),
        });
        if (attempt === ASSET_VALIDATION_MODEL_RESPONSE_ATTEMPTS) {
          throw new Error("ASSET_VALIDATION_RESPONSE_INVALID");
        }
      }
    }
    throw new Error("ASSET_VALIDATION_RESPONSE_INVALID");
  } finally {
    await cleanupAssetValidationProviderFiles(uploadedProviderFileNames);
  }
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("No JSON object found in Gemini response");
    return JSON.parse(objectMatch[0]);
  }
}

export function parseAssetValidationModelResponse(
  text: string,
  totalFiles: number,
  readableFileIndexes: readonly number[],
): AssetValidationResult {
  return normalizeAssetValidationResult(
    parseGeminiJson(text),
    totalFiles,
    readableFileIndexes,
  );
}
