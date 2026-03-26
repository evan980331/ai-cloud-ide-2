'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CodeEditor, { EditorHandle, CodeDiffEditor } from '@/components/Editor';
import { supabase } from '@/lib/supabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Prettier standalone imports
import * as prettier from 'prettier/standalone';
import prettierPluginBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginHtml from 'prettier/plugins/html';
import prettierPluginPostcss from 'prettier/plugins/postcss';

import {
  Sparkles,
  Zap,
  Share2,
  Loader2,
  AlertCircle,
  Play,
  History,
  Save,
  Code,
  Wand2,
  Palette,
  Download,
  Users,
  Monitor,
  Send,
  Check,
  Plus,
  Cloud,
  XCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Copy,
  ExternalLink,
  Github
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Skeleton } from '@/components/ui/Skeleton';

// --- Types & Constants ---

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  isTyping?: boolean;
  stdin?: string;
}

const SUPPORTED_LANGUAGES = [
  { label: 'Plain Text', value: 'plaintext' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
];

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}`,
  python: `def main():\n    pass\n\nif __name__ == "__main__":\n    main()`,
  typescript: `// TypeScript 初始模板\nconst greet = (name: string): void => {\n  console.log(\`Hello, \${name}!\`);\n};\ngreet("Antigravity");`,
  javascript: `// JavaScript 初始模板\nconst greet = (name) => {\n  console.log(\`Hello, \${name}!\`);\n};\ngreet("Antigravity");`,
  html: `<!DOCTYPE html>\n<html>\n<body>\n  <h1>Welcome to Antigravity</h1>\n</body>\n</html>`,
  css: `body { background: #000; color: #fff; }`,
};

const WANDBOX_LANG_MAP: Record<string, { compiler: string }> = {
  typescript: { compiler: 'typescript-5.6.2' },
  javascript: { compiler: 'nodejs-20.17.0' },
  python: { compiler: 'cpython-3.14.0' },
  c: { compiler: 'gcc-13.2.0' },
  cpp: { compiler: 'gcc-13.2.0' },
};

type AppTheme = 'vs-dark' | 'light' | 'hc-black';

const THEME_CONFIG: Record<AppTheme, Record<string, string>> = {
  'vs-dark': {
    '--bg-app': '#050505',
    '--bg-header': '#0d0d0d',
    '--bg-editor': '#0a0a0a',
    '--bg-ai': '#0c121e',
    '--bg-sidebar': '#080808',
    '--border-subtle': 'rgba(255, 255, 255, 0.05)',
    '--text-main': '#d4d4d8',
    '--text-muted': '#a1a1aa',
    '--text-bright': '#f4f4f5',
    '--accent': '#3b82f6',
  },
  'light': {
    '--bg-app': '#f4f4f5',
    '--bg-header': '#ffffff',
    '--bg-editor': '#ffffff',
    '--bg-ai': '#fafafa',
    '--bg-sidebar': '#ffffff',
    '--border-subtle': 'rgba(0, 0, 0, 0.1)',
    '--text-main': '#27272a',
    '--text-muted': '#71717a',
    '--text-bright': '#09090b',
    '--accent': '#2563eb',
  },
  'hc-black': {
    '--bg-app': '#000000',
    '--bg-header': '#000000',
    '--bg-editor': '#000000',
    '--bg-ai': '#000000',
    '--bg-sidebar': '#000000',
    '--border-subtle': 'rgba(255, 255, 255, 0.4)',
    '--text-main': '#ffffff',
    '--text-muted': '#cccccc',
    '--text-bright': '#ffffff',
    '--accent': '#ffff00',
  }
};

// --- Components ---

const Typewriter = ({ text, speed = 20, onComplete }: { text: string; speed?: number; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) onComplete();
  }, [index, text, speed, onComplete]);

  return <span>{displayedText}</span>;
};

// --- Main Page ---

export default function ProjectPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('typescript');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved' | 'error'>('saved');
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const [theme, setTheme] = useState<AppTheme>('vs-dark');
  const [isFormatting, setIsFormatting] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [fileName, setFileName] = useState<string>('main.ts');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<{ type: 'system' | 'stdout' | 'stderr' | 'compiler', content: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [stdin, setStdin] = useState('');
  const [runCooldown, setRunCooldown] = useState(0);
  const [gistCooldown, setGistCooldown] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // --- Panel Resizing States ---
  const [sidePanelWidth, setSidePanelWidth] = useState(384); // 預設 384px (lg:w-96)
  const [terminalHeight, setTerminalHeight] = useState(35); // 預設 35%
  const [isResizingSide, setIsResizingSide] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // --- Version History States ---
  const [historyRecords, setHistoryRecords] = useState<{ id: string, content: string, summary: string, created_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{ id: string, content: string, summary: string, created_at: string } | null>(null);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const lastSnapshotContentRef = useRef<string>('');
  const lastEditTimeRef = useRef<number>(Date.now());

  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get('view') === 'true';

  // --- Network Resilience & Offline Mode ---
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus('unsaved'); // Trigger sync immediately on reconnect
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Dynamic Favicon ---
  useEffect(() => {
    const langToIcon: Record<string, string> = {
      python: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg',
      javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',
      typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg',
      cpp: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg',
      c: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg',
    };

    const iconUrl = langToIcon[language] || '/favicon.ico';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  }, [language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRunCooldown((prev) => Math.max(0, prev - 1));
      setGistCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 【教學註解】：為什麼之前的同步會失效？
  // 之前的同步失效主要是因為「循環回饋 (Circular Feedback)」問題：
  // 1. 本地修改內容 -> 2. 自動存檔至雲端 -> 3. 雲端推播更新回本地 -> 4. 本地收到更新又觸發存檔。
  // 現在我們使用 lastSyncedContentRef 來紀錄「最後一次從雲端同步下來的內容」，
  // 如果收到的內容跟本地一樣，或者是我們剛剛才存過的內容，就忽略它，從而保證同步流程的穩定與正確。
  const lastSyncedContentRef = useRef<string>('');
  const contentRef = useRef(content);
  const languageRef = useRef(language);
  const fileNameRef = useRef(fileName);
  const isInternalChangeRef = useRef(false); // 用於防止編輯器重繪觸發的 onChange 導致無限迴圈

  useEffect(() => {
    contentRef.current = content;
    languageRef.current = language;
    fileNameRef.current = fileName;
  }, [content, language, fileName]);

  // 1. History Sync
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const stored = localStorage.getItem('antigravity_history');
      let list: string[] = stored ? JSON.parse(stored) : [];
      list = [projectId, ...list.filter(id => id !== projectId)].slice(0, 10);
      localStorage.setItem('antigravity_history', JSON.stringify(list));
      setHistory(list);
    }
  }, [projectId]);

  const fetchProject = useCallback(async (isManualSync = false) => {
    if (!projectId) return;
    try {
      const { data, error: fetchError } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (fetchError && fetchError.code === 'PGRST116') {
        if (!isManualSync) {
          setContent('// Start coding here...');
          setLanguage('typescript');
        }
      } else if (fetchError) setError(fetchError.message);
      else if (data) {
        const loadedContent = data.content || (data.files && data.files.length > 0 ? data.files[0].content : '');
        const loadedLang = data.language || (data.files && data.files.length > 0 ? data.files[0].language : 'typescript');
        const loadedName = data.name || (data.files && data.files.length > 0 ? data.files[0].name : 'main.ts');

        // 只有當內容確實不同時才更新狀態，避免閃爍
        if (loadedContent !== contentRef.current && loadedContent !== lastSyncedContentRef.current) {
          console.log('🔄 Sync: Data fetched and updated');
          isInternalChangeRef.current = true; // 標記為內部更新，防止觸發 unsaved 狀態
          setContent(loadedContent);
          contentRef.current = loadedContent;
          lastSyncedContentRef.current = loadedContent;
        }
        if (loadedLang !== languageRef.current) setLanguage(loadedLang);
        if (loadedName !== fileNameRef.current) setFileName(loadedName);

        if (isManualSync) setSaveStatus('saved');
      }
    } catch (err: any) { setError(err.message); }
  }, [projectId]);

  // 2. Load Data from Supabase
  useEffect(() => {
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!projectId) return;

    if (!isUuid(projectId)) {
      setError(`Invalid Project ID: "${projectId}".`);
      setIsPageLoading(false);
      return;
    }

    setIsPageLoading(true);
    fetchProject().finally(() => setIsPageLoading(false));
  }, [projectId, fetchProject]);

  // 3. Realtime Sync
  useEffect(() => {
    const channel = supabase.channel(`project:${projectId}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    }, (payload) => {
      const remote = payload.new;
      console.log('📡 Realtime update received:', remote);

      // 如果 payload 包含完整內容且與本地不同
      if (remote.content !== undefined) {
        if (remote.content !== contentRef.current && remote.content !== lastSyncedContentRef.current) {
          console.log('🔄 Sync: Direct payload update');
          isInternalChangeRef.current = true; // 標記為內部更新
          setContent(remote.content);
          contentRef.current = remote.content;
          lastSyncedContentRef.current = remote.content;
        }
        if (remote.language && remote.language !== languageRef.current) setLanguage(remote.language);
        if (remote.name && remote.name !== fileNameRef.current) setFileName(remote.name);
        setSaveStatus('saved');
      } else {
        // 如果是 Partial Payload (只有 ID)，主動重新抓取完整資料
        console.log('⚠️ Partial payload detected, fetching full record...');
        fetchProject(true);
      }
    }).subscribe();

    const presence = supabase.channel(`presence:${projectId}`);
    presence.on('presence', { event: 'sync' }, () => {
      setOnlineCount(Object.keys(presence.presenceState()).length);
    }).subscribe(async (s) => {
      if (s === 'SUBSCRIBED') await presence.track({ user: Math.random(), at: new Date() });
    });

    return () => { supabase.removeChannel(channel); supabase.removeChannel(presence); };
  }, [projectId, fetchProject]);

  // 4. Auto-save
  useEffect(() => {
    if (isPageLoading) return;
    const timer = setTimeout(async () => {
      // 最終防禦：再次確認狀態與頁面載入情況
      if (saveStatus !== 'unsaved' || isPageLoading || !projectId || !content) return;

      if (!isOnline) {
        console.log('📴 Offline: Skipped Supabase sync, relying on LocalStorage.');
        setSaveStatus('saved');
        return;
      }

      setSaveStatus('saving');
      try {
        console.log('☁️ Auto-saving project:', projectId);
        const { error: saveError } = await supabase.from('projects').upsert({
          id: projectId,
          content: content,
          language: language,
          name: fileName,
          updated_at: new Date().toISOString()
        });

        if (saveError) {
          console.error('❌ Supabase Upsert Error Details:', {
            message: saveError.message,
            code: saveError.code,
            details: saveError.details,
            hint: saveError.hint
          });

          // 如果是因為欄位不存在（例如 updated_at），嘗試不帶該欄位再存一次
          console.log('🔄 Attempting fallback save without updated_at...');
          const { error: fallbackError } = await supabase.from('projects').upsert({
            id: projectId,
            content: content,
            language: language,
            name: fileName
          });

          if (fallbackError) {
            console.error('❌ Fallback Save also failed:', fallbackError.message);
            throw fallbackError;
          }
        }

        lastSyncedContentRef.current = content;
        setSaveStatus('saved');
        console.log('✅ Save successful');
      } catch (err: any) {
        console.error('❌ Final Save Exception:', err);
        setSaveStatus('error');
      }
    }, 800); // 【優化】：優化為 800ms Debounce 模式
    return () => clearTimeout(timer);
  }, [content, language, fileName, projectId, isPageLoading, saveStatus]);

  // --- Panel Resizing Logic ---

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSide) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < 800) {
          setSidePanelWidth(newWidth);
          editorRef.current?.layout();
        }
      }
      if (isResizingTerminal) {
        // 使用百分比高度
        const newHeight = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        if (newHeight > 10 && newHeight < 80) {
          setTerminalHeight(newHeight);
          editorRef.current?.layout();
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSide(false);
      setIsResizingTerminal(false);
      document.body.style.cursor = 'default';
      // 延遲一點點確保 DOM 更新後重繪
      setTimeout(() => editorRef.current?.layout(), 50);
    };

    if (isResizingSide || isResizingTerminal) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingSide ? 'col-resize' : 'row-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSide, isResizingTerminal]);

  // --- 4. LocalStorage Auto-Backup ---

  useEffect(() => {
    if (!projectId || !content || isReadOnly) return;

    // 每 5 秒自動備份到本地
    const timer = setInterval(() => {
      const backupData = {
        content,
        timestamp: Date.now()
      };
      localStorage.setItem(`antigravity_draft_${projectId}`, JSON.stringify(backupData));
      console.log('💾 Local backup saved.');
    }, 5000);

    return () => clearInterval(timer);
  }, [projectId, content, isReadOnly]);

  // --- 5. Draft Recovery ---
  useEffect(() => {
    if (!projectId || isPageLoading) return;

    // 檢查是否有本地草稿
    const storedDraft = localStorage.getItem(`antigravity_draft_${projectId}`);
    if (storedDraft) {
      const { content: draftContent, timestamp } = JSON.parse(storedDraft);

      // 如果草稿比雲端新（或者雲端還沒載入內容），則提示恢復
      // 這裡簡單判斷：如果雲端內容為空，或者是明確的初始字串，則自動套用草稿
      if ((!contentRef.current || contentRef.current === '// Start coding here...') && draftContent) {
        isInternalChangeRef.current = true;
        setContent(draftContent);
        setTerminalOutput(prev => [...prev, { type: 'system', content: `💡 已為您恢復本地草稿 (${new Date(timestamp).toLocaleTimeString()})` }]);
      }
    }
  }, [projectId, isPageLoading]);

  // --- 6. Auto-Snapshot Logic (60s Inactivity) ---

  useEffect(() => {
    if (!projectId || isReadOnly || isPageLoading) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastEdit = now - lastEditTimeRef.current;

      // 如果 60 秒沒動過，且內容跟上次快照不同，則自動產生快照
      if (timeSinceLastEdit >= 60000 && content && content !== lastSnapshotContentRef.current) {
        console.log('📸 Auto-snapshot triggered...');
        handleSaveSnapshot();
      }
    }, 10000); // 每 10 秒檢查一次

    return () => clearInterval(timer);
  }, [projectId, content, isReadOnly, isPageLoading]);

  useEffect(() => {
    lastEditTimeRef.current = Date.now();
  }, [content]);

  const handleSaveSnapshot = async (manualSummary?: string) => {
    if (!projectId || !content || isSnapshotting) return;
    setIsSnapshotting(true);
    try {
      let summary = manualSummary || '';

      // 如果沒有手動摘要，請 AI 產生
      if (!summary) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `請用 10 個字以內總結這段代碼目前的改動內容：\n\n${content.slice(0, 1000)}`
            }]
          })
        });
        const aiRes = await response.json();
        summary = aiRes.explanation || '自動存檔快照';
        if (summary.length > 20) summary = summary.slice(0, 20) + '...';
      }

      const { data, error: snapshotError } = await supabase.from('history').insert({
        project_id: projectId,
        content: content,
        summary: summary,
      }).select();

      if (!snapshotError) {
        console.log('✅ Snapshot saved:', summary);
        lastSnapshotContentRef.current = content;
        fetchHistory();
      } else {
        console.error('❌ Snapshot error:', snapshotError.message);
      }
    } catch (err) {
      console.error('❌ Snapshot exception:', err);
    } finally {
      setIsSnapshotting(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    const { data, error: historyError } = await supabase
      .from('history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!historyError && data) {
      setHistoryRecords(data);
    }
  }, [projectId]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  // 5. Terminal Auto-scroll
  useEffect(() => {
    if (showTerminal && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput, showTerminal]);

  // AI Chat Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // 6. Live Preview Builder
  useEffect(() => {
    const doc = language === 'html' ? content : `
      <!DOCTYPE html><html><body style="background:#0a0a0a;color:#fff;margin:2rem;font-family:sans-serif;"><div id="root"></div>
      <script>${(language === 'javascript' || language === 'typescript') ? content : ''}</script></body></html>`;
    setPreviewDoc(doc);
  }, [content, language]);

  // --- Handlers ---

  const syncCurrentFile = useCallback(() => {
    if (editorRef.current) {
      const val = editorRef.current.getValue() || '';

      // 如果是內部的程式化修改（如同步、AI 套用），則不觸發 unsaved
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        contentRef.current = val;
        return;
      }

      // 如果真的有差異，才設為待存檔
      if (val !== contentRef.current && val !== lastSyncedContentRef.current) {
        console.log('✍️ User change detected');
        setContent(val);
        contentRef.current = val; // 立即同步 Ref，防止 React 異步更新延遲導致的重複進入
        setSaveStatus('unsaved');

        // 如果目前內容不等於任何基礎模板，且不是空內容，則標記為已編輯
        const isAnyBoilerplate = Object.values(BOILERPLATES).some(b => b === val);
        if (!isAnyBoilerplate && val.trim().length > 0) {
          setHasEdited(true);
        }
      }
    }
  }, []); // 移除 content 依賴，完全依靠 Ref

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setSaveStatus('unsaved');

    // 自動更新檔名副檔名
    const nameWithoutExt = fileName.split('.')[0] || 'main';
    const extMap: Record<string, string> = {
      typescript: 'ts', javascript: 'js', python: 'py', cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json'
    };
    if (extMap[newLang]) {
      setFileName(`${nameWithoutExt}.${extMap[newLang]}`);
    }

    // 如果使用者尚未手動編輯，則自動替換為新語言的基礎模板
    if (!hasEdited && BOILERPLATES[newLang]) {
      const template = BOILERPLATES[newLang];
      setContent(template);
      editorRef.current?.setValue(template);
    }
  };

  const handleFormatCode = async () => {
    if (!editorRef.current) return;
    setIsFormatting(true);
    const val = editorRef.current.getValue() || '';
    try {
      let formatted = '';
      if (['javascript', 'typescript', 'html', 'css', 'json'].includes(language)) {
        const parser = language === 'typescript' ? 'typescript' : (language === 'javascript' ? 'babel' : language);
        formatted = await prettier.format(val, {
          parser, plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginHtml, prettierPluginPostcss],
          semi: true, singleQuote: true, tabWidth: 2
        });
      } else {
        const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt: `Format this ${language} code`, currentCode: val, language }) });
        const data = await res.json();
        formatted = data.code || val;
      }
      if (formatted) {
        isInternalChangeRef.current = true;
        editorRef.current.setValue(formatted);
        setContent(formatted);
        contentRef.current = formatted;
        setSaveStatus('unsaved');
      }
    } catch (e) { console.error(e); }
    finally { setIsFormatting(false); }
  };

  const getLanguageFromExtension = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json'
    };
    return map[ext || ''] || 'plaintext';
  };

  const handleFileNameChange = (newName: string) => {
    setFileName(newName);
    const newLang = getLanguageFromExtension(newName);
    if (newLang !== language) {
      setLanguage(newLang);
    }
    setSaveStatus('unsaved');
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    // 如果是 TypeScript，強制下載成 .txt
    const finalName = language === 'typescript' ? fileName.replace(/\.ts$/, '.txt') : fileName;
    saveAs(blob, finalName);
  };

  const handleAiRefactor = async (msg?: string) => {
    const finalPrompt = msg || prompt;
    if (!finalPrompt.trim()) return;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', content: finalPrompt }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt: finalPrompt, currentCode: content, language }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Unknown Error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.explanation || 'Done.', code: data.code, isTyping: true, stdin: data.stdin }]);
    } catch (e: any) { setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]); }
    finally { setIsLoading(false); }
  };

  const handleShare = () => {
    const url = window.location.origin + window.location.pathname + '?view=true';
    navigator.clipboard.writeText(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- Gist Export Logic (Stateless) ---

  const handleExportGist = async () => {
    if (gistCooldown > 0) return;
    setGistCooldown(5);
    // 【學習註解】：如何實作 Stateless (無狀態) 的第三方服務授權？
    // 1. 利用 Supabase Auth 的 OAuth 流程，透過 redirectTo 攜帶目前專案的 UUID 回來。
    // 2. 授權成功後，Session 會存在瀏覽器中。我們在 mount 時檢查 Session。
    // 3. 抓到 Token 後，直接呼叫 GitHub API 建立 Gist，完成後隨即 SignOut，保持「導出即走」的無狀態感。
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'gist',
        redirectTo: window.location.origin + window.location.pathname + '?gist_export=true'
      }
    });

    if (error) {
      setTerminalOutput(prev => [...prev, { type: 'stderr', content: `OAuth Error: ${error.message}` }]);
    }
  };

  useEffect(() => {
    const performGistExport = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams(window.location.search);

      if (session && params.get('gist_export') === 'true') {
        const token = session.provider_token;
        if (!token) return;

        setShowTerminal(true);
        setTerminalOutput(prev => [{ type: 'system', content: '🚀 Detected GitHub authorization. Exporting to Gist...' }]);

        try {
          const ext = language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : 'txt';
          const fileNameGist = `antigravity_${projectId.slice(0, 8)}.${ext}`;

          const res = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              description: `Project exported from Antigravity AI Cloud IDE (ID: ${projectId})`,
              public: true,
              files: {
                [fileNameGist]: {
                  content: content
                }
              }
            })
          });

          const data = await res.json();
          if (data.html_url) {
            setTerminalOutput(prev => [...prev, {
              type: 'system',
              content: `🎉 Gist Exported Successfully! \n🔗 URL: ${data.html_url}`
            }]);
            window.open(data.html_url, '_blank');
          } else {
            throw new Error(data.message || 'Github API Error');
          }
        } catch (err: any) {
          setTerminalOutput(prev => [...prev, { type: 'stderr', content: `Gist Export Failed: ${err.message}` }]);
        } finally {
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          await supabase.auth.signOut();
        }
      }
    };

    performGistExport();
  }, [projectId, content, language]);

  const handleFork = async () => {
    const newId = crypto.randomUUID();
    setIsLoading(true);

    // 【教學註解】：如何實作資料庫的 Clone (複製) 邏輯？
    // 在雲端服務中，「複製」並非修改既有資料，而是取出現有的狀態（Content, Language, Name），
    // 搭配一個「全新的 UUID」作為 Primary Key 寫入資料庫。
    // 這樣使用者就能在不破壞原作者代碼的情況下，擁有自己的獨立副本進行編輯。
    try {
      const { error: forkError } = await supabase.from('projects').insert({
        id: newId,
        content: content,
        language: language,
        name: `forked-${fileName}`,
        updated_at: new Date().toISOString()
      });

      if (forkError) throw forkError;

      // 跳轉至新專案
      router.push(`/${newId}`);
    } catch (err: any) {
      alert(`Fork failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = async () => {
    if (isRunning || runCooldown > 0) return;

    // 【防呆】：代碼為空保護
    if (!content.trim()) {
      setShowTerminal(true);
      setTerminalOutput([{ type: 'system', content: '❌ 代碼為空，無法執行。' }]);
      return;
    }

    setRunCooldown(5);

    // 【防呆與優化】：限制 Stdin 大小避免 Payload 過大 (上限 100KB)
    let finalStdin = stdin.trim();
    if (finalStdin.length > 100000) {
      finalStdin = finalStdin.slice(0, 100000);
      setShowTerminal(true);
      setTerminalOutput(prev => [...prev, { type: 'system', content: '⚠️ 警告：STDIN 超過 100KB 上限，已自動截斷結尾。' }]);
    }

    // 【防呆與優化】：偵測代碼是否需要輸入
    const inputKeywords = ['cin', 'scanf', 'input(', 'readline'];
    const needsInput = inputKeywords.some(kw => content.includes(kw));

    if (needsInput) {
      if (!finalStdin) {
        setShowToast(true);
        setShowTerminal(true);
        setTerminalOutput([
          { type: 'system', content: '❌ 執行中斷：偵測到代碼需要輸入資料，但 INPUT 區目前為空。' },
          { type: 'system', content: '💡 為防止產生亂碼或非預期結果，請先在左側填寫測試資料後再點擊 Run。' }
        ]);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      // 【數量校驗】：啟發式預估所需項數
      let expectedCount = 0;
      if (language === 'cpp' || language === 'c') {
        // 估計方法：計算 cin 後面跟隨的 >> 數量
        const cinMatches = content.match(/cin\s*(>>\s*[^;>>]+)+/g) || [];
        cinMatches.forEach(m => {
          expectedCount += (m.match(/>>/g) || []).length;
        });
      } else if (language === 'python') {
        // 估計方法：計算 input() 的出現次數
        expectedCount = (content.match(/input\s*\(/g) || []).length;
      }

      const providedCount = finalStdin.split(/\s+/).length;
      if (expectedCount > providedCount) {
        setShowToast(true);
        setShowTerminal(true);
        setTerminalOutput([
          { type: 'system', content: `❌ 執行中斷：偵測需求約 ${expectedCount} 項輸入，但您僅提供了 ${providedCount} 項。` },
          { type: 'system', content: '💡 提示：請確保輸入資料的數量（以空白或換行隔開）與代碼中的讀取次數相符。' }
        ]);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }
    }

    setIsRunning(true);
    setShowTerminal(true);
    setTerminalOutput([]); // 自動清除上次輸出
    const langConfig = WANDBOX_LANG_MAP[language];

    setTerminalOutput(prev => [...prev, { type: 'system', content: `Running ${language} code via Wandbox...` }]);

    if (!langConfig || language === 'html' || language === 'css') {
      setTerminalOutput(prev => [...prev, { type: 'stderr', content: `Execution for ${language} is not supported via Wandbox API yet. Please use 'Live Preview' for web languages.` }]);
      setIsRunning(false);
      return;
    }

    try {
      // 【教學註解】：為什麼遠端執行環境無法像本地電腦一樣實時等待 cin 輸入？
      // 在本地電腦，程式與使用者共用一個終端機 Process，可以隨時暫停並等待 Input。
      // 但在「服務化 (SaaS)」的雲端環境中，Web 前端與後端編譯器是透過「標准 HTTP 請求」通訊的。
      // HTTP 請求是「無狀態」且「單次往返」的模式：我們發送代碼與預填好的 Stdin，
      // 後端則是一次跑完後將結果全部回傳。因此，使用者必須在點擊「Run」之前先填好所有的輸入。

      // 【學習註解】：為什麼 Web IDE 採用 Batch Mode (批次模式) 而非 Interactive Mode (互動模式)？
      // 1. 效能與資源：互動模式需要為每個使用者維持一個長連線 (WebSocket/SSH)，對伺服器負擔極大。
      // 2. 安全性：批次模式能讓容器 (Container) 在執行完畢後立即銷毀，防止使用者進行惡意操控。
      // 3. 穩定性：HTTP 請求比長連線更穩定，不容易因為網路波動而中斷執行。
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: langConfig.compiler,
          code: content,
          stdin: finalStdin || "", // 確保 Stdin 為空字串而非空值，防止讀取系統緩衝
          save: true,
          clientId: projectId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server Error: ${response.status}`);
      }

      // 優先序顯示邏輯：
      // 1. 若有 compiler_message 或 compiler_output，優先顯示（即便是警告或編譯錯誤）
      // 2. 顯示 program_output (stdout)
      // 3. 顯示 program_error (stderr)
      if (data) {
        const cOutput = data.compiler_message || data.compiler_output;
        const pOutput = data.program_output;
        const pError = data.program_error;
        const pMessage = data.program_message; // 有些環境會用這個

        if (cOutput) {
          setTerminalOutput(prev => [...prev, { type: 'compiler', content: cOutput }]);
        }

        if (pOutput) {
          setTerminalOutput(prev => [...prev, { type: 'stdout', content: pOutput }]);
        }

        if (pError) {
          setTerminalOutput(prev => [...prev, { type: 'stderr', content: pError }]);
        }

        // 如果上述都沒有但有 program_message，也加上去
        if (pMessage && !pOutput && !pError) {
          setTerminalOutput(prev => [...prev, { type: 'stdout', content: pMessage }]);
        }

        if (pError || (cOutput && cOutput.toLowerCase().includes('error'))) {
          const errorMsg = cOutput || pError;
          setTerminalOutput(prev => [...prev, { type: 'system', content: '🤖 AI Smart Debugging Triggered...' }]);
          handleAiRefactor(`My code is having following errors. Please diagnose and provide a short fix with code: \n\nError Message:\n${errorMsg}`);
        }

        if (!pOutput && !pError && !cOutput && !pMessage) {
          setTerminalOutput(prev => [...prev, { type: 'system', content: 'Execution finished (no output).' }]);
        } else {
          const statusText = data.status === "0" ? '✅ Success' : `❌ Exit Code: ${data.status}`;
          setTerminalOutput(prev => [...prev, { type: 'system', content: statusText }]);
        }
      } else {
        throw new Error('No response data from Wandbox');
      }
    } catch (err: any) {
      setTerminalOutput(prev => [...prev, { type: 'stderr', content: `Runtime Error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
      setSaveStatus('saved');
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex h-screen w-full bg-[#050505] overflow-hidden">
        <aside className="w-12 border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col items-center py-4 gap-6">
          <Skeleton className="w-8 h-8 rounded-xl bg-zinc-800" />
          <Skeleton className="w-6 h-6 rounded-md bg-zinc-900" />
          <Skeleton className="w-6 h-6 rounded-md bg-zinc-900" />
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="h-11 border-b border-[#1a1a1a] bg-[#0d0d0d] flex items-center px-4 justify-between">
            <div className="flex gap-4 items-center">
              <Skeleton className="w-32 h-4 bg-zinc-800" />
              <Skeleton className="w-20 h-4 bg-zinc-900" />
            </div>
            <div className="flex gap-4 items-center">
              <Skeleton className="w-48 h-6 rounded-md bg-zinc-900" />
            </div>
          </header>
          <div className="flex-1 p-6 space-y-4 bg-[#0a0a0a]">
            <Skeleton className="w-2/3 h-5 bg-zinc-800 opacity-50" />
            <Skeleton className="w-1/2 h-5 bg-zinc-800 opacity-50" />
            <Skeleton className="w-3/4 h-5 bg-zinc-800 opacity-50" />
            <Skeleton className="w-full h-32 mt-8 bg-zinc-900 opacity-30" />
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center text-red-500 font-bold p-8 text-center">{error}</div>;

  return (
    <div
      className="flex h-screen w-full bg-[var(--bg-app)] text-[var(--text-main)] font-sans overflow-hidden"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          setSaveStatus('saved');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleRunCode();
        }
      }}
    >
      <style jsx global>{`
        :root { ${Object.entries(THEME_CONFIG[theme]).map(([k, v]) => `${k}: ${v};`).join('\n')} }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 10px; }
      `}</style>

      {/* 1. Activity Bar */}
      <aside className="w-12 flex flex-col items-center py-4 border-r border-[var(--border-subtle)] bg-[var(--bg-header)] z-30">
        <button
          onClick={() => {
            if (confirm('是否離開目前專案並建立新專案？')) {
              router.push('/');
            }
          }}
          className="p-2 text-[var(--accent)] bg-[var(--accent)]/10 rounded-xl mb-6 hover:bg-[var(--accent)]/20 transition-colors"
          title="Home / New Project"
        >
          <Sparkles size={20} />
        </button>
        <div className="flex flex-col gap-6 text-[var(--text-muted)]">
          <button onClick={() => window.open('/', '_blank')} className="hover:text-[var(--text-bright)] transition-colors" title="Create New Project">
            <Plus size={20} />
          </button>
          <button
            onClick={() => { setShowHistory(!showHistory); setShowTerminal(false); }}
            className={`transition-colors ${showHistory ? 'text-[var(--accent)]' : 'hover:text-[var(--text-bright)]'}`}
            title="Time Machine (History)"
          >
            <History size={20} />
          </button>
        </div>
      </aside>

      {/* 2. Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-11 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            {isEditingName ? (
              <input
                autoFocus
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => { setIsEditingName(false); handleFileNameChange(fileName); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingName(false); handleFileNameChange(fileName); } }}
                className="bg-[var(--bg-app)] text-[11px] font-black text-[var(--text-bright)] outline-none border border-[var(--accent)]/50 px-2 py-0.5 rounded-md italic uppercase tracking-widest w-40"
              />
            ) : (
              <button
                onClick={() => !isReadOnly && setIsEditingName(true)}
                className={`text-[11px] font-black uppercase tracking-widest text-[var(--text-bright)] italic transition-colors group flex items-center gap-2 ${isReadOnly ? 'cursor-default' : 'hover:text-[var(--accent)]'}`}
              >
                <Code size={12} className="text-[var(--accent)]" />
                {fileName}
                {isReadOnly && <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 text-[8px] rounded uppercase not-italic">Read Only</span>}
              </button>
            )}

            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-2" />

            <select value={language} onChange={e => handleLanguageChange(e.target.value)} disabled={isReadOnly} className={`bg-transparent text-[10px] font-black text-[var(--text-muted)] outline-none cursor-pointer uppercase tracking-tight ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-[var(--bg-header)]">{l.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            {isReadOnly ? (
              <button
                onClick={handleFork}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full hover:scale-105 transition-all shadow-lg shadow-[var(--accent)]/20"
              >
                <ExternalLink size={14} />
                <span>Fork / Edit This Code</span>
              </button>
            ) : (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors relative"
                title="Share Project URL"
              >
                <Share2 size={14} />
                <span>Share</span>
                {showToast && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-[8px] px-2 py-1 rounded shadow-xl animate-in fade-in slide-in-from-top-1">COPIED!</div>
                )}
              </button>
            )}
            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Download File"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <div className="flex items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-tight" title={isOnline ? "Cloud Sync Active" : "Offline Mode (Local Save Only)"}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={isOnline ? 'text-emerald-500/70' : 'text-red-500/70'}>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {!isReadOnly && (
              <button
                onClick={handleExportGist}
                disabled={gistCooldown > 0}
                className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight transition-colors px-2 py-0.5 rounded border ${gistCooldown > 0 ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:text-zinc-200'}`}
                title="Export to GitHub Gist"
              >
                <Github size={13} />
                <span>{gistCooldown > 0 ? `Wait ${gistCooldown}s` : 'Gist'}</span>
              </button>
            )}

            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <div className="flex items-center gap-1">
              <Palette size={12} className="text-[var(--text-muted)]" />
              <select value={theme} onChange={e => setTheme(e.target.value as AppTheme)} className="bg-transparent text-[10px] font-black text-[var(--text-muted)] outline-none cursor-pointer uppercase tracking-tight">
                <option value="vs-dark">VS Dark</option><option value="light">Light</option><option value="hc-black">Contrast</option>
              </select>
            </div>
            <button
              onClick={handleRunCode}
              disabled={isRunning || runCooldown > 0}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-md transition-all ${isRunning ? 'bg-[var(--accent)]/10 text-[var(--accent)] animate-pulse' : (runCooldown > 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[var(--accent)] text-white hover:opacity-90 shadow-lg shadow-[var(--accent)]/20')}`}
            >
              <Play size={12} fill="currentColor" />
              <span>{isRunning ? 'Running...' : (runCooldown > 0 ? `Wait ${runCooldown}s` : 'Run')}</span>
            </button>
            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <button onClick={handleFormatCode} disabled={isFormatting} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight ${isFormatting ? 'text-[var(--accent)] animate-pulse' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'}`}><Wand2 size={12} /> Format</button>
            <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded-lg transition-all ${showPreview ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} title="Live Preview"><Play size={14} /></button>
            <button onClick={() => setShowTerminal(!showTerminal)} className={`p-1.5 rounded-lg transition-all ${showTerminal ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} title="Terminal"><Terminal size={14} /></button>
            <button onClick={() => setIsZenMode(!isZenMode)} className={`p-1.5 rounded-lg transition-all ${isZenMode ? 'bg-orange-500/10 text-orange-400' : 'text-[var(--text-muted)] hover:text-orange-400'}`} title="Zen Mode (Distraction Free)"><Zap size={14} /></button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <div className={`flex-1 relative bg-[var(--bg-editor)] ${isZenMode ? 'fixed inset-0 z-[100]' : ''}`}>
              {!isDiffMode ? (
                <CodeEditor
                  ref={editorRef}
                  language={language}
                  value={content}
                  theme={theme}
                  onChange={syncCurrentFile}
                  options={{
                    minimap: { enabled: false },
                    lineNumbersMinChars: 3,
                    fontSize: 14,
                    readOnly: isReadOnly,
                    wordWrap: 'on',
                    codeLens: false,
                    lightbulb: { enabled: 'off' },
                    quickSuggestions: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'none',
                    glyphMargin: false
                  }}
                />
              ) : (
                <div className="h-full flex flex-col animate-in zoom-in-95 duration-300">
                  <div className="h-10 bg-black/40 border-b border-white/5 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      <Zap size={14} /> Time Machine: Comparing Versions
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          isInternalChangeRef.current = true;
                          setContent(selectedVersion!.content);
                          setSaveStatus('unsaved');
                          setIsDiffMode(false);
                        }}
                        className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase rounded hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Check size={12} /> Restore This Version
                      </button>
                      <button
                        onClick={() => setIsDiffMode(false)}
                        className="px-3 py-1 bg-white/5 text-[var(--text-muted)] text-[10px] font-black uppercase rounded hover:text-white transition-all flex items-center gap-2"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CodeDiffEditor
                      original={selectedVersion?.content || ''}
                      modified={content}
                      language={language}
                      theme={theme}
                    />
                  </div>
                </div>
              )}
              {isZenMode && (
                <button
                  onClick={() => setIsZenMode(false)}
                  className="fixed bottom-8 right-8 p-4 bg-[var(--accent)] text-white rounded-full shadow-2xl z-[101] hover:scale-110 active:scale-95 transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px]"
                >
                  <X size={20} /> Exit Zen Mode
                </button>
              )}
            </div>
            {showPreview && !isZenMode && (
              <div className="w-1/2 border-l border-[var(--border-subtle)] bg-white flex flex-col animate-in slide-in-from-right duration-500">
                <div className="h-8 bg-zinc-100 border-b flex items-center px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Runtime</div>
                <iframe srcDoc={previewDoc} className="flex-1 w-full border-none" sandbox="allow-scripts" />
              </div>
            )}
          </div>

          {/* 3. Terminal Area (With Vertical Resizer) */}
          {showTerminal && !isZenMode && (
            <div
              style={{ height: `${terminalHeight}%`, flexShrink: 0 }}
              className="border-t border-[var(--border-subtle)] bg-[#050505] flex flex-col relative z-20 transition-[height] duration-75"
            >
              {/* Vertical Drag Handle */}
              <div
                onMouseDown={() => setIsResizingTerminal(true)}
                className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize hover:bg-[var(--accent)]/50 transition-colors z-30"
              />

              <div className="h-9 bg-[var(--bg-header)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Terminal size={14} className="text-[var(--accent)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-bright)]">Main Circuit: Terminal & Input</span>
                  {isRunning && <Loader2 size={10} className="animate-spin text-[var(--accent)]" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTerminalOutput([])}
                    className="p-1.5 hover:bg-white/5 rounded-md hover:text-red-400 transition-colors"
                    title="Clear Terminal"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="p-1.5 hover:bg-white/5 rounded-md hover:text-[var(--text-bright)] transition-colors"
                    title="Hide Terminal"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: STDIN */}
                <div className="w-1/2 border-r border-[var(--border-subtle)] bg-black/40 flex flex-col group/stdin">
                  <div className="px-3 py-1.5 bg-white/5 border-b border-[var(--border-subtle)] text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wide flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send size={10} className="text-orange-400" />
                      Input (Stdin)
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-orange-500/5 text-orange-400/60 text-[8px] italic leading-tight border-b border-orange-500/10">
                    提示：請在按下 Run 之前，依序輸入代碼所需的測試資料。
                  </div>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="例如：10 20 或 Hello"
                    className="flex-1 w-full bg-transparent p-4 text-[12px] font-mono outline-none resize-none text-[var(--text-main)] placeholder:text-zinc-800 custom-scrollbar leading-relaxed"
                  />
                </div>

                {/* Right Panel: STDOUT/STDERR */}
                <div className="w-1/2 flex flex-col bg-black/60">
                  <div className="px-3 py-1.5 bg-white/5 border-b border-[var(--border-subtle)] text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-2">
                    <Monitor size={10} className="text-blue-400" />
                    Output (Terminal)
                  </div>
                  <div
                    className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed custom-scrollbar selection:bg-[var(--accent)]/30"
                    style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace' }}
                  >
                    {terminalOutput.length === 0 ? (
                      <div className="text-[var(--text-muted)]/20 italic text-[11px] font-light tracking-wider">
                        // Waiting for data stream...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {terminalOutput.map((line, i) => (
                          <div key={i} className={`whitespace-pre-wrap leading-relaxed px-1 rounded transition-colors ${line.type === 'stderr' ? 'text-red-400 bg-red-400/5 font-medium' :
                            line.type === 'system' ? 'text-[var(--accent)] font-bold' :
                              line.type === 'compiler' ? 'text-orange-300 bg-orange-400/10 border-l-2 border-orange-500/50 pl-3 py-1 my-1' :
                                'text-zinc-300 hover:bg-white/5'
                            }`}>
                            {line.type === 'system' && <span className="mr-2 opacity-50">❯</span>}
                            {line.content}
                          </div>
                        ))}
                        <div ref={scrollRef} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="h-8 border-t border-[var(--border-subtle)] bg-[var(--bg-header)] flex items-center justify-between px-4 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4">
            <History size={10} /> PROJECT: {projectId.slice(0, 8)}
            <div className="flex items-center gap-1.5 text-[var(--accent)] italic"><Sparkles size={10} /> Neural Sync Active</div>
          </div>
          <div className="flex items-center gap-4">
            {/* 【自主學習】：監聽 content 變化並即時計算字數 */}
            <div className="bg-[var(--bg-app)]/50 px-3 py-1 rounded-full border border-[var(--border-subtle)] flex items-center gap-2">
              <Monitor size={10} /> CHARS: <span className="text-[var(--text-bright)]">{content.length}</span>
            </div>
            <div className="flex items-center gap-1 text-green-500"><Users size={10} /> {onlineCount} ONLINE</div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 shadow-inner">
              {saveStatus === 'saving' && <span className="flex items-center gap-1.5 text-blue-400 animate-pulse font-black"><Cloud size={10} /> ☁️ SAVING...</span>}
              {saveStatus === 'saved' && <span className="flex items-center gap-1.5 text-emerald-400 font-black"><Check size={10} /> ✅ SAVED</span>}
              {saveStatus === 'unsaved' && <span className="flex items-center gap-1.5 text-amber-500 font-bold italic"><AlertCircle size={10} /> ✍️ UNSAVED</span>}
              {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-red-500 font-black animate-bounce"><XCircle size={10} /> ❌ SYNC ERROR</span>}
            </div>
          </div>
        </footer>
      </main>

      {/* 4. History Sidebar */}
      {showHistory && !isZenMode && (
        <aside style={{ width: `300px` }} className="flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-ai)] shrink-0 shadow-2xl relative animate-in slide-in-from-right duration-300">
          <header className="p-4 border-b border-[var(--border-subtle)] bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-bright)] font-black text-[10px] italic uppercase tracking-widest">
              <History size={14} className="text-emerald-400" /> Snapshot History
            </div>
            <button onClick={() => { setShowHistory(false); setIsDiffMode(false); }} className="text-[var(--text-muted)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {historyRecords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-[var(--text-muted)] uppercase text-[10px] font-black spacing tracking-[0.2em] italic text-center p-8">
                No Snapshots Found.<br />Auto-save starts in 60s.
              </div>
            ) : (
              historyRecords.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    setSelectedVersion(rec);
                    setIsDiffMode(true);
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all group ${selectedVersion?.id === rec.id && isDiffMode ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-[var(--text-bright)] uppercase tracking-tight">{rec.summary}</span>
                    <span className="text-[8px] text-[var(--text-muted)] font-bold italic">{new Date(rec.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[8px] text-[var(--text-muted)] font-medium line-clamp-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    {rec.content.slice(0, 100).replace(/\n/g, ' ')}...
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-4 border-t border-[var(--border-subtle)] bg-black/20">
            <button
              onClick={() => handleSaveSnapshot('手動儲存快照')}
              disabled={isSnapshotting}
              className="w-full py-2 bg-[var(--accent)] text-white text-[10px] font-black uppercase rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isSnapshotting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Create Manual Snapshot
            </button>
          </div>
        </aside>
      )}

      {/* 3. AI Assistant (With Horizontal Resizer) */}
      {!isReadOnly && !isZenMode && !showHistory && (
        <>
          {/* Horizontal Drag Handle */}
          <div
            onMouseDown={() => setIsResizingSide(true)}
            className="w-1.5 cursor-col-resize bg-transparent hover:bg-[var(--accent)]/30 border-l border-[var(--border-subtle)] transition-colors z-40 active:bg-[var(--accent)]/50"
          />
          <aside
            style={{ width: `${sidePanelWidth}px` }}
            className="flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-ai)] shrink-0 shadow-2xl relative"
          >
            <header className="p-4 border-b border-[var(--border-subtle)] bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--text-bright)] font-black text-[10px] italic uppercase tracking-widest"><Sparkles size={14} className="text-[var(--accent)]" /> AI Assistant</div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-[var(--text-muted)] uppercase text-[10px] font-black spacing tracking-[0.5em] italic">Waiting for Transmission</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-white/5 border border-[var(--border-subtle)] text-[var(--text-main)] whitespace-pre-wrap'}`}>
                    {m.role === 'assistant' && m.isTyping ? <Typewriter text={m.content} /> : (m.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.content) }} /> : m.content)}
                  </div>
                  {m.code && (
                    <div className="mt-3 w-full bg-black/40 border border-white/5 rounded-xl p-3 shadow-xl overflow-hidden group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-black uppercase text-[var(--text-muted)] italic">Neural Code Proposal</span>
                        <button onClick={() => {
                          isInternalChangeRef.current = true;
                          setContent(m.code!);
                          contentRef.current = m.code!;
                          editorRef.current?.setValue(m.code!);
                          setSaveStatus('unsaved');
                        }} className="text-[8px] text-[var(--accent)] font-black uppercase bg-[var(--accent)]/10 px-3 py-1 rounded-full border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-all">Apply Patch</button>
                      </div>
                      <pre className="text-[10px] font-mono overflow-auto max-h-60 text-blue-100/70 p-1 flex">
                        <code className="flex-1">{m.code}</code>
                      </pre>
                    </div>
                  )}
                  {m.stdin && (
                    <div className="mt-2 w-full bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 shadow-xl overflow-hidden group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-black uppercase text-orange-400 italic">Test Input Proposal</span>
                        <button onClick={() => {
                          setStdin(m.stdin!);
                          setShowTerminal(true);
                        }} className="text-[8px] text-orange-400 font-black uppercase bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30 hover:bg-orange-500/20 transition-all flex items-center gap-1">
                          <Send size={10} /> Apply to Input
                        </button>
                      </div>
                      <pre className="text-[10px] font-mono overflow-auto max-h-32 text-orange-200/70 p-1 bg-black/40 rounded custom-scrollbar">
                        <code>{m.stdin}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {/* AI Thinking Indicator */}
              {isLoading && (
                <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white/5 border border-[var(--border-subtle)] p-3 rounded-2xl flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] italic animate-pulse">
                      AG Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-[var(--border-subtle)] bg-black/40 backdrop-blur-xl">
              <div className="relative bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-3 focus-within:border-[var(--accent)]/50 transition-all">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiRefactor(); } }}
                  placeholder="繁體中文智慧溝通已開啟..."
                  className="w-full bg-transparent border-none text-[12px] focus:outline-none resize-none placeholder:text-[var(--text-muted)] h-12 custom-scrollbar"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[8px] font-black text-[var(--text-muted)] italic uppercase tracking-tighter">Gemini 2.5 L10N Mode</span>
                  <button
                    onClick={() => handleAiRefactor()}
                    disabled={isLoading}
                    className="p-1.5 bg-[var(--accent)] rounded-lg text-white disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
