import os
import shutil
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import SessionLocal, engine
from models import Base, Document
from ingest import extract_text_by_page, chunk_text
from vectorstore import VectorStore
from agent import answer_question, stream_answer


app = FastAPI()


# Create database tables
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = VectorStore()

os.makedirs("./data/uploads", exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ChatRequest(BaseModel):
    question: str

def process_document(path, filename, document_id):
    db = SessionLocal()
    try:
        print(f"Processing started: {filename}")
        # Extract PDF text
        pages = extract_text_by_page(path)
        # Create chunks
        chunks = chunk_text(
            pages,
            filename
        )

        # Store embeddings
        store.add_chunks(chunks)

        # Update database status
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        if document:
            document.status = "completed"
            db.commit()
        print(f"Processing completed: {filename}")
    except Exception as e:
        print("Processing failed:", e)
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        if document:
            document.status = "failed"
            db.commit()
    finally:
        db.close()

@app.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):

    save_path = f"./data/uploads/{file.filename}"

    with open(save_path, "wb") as f:

        shutil.copyfileobj(
            file.file,
            f
        )

    db = SessionLocal()
    document = Document(
        filename=file.filename,
        status="processing"
    )

    db.add(document)
    db.commit()
    db.refresh(document)
    document_id = document.id

    background_tasks.add_task(
        process_document,
        save_path,
        file.filename,
        document_id
    )
    db.close()
    return {
        "message": "Document processing started",
        "document_id": document_id,
        "status": "processing"
    }

@app.get("/documents/{document_id}")
def document_status(
    document_id: int,
    db=Depends(get_db)
):
    
    document = db.query(Document).filter(
        Document.id == document_id
    ).first()
    if not document:
        return {
            "message": "Document not found"
        }
    return {
        "id": document.id,
        "filename": document.filename,
        "status": document.status,
        "created_at": document.created_at
    }

@app.get("/documents")
def get_documents(
    db=Depends(get_db)
):
    documents = db.query(Document).all()
    return documents
@app.post("/chat")
async def chat(req: ChatRequest):
    result = answer_question(
        req.question,
        store
    )
    return result

@app.delete("/documents/{document_id}")
def delete_document(document_id: int, db=Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        return {"status": "not_found", "document_id": document_id}

    store.delete_source(document.filename)

    upload_path = f"./data/uploads/{document.filename}"
    if os.path.exists(upload_path):
        os.remove(upload_path)

    db.delete(document)
    db.commit()

    return {"status": "deleted", "document_id": document_id, "filename": document.filename}

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    async def event_generator():
        async for line in stream_answer(
            req.question,
            store
        ):
            yield line

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
