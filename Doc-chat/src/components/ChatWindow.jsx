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
    <div className="flex-1 flex flex-col h-96 border border-light-border/80 dark:border-dark-border/80 rounded-2xl mt-4 relative bg-light-surface/90 dark:bg-dark-surface/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-light-border/80 dark:border-dark-border/80 px-4 py-3 bg-light-surface/80 dark:bg-dark-surface/80">
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 font-mono hover:text-neutral-900 dark:hover:text-white truncate max-w-[70%] text-left transition-colors"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">◦</span>
          <span className="truncate">{activeSession.title}</span>
          <span className="text-neutral-400">▾</span>
        </button>
        <button
          onClick={startNewChat}
          className="text-xs px-3 py-1.5 rounded-full border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-all"
        >
          + New Chat
        </button>
      </div>

      {showHistory && (
        <div className="absolute top-14 left-3 z-10 w-72 max-h-64 overflow-y-auto bg-light-surface dark:bg-dark-surface border border-light-border/80 dark:border-dark-border/80 rounded-2xl shadow-xl">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => switchToSession(session.id)}
              className={`flex items-center justify-between px-3 py-2.5 text-xs cursor-pointer transition-colors ${
                session.id === activeSessionId ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/70"
              }`}
            >
              <span className="truncate">{session.title}</span>
              <button
                onClick={(e) => deleteSession(session.id, e)}
                className="ml-2 flex-shrink-0 rounded-full border border-transparent px-2 py-1 text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/20"
                title="Delete chat"
                aria-label="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-light-surface/70 dark:bg-dark-surface/70">
        {messages.length === 0 && !loading ? (
          <div className="flex h-full min-h-[220px] flex-col items-start justify-center rounded-2xl border border-dashed border-light-border dark:border-dark-border bg-light-base/50 dark:bg-dark-base/50 p-6 text-sm text-neutral-600 dark:text-neutral-300">
            <p className="font-display text-base font-semibold text-neutral-900 dark:text-white">Start with a document question or Live Web Search</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Upload a PDF, then ask for a summary, comparison, or a precise answer grounded in your repository.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Grounded answers</span>
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Citations</span>
              <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Session history</span>
               <span className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-1">Live Web Search</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <Message key={index} {...msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-700 dark:text-neutral-200">
                  AI
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-none border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400 [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex border-t border-light-border/80 dark:border-dark-border/80 p-2.5 bg-light-surface/80 dark:bg-dark-surface/80">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question..."
          className="flex-1 bg-light-base/80 dark:bg-dark-base/70 text-neutral-800 dark:text-neutral-100 px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border outline-none placeholder:text-neutral-400 transition focus:border-accent/60"
        />
        <button
          onClick={sendMessage}
          className="ml-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;