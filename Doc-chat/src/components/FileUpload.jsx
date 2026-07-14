import { useState, useRef, useEffect } from "react";

const API_BASE_URLS = ["http://127.0.0.1:8001", "http://127.0.0.1:8000"];

async function fetchJson(path, options = {}) {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      if (!response.ok) {
        lastError = new Error(`Request failed: ${response.status}`);
        continue;
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Request failed");
}

function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef();

  const loadDocuments = async () => {
    try {
      const data = await fetchJson("/documents");
      const docs = Array.isArray(data)
        ? data.map((doc) => ({
            id: doc.id,
            name: doc.filename,
            chunks: doc.chunks || 0,
            status: doc.status || "processing",
          }))
        : [];
      setDocuments(docs);
    } catch (err) {
      console.error("Could not load documents", err);
    }
  };

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(() => {
      loadDocuments();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await fetchJson("/upload", {
        method: "POST",
        body: formData,
      });

      setDocuments((prev) => [
        {
          id: data.document_id,
          name: file.name,
          chunks: 0,
          status: data.status || "processing",
        },
        ...prev,
      ]);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setError(null);

    try {
      await fetchJson(`/documents/${id}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-light-border/80 bg-light-surface/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-200 dark:border-dark-border/80 dark:bg-dark-surface/95">
      <div className="flex items-center justify-between border-b border-light-border/80 pb-3 dark:border-dark-border/80">
        <div className="flex items-center gap-2">
          <svg className="h-4.5 w-4.5 text-neutral-700 dark:text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="font-display text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
            Document Repository
          </h2>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {documents.length}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (uploading) return;
          const file = e.dataTransfer.files[0];
          if (file && file.type === "application/pdf") {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
            handleFileChange({ target: { files: dt.files } });
          } else {
            setError("Only PDF files are supported");
          }
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
          isDragOver
            ? "border-accent bg-accent/10"
            : "border-light-border bg-neutral-50/70 hover:border-accent/50 hover:bg-neutral-100/80 dark:border-dark-border dark:bg-neutral-900/30 dark:hover:border-accent/50 dark:hover:bg-neutral-800/50"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
        onClick={() => !uploading && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-neutral-700 dark:text-neutral-200 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="font-display font-medium text-sm text-neutral-800 dark:text-neutral-200">
                Parsing & Indexing...
              </p>
              <p className="font-mono text-[10px] text-neutral-400 mt-1">
                generating vector embeddings
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200 group-hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-neutral-700 dark:group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span className="font-semibold text-neutral-900 dark:text-white">Upload PDF</span> or drag & drop
              </p>
              <p className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                PDF documents up to 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="font-display font-semibold text-xs text-red-700 dark:text-red-400">
              Indexing Failed
            </p>
            <p className="font-mono text-[10px] text-red-600 dark:text-red-500/95 mt-0.5 break-all">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[300px] pr-1">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-light-border dark:border-dark-border rounded-lg bg-neutral-50/20 dark:bg-neutral-900/10">
            <svg className="w-6 h-6 text-neutral-400 dark:text-neutral-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-display text-xs font-medium text-neutral-400 dark:text-neutral-500">
              No documents active
            </p>
            <p className="font-mono text-[10px] text-neutral-400/70 dark:text-neutral-600 mt-1">
              upload a PDF to extract chunks
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id || doc.name}
                className="group flex items-center justify-between rounded-xl border border-light-border bg-neutral-50 p-3 transition-all duration-150 hover:border-accent/40 hover:bg-neutral-100 dark:border-dark-border dark:bg-neutral-900/40 dark:hover:border-accent/40 dark:hover:bg-neutral-800/70"
              >
                <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                  <svg className="w-4 h-4 text-neutral-600 dark:text-neutral-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate block" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400">
                      {doc.status || "processing"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-mono text-[9px] font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {doc.chunks} chunks
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 disabled:opacity-50"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;