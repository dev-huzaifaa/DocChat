from pypdf import PdfReader

def extract_text_by_page(pdf_path):
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((i + 1, text))
    return pages

def chunk_text(pages, filename, chunk_size=800, overlap=150):
    chunks = []
    chunk_index = 0
    for page_num, text in pages:
        start = 0
        while start < len(text):
            end = start + chunk_size
            piece = text[start:end].strip()
            if piece:
                chunks.append({
                    "text": piece,
                    "source": filename,
                    "chunk_id": f"{filename}::chunk_{chunk_index}",
                    "page": page_num,
                })
                chunk_index += 1
            start += chunk_size - overlap
    return chunks