// import { GoogleGenAI } from '@google/genai';

// // Initialize Vertex with your Cloud project and location
// const ai = new GoogleGenAI({
//     vertexai: true,
//     project: 'ecomsai',
//     location: 'global'
// });
// const model = 'gemini-2.0-flash-preview-image-generation';


// // Set up generation config
// const generationConfig = {
//     maxOutputTokens: 8192,
//     temperature: 1,
//     topP: 0.95,
//     responseModalities: ["TEXT", "IMAGE"],
//     safetySettings: [
//         {
//             category: 'HARM_CATEGORY_HATE_SPEECH',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_HARASSMENT',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_IMAGE_HATE',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_IMAGE_HARASSMENT',
//             threshold: 'OFF',
//         },
//         {
//             category: 'HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT',
//             threshold: 'OFF',
//         }
//     ],
// };

// const msg1Text1 = {
//     text: `You will be provided with an image URL. Your goal is to remove the background from the image while preserving the main object, enhancing the image quality, and restoring any lost details.

// Follow these steps:
// 1. Analyze the image to identify the main object and the background.
// 2. Carefully remove the background from the image, ensuring that the main object is not altered or removed.
// 3. Enhance the image quality by adjusting the resolution, sharpness, and color balance.
// 4. Restore any lost details in the main object, such as textures, edges, and fine lines.
// 5. Ensure the final image has a transparent background and the main object is clear and well-defined.`};
// const msg1Image1 = {
// inlineData:{}
// };
// const msg1Text2 = {
//     text: `Here is the image URL:

// Please focus on the specified task and avoid making any unnecessary modifications to the image.`};
// const msg2Image1 = {
//     inlineData:{}
// };
// const msg3Image1 = {
//     inlineData: {}
// };
// const msg4Image1 = {
//     inlineData: {}
// };
// const msg5Image1 = {
//     inlineData:{}
// };

// const chat = ai.chats.create({
//     model: model,
//     config: generationConfig
// });

// async function sendMessage(message) {
//     const response = await chat.sendMessageStream({
//         message: message
//     });
//     process.stdout.write('stream result: ');
//     for await (const chunk of response) {
//         if (chunk.text) {
//             process.stdout.write(chunk.text);
//         } else {
//             process.stdout.write(JSON.stringify(chunk) + '\n');
//         }
//     }
// }

// async function generateContent() {
//     await sendMessage([
//         msg1Text1, msg1Image1, msg1Text2
//     ]);
//     await sendMessage([
//         msg2Image1
//     ]);
//     await sendMessage([
//         msg3Image1
//     ]);
//     await sendMessage([
//         msg4Image1
//     ]);
//     await sendMessage([
//         msg5Image1
//     ]);
// }

// generateContent();