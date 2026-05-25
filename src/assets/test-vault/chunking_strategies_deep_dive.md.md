# Chunking Strategies for Optimal RAG

## Why Chunking Matters

Chunking is the process of dividing a long document into smaller, semantically coherent pieces. The quality of your chunks directly determines retrieval accuracy. If a chunk contains too much unrelated information, the LLM gets distracted. If it’s too small, crucial context is lost.

A poor chunking strategy causes the “lost in the middle” problem – relevant details appear outside the retrieved window. Good chunking makes the assistant appear smart; bad chunking makes it seem forgetful.

## Chunking Approaches

### 1. Fixed‑Size Chunking (Sliding Window)

The simplest method: split by token count (e.g., every 512 tokens), with optional overlap.
[----------------- document -----------------]
chunk1: tokens 1-512
chunk2: tokens 256-768
chunk3: tokens 512-1024 ...

**Pros**: Deterministic, fast, no language model required.  
**Cons**: Cuts sentences or paragraphs arbitrarily; loses structural boundaries.

**Overlap** mitigates boundary loss. Set overlap to 10‑20% of chunk size.

### 2. Sentence‑Aware Chunking

Split on sentence boundaries (`.`, `!`, `?`) but group sentences into chunks of ~N tokens.

Algorithm:
1. Tokenize into sentences (using `nltk` or `regex`).
2. Add sentences to current chunk until adding the next would exceed max size.
3. Start new chunk.

**Pros**: More natural, preserves linguistic units.  
**Cons**: Still ignores section headings and lists.

### 3. Paragraph / Section Chunking

Treat each Markdown heading (`#`, `##`, etc.) or blank line as a natural boundary. Often combined with fixed size for long paragraphs.

Implementation: parse Markdown AST (with `pulldown‑cmark` in Rust or `markdown‑it` in Python). Recursively walk nodes, emitting a chunk for each heading group.

**Pros**: Highly coherent – each chunk corresponds to a logical section.  
**Cons**: Sections can be extremely long (e.g., entire API reference). Fallback to recursive splitting.

### 4. Semantic Chunking (Advanced)

Use a cross‑encoder or sentence transformer to measure similarity between adjacent sentences. Where similarity drops sharply, cut the chunk.

Steps:
- Split into sentences.
- Embed each sentence.
- Compute cosine similarity between sentence_i and sentence_{i+1}.
- Define a threshold (e.g., 0.6). When similarity < threshold, create a break.

**Pros**: Produces chunks that align with topic shifts.  
**Cons**: Computationally expensive (embeds every sentence). Requires tuning threshold.

### 5. Document‑Structure Aware Chunking

For Markdown specifically, retain heading hierarchy in the chunk’s metadata. For example, a chunk from a subsection under `## Installation` carries the heading context: `Document: “Manual” > Section: “Installation” > Subsection: “Linux”`.

When retrieved, you can prepend the heading path to the chunk text, giving the LLM explicit context.

## Recommended Configuration for General Use

| Parameter         | Value          | Rationale                                                                 |
|-------------------|----------------|---------------------------------------------------------------------------|
| Chunk size        | 512 tokens     | Most embedding models are trained on 512‑length sequences. LLM context windows are larger, but retrieval quality peaks around 512–768. |
| Overlap           | 50 tokens      | Enough to preserve boundary information but not double storage.           |
| Chunking method   | Sentence‑aware | Balance between speed and coherence. Use section‑aware if document structure is reliable (e.g., technical docs). |
| Tokenizer         | cl100k_base (tiktoken) | Matches OpenAI’s tokeniser; good for any LLM. Alternatively, use `llama‑tokenizer‑js`. |

## Overlap in Detail

Overlap ensures that if a relevant passage straddles a chunk boundary, it appears fully in at least one chunk. For a query like “How to configure the API key?”, the answer might start at the end of chunk 5 and conclude in chunk 6. Without overlap, neither chunk contains the full answer.

Trade‑offs:
- **Higher overlap** (e.g., 30%) → more redundancy, better recall, but ~30% more storage and embedding compute.
- **Lower overlap** (e.g., 10%) → less redundancy, faster indexing, but risk of missed information.

## Chunking for Code Files

Code requires special handling. Splitting by line count often breaks functions. Better: use tree‑sitter to parse the abstract syntax tree and chunk by function / class / method. Keep import statements in the same chunk as the first function.

Example (Rust with `tree‑sitter`):
- Walk the AST.
- For each function definition, emit a chunk containing the entire function signature + body.
- For long functions (>1024 tokens), split inside the body but keep the signature in each child chunk.

## Implementation Tips

- Store chunk boundaries in the metadata: `start_char`, `end_char`. Useful for highlighting exact source locations.
- For PDFs, also store page numbers.
- When a document is updated, recompute only the chunks that have changed (use a rolling hash of the chunk’s raw text).

## Evaluation Metrics

Measure chunking quality by:
- **Retrieval accuracy**: Given a query that explicitly targets a specific sentence, does the chunk containing that sentence appear in top‑3 retrieved?
- **Answer faithfulness**: When the LLM uses the chunk to answer, does it hallucinate? (Requires human or LLM‑as‑judge evaluation)
- **Latency**: How long does chunking add to ingestion?

Experiment with different strategies on a representative sample of your documents before committing.


