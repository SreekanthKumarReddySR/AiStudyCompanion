# Architecture Overview

This document outlines the design of the AI Study Companion application, describing components, data flow, and mapping each GenAI stage to implementation.

## Components

- **Frontend (React)**
  - `src/components`: UI components like Login, Signup, FileUploader, Chat, Summary, Quiz.
  - `src/services`: API wrappers.
  - `src/pages`: Route-level pages.

- **Backend (Node.js / Express)**
  - `src/controllers`: Request handlers.
  - `src/routes`: API route definitions.
  - `src/models`: Mongoose schemas for MongoDB.
  - `src/services`: Business logic (ingestion, embeddings, vector search, LLM calls).
  - `src/utils`: Helpers for text extraction, chunking, prompt templates.

- **Database**
  - MongoDB: stores `User`, `Document`, `Chunk` metadata.
  - Vector DB (ChromaDB or FAISS): stores embeddings with metadata pointers.

## GenAI Stages Mapping

1. **Input**: User uploads `PDF`, `DOCX` or `TXT` documents via frontend; sent to backend `/upload` endpoint.
2. **Information Extraction**: Backend uses libraries (e.g., `pdf-parse`, `textract`) to extract raw text.
3. **Chunking**: Raw text broken into segments (e.g., 500-word overlapping windows) using simple heuristics or NLP.
4. **Embedding**: Each chunk sent to embedding model (OpenAI `text-embedding-3-large` etc.) to get vector.
5. **Vector Storage**: Embeddings and metadata stored in vector DB table/collection; metadata includes doc ID, chunk index.
6. **Prompting**: Predefined prompt templates inserted with context and user query.
7. **Query Processing**: On user question, the text is embedded similarly to create query vector.
8. **Vector Search**: Query vector used to search vector DB and retrieve top-k similar chunks.
9. **Ranking**: Retrieved chunks sorted by similarity score; optionally re-ranked by cross-encoder.
10. **LLM Synthesis**: The system builds prompt with retrieved chunks and user query, calls LLM to generate answer.
11. **Output**: The LLM response returned to frontend chat UI.

## Data Flow
See section "End-to-end Data Flow" below or refer to `docs/data_flow.md`.
