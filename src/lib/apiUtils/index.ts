import { UserUploadedFileType } from "@type/common";

export const getImageAsBase64 = async (referanceImage: UserUploadedFileType) => {
    let base64ImageData: string;
    let mimeType: string = referanceImage.type || "image/jpeg"; // Default or use provided type
    if (referanceImage.url && referanceImage.url.includes("https://firebasestorage.googleapis.com")) {
        console.log("fetching firebase url")
        const imageUrl = referanceImage.url;
        const response = await fetch(imageUrl);
        const imageArrayBuffer = await response.arrayBuffer();
        base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
        console.log("fetched firebase base64ImageData")
    } else if (referanceImage.url && typeof referanceImage.url === 'string' && referanceImage.url.startsWith('data:')) {
        // This block handles the data URL case
        console.log("Processing image from Data URL");
        const dataUrl = referanceImage.url;
        const commaIndex = dataUrl.indexOf(',');

        if (commaIndex === -1) {
            console.error("Invalid data URL format: missing comma", dataUrl);
            throw new Error("Invalid image data URL format.");
        }

        // Extract mime type from data URL (e.g., "image/png;base64")
        const meta = dataUrl.substring(5, commaIndex);
        const metaParts = meta.split(';');
        mimeType = metaParts[0]; // Get the actual mime type (e.g., "image/png")

        // Extract the raw Base64 data after the comma
        base64ImageData = dataUrl.substring(commaIndex + 1);

        // Optional: Basic validation of the extracted Base64 data
        if (!base64ImageData || base64ImageData.length % 4 !== 0) {
            console.warn("Extracted Base64 data looks potentially invalid or incomplete");
            // You might add more rigorous Base64 validation here if needed
        }

    } else {
        // Handle cases where the URL is neither Firebase nor a data URL
        console.error("Unsupported image URL format or invalid data:", referanceImage.url);
        throw new Error("Unsupported image data format.");
    }
    return { base64ImageData, mimeType }
}