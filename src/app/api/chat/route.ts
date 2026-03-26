import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `
You are Antigravity, a world-class senior software engineer assistant.
You are in a Single-file (單檔案) Cloud IDE environment.

CRITICAL: Your response MUST be in valid JSON format only.
Expected JSON structure:
{
  "action": "update" | "explain",
  "explanation": "A very brief summary of your change.",
  "code": "The raw source code to be applied.",
  "language": "The programming language of the code.",
  "stdin": "Optional: Valid test input data for cin/scanf/input, if applicable."
}

Rules:
1. "action" should be "update" to replace/edit content, or "explain" for general chat.
2. Since this is a SINGLE-FILE environment, DO NOT provide a targetFile field. All code changes apply directly to the current editor.
3. From now on, you MUST use 'Traditional Chinese (繁體中文)' to communicate with the user, unless the user explicitly asks for code in another language.
4. When mentioning technical terms, provide the English term in parentheses after the Traditional Chinese term (e.g., 非同步 (Asynchronous)).
5. If the user asks for a feature that requires multiple files (like an image asset), explain that this is a single-file prototype.
6. STDIN MAGIC: If the current code or your new code requires user input (cin, scanf, input()), you are ENCOURAGED to provide a valid, multi-line test input in the "stdin" field to help the user test the program immediately.
7. FORMATTING IMPORTANT: You MUST use "\n\n" to create paragraphs and use markdown bullet points (e.g., 1. 2. or - ) to format your "explanation" clearly. Never output a dense block of text!
8. C++ SPECIFIC: When generating or fixing C++ code, you MUST always prefer to use 'using namespace std;' after include statements.
`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, currentCode, language } = body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
        });

        const fullPrompt = `
Current Code in Editor:
${currentCode || '(empty)'}

Language: ${language}

User Instruction: ${prompt}

Remember to return ONLY the JSON object.
`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text().trim();

        try {
            // Attempt to clean the response if Gemini included markdown
            let cleanedText = responseText;
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            }

            const jsonResponse = JSON.parse(cleanedText);
            return NextResponse.json(jsonResponse);
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', responseText);
            return NextResponse.json(
                {
                    action: 'explain',
                    explanation: 'AI returned an invalid format. Raw response: ' + responseText,
                    code: '',
                    language: language
                },
                { status: 200 }
            );
        }

    } catch (error: any) {
        console.error('Chat API Error:', error);
        if (error.message?.includes('429')) {
            return NextResponse.json({ error: '請求過度頻繁，請稍等 15 秒後再試。' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
