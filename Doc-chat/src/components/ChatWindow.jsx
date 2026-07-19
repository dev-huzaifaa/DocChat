import { useState, useRef, useEffect } from "react";
import Message from "./Message.jsx";

function ChatWindow() {
  const [sessions, setSessions] = useState([
    { id: 1, title: "New Chat", messages: [] },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession.messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function updateActiveSessionMessages(updater) {
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: updater(session.messages) }
          : session
      )
    );
  }

  function startNewChat() {
    const newId = Date.now();
    setSessions((prev) => [...prev, { id: newId, title: "New Chat", messages: [] }]);
    setActiveSessionId(newId);
    setInput("");
    setShowHistory(false);
  }

  function switchToSession(id) {
    setActiveSessionId(id);
    setShowHistory(false);
  }

  function deleteSession(id, event) {
    event.stopPropagation();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const freshId = Date.now();
        setActiveSessionId(freshId);
        return [{ id: freshId, title: "New Chat", messages: [] }];
      }
      if (id === activeSessionId) {
        setActiveSessionId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  }

  async function sendMessage() {
    const question = input.trim();
    if (!question || loading) return;

    updateActiveSessionMessages((prev) => [...prev, { role: "user", text: question }]);

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId && session.title === "New Chat"
          ? { ...session, title: question.slice(0, 30) }
          : session
      )
    );

    setInput("");
    setLoading(true);
    updateActiveSessionMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const response = await fetch("http://127.0.0.1:8001/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);

          if (parsed.type === "meta") {
            updateActiveSessionMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                sources: parsed.sources,
                usedWebSearch: parsed.used_web_search,
              };
              return updated;
            });
          }

          if (parsed.type === "token") {
            updateActiveSessionMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                text: (last.text || "") + parsed.text,
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      updateActiveSessionMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: "Connection error — is the backend running?",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full relative bg-light-surface dark:bg-dark-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border px-5 py-3.5">
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white truncate max-w-[70%] text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 rounded px-1.5 py-0.5"
        >
          <span className="truncate font-semibold">{activeSession.title}</span>
          <svg className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={startNewChat}
          className="text-xs px-3 py-1.5 rounded-full border border-light-border dark:border-dark-border text-neutral-600 dark:text-neutral-300 hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          + New Chat
        </button>
      </div>

      {showHistory && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowHistory(false)} />
          <div className="absolute top-13 left-5 z-20 w-72 max-h-64 overflow-y-auto bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-md border border-light-border dark:border-dark-border rounded-2xl shadow-xl py-1.5 transition-all duration-200">
            {sessions.map((session) => (
              <div
                key={session.id}
                tabIndex="0"
                onClick={() => switchToSession(session.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    switchToSession(session.id);
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 text-xs cursor-pointer transition-colors border-l-2 focus:outline-none ${
                  session.id === activeSessionId
                    ? "bg-accent/10 text-accent font-semibold border-accent"
                    : "text-neutral-600 dark:text-neutral-300 hover:bg-light-base dark:hover:bg-dark-base border-transparent focus:bg-light-base dark:focus:bg-dark-base"
                }`}
              >
                <span className="truncate">{session.title}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="ml-2 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-red-500"
                  aria-label="Delete chat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="flex h-full min-h-[220px] flex-col items-start justify-center rounded-2xl border border-dashed border-light-border dark:border-dark-border bg-light-base/30 dark:bg-dark-base/10 p-6">
            <p className="font-display text-base font-semibold text-neutral-900 dark:text-white">
              Start with a document question or live search
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Upload a PDF, then ask for a summary, comparison, or a precise answer grounded in your repository.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Grounded answers</span>
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Citations</span>
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Live web search</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <Message key={index} {...msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent">
                  AI
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-none border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-accent [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-accent [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-light-border dark:border-dark-border p-3.5 bg-light-surface/90 dark:bg-dark-surface/90">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question…"
          className="flex-1 bg-light-base dark:bg-dark-base text-neutral-800 dark:text-neutral-100 px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all duration-200 focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-accent p-2.5 text-white transition-all duration-200 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 dark:focus:ring-offset-dark-surface"
          aria-label="Send message"
          title="Send message"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;