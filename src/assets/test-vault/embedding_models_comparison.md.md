# Embedding Models for Local Vault: Benchmarks & Selection Guide

## What Makes a Good Embedding Model?

Embedding models map text to dense vectors such that semantically similar texts have vectors close together (e.g., high cosine similarity). For a local vault, the model must:

- **Run efficiently on CPU** (GPU optional, but many users have no GPU)
- **Handle your language(s)** (English, code, or multilingual)
- **Produce reasonable vector dimensions** (384–768 for speed, 1024+ for accuracy)
- **Be permissively licensed** (MIT, Apache 2.0, or CC‑BY‑SA)

## Top Models for Local Use

| Model Name                     | Dimensions | Memory (MB) | MS MARCO NDCG@10 | CPU Speed (ms/1k tokens) | License      |
|--------------------------------|------------|-------------|------------------|--------------------------|--------------|
| all‑MiniLM‑L6‑v2               | 384        | 80          | 34.5             | 3.2                      | Apache 2.0   |
| all‑mpnet‑base‑v2              | 768        | 420         | 38.2             | 8.7                      | Apache 2.0   |
| BAAI/bge‑small‑en‑v1.5         | 384        | 95          | 37.1             | 4.1                      | MIT          |
| BAAI/bge‑base‑en‑v1.5          | 768        | 410         | 39.0             | 10.4                     | MIT          |
| intfloat/e5‑small‑v2           | 384        | 120         | 36.8             | 4.3                      | MIT          |
| sentence‑transformers/gtr‑t5‑small | 768    | 350         | 35.2             | 9.1                      | Apache 2.0   |
| nomic‑ai/nomic‑embed‑text‑v1.5 | 768        | 550         | 41.2             | 15.3                     | Apache 2.0   |

*MS MARCO NDCG@10*: higher is better (39+ is excellent).  
*Speed*: measured on an Intel i7‑1260P (4.7 GHz) with `onnxruntime` optimised.

## Recommendation

- **Default / fastest**: `all‑MiniLM‑L6‑v2` – good quality, tiny, runs on anything.
- **Balanced**: `BAAI/bge‑small‑en‑v1.5` – better accuracy for domain‑specific queries (code, finance, law).
- **High accuracy (if you have a GPU or powerful CPU)**: `nomic‑ai/nomic‑embed‑text‑v1.5` – top tier for retrieval, but slower.
- **Multilingual**: `intfloat/multilingual‑e5‑small` (384 dim) or `sentence‑transformers/paraphrase‑multilingual‑MiniLM‑L12‑v2`.

## Quantisation & Optimisation

To run models faster on CPU, apply quantisation:

- **FP16** → halves memory, slight accuracy drop.
- **INT8** → 4x smaller, 2‑3x faster, acceptable accuracy loss (1‑2% in NDCG).
- **Binary / Product quantisation** – Only for extreme edge (e.g., Raspberry Pi). Not recommended.

Use `optimum‑onnxruntime` to convert Hugging Face models to ONNX format, then run with `ORTQuantizer`. For Rust, use `ort` (ONNX Runtime bindings) or `candle` with quantised GGUF.

## Embedding Dimension Trade‑offs

Higher dimensions capture more nuance but increase storage and retrieval time. With FAISS, search complexity is O(dim * N) for flat indexes. For 100k chunks:

- 384 dimensions → 384 * 100k ≈ 38 million floats → 150 MB (FP32)
- 768 dimensions → 307 MB
- 1536 dimensions → 614 MB

Use **indexes with quantisation** (IVF, HNSW) to mitigate, but they add overhead. For personal vaults (<50k chunks), flat index with 384 dim is fine.

## Updating Embeddings Over Time

As new embedding models are released, you may want to re‑embed your entire vault. Keep the original chunk texts and the name of the model used. Write a migration script that:

1. Loads all chunks from SQLite.
2. Re‑embeds them with the new model.
3. Replaces the FAISS index.
4. Updates `vault_config.yaml` with the new model name.

Never delete the old index until the new one is validated.

## How to Benchmark on Your Own Data

Don’t trust public leaderboards blindly. Use your own query‑document pairs:

- Collect 100 real questions you might ask the assistant.
- For each, mark the document chunk that contains the answer.
- Compute recall@k (k=1,3,5) for each model.
- Also measure latency (embedding + retrieval + reranking).

A simple script:

```python
from sentence_transformers import SentenceTransformer, util
model = SentenceTransformer('all-MiniLM-L6-v2')
query_emb = model.encode(queries)
doc_emb = model.encode(chunks)
hits = util.semantic_search(query_emb, doc_emb, top_k=5)
```

Future: Multimodal Embeddings
If your vault includes diagrams or screenshots, consider CLIP (ViT‑B/32) which produces aligned image‑text embeddings. Query can be text or image. For pure text, not needed.

Final Advice
Start with all-MiniLM-L6‑v2. It’s good enough for 90% of use cases. Only upgrade if you observe obvious retrieval failures (e.g., synonyms not matched, subtle distinctions ignored). After upgrading, you will need to reindex everything – so do it early in development to avoid rework.
