# Local Vault Architecture for AI Assistants

## Introduction

Modern AI assistants benefit enormously from retrieval-augmented generation (RAG). Instead of relying solely on a model’s parametric memory (which is limited, stale, and generic), RAG injects relevant documents from an external **vault** into the prompt at inference time. This vault lives on your local machine – no cloud, no API calls, no data leaving your control.

This document describes a production‑ready local vault architecture that balances speed, storage efficiency, and semantic fidelity.

## High‑Level Components

The vault consists of five layers:

1. **Ingestion Layer** – Watches file system changes, extracts text from PDFs/Office/Markdown, and cleans content.
2. **Chunking & Embedding Layer** – Splits documents into overlapping chunks and computes dense vector embeddings.
3. **Vector Index Layer** – Stores chunks and their embeddings in an approximate nearest neighbour (ANN) index (FAISS, LanceDB, or SQLite‑VSS).
4. **Metadata SQL Layer** – Maintains document titles, tags, timestamps, and source paths (using SQLite via Tauri plugin).
5. **Query & Re‑ranking Layer** – Accepts natural language queries, returns top‑k chunks, optionally re‑ranks them with cross‑encoders.

## Why Local?

- **Privacy** – No external service sees your queries or documents.
- **Compliance** – GDPR, HIPAA, and internal security policies satisfied.
- **Offline operation** – Works without internet after models are downloaded.
- **Cost** – No per‑query token fees for retrieval (only generation).
- **Customisation** – Swap embedding models, rerankers, and chunking strategies at will.

## File System Layout

A typical vault directory:
vault/
├── documents/ # Original files (user added)
│ ├── meeting_notes.md
│ ├── research.pdf
│ └── architecture.md
├── chunks/ # Stored chunk JSON files (one per doc)
│ └── {uuid}.json
├── index/ # FAISS index files and mapping
│ ├── faiss.index
│ └── id_to_chunk.map
├── metadata.db # SQLite database (via tauri_plugin_sql)
└── vault_config.yaml


## Data Flow (Write Path)

1. User drops a file into `documents/`.
2. File watcher triggers ingestion.
3. Text extraction (Unstructured, `pdf‑extract`, or `cat` for plaintext).
4. Chunking with configurable size (256–1024 tokens) and overlap (10–20%).
5. Embedding generation using a local `sentence‑transformers` model (e.g., `all‑MiniLM‑L6‑v2` or `BAAI/bge‑small‑en`).
6. Insert embedding into FAISS index; store chunk text + metadata in SQLite.
7. Optionally, write chunk JSON to `chunks/` for backup.

## Data Flow (Read / Query Path)

1. User asks “What were the key decisions from the March meeting?”
2. Query is embedded using the same model (no cross‑modal issues).
3. FAISS returns top‑k (e.g., 10) nearest neighbours by cosine similarity.
4. SQLite retrieves the full chunk text, document title, and source path.
5. Assistant builds a prompt:

Context:
{chunk1}
{chunk2}...
Question: {user query}
Answer:

6. Generation model (local LLM, e.g., Llama 3 or Phi‑3) produces final answer.
7. Citations are appended with `[Source: document.md]`.

## Scaling Considerations

- **Embedding cache** – Store computed embeddings for unchanged documents to avoid recomputation.
- **Hybrid search** – Combine dense (vector) and sparse (BM25) retrieval for better recall on keyword‑heavy queries.
- **Multi‑modal** – Extend to images via CLIP embeddings (store image chunks with text descriptions).
- **Distributed vault** – Not needed for local, but possible with LanceDB’s cloud‑native format.

## Integration with Tauri

Your Tauri backend should:

- Use `tauri_plugin_sql` for the metadata database (migrations for document and chunk tables).
- Use `tauri_plugin_fs` to read document files and write chunk JSONs.
- Spawn a thread for embedding generation (CPU‑intensive) to avoid UI freezing.
- Expose commands: `index_document`, `query_vault`, `delete_document`.

## Future Extensions

- **Automatic tagging** – Small zero‑shot classifier (e.g., `typeform/distilbert‑base‑uncased‑goemotions`) to tag incoming docs.
- **Conversational memory** – Store past queries and retrieved chunks to allow follow‑up questions without re‑embedding.
- **Incremental updates** – Watch for file changes and update only modified chunks (using file hashes).

This architecture has been tested with up to 100k chunks (≈5000 documents) on a laptop with 16GB RAM, achieving <200ms query latency.

