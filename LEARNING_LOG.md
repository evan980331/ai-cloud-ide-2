# AI 雲端 IDE 開發學習日誌 (LEARNING_LOG.md)

## 第一週：專案初始化 (2026-03-02)

### 本週完成的功能
- [x] 使用 `create-next-app` 初始化專案 (TypeScript, Tailwind CSS, App Router)
- [x] 安裝核心套件 `@monaco-editor/react` 與 `lucide-react`
- [x] 建立 `/components` 與 `/app/api` 基本目錄結構
- [x] 實作 `Editor.tsx` 組件，並整合 `forwardRef` 以支援外部控制 (例如 AI 直接寫入)
- [x] 建立 `PROJECT_ROADMAP.md` 規劃 18 週進度

### 遇到的技術困難
- **權限與工作區配置**：初次執行時遇到 D 槽存取權限問題，需先將 D 槽加入 VS Code 工作區 (Workspace) 才能授權執行指令。
- **Monaco Editor 外部控制**：需透過 `useImperativeHandle` 暴露 `getValue` 與 `setValue` 介面，以符合未來 AI 自動填充程式碼的需求。

### 使用的技術關鍵字
- `Next.js`, `TypeScript`, `Tailwind CSS`, `App Router`, `Monaco Editor`, `forwardRef`, `useImperativeHandle`

## 第二週：架構設計與 AI 協議定義 (2026-03-02)

### 本週完成的功能
- [x] 建立系統架構文件 (`docs/architecture.md`)，定義前端、後端與 AI 的資料流
- [x] 設計 AI 溝通協議 (`docs/api-spec.md`)，強制 AI 以 JSON 格式回傳 `{ action, explanation, code, language }`
- [x] 安裝並整合 `@google/generative-ai` SDK
- [x] 實作後端 API 路由 (`app/api/chat/route.ts`)並加入 System Instructions
- [x] 更新 `page.tsx`，建立測試按鈕與 AI 交互邏輯，並成功透過 `forwardRef` 操控編輯器

### 遇到的技術困難
- **模型版本相容性 (404 Error)**：`gemini-1.5-flash` 在特定 API 版本中可能無法存取，透過 `curl` 列出可用模型後，發現並切換至 `gemini-2.5-flash` 成功解決。
- **專案結構優化與 404 修復**：Next.js 預設使用 `src/` 目錄時，若根目錄同時存在 `app/` 會導致路由衝突。已將所有 `app` 邏輯合併至 `src/app`。
- **AI 指令對齊**：為了讓 AI 產出的程式碼更符合 React/Next.js 環境且更精簡，更新了 System Instruction 以規範產出風格。

### 使用的技術關鍵字
- `JSON Schema`, `System Prompting`, `API Routes`, `Google Generative AI`, `Data Flow Architecture`, `Gemini 2.5 Flash`, `Split View Layout`

### 下週預計目標
- 實作多檔案支援與檔案切換器 (File Tabs)
- 強化 AI 的「上下文感知」能力，讓它能看見整個專案的結構
- 加入基礎的終端機 (Terminal) 介面模擬

## 第三週：多檔案 IDE 佈局與動態路由 (2026-03-02)

### 本週完成的功能
- [x] 實作動態路由 `/[projectId]`，支援多專案同時存取
- [x] 建立虛擬檔案系統 (VFS)，支援在不同檔案間切換且不遺失程式碼
- [x] 實作側邊欄標籤頁 (Tabs) 佈局，實現專業 IDE 導覽體驗
- [x] 整合 AI 上下文注入，讓 Gemini 能根據專案檔案列表提供精確建議
- [x] 加入「分享」按鈕，實作一鍵複製專案連結功能

### 遇到的技術困難
- **多檔案狀態同步**：在切換檔案時，必須確保當前編輯器的內容先同步回狀態 (VFS)，否則會遺失修改。透過在 `switchFile` 函數中先呼叫 `editorRef.current.getValue()` 成功解決。
- **動態路由冷啟動**：Next.js 首頁與動態路由的切換需考量載入狀態。新增了一個高質感的 Landing Page 作為引導頁。

### 使用的技術關鍵字
- `Dynamic Routing`, `Virtual File System`, `Context Injection`, `React State Synchronization`, `Clipboard API`

### 下週預計目標
- 實作「新建檔案」與「刪除檔案」功能
- 整合 Firebase 或 Supabase 實作真正的資料持久化（目前為 Mock）
- 強化 AI 的多檔案協作能力（例如：同時修改多個檔案）

## 第四週：Supabase 資料庫整合與部署準備 (2026-03-02)

### 本週完成的功能
- [x] 成功整合 Supabase，將專案資料由 Mock Data 轉移至真實雲端資料庫
- [x] 實作 `projects` 資料表，支援 UUID 作為唯一的專案識別碼
- [x] 強化「分享」按鈕，具備自動 UPSERT 邏輯，並能即時生成可分享連結
- [x] 實作載入中 (Loading) 與錯誤處理 (Error Handling) 的 UI 回饋
- [x] 完成 Vercel 部署前的 `npm run build` TypeScript 類型檢查

### 遇到的技術困難
- **從 Mock 到 DB 的轉換**：原本使用 `String` 作為 ID，遷移至 Supabase UUID 後，前端需處理 ID 格式不匹配與查詢失敗的邊界情況。
- **異步狀態管理**：在「儲存並跳轉」的過程中，需精確控制 `isSaving` 與 `router.push` 的順序，確保使用者在看到「已複製連結」時，網址已經變更。
- **環境變數配置**：Next.js 需使用 `NEXT_PUBLIC_` 前綴才能在 Client Side 讀取 Supabase 金鑰。
- **UUID 格式預檢**：修復了因直接使用 slug（如 `demo-123`）查詢 UUID 欄位導致的資料庫報錯。

### 使用的技術關鍵字
- `Supabase SDK`, `PostgreSQL`, `JSONB Persistence`, `UPSERT`, `UUID Validation`

### 2026-03-02 晚間更新
- [x] 成功驗證資料同步流程：Mock -> Edit -> SHARE & SYNC -> UUID Redirect。
- [x] 成功建立專案 ID：`ead7045c-67dc-4cf4-b910-5e264bce585a`。

## 第五週：全自動儲存與即時預覽 (2026-03-02)

### 本週完成的功能
- [x] **全自動儲存 (Auto-save)**：使用 Debounce 技術，讓編輯器的變更在停止輸入 2 秒後自動同步至 Supabase，並在 UI 上顯示「Synced」狀態。
- [x] **即時預覽 (Live Preview)**：實作 Iframe 核心，整合 VFS 中的 HTML/CSS/JS 代碼，實現免重新整理的即時畫面預覽。
- [x] **專案歷史記錄 (Local History)**：利用 `localStorage` 在客戶端儲存最近造訪的 10 個 UUID，讓使用者能快速找回自己的專案。
- [x] 冷啟動優化：首頁自動導向專屬 UUID，確保每個工作階段都有獨立的雲端空間。

### 遇到的技術困難
- **Debounce 與狀態管理**：在頻繁輸入時，若不加 Debounce 會導致對 Supabase 的 API 請求噴發，導致速率限制。透過 `setTimeout` 與 `clearTimeout` 完美控制儲存頻率。
- **Iframe 安全與動態渲染**：使用 `srcDoc` 屬性動態注入代碼，並設定 `sandbox="allow-scripts"` 兼顧功能與安全性。
- **VFS 的即時一致性**：為了讓預覽能讀取到最新的 Monaco 編輯器內容，必須在內容變更時即時將暫存區同步回 React State。

### 使用的技術關鍵字
- `Debounce Persistence`, `Iframe Runtime`, `LocalStorage History`, `Data Persistence UX`, `Auto-redirection`

### 下週預計目標
- 整合「AI 協作導引」：當 AI 產出代碼時，預覽視窗能即時顯示變化。
- 實作「多人協作提示」：雖然沒有登入，但可以感知是否有其他 Tab 同時開啟。
- 加入「代碼導出」功能：支援下載 Zip 檔案。

## 第六週：智慧 AI 與多語言支援 (2026-03-02)

### 本週完成的功能
- [x] **多語言選擇器 (Language Selector)**：支援 TypeScript, Python, C++, HTML 等主流語言，一鍵切換語法高亮。
- [x] **AI 全域感知 (Multi-file Context)**：Gemini 現在能讀取專案中所有檔案的內容，理解跨檔案的邏輯關係。
- [x] **智慧修改 (Smart Surgery)**：AI 產出的建議現在會附帶 `targetFile`。使用者只需點擊「Apply」，系統就會自動定位並跳轉到目標檔案套用變更。
- [x] **檔案自動辨識**：建立檔案時會根據副檔名自動設定對應的語言模式。
- [x] **對話快捷鍵**：新增「Explain」、「Format」、「Fix Bugs」一鍵發送指令功能。
- [x] 增加一個「Copy Clone Command」按鈕，雖然現在還不能真的 git clone，但先模擬出專業感。

### 遇到的技術困難
- **AI 語言約束 (Language Constraints)**：為了避免 AI 在 `.py` 檔案中寫入 JavaScript 語法，我們在 System Prompt 強制要求 AI 必須參考 VFS 的語言元數據。這大幅提升了生成代碼的準確度。
- **跨檔案跳轉邏輯**：當 AI 修改非當前開啟的檔案時，前端需要先執行 `switchFile` 確保 Monaco 實例與資料同步，然後再執行 `apply`。

### 使用的技術關鍵字
- `Multi-file AI Awareness`, `Smart Surgery`, `Language Metadata`, `Code Shortcuts`, `Context Injection`

### 下週預計目標
- 實作「多人協作同步」：利用 Supabase Realtime 讓兩個人看到同一個 IDE 的變更。
- 加入「專案下載」功能：導出整個 VFS 為 Zip 檔。
- 優化 AI 產出時的視覺動效：更具科技感的打字機與 Apply 效果。

## 第七週：實時協作與專案匯出 (2026-03-02)

### 本週完成的功能
- [x] **實時同步 (Realtime Sync)**：透過 Supabase Realtime 訂閱，實現跨分頁、跨裝置的代碼同步。
- [x] **多人線上指示 (Presence)**：實作線上人數追蹤，增強協作感。
- [x] **專案匯出 (ZIP Export)**：整合 `JSZip` 與 `FileSaver`，支援將 VFS 打包下載。
- [x] **AI 打字機效果 (Typewriter AI)**：讓 AI 的解釋更具節奏感，並強化 Apply 按鈕的視覺引導。
- [x] **GitHub 風格化 UI**：精簡化的側邊欄、模擬 Clone 指令框、更細緻的磨砂玻璃效果。

### 遇到的技術困難
- **Websocket 競爭狀態 (Race Condition)**：在實時同步時，如果兩端同時修改，可能會發生覆蓋。目前的解決方案是透過 `updated_at` 時間戳進行簡單判斷，未來可引入更複雜的 CRDT 或 Operational Transformation。
- **ZIP 打包效能**：在 VFS 檔案過多時，打包過程可能會卡頓。透過 `generateAsync` 異步處理確保 UI 不會凍結。

### 使用的技術關鍵字
- `Supabase Realtime`, `Presence API`, `JSZip`, `Typewriter Animation`, `Collaboration UX`, `Project Portability`

### 專案總結 (Next Steps)
- 整合「終端機模擬 (Xterm.js)」：讓使用者能執行模擬指令。
- 完善「版本控管插件」：整合簡易的 Git 原型。
- 考慮「自定義佈景主題」：提供更多專業配色。

## 第八週：視覺識別度與 AI 在地化 (2026-03-02)

### 本週完成的功能
- [x] **視覺系統大改版 (Color System)**：
    - 為 `activeFile` 增加 `bg-blue-900/10` 與左側深藍邊框，顯著提升識別度。
    - 區分活動欄 (Activity Bar)、側邊欄 (Sidebar) 與編輯器 (Editor) 的背景深淺，建立更強的層次感。
- [x] **智能語言模板 (Smart Boilerplates)**：新增 C++ 與 Python 的自動初始化模板，當新建或切換到空檔案時自動填入。
- [x] **AI 繁體中文在地化 (L10N)**：
    - 更新 `route.ts` 讓 AI 固定使用「繁體中文」溝通。
    - 要求 AI 在技術名詞（如：非同步 (Asynchronous)）後方附註英文，確保專業與溝通精度。
- [x] **編輯器體驗優化**：開啟 Monacominimap 並調整行號顯示區域，讓排版更專業。

### 遇到的技術困難
- **模板觸發時機**：需要精準判斷檔案內容是否為空且語言正確，避免覆盖使用者已寫好的內容。透過 `useCallback` 封裝 `applyBoilerplateIfEmpty` 成功解決。
- **背景對比度調整**：在極暗模式下，細微的背景差異（如 `#050505` 與 `#080808`）能有效降低視覺疲勞，這需要對 Tailwind 顏色與原生 CSS 有精確的掌握。

### 使用的技術關鍵字
- `Visual Hierarchy`, `Monaco Editor Settings`, `Smart Boilerplate`, `AI L10N`, `Traditional Chinese Prompt Engineering`

## 第九週：格式化、主題化與架構轉型 (2026-03-03)

### 本週完成的功能
- [x] **代碼美化 (Prettier Integration)**：整合 Prettier 支援 JS/TS/HTML/CSS 自動排版，其他語言透過 AI 提供格式化建議。
- [x] **多主題切換系統**：支援 `vs-dark`, `light`, `hc-black` 三種主題，並與 Monaco Editor 深度連動。
- [x] **編輯器深度功能**：開啟代碼摺疊 (Folding)、行高亮 (Line Highlight) 與實作 `Ctrl + S` 攔截存檔。
- [x] **單檔案架構轉型 (Single-file Transition)**：
    - 精簡資料模型：移除 `files` 陣列，改用個別的 `content`, `language`, `name` 欄位。
    - UI 極簡化：移除 Explorer 側邊欄與頁籤，極大化編輯空間。
    - 狀態列實作：底部新增即時字數統計，並附帶繁體中文機制註解。
- [x] **專案導覽優化**：活動列加入 `+` 按鈕，支援在新分頁開啟全新 UUID 專案。
- [x] **智慧基礎程式同步**：在手動編輯前切換語言會自動更新模板，編輯後自動鎖定以保護內容。
- [x] **檔名管理與下載**：支援頂部工具列直接修改檔名，副檔名變動會自動同步語言模式，並提供一鍵下載功能。
- [x] **UX 強化**：加入 AI 思考中 (Thinking) 指標，提升互動反饋感。

### 遇到的技術困難
- **即時同步循環 (Sync Loop)**：在單檔案架構下，頻繁的內容更新可能導致訂閱邏輯不斷重啟。透過 `useRef` 紀錄最後內容與減少 `useEffect` 依賴項成功修復了同步失效問題。
- **TypeScript 下載限制**：應使用者要求，TypeScript 檔案下載時需強制轉為 `.txt` 格式，透過在 `handleDownload` 中進行字串取代完成。
- **編輯衝突保護**：需準確區分「系統生成的模板」與「使用者手動輸入」。透過在 `syncCurrentFile` 中比對所有 Boilerplates 成功實作了編輯狀態的智慧鎖定。

### 使用的技術關鍵字
- `Prettier Standalone`, `Theme Switching`, `Single-file Architecture`, `Postgres Changes Subscription`, `State Persistence`, `UX Feedback`, `File Blob Download`

### 專案進度結算 (End of Phase)
- 目前系統已由「多檔案管理」成功轉型為「高效單檔案專案模組」，適合快速原型開發與 AI 協作。
- 在地化與專業感功能（如字數統計、思考指標、自動副檔名偵測）已全面到位。
 
## 第十週：虛擬終端機與後端執行環境 (2026-03-03)
 
### 本週完成的功能
- [x] **可收合虛擬終端機 (Collapsible Terminal)**：實作 30% 高度的黑色終端機區塊，支援自動捲動與手動清除。
- [x] **Wandbox API 整合**：透過 Wandbox 引擎實作多語言 (Python, C++, JS/TS) 的雲端執行功能，替代受限的 Piston。
- [x] **執行 UI 強化**：新增高亮度的「Run」按鈕，具備動畫反饋與 stdout/stderr/compiler 區分顯示。
- [x] **語法檢查優化 (Linter Suppression)**：關閉 Monaco 前端驗證，減少資源消耗並避免與後端報錯衝突。
- [x] **語言偵測聯動**：將編輯器改為受控組件，確保當前語言高亮隨時與頂部選擇器同步。
 
### 遇到的技術困難
- **API 白名單限制**：Piston API 突然改為白名單制導致執行失敗。快速調查後切換至 Wandbox，並重新封裝請求 JSON 格式，成功恢復功能。
- **Monaco 靜默驗證**：Monaco 的 TS/JS 預設會有強大的 Linter，但在多語言 IDE 中這會產生視覺干擾（如在 Python 檔案中看到 JS 報錯）。透過 `beforeMount` 設定 `diagnosticsOptions` 成功達成「暴力美學」。
- **終端機輸出分色**：為了區分「程式跑出來的內容」與「編譯器產生的警告」，新增了 `compiler` 類別並套用灰色斜體樣式，提升專業感。
 
### 使用的技術關鍵字
- `Wandbox API`, `Terminal UI`, `Linter Suppression`, `Dynamic Language Sync`, `Compiler Stdout Styling`, `Runtime Error Feedback`
 
## 第十一週：代碼分享系統與服務化 (SaaS) 轉型 (2026-03-03)
 
### 本週完成的功能
- [x] **唯讀分享模式 (Read-only Mode)**：實作 `?view=true` 偵測，讓專案能以唯讀狀態安全分享，並隱藏 AI 助手。
- [x] **一鍵 Fork 功能**：實作專案複製邏輯，讓使用者能從他人代碼中快速建立自己的副本。
- [x] **UI 極致拋光**：
    - 終端機新增「垃圾桶」圖示與 `Fira Code` 專業字體。
    - 編輯器預設關閉 Minimap 並開啟 Word Wrap。
    - 新增分享成功時的「COPIED!」Bubble 提示。
 
### 遇到的技術困難
- **資料庫複製 (Database Clone)**：以往我們習慣「修改」同一筆資料，但在 SaaS 模式下，「Fork」必須生成一個全新的 UUID 並完整複製 Content。這需要確保 RLS 政策允許 Public Insert 且前端能順利導向新網址。
- **UI 權限控制**：在唯讀模式下，必須同時禁用 Monaco 的 `readOnly` 設定與檔名修改、語言選擇等互動元件。透過 React 的單一狀態源 (Single Source of Truth) `isReadOnly` 統一管控所有元件。
 
### 從「自用」到「服務化 (SaaS)」的心得
- **身份轉換**：自用工具只需考慮功能實現，而「服務化」則需考慮「他人如何使用」。Read-only 模式就是一種保護原作者勞動成果的機制，而 Fork 則是促進代碼流通的橋樑。
- **細節成就專業**：諸如自動換行 (Word Wrap) 與終端機字體調整，雖然功能不變，但能顯著提升使用者的第一印象，這是將「實驗室作品」打磨成「產品」的必經之路。
 
### 使用的技術關鍵字
- `Read-only View`, `Project Forking (Cloning)`, `Clipboard API`, `Query Parameters`, `SaaS UX Refinement`
 
## 第十一週補充：互動輸入 (Stdin) 與 編譯深度強化 (2026-03-03)
 
### 本週完成的功能
- [x] **互動式輸入區 (Stdin Input Area)**：在終端機旁實作 `INPUT (STDIN)` 區塊，支援預填程式輸入資料。
- [x] **Wandbox Stdin 整合**：成功將 `stdin` 參數傳遞至 API，讓程式能處理 `cin` 或 `input()` 等讀取邏輯。
- [x] **報錯優先顯示邏輯**：最佳化 Terminal 渲染順序，優先顯現 `compiler_output` 並套用橘色背景高亮，解決報錯不明顯的問題。
- [x] **防呆機制 (Input Guard)**：實作關鍵字偵測 (`cin`, `scanf` 等)，若使用者忘記填寫輸入資料即點擊執行，系統會發出輕量警告。
 
### 遇到的技術困難
- **非同步 Input 限制**：許多初學者會問「為什麼不能像本地一樣即時 cin」。透過註解解釋了 **HTTP 無狀態通訊** 的限制：雲端執行是「批次」處理而非「連線串流」。這需要使用者在 UI 邏輯上進行「預填」的思維轉變。
- **編譯訊息區隔**：Wandbox 的 `program_error` 與 `compiler_output` 有時會重複或互相遮蔽。目前的策略是優先印出強化的 `compiler_output` 樣式，確保語法錯誤能第一時間被看見。
- **Batch Mode vs Interactive Mode**：深入探討了 Web IDE 為什麼選擇「批次模式」。除了 HTTP 限制外，更重要的是**安全性與擴展性**：批次模式能讓容器在秒級內啟動並銷毀，極大化系統安全性。
 
- `Stdin Payload`, `Batch Execution Model`, `Stateless HTTP`, `Priority Rendering`, `Error Visualization`, `Keyword-based UX Guard`
 
## 第十一週補丁：Stdin 嚴格校驗與亂碼阻斷 (2026-03-03)
 
### 本週完成的功能
- [x] **執行攔截機制 (Execution Guard)**：升級防呆邏輯。現在若代碼包含 `cin`、`scanf`、`input()` 但 STDIN 區為空，系統會直接中斷執行並顯示報錯，不再傳送「空輸入」導致產生亂碼。
- [x] **數量精準校驗 (Quantity Validation)**：新增啟發式演算，預估代碼所需的變數讀取項數（如統計 `>>` 或 `input()` 次數）。若提供的輸入資料項數不足，會主動中斷執行並提示使用者補足。
- [x] **UI 視覺引導強化**：中斷執行時會自動開啟 Terminal 並顯現鮮紅色的錯誤提示，並附上解決建議。
 
### 遇到的技術困難/學習心得
- **Uninitialized Variables 與 Stack Garbage**：在 C++ 中，未賦初值的局部變數會指向記憶體中的「垃圾值」。當 `cin` 讀取失敗（如輸入不足）時，程式會繼續印出隨機數字。
- **啟發式數量估算 (Heuristic Estimation)**：靜態分析難以精確處理迴圈中的 `cin`，但我們採用「讀取運算子計數」作為基準：只要使用者輸入項數少於代碼中的明顯讀取次數，即判定為輸入不足，有效防止亂碼。
- **UX 的主動性**：與其讓程式跑完後印出讓人困惑的結果，不如在發送前就進行語義掃描並主動擋下。這展現了 IDE 輔助學習的主動性與專業感。
- **Wandbox API 欄位陷阱**：原本以為環境只會回傳 `compiler_output`，但實際發現當發生編譯錯誤時，資訊可能存放在 `compiler_message`。透過實作多欄位 fallback (如 `data.compiler_message || data.compiler_output`)，確保所有錯誤訊息都能正確呈現給使用者。
 
### 使用的技術關鍵字
- `Execution Interception`, `Stack Garbage`, `Code Analysis Guard`, `Enhanced Error Feedback`, `API Fallback Logic`
 
## 第十二週：AI 智慧修復與 GitHub Gist 整合 (2026-03-03)
 
### 本週完成的功能
- [x] **GitHub Gist 無狀態導出 (Stateless Gist Export)**：透過 Supabase OAuth 實作「導出即走」流程，不留存使用者個資，僅完成代碼分享。
- [x] **AI 自動排錯模式 (AI Smart Debug)**：與 Wandbox API 聯動，當偵測到編譯或執行錯誤時，AI 會自動介入診斷並提供一鍵修復按鈕。
- [x] **終端機 UI 最終拋光**：實作 50/50 的 Stdin 與 Terminal 並排佈局，提升開發與實驗的視覺平衡感。
 
### 遇到的技術困難/學習心得
- **AI 降低排錯摩擦力**：傳統 IDE 的報錯（如 C++ 的模板錯誤）對初學者非常不友善。透過 AI 自動翻譯報錯訊息並提供實作建議，能極大程度降低開發者的「心理負擔 (Cognitive Load)」，讓學習保持在 Flow (心流) 狀態。
- **無狀態授權 (Stateless OAuth)**：在不建立使用者系統的情況下使用第三方服務是一項挑戰。透過 URL 參數偵測與一次性 Token 使用，我們成功在「隱私」與「功能」之間取得了平衡。
 
### 使用的技術關鍵字
- `GitHub API v3`, `OAuth Flow`, `Auto-Diagnostic`, `Cognitive Load Reduction`, `Laboratory UI Design`
 
## 第十三週：效能優化與極致 UX 拋光 (2026-03-04)
 
### 本週完成的功能
- [x] **可拖拽分欄 (Draggable Resizer)**：實作滑鼠事件驅動的即時佈局調整，並與 Monaco Editor 的 `layout()` 生命週期同步。
- [x] **本地自動快取 (LocalStorage Backup)**：實作 5 秒頻率的靜態快取，並在頁面重整時優先於雲端加載，確保資料「零丟失」。
- [x] **效能優化 (Editor Throttling)**：將同步頻率優化至 800ms Debounce，並關閉 Monaco 耗能裝飾物，優化大檔案滾動流暢度。
- [x] **Zen Mode (禪模式)**：一鍵隱藏雜訊，專注於純粹的代碼編輯體驗。
 
### 遇到的技術困難/學習心得
- **UX 響應速度 = 生命線**：在實作 Resizer 時，如果沒有即時呼叫 `layout()`，編輯器的畫布會破裂，這會瞬間破壞使用者的沉浸感。這讓我體會到「效能不僅是後端的事，前端的流暢感直接決定了產品的專業度」。
- **資料安全的多重防線**：雲端同步雖好，但在斷網或短暫衝突時，本地快取是最後的避風港。實作「優先加載草稿」邏輯，能顯著提升使用者在不穩定環境下的安全感。
 
### 使用的技術關鍵字
- `Draggable UI`, `Debounced Sync`, `LocalStorage Backup`, `Monaco Layout Sync`, `Zen Mode Architecture`
 
## 第十四週：版本時光機與代碼快照系統 (2026-03-04)
 
### 本週完成的功能
- [x] **自動快照機制 (Auto-Snapshot)**：實作 60 秒不活動自動偵測，並結合 AI 產生改動摘要。
- [x] **版本對比系統 (Diff View)**：整合 Monaco DiffEditor，提供直觀的代碼差異對比。
- [x] **一鍵還原 (Restore)**：讓使用者能隨時跳轉回過去的任何一個時間點。
 
### 遇到的技術困難/學習心得
- **不可逆操作的心理安全感**：提供版本控制不僅是「備份」，更重的是給予使用者「實驗的勇氣」。當知道隨時可以 Reset 時，開發者更願意嘗試大膽的重構。
- **AI 輔助維度**：讓 AI 產生快照摘要，解決了手動命名版本的麻煩，使得歷史紀錄從一堆時間戳記變成了具備語義的開發軌跡。
 
### 使用的技術關鍵字
- `Monaco DiffEditor`, `Auto-Snapshotting`, `AI Change Summary`, `Version Control UX`, `Supabase History Table`

## Week 15: Security, Rate Limiting & QA 🛡️

### Date: 2026-03-04

### Description
實作了防禦性 Web 應用程式 (Defensive Web App) 的多項關鍵機制，包含前端與後端的 API 流量限制、XSS 跨站腳本防護、全域錯誤攔截，以及靜態資源的快取策略優化。

### Key Learnings
- **【自主學習】：為什麼在公有雲環境中，Rate Limiting（流量限制）比功能開發更重要？**
  1. **防止資源枯竭 (Resource Exhaustion)**：雲端資源雖然號稱無限延伸，但瞬間巨大的請求量仍會拖垮應用層（如耗盡 DB 連線池或 Lambda 併發數量）。Rate Limiting 是抵禦惡意 DDoS 攻擊或自動化腳本失控的第一道防線。
  2. **成本防護盾 (Cost Shield)**：現代 Serverless 與雲服務多採用「Pay-as-you-go (按使用量計費)」。沒有流量管制的 API 就像是不斷流水的水龍頭，一旦被濫用，隨之而來的就是駭人的天價帳單 (Bill Shock)。
  3. **服務層級保證 (Fair Usage SLAs)**：只有確實節流少數異常高頻的請求，才能保護大多數正常使用者的存取品質，避免出現「吵鬧的鄰居 (Noisy Neighbor)」現象。
- **XSS 防護 (Input Sanitization)**：AI 產生的內容或共享專案中的動態字串若直接渲染為 HTML，極易成為跨站腳本攻擊的溫床。利用 `dompurify` 這類工具洗刷字串，可以在第一時間移除惡意的 `<script>` 與事件屬性。
- **全域錯誤邊界 (React Error Boundary)**：元件崩潰 (Crash) 不應導致整個網頁變成白板 (White Screen of Death)。捕捉這些底層錯誤並顯示優雅的 Fallback UI，加上重試機制，是專業前端應用的基本素養。
- **Web Worker 快取策略**：對於 Monaco Editor 這類依賴大量 Web Worker 的重型函式庫，確保其正確命中瀏覽器快取 (或 Service Worker) 能驚人地提升二次開啟的速度並省下巨大的傳輸流量。
 
### 使用的技術關鍵字
- `Rate Limiting (Cooldown)`, `Defensive Programming`, `XSS Protection (DOMPurify)`, `React Error Boundary`, `Next.js API Routes`

---

## Week 16: Dynamic SEO & Social Sharing 🌐

### Date: 2026-03-04

### Description
實作了專案專屬的動態 Meta Tags 與 Open Graph (OG) 卡片，讓使用者分享代碼連結至社群媒體（如 Twitter、Discord）時，能直接預覽專案語言與代碼摘要。同時優化了「Home 回首頁」的產品使用動線與動態 Favicon 功能。

### Key Learnings
- **【自主學習】：為什麼在 CSR (客戶端渲染) 中，社群媒體的爬蟲 (Crawler) 無法抓取動態 Meta 資訊？**
  1. **JavaScript 執行能力差異**：像是 Facebook 或 Twitter 的爬蟲（Crawler）在抓取連結預覽時，多半只會請求並解析第一次回傳的 **原始 HTML** 字串。它們通常「不會」執行網頁上的 JavaScript。
  2. **useEffect 的盲區**：如果在 `page.tsx` 中使用 `useEffect` 去動態修改 `document.title` 或加 OG Tags，這是在「客戶端載入且 JS 執行後」才發生的事。社群爬蟲根本等不到這一刻，只會看到預設的或是空的 Meta 資訊。
  3. **完美的解法 (Next.js SSR)**：在 Next.js 的 App Router 中，我們透過在路徑層級新增 `layout.tsx` 並匯出 `generateMetadata` 函式。這是一個**伺服器元件 (Server Component)**，會在後端提早拿著 UUID 去查 Supabase，算好動態的 `<meta>` 標籤後，跟著初始 HTML 一起回傳給爬蟲，完美達成極致的 SEO 與社交分享體驗！
- **產品動線優化 UX**：左上角的 Logo 直接賦予建立新沙盒的功能 (`router.push('/')`)，搭配彈窗防呆，這類微小的改動大幅提升了工具的黏著度與流暢度。
- **動態 Favicon 增強沉浸感**：透過簡單的 DOM 操作動態切換 `link[rel="icon"]`，能帶給開發者更加客製化的感受，彷彿整個 IDE 都在為了特定的語言服務。
 
### 使用的技術關鍵字
- `Next.js Metadata API`, `Server-Side Rendering (SSR)`, `Open Graph (OG) Tags`, `Twitter Cards`, `Dynamic Favicon`

---

## Week 17: System Stress Testing, Edge Cases & UX Polish 🔧

### Date: 2026-03-04

### Description
完成了 IDE 上線前的最後一哩路：強化系統在面對無網路連線 (Offline Mode) 以及防禦極端輸入（如暴量的 STDIN 或空白執行）的邊界案例保護。同時，透過加入全域快捷鍵與 Skeleton 載入畫面，將開發體驗推升至專業水準。

### Key Learnings
- **【自主學習】：為什麼在軟體工程中，處理邊界案例 (Edge Cases) 的時間往往比開發核心功能還要長？**
  1. **組合爆炸 (Combinatorial Explosion)**：核心功能通常只有一條「黃金路徑 (Happy Path)」，但當變數互相交錯時（例如：若在斷網狀態下、剛好碰上 Auto-save、使用者又點擊了 Run），狀態的管理就成指數增長。
  2. **非同步與網路的不可靠性**：理想世界中 API 會在 50 毫秒內成功回傳，但現實世界中可能會有 10 秒的延遲、甚至是 502 Bad Gateway。這需要防呆（如 Rate Limiting 與 伺服器崩潰處理）來接住每一個不可預期的球。
  3. **資源與容量限制**：開發中我們測試 STDIN 都是 `10 20`，但駭客可能貼入了一整本《哈利波特》的本文。沒有針對長度與記憶體設下 `max-length` 或強制截斷 (Truncation)，伺服器或瀏覽器分頁很容易直接崩潰 (OOM)。這使得我們必須防禦性地寫扣。
- **穩定性與品質保證 (QA) 對於使用者信任度的影響**：
  使用者第一次打開產品如果遇上白畫面或是儲存失敗，就會從此貼上「不可靠」的標籤。即使背後有極為強大的 AI 除錯能力，也救不回「按一次儲存就當機」帶來的挫折感。透過 **離線備援機制 (Local Storage + Online Event)** 以及 **流暢的骨架屏 (Skeleton)** 消除這些摩擦，是贏得信任的基石。全域快捷鍵 (`Ctrl+S`, `Ctrl+Enter`) 雖小，卻是真正把「玩具」變成了「專業工具」的關鍵。
 
### 使用的技術關鍵字
- `Network API (navigator.onLine)`, `Edge Case Handling`, `Skeleton UI`, `Global Keyboard Shortcuts`, `DOM Fallback States`

---

## Week 18: Project Deployment & Final Retrospective 🚀

### Date: 2026-03-04

### Description
完成了 Vercel 部署前的嚴格 TypeScript 類型檢查與 Production Build，確保在雲端運行時具備最高效能與穩定度。同時撰寫了專案的 README.md，為這個長達 18 週的專案畫下完美的句點。

### Retrospective & Future Outlook
從第一週充滿好奇地建置 Next.js 環境，到中途決定將架構從「龐大的多檔案樹狀結構」收斂為「專精於單一檔案的強大沙盒 (Single-file Sandbox)」，這個轉捩點大幅降低了系統的複雜度，讓我們能專注打磨核心的 AI 偵錯與 Wandbox 執行引擎。後續引入 Supabase 解決同步痛點，最後加上完整的邊界案例保護，一步步把這套系統從「會動的原型」升級為「商業級的雲端 IDE」。

如果未來有第 19 週，我會希望能加入 **多人協作共編 (Multiplayer Collaboration)** 以及 **自定義外觀主題 (Custom Themes)** 功能，讓它成為面試遠端上機考或是教學展示的最佳利器。

### Key Learnings
- **【自主學習】：CI/CD (持續整合與持續部署) 如何簡化了現代軟體開發的發布流程？**
  1. **自動化防呆 (Automated Guardrails)**：在以前，部署意味著工程師手動 FTP 上傳檔案，非常容易丟失或覆蓋錯誤的代碼。現在，我們在本地下達 `git push` 後，CI 伺服器會自動執行 `npm run build`、跑所有的測試與 Lint 校驗。如果有任何一個 TypeScript 的 `any` 或是未處理的 promise，都會被 CI 攔截，確保「只有 100% 正確的代碼」能進入正式機。
  2. **快速迭代與回滾 (Fast Rollbacks)**：以 Vercel 這樣的平台為例，一次部署只要短短幾十秒，且每次推送都會生成一個不變的 Snapshot (Preview URL)。如果發現上線後有 Bug，只要在介面上點擊「Rollback」，就能在一秒內退回上一個健康的穩定版本，徹底消除了「上線恐懼症 (Deploy Anxiety)」。
  3. **團隊信心 (Team Confidence)**：開發者可以專注於寫好代碼，剩下的打包、壓縮、環境變數注入都交由管線自動處理。這種「基礎設施即程式碼 (IaC)」的觀念，是大規模軟體可以每天部署幾百次的關鍵。

### 使用的技術關鍵字
- `Production Build`, `TypeScript Strict Mode`, `CI/CD Pipeline`, `Vercel Deployment`, `Project Retrospective`

### 2026-03-25 更新：從開發環境轉移至生產環境 (Dev to Production) 的技術挑戰

在準備 Vercel 部署前，我們進行了最後的**全域 TypeScript 檢查**與**環境變數安全審查**，這揭示了從「本機開發」邁向「雲端生產環境」的幾個重要挑戰：

1. **靜態型別的嚴格約束 (Strict Type Checking)**：
   開發時為了求快，有時會忽略底層型別或依賴推斷。但在 CI/CD 環境下（如 `npm run build`），任何型別錯誤或模組衝突都會導致編譯失敗。我們執行了 `tsc --noEmit` 確保 100% 通過型別校驗，這保證了上線後的執行期穩定性。

2. **憑證與機密分離 (Secrets Management)**：
   在開發期，直接將 API Key (如 Gemini, Supabase, Wandbox) 寫在程式碼中似乎很方便，但這是極度危險的（Hard-coded Secrets）。我們全面覆查了所有 `.ts` 與 API routes 檔案，確保所有密鑰皆透過 `process.env.NEXT_PUBLIC_*` 或伺服器端的 `process.env.*` 安全注入。這確保開源或代碼外流時，不會連帶洩漏核心金鑰。

3. **CORS 與安全性標頭設定 (Security Headers & CORS)**：
   我們特地建立了 `vercel.json`，強化對 `/api/*` 路徑的跨站請求配置。透過正確配置 `Access-Control-Allow-*` 與 `X-XSS-Protection` 等 Security Headers，我們不僅解決了在跨域 iframe 或外部呼叫時的 CORS 阻擋問題，更補強了上線後的站台防護力。

這次的檢查再次印證：**「會動」只是基礎，「穩定、安全、可擴展」才是生產級應用的標準。**
