# AI Cloud IDE System Architecture

## Overview
This document describes the high-level architecture of the AI Cloud IDE, focusing on the data flow between the user interface, the backend logic, and the AI engine.

## Components

### 1. Frontend (React / Next.js App Router)
- **Editor Component**: A wrapper around Monaco Editor that uses `forwardRef` to expose methods like `getValue()` and `setValue()`.
- **Chat Interface**: Handles user prompts and displays AI responses.
- **State Management**: Manages the current file content, AI suggestions, and terminal output.

### 2. Backend (Next.js API Routes)
- **Chat API (`/api/chat`)**: Acts as a bridge between the frontend and Gemini API.
- **System Instructions**: Injects a specialized prompt to ensure Gemini behaves as a professional senior engineer and returns valid JSON.

### 3. AI Engine (Google Gemini API)
- Processes code context and user instructions.
- Generates structured code updates based on the defined protocol.

## Data Flow

1. **User Action**: The user clicks "AI Fix" or submits a chat prompt.
2. **Context Gathering**: The frontend retrieves the current code from `Editor.tsx` using the `ref`.
3. **API Request**: The frontend sends the prompt and code context to `/api/chat`.
4. **AI Generation**: The backend calls Gemini with System Instructions.
5. **Structured Response**: Gemini returns a JSON object following the [API Protocol](./api-spec.md).
6. **Execution**: The frontend parses the JSON and updates the `Editor.tsx` content via `ref.current.setValue()`.

## ForwardRef Usage in Editor.tsx
To allow external control, the `CodeEditor` component is wrapped in `forwardRef`. The parent component (e.g., `page.tsx`) can interact with it as follows:

```tsx
const editorRef = useRef<EditorHandle>(null);

// Loading AI generated code
const handleAiUpdate = (newCode: string) => {
  editorRef.current?.setValue(newCode);
};
```
