'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Editor, { OnMount, BeforeMount, DiffEditor } from '@monaco-editor/react';

interface EditorProps {
    value?: string;
    language?: string;
    onChange?: (value: string | undefined) => void;
    theme?: 'vs-dark' | 'light' | 'hc-black';
    options?: any;
}

export interface EditorHandle {
    getValue: () => string | undefined;
    setValue: (value: string) => void;
    focus: () => void;
    layout: () => void;
}

const CodeEditor = forwardRef<EditorHandle, EditorProps>(
    ({ value, language = 'javascript', onChange, theme = 'vs-dark', options }, ref) => {
        const editorRef = useRef<any>(null);

        useImperativeHandle(ref, () => ({
            getValue: () => editorRef.current?.getValue(),
            setValue: (val: string) => editorRef.current?.setValue(val),
            focus: () => editorRef.current?.focus(),
            layout: () => editorRef.current?.layout(),
        }));

        const handleEditorDidMount: OnMount = (editor) => {
            editorRef.current = editor;
        };

        const handleBeforeMount: BeforeMount = (monaco) => {
            // 【教學註解】：為什麼在 Web 端的 IDE 中，通常會選擇關閉語法檢查？
            // 1. 效能考慮：Monaco 的語法檢查（尤其是 TS/JS）會佔用大量的 Client-side CPU 資源。
            // 2. 核心權威性：在雲端 IDE 中，我們以「後端編譯器」的回傳結果為準，前端的紅線有時會與真實環境衝突。
            // 3. 跨語言一致性：並非所有語言在 Monaco 中都有內建的 Linter，關閉它能保持視覺乾淨與一致。
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true
            });
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true
            });
        };

        return (
            <div className="h-full w-full border border-white/5 rounded-md overflow-hidden">
                <Editor
                    height="100%"
                    language={language}
                    value={value}
                    theme={theme}
                    onChange={onChange}
                    onMount={handleEditorDidMount}
                    beforeMount={handleBeforeMount}
                    options={{
                        minimap: { enabled: false }, // 單檔案通常不需要地圖
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        folding: true,
                        wordWrap: 'on', // 開啟自動換行，確保代碼不超出螢幕
                        renderLineHighlight: 'all',
                        renderValidationDecorations: 'off', // 關閉 C++/Python 等語言的視覺紅線
                        ...options
                    }}
                />
            </div>
        );
    }
);

CodeEditor.displayName = 'CodeEditor';

// --- Diff Editor Component ---

interface DiffEditorProps {
    original: string;
    modified: string;
    language?: string;
    theme?: 'vs-dark' | 'light' | 'hc-black';
    options?: any;
}

export const CodeDiffEditor = ({ original, modified, language = 'javascript', theme = 'vs-dark', options }: DiffEditorProps) => {
    const handleBeforeMount: BeforeMount = (monaco) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true
        });
    };

    return (
        <div className="h-full w-full border border-white/5 rounded-md overflow-hidden">
            <DiffEditor
                height="100%"
                language={language}
                original={original}
                modified={modified}
                theme={theme}
                beforeMount={handleBeforeMount}
                options={{
                    renderSideBySide: true,
                    readOnly: true,
                    domReadOnly: true,
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    ...options
                }}
            />
        </div>
    );
};

export default CodeEditor;
