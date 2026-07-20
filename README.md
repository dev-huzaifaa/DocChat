# DocChat

A retrieval-augmented generation (RAG) agent that answers questions from uploaded PDF documents, with cited sources and a live web-search fallback when the documents don't have the answer.

Built as a hands-on project to learn core AI engineering concepts end to end: document ingestion, chunking strategy, embeddings, vector search, agentic tool use, streaming inference, and production concerns like persistence and graceful failure handling.

## Features

- **Document-grounded Q&A** — upload PDFs, ask questions, get answers with inline citations pointing to the exact source document and page
- **Agentic web search fallback** — when the uploaded documents don't contain the answer, the model decides on its own to call a web search tool instead of guessing
- **Streaming responses** — answers appear token-by-token in real time, not as one blocking request
- **Multi-session chat history** — start new conversations, switch between past sessions, delete sessions
- **Document management** — upload, track processing status, and delete documents (removes both the vector embeddings and the database record)
- **Light/dark theme** with a custom design system

## Architecture

```
PDF Upload → Text Extraction (pypdf) → Chunking (sliding window, overlap)
    → Embeddings (ChromaDB, local MiniLM model) → Vector Store (ChromaDB)

User Question → Vector Search (top-k relevant chunks)
    → LLM (Groq / Llama 3.3) with a web_search tool available
    → [optional: tool call → live web search → re-prompt]
    → Streamed, cited answer
```

Document metadata (filename, processing status, timestamps) is tracked in **SQLite**, separately from the actual vector embeddings in **ChromaDB** — a deliberate separation between relational/status data and vector/semantic data.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), Tailwind CSS |
| Backend | FastAPI |
| LLM inference | Groq API (Llama 3.3 70B) |
| Vector store | ChromaDB |
| Metadata store | SQLite (SQLAlchemy) |
| Web search tool | DuckDuckGo Search (`ddgs`) |
| PDF parsing | pypdf |

## Why these choices

- **Groq** over a closed API: fast inference, generous free tier, OpenAI-compatible interface — useful for learning tool-calling without vendor lock-in
- **ChromaDB** over a hosted vector DB: runs locally with zero setup, good for learning the retrieval mechanics before reaching for infrastructure
- **Streaming + graceful tool-call failure handling**: open-weight models are occasionally inconsistent at generating well-formed tool calls; the agent catches this and falls back to a direct answer rather than crashing the request

## Running locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # add your GROQ_API_KEY (console.groq.com, free)
uvicorn main:app --reload --port 8001
```

### Frontend
```bash
cd Doc-chat
npm install
npm run dev
```

Visit `localhost:5173`. Upload a PDF, ask a question, and try something the document doesn't cover to see the web-search fallback trigger.

## What I'd build next

- RAGAS-based evaluation (faithfulness, answer relevancy, context precision) instead of a manual hit-rate check
- Hybrid retrieval (BM25 + vector search) with re-ranking
- Multi-user auth and document isolation
- Dockerized deployment with a persistent volume

## License

MIT
