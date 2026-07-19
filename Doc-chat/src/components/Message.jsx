function Message({ role, text, sources, usedWebSearch }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2.5">
        <div className="max-w-[82%] rounded-2xl rounded-br-none bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  const isGrounded = sources && sources.length > 0 && !usedWebSearch;

  return (
    <div className="flex justify-start items-start gap-2.5">
      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-light-border bg-light-base text-[10px] font-semibold text-neutral-700 dark:border-dark-border dark:bg-dark-base dark:text-neutral-300">
        AI
      </div>

      <div
        className={`max-w-[82%] rounded-2xl rounded-bl-none border border-light-border bg-light-surface px-4 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-200 dark:border-dark-border dark:bg-dark-surface ${
          isGrounded
            ? "border-l-4 border-l-accent"
            : usedWebSearch
            ? "border-l-4 border-l-amber-500"
            : ""
        }`}
      >
        <div className="flex flex-wrap gap-2 select-none">
          {isGrounded && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-accent-hover dark:text-accent">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Document Grounded
            </div>
          )}

          {usedWebSearch && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Live Web Search
            </div>
          )}
        </div>

        <p className="mt-2 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">{text}</p>

        {isGrounded && (
          <details className="group mt-3 border-t border-light-border pt-2.5 dark:border-dark-border">
            <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-mono font-semibold text-neutral-600 hover:text-accent focus:text-accent dark:text-neutral-300 dark:hover:text-accent dark:focus:text-accent transition-colors duration-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 select-none">
              <svg className="h-3 w-3 transform transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Sources ({sources.length})
            </summary>

            <div className="mt-2 space-y-2 rounded-xl border border-light-border bg-light-base p-3 dark:border-dark-border dark:bg-dark-base/40">
              {sources.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5 border-b border-light-border/70 pb-2 text-[11px] last:border-b-0 last:pb-0 dark:border-dark-border/60">
                  <div className="flex items-center justify-between font-mono">
                    <span className="max-w-[180px] truncate rounded border border-light-border bg-light-surface px-2 py-0.5 text-[10px] text-neutral-700 dark:border-dark-border dark:bg-dark-surface dark:text-neutral-300 sm:max-w-[280px]" title={s.source}>
                      {s.source}
                    </span>
                    <span className="text-[9px] uppercase text-neutral-500 dark:text-neutral-400">
                      Page {s.page}
                    </span>
                  </div>
                  <blockquote className="rounded-lg border-l-2 border-light-border bg-light-surface/40 px-2.5 py-1 pr-1 text-[10.5px] font-mono italic leading-relaxed text-neutral-600 dark:border-dark-border dark:bg-dark-surface/10 dark:text-neutral-400">
                    “{s.text.slice(0, 150)}…"
                  </blockquote>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default Message;