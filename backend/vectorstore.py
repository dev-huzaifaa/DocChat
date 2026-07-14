import os
import chromadb


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./data/chroma")
        self.collection = self.client.get_or_create_collection(name="docchat")

    def add_chunks(self, chunks):
        self.collection.add(
            ids=[c["chunk_id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[{"source": c["source"], "page": c["page"]} for c in chunks],
        )

    def query(self, question, top_k=4):
        if not os.path.exists("./data/chroma"):
            return []

        try:
            results = self.collection.query(query_texts=[question], n_results=top_k)
        except Exception:
            return []

        out = []
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            out.append({"text": doc, "source": meta["source"], "page": meta["page"]})
        return out
    
    def delete_source(self, filename):
        self.collection.delete(where={"source": filename})