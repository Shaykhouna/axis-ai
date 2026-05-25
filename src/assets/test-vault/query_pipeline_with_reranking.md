query_pipeline_with_reranking.md

# Query Pipeline: From User Question to Final Answer

A robust retrieval pipeline involves more than just “embed query, fetch nearest neighbours”. To achieve high accuracy, you need:

- **Hybrid search** (vector + keyword)
- **Re‑ranking** (cross‑encoder to refine ordering)
- **Context window management** (packing chunks while respecting LLM limits)
- **Citation generation**

This document details each stage.

## Stage 0: Query Pre‑processing

Before embedding, normalise the query:

- Lowercase (unless you preserve case for code).
- Remove extra whitespace.
- Optional: expand acronyms from a custom dictionary (`"API" -> "Application Programming Interface"`).
- For code queries, preserve exact spelling but strip comments.

Pre‑processing improves embedding quality because embedding models are sensitive to punctuation and case.

## Stage 1: Hybrid Retrieval (Vector + BM25)

Vector search alone sometimes misses keyword‑specific queries (e.g., “error code 0x80070005”) because the embedding may generalise the number. BM25 (bag‑of‑words) excels at exact term matching.

Implementation:

- **Vector search**: FAISS returns `k1 = 20` nearest neighbours.
- **BM25 search**: Use `tantivy` (Rust) or `rank_bm25` (Python) on the same chunk corpus, returning `k2 = 20` nearest.
- **Merge**: Combine results with Reciprocal Rank Fusion (RRF).

RRF formula: `score(chunk) = sum(1 / (k + rank_i))` for each retrieval method where chunk appears. `k=60` is typical.

Example:
Chunk A: vector rank 1, BM25 rank 5 → RRF = 1/(60+1) + 1/(60+5) = 0.0164 + 0.0154 = 0.0318
Chunk B: vector rank 2, BM25 rank 3 → RRF = 1/62 + 1/63 = 0.0323 (higher)


RRF favours chunks that are relevant to both methods.

## Stage 2: Cross‑Encoder Re‑ranking

The initial retrieval (stage 1) uses bi‑encoders (fast but lower accuracy). A cross‑encoder takes a query and a candidate chunk together, passes them through a transformer that can attend across both, and outputs a relevance score (e.g., 0..1). Cross‑encoders are slow (one forward pass per candidate) but much more accurate.

**Recommended cross‑encoder models** (CPU‑friendly):

- `cross‑encoder/ms‑marco‑MiniLM‑L‑6‑v2` – 80 MB, very fast.
- `BAAI/bge‑reranker‑base` – 1.2 GB, higher accuracy.
- `mixedbread‑ai/mxbai‑rerank‑base‑v1` – 400 MB, good balance.

Pipeline:

1. Take the top 20 candidates from stage 1.
2. For each candidate, run cross‑encoder to get a score.
3. Sort by cross‑encoder score.
4. Keep top 5–10 chunks for context.

This dramatically reduces the chance of retrieving a chunk that is lexically similar but semantically off‑topic.

## Stage 3: Context Compilation

The LLM has a finite context window. For a local model (e.g., Llama 3 8B, 8192 tokens), you can typically fit:

- System prompt (200 tokens)
- Retrieved chunks (5 chunks × 500 tokens = 2500 tokens)
- User query (50 tokens)
- Assistant preamble / instruction (100 tokens)
- Response (remaining ~5000 tokens)

If total exceeds limit, truncate the **least relevant** chunks (by cross‑encoder score) or shorten them by removing low‑information sentences.

Preserve metadata with each chunk:

[Source: manual.md, Section: Installation]
To install the package, run pip install mytool.


## Stage 4: Prompt Construction

Template (use Jinja2 or handlebars):
You are a helpful AI assistant. Answer the user's question using only the provided context.
If the context does not contain the answer, say "I don't have information about that."

Context:
{% for chunk in chunks %}
--- Source: {{ chunk.source }} ---
{{ chunk.text }}
{% endfor %}

Question: {{ query }}

Answer:

**Important**: Never allow the model to see the chunk’s embedding vector or internal IDs – only the text and human‑readable source.

## Stage 5: Generation & Citation

After the LLM generates an answer, post‑process to add citations. Because the model may not reliably output `[1]` style references, you can:

- After generation, scan the answer for phrases that match chunk content.
- Use a sentence‑level similarity between answer sentences and chunk sentences.
- Append a numbered list of sources at the end.

Simpler: always prepend each chunk’s source path when presenting context; the LLM naturally refers to it.

## Stage 6: Feedback Loop (Optional)

If the user indicates that the answer was insufficient, log the query and the retrieved chunks. Later, you can:

- Fine‑tune the cross‑encoder with these hard negatives.
- Adjust chunking parameters (e.g., increase overlap).
- Add new documents to the vault to fill the gap.

## Latency Budget

| Stage                     | Time (ms) |
|---------------------------|-----------|
| Query embedding (CPU)     | 15–40     |
| FAISS search (k=20)       | 2–5       |
| BM25 search               | 1–3       |
| RRF merge                 | <1        |
| Cross‑encoder (20 calls)  | 200–600   |
| Context compilation       | 1         |
| LLM generation (100 tokens)| 200–2000 |
| **Total**                 | **400–2600** |

For a responsive assistant, aim for <2 seconds total. If cross‑encoder is too slow, skip it and rely on hybrid + larger `k`. Or run cross‑encoder asynchronously on a separate thread and cache results for frequent queries.
