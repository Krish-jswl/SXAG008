import Groq from 'groq-sdk';
import 'dotenv/config';
import { PDFParse } from 'pdf-parse';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function analyzeDocument(userQuestion, fileBuffer, mimeType) {
    let documentText = "";

    if (mimeType === 'application/pdf') {
        try {
            const parser = new PDFParse({ data: fileBuffer });
            const result = await parser.getText();
            documentText = result.text;

            if (typeof parser.destroy === 'function') {
                await parser.destroy();
            }

        } catch (error) {
            console.error("PDF Parsing Error:", error);
            throw new Error("Could not read the text inside this PDF.");
        }
    } else {
        throw new Error("Currently, only PDF files are supported for text extraction.");
    }

    const systemPrompt = `
        You are KALPA AI, a helpful, highly empathetic Legal Navigator.
        Your goal is to explain legal documents directly to the user in simple, conversational English.

        CRITICAL FORMATTING RULES:
        1. NO WALLS OF TEXT: You are strictly forbidden from outputting long paragraphs. 
        2. STRUCTURE: 
           - Start with a brief, friendly 1-sentence summary addressing the user (e.g., "Here is what your document says about...").
           - Use bullet points for the specific rules, facts, or clauses.
           - Keep every bullet point under 2 sentences.
        3. TONE: Speak directly to the user. Use "you", "your landlord", "your contract". Avoid dry legal jargon.
        4. ACCURACY: Base your answer ONLY on the provided text. If the answer isn't in the document, politely say you cannot find it.
        5. CONVERSATIONAL VARIETY: 
            - If the user asks a direct 'yes/no' question (e.g., "Do I have to pay advance payment?"), answer it directly first (e.g., "Yes, you do.") before listing the rules.
            - Do not use the exact same introductory phrase for every response. Mix it up (e.g., "Looking at that section...", "According to the contract...", "Here are the details on...").
        6. THE PIVOT: If the user is asking about a penalty, a breach, or a risk (e.g., "What if they don't return my deposit?"), end your response by reminding them they can click "Convert to Action Path" to have you draft a formal notice.
        `;

    const userPrompt = `
        I need you to explain this document to me like a friend who knows the law.

        --- DOCUMENT TEXT START ---
        ${documentText}
        --- DOCUMENT TEXT END ---

        My Question: ${userQuestion}
        `;

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
    });

    return chatCompletion.choices[0].message.content;
}
