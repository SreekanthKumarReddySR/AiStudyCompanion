# AI Study Companion for Exams

This repository contains a full-stack web application implementing a GenAI-powered study companion using a retrieval-augmented generation pipeline (RAG). It allows students to upload materials, ask questions, get summaries/quizzes, and more.

## System Architecture
The system consists of two major parts:

1. **Frontend (React)**
   - Provides user interface for signup/login, file uploads, chat, summaries and quizzes.
   - Communicates with backend via REST API.

2. **Backend (Node.js / Express)**
   - Handles authentication, document ingestion, chunking, embedding, vector storage, query processing, and communication with LLMs.
   - Uses MongoDB for user/document metadata.
   - Vector database (e.g., ChromaDB or FAISS) for embeddings.
   - Integrates with OpenAI (or HuggingFace) for language model calls.

The GenAI pipeline covers all stages: input, extraction, chunking, embedding, storage, querying, search, ranking, synthesis, and output.

Refer to `docs/architecture.md` for detailed explanation, API definitions, and data flow.
