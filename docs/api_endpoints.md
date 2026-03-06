# API Endpoints

The backend exposes REST endpoints for authentication, document management, and chat.

## Authentication

- **POST /api/auth/signup**
  - Request: `{ "email": "user@example.com", "password": "..." }`
  - Response: `{ "userId": "...", "token": "..." }`

- **POST /api/auth/login**
  - Request: `{ "email": "user@example.com", "password": "..." }`
  - Response: `{ "userId": "...", "token": "..." }`

## Document Upload & Management

- **POST /api/docs/upload**
  - Header: `Authorization: Bearer <token>`
  - Form data: `file` (PDF/DOCX/TXT)
  - Response: `{ "docId": "...", "status": "processed" }`

- **GET /api/docs/:docId/chunks**
  - Fetches metadata for chunks belonging to a document.

## Chat & Queries

- **POST /api/chat/query**
  - Header: `Authorization`
  - Body: `{ "question": "..." }`
  - Response: `{ "answer": "...", "sources": [ {"chunkId":"...","score":0.92} ] }`

- **POST /api/chat/summary**
  - Body: `{ "docId": "..." }`
  - Response: `{ "summary": "..." }`

- **POST /api/chat/quiz**
  - Body: `{ "docId": "...", "numQuestions": 5 }`
  - Response: `{ "questions": ["..."], "answers": ["..."] }`

Additional endpoints (e.g., user profile, listing documents) follow standard CRUD patterns.
