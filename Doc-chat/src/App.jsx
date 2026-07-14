import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload.jsx";
import ChatWindow from "./components/ChatWindow.jsx";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="h-screen w-screen flex flex-col bg-light-base dark:bg-dark-base text-neutral-800 dark:text-neutral-100 font-body transition-colors duration-200 overflow-hidden">
      {/* Header Banner */}
      <header className="flex-shrink-0 border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md px-4 sm:px-6 py-3.5 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all shadow-sm"
              title="Toggle Documents"
              aria-label="Toggle Documents"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 shadow-sm flex-shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display font-semibold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-white leading-none">
                Doc<span className="text-neutral-600 dark:text-neutral-300">Chat</span>
              </h1>
              <p className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1 hidden xs:block">
                retrieval-augmented document intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center font-mono text-[10px] font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 rounded">
              groq / gpt-oss-120b
            </span>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                // Sun Icon
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                // Moon Icon
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex-1 overflow-hidden">
        <div className="w-full h-full border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface rounded-2xl overflow-hidden shadow-md grid grid-cols-1 md:grid-cols-[280px_1fr] divide-y md:divide-y-0 md:divide-x divide-light-border dark:divide-dark-border relative">
          
          {/* Mobile Overlay backdrop */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-neutral-900/60 dark:bg-black/70 backdrop-blur-xs z-30 transition-opacity duration-200"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar Area */}
          <aside
            className={`
              p-4 flex flex-col justify-between overflow-y-auto bg-neutral-50/40 dark:bg-dark-base/10
              fixed inset-y-0 left-0 z-40 w-[290px] h-full transform transition-transform duration-300 ease-in-out border-r border-light-border dark:border-dark-border
              md:relative md:inset-auto md:translate-x-0 md:w-auto md:h-auto md:z-auto md:border-r-0
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
          >
            {/* Mobile close sidebar button */}
            <div className="flex items-center justify-between md:hidden mb-4 pb-2 border-b border-light-border dark:border-dark-border">
              <span className="font-display font-semibold text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Workspace Repository
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                aria-label="Close repository"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <FileUpload />
          </aside>

          {/* Chat Pane */}
          <div className="flex flex-col overflow-hidden bg-light-surface dark:bg-dark-surface h-full">
            <ChatWindow />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;