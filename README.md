# Antigravity AI Cloud IDE 🚀

![Banner](https://img.shields.io/badge/Next.js-14-black) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC) ![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E) ![Monaco](https://img.shields.io/badge/Monaco-Editor-007ACC) ![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4)

A feature-rich, single-file AI Cloud IDE built for modern developers. Write, execute, and debug code in a seamless, real-time environment powered by Google's Gemini AI and the Wandbox execution engine.

---

## ✨ Features

- **🌐 Live Cloud Sync & Offline Resilience:** Real-time multi-tab synchronization powered by Supabase. If your internet drops, the local engine queues your edits securely until you're back online.
- **💻 Multi-Language Execution:** Execute Python, TypeScript, C++, and more instantly in the cloud without local setups.
- **🤖 Built-in AI Debugger:** Stuck on an error? The integrated AI assistant automatically reads the compiler error, diagnoses the issue, and provides a one-click code patch directly into the editor.
- **🕰️ Time Machine (History):** Never lose your logic again. Access up to 10 automated snapshots to revert your project to an earlier state using a built-in diff viewer.
- **🔗 Frictionless Sharing:** Unique UUID-based URLs allow instant sharing and collaboration. Export your brilliant algorithms directly to GitHub Gists without even logging in.
- **🎨 Custom Scrollbars & Dynamic Favicons:** A beautifully crafted Dark Mode aesthetic with dynamic browser tab icons that adapt to your selected programming language.

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TailwindCSS, Monaco Editor
- **Backend/API:** Next.js API Routes
- **Database/Realtime:** Supabase
- **Execution Engine:** Wandbox API
- **AI Integration:** Google Gemini Pro

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/ai-cloud-ide.git
   cd ai-cloud-ide
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add the following keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000` and start coding!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📜 License

This project is open-source and available under the MIT License.
