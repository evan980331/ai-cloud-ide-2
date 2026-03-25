# AI Communication Protocol (JSON Schema)

## Goal
To ensure reliable programmatic updates to the code editor, all responses from the AI must follow a strict JSON format.

## Response Structure

The AI MUST respond with a single JSON object:

```json
{
  "action": "update" | "insert" | "explain",
  "explanation": "A brief description of what was changed or why.",
  "code": "The actual source code to be applied.",
  "language": "typescript" | "javascript" | "css" | "html"
}
```

### Fields Description

- **`action`**: 
    - `update`: Replace the entire editor content with the new `code`.
    - `insert`: Append the `code` to the end of the current content (reserved for future use).
    - `explain`: No code update, just provide an explanation in the chat.
- **`explanation`**: A human-readable summary of the AI's logic.
- **`code`**: The raw string of the generated code.
- **`language`**: The programming language for syntax highlighting in the editor.

## System Prompt Implementation
The backend will enforce this protocol by prepending the following instruction to all Gemini requests:

> "You are a professional senior software engineer. Your response must be in valid JSON format only, structured as follows: { \"action\": \"...\", \"explanation\": \"...\", \"code\": \"...\", \"language\": \"...\" }. Do not include markdown code blocks around the JSON."
