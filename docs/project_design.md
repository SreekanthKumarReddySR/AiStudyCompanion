# AI Study Companion for Exams - System Design

This document covers the complete design and architecture for the Web-based AI Study Companion application, implementing an end-to-end GenAI (RAG) pipeline.

---

## 1. System Architecture Explanation

The application is divided into two major layers:

1. **Frontend (React SPA)**
   - Handles user interactions: signup/login, file uploads, chat interface.
   - Communicates with backend via REST APIs.
   - Implements state management for user session and chat.

2. **Backend (Node.js/Express)**
   - Exposes REST endpoints for authentication, document processing, and chat.
   - Manages MongoDB for user accounts and document metadata.
   - Coordinates GenAI pipeline: extraction, chunking, embeddings, vector store, retrieval, ranking, and synthesis.
   - Uses a vector database (e.g., Chroma/FAISS or Pinecone) to store and search embeddings.
   - Integrates with an LLM provider (OpenAI or HuggingFace) for generation.

3. **Databases and Storage**
   - **MongoDB** stores user credentials, document records, and chunk metadata.
   - **Vector Database** stores chunk embeddings along with references.

4. **External Services**
   - **Storage** (e.g., AWS S3) may hold uploaded files, processed text.
   - **LLM API** for embedding generation and response synthesis.

GenAI stages map to modules within the backend. Each stage is described later.

---

## 2. Frontend Folder Structure

```
frontend/
  package.json
  public/
    index.html
  src/
    App.js                # main application wrapper
    index.js              # React DOM entry point
    components/
      ChatWindow.jsx
      FileUploader.jsx
      LoginForm.jsx
      SignupForm.jsx
      SummaryQuizModal.jsx
    pages/
      HomePage.jsx
      Dashboard.jsx
      ChatPage.jsx
    services/
      api.js              # wraps fetch/axios calls
      auth.js             # login/signup helpers
```

Each component corresponds to UI elements for uploading, chatting, and displaying results. Services abstract HTTP.

---

## 3. Backend Folder Structure

```
backend/
  package.json
  src/
    index.js             # Express app entry point
    routes/
      auth.js            # /api/auth endpoints
      documents.js       # /api/documents endpoints
      chat.js            # /api/chat endpoints
    controllers/
      authController.js
      documentController.js
      chatController.js
    models/
      User.js            # mongoose schema for users
      Document.js        # metadata about uploads
      Chunk.js           # store chunk records/indexes
    utils/
      extraction.js      # text extraction helpers (pdf/docx/txt)
      chunking.js        # segmentation logic
      embedding.js       # calls to LLM embeddings API
      vectorStore.js     # wrapper for FAISS/Chroma/Pinecone
      ranking.js         # scoring retrieved chunks
      llm.js              # LLM synthesis calls
    middleware/
      authMiddleware.js  # JWT authentication
    config/
      db.js              # Mongo connection
      vectorConfig.js    # vector DB configuration
```

This separation supports maintainability and maps well to the GenAI stages.

---

## 4. API Endpoint List

| Method | Endpoint               | Description                            | Req Body                                | Resp Body                                  |
|--------|------------------------|----------------------------------------|-----------------------------------------|---------------------------------------------|
| POST   | /api/auth/signup       | Register a new user                    | `{email, password}`                     | `{userId, token}`                           |
| POST   | /api/auth/login        | Login and receive JWT                  | `{email, password}`                     | `{userId, token}`                           |
| POST   | /api/documents/upload  | Upload study material                  | FormData file                           | `{docId, status}`                           |
| GET    | /api/documents/:id     | Get document metadata                  | -                                       | `{doc}`                                     |
| POST   | /api/chat/query        | Submit question or request             | `{query, type?}`                        | `{response, sources}`                       |
| POST   | /api/chat/summary      | Request summary for a document         | `{docId}`                               | `{summary}`                                 |
| POST   | /api/chat/quiz         | Generate quiz for a document           | `{docId}`                               | `{questions: [...]}`                        |

Authentication is handled via JWT in `Authorization` header.

---

## 5. Database Schema

```js
// User.js
{
  email: String,
  passwordHash: String,
  createdAt: Date,
}

// Document.js
{
  userId: ObjectId,
  filename: String,
  uploadedAt: Date,
  status: String, // pending/processed
  text: String, // full extracted text
}

// Chunk.js
{
  documentId: ObjectId,
  text: String,
  startOffset: Number,
  endOffset: Number,
  embeddingId: String, // reference in vector store
}
```

Chunk metadata helps with retrieval and ranking. Mongo indexes ensure efficient queries.

---

## 6. Vector Storage Design

- Use ChromaDB for local dev or Pinecone for production.
- Each chunk embedding stored along with metadata: `documentId`, `chunkId`, `text`, and possibly `sourceOffset`.
- When uploading, chunks go through embedding stage then inserted into vector DB.
- On search, query embedding is computed and sent to DB for nearest-neighbor search (semantic search).

Vectors are typically 1536 dimensions when using OpenAI embeddings; storage handles arrays of floats.

---

## 7. Prompt Templates Used

```
// For question answering
"You are a helpful study assistant. Given the following context:\n{context}\nAnswer the question: {question}\nProvide citations to the document chunks if possible."

// For summaries
"Summarize the following text in 3-4 sentences:\n{document_text}"

// For quizzes
"Generate 5 multiple-choice questions based on the following text:\n{document_text}"
```

Templates can be stored in `utils/promptTemplates.js`.

---

## 8. End-to-End Data Flow

1. **Input**: User logs in and uploads a file via frontend.
2. **Information Extraction**: Backend saves file, then `extraction.js` reads the PDF/DOCX/TXT and produces plain text.
3. **Chunking**: `chunking.js` splits text into overlapping or fixed-size segments, storing them in Mongo and preparing for embeddings.
4. **Embedding**: For each chunk, `embedding.js` calls the LLM provider to generate vector representations.
5. **Vector Storage**: Embeddings along with chunk metadata are inserted into vector DB via `vectorStore.js`.
6. **Prompting**: When a user asks a question, frontend sends query to `/api/chat/query`.
7. **Query Processing**: Backend cleans the query and obtains its embedding through `embedding.js`.
8. **Vector Search**: Query embedding is passed to vector DB to retrieve nearest chunk vectors.
9. **Ranking**: Retrieved chunks are scored (e.g., semantic similarity + recency) in `ranking.js`.
10. **LLM Synthesis**: The top-K chunks are concatenated into a context prompt and sent—with the question—to the LLM for generation via `llm.js`.
11. **Output**: Generated answer returned to frontend, displayed in chat UI along with source highlights.

This loop is repeated for summaries and quizzes with different prompt templates.

---

## 9. Sample UI Description

1. **Login/Signup Page**: Simple form with email/password fields.
2. **Dashboard**: Shows list of uploaded documents with status and actions (view summary, ask question).
3. **Upload Modal**: Drag-and-drop or file selector for study materials.
4. **Chat Interface**: Text input at bottom, conversation view above showing user queries and assistant answers. Sources are clickable to reveal original chunk.
5. **Summary/Quiz Modal**: Buttons trigger generation and display results.

UI uses React components mentioned earlier, styled with simple CSS or a library like Material-UI.

---

## 10. Resume-ready Project Description

**AI Study Companion (React, Node.js, MongoDB, ChromaDB, OpenAI)**<br>
Developed a full-stack web application enabling students to upload study materials and interact with an AI-powered assistant for exam preparation. Implemented a Retrieval-Augmented Generation (RAG) pipeline covering document ingestion, text extraction, chunking, embedding, vector storage, semantic search, ranking, and LLM-based answer synthesis. Backend built on Node.js/Express with MongoDB for metadata and ChromaDB for vector storage; frontend developed in React featuring authentication, chat interface, summary and quiz generation. Demonstrated end-to-end GenAI architecture, REST API design, and scalable middleware components.

---

This concludes the design documentation for the project; the next steps involve creating scaffolding code and implementing core modules as per the structure above.