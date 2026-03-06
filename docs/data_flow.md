# End-to-End Data Flow

1. **User Login/Signup**: Frontend posts credentials to `/api/auth`. Backend verifies or creates user in MongoDB, returns JWT.

2. **Document Upload**:
   - Frontend sends file via `/api/docs/upload` with auth token.
   - Backend saves file temporarily, extracts text using `textract` or `pdf-parse`.
   - Clean text (remove headers/footers), store in `Document` collection.
   - Chunk text into segments (e.g., 500 tokens with 50-token overlap) and store each in `Chunk` collection.
   - For each chunk, call embedding API and insert vector+metadata into vector DB. Update `vectorId` in chunk record.

3. **User Query**:
   - Chat UI sends question to `/api/chat/query`.
   - Backend embeds question to vector, queries vector DB for top-`k` nearest chunks.
   - Retrieved chunks are ranked by similarity score from vector DB; optionally cross-encoder re-ranks.
   - Build prompt using `QA Prompt` template, injecting top chunks and user question.
   - Call LLM to generate answer; store query/answer pair in `QueryLog`.
   - Return answer and sources to frontend.

4. **Summary or Quiz Request**:
   - Similar process: load relevant document text from DB, build prompt, call LLM, return results.

5. **Frontend Display**:
   - Chat-style interface shows conversation history, answers, and citations.
   - File upload page shows progress and document processing status.
   - Summary and quiz pages display output accordingly.

Throughout the pipeline, logs are maintained for auditing, and errors are handled gracefully with user-friendly messages.
