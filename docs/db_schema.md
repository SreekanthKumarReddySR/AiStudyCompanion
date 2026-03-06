# Database Schema (MongoDB)

## User
```json
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Document
```json
{
  _id: ObjectId,
  userId: ObjectId,      // reference to User
  filename: String,
  contentType: String,
  originalText: String,  // raw extracted text
  uploadedAt: Date,
  processed: Boolean,
  chunkCount: Number
}
```

## Chunk
```json
{
  _id: ObjectId,
  docId: ObjectId,       // reference to Document
  index: Number,         // order
  text: String,
  vectorId: String,      // id in vector DB
  createdAt: Date
}
```

Optional additional collections:

- `QueryLog` for storing user queries and answers.

## Vector Storage Design
Vectors are stored outside MongoDB in a vector database (e.g., Chroma or FAISS). Each entry includes:

```json
{
  vectorId: String,      // unique identifier (could be same as chunk _id)
  embedding: [Number],   // float array
  metadata: {
    docId: "...",
    chunkIndex: 5,
    textSnippet: "..."
  }
}
```

Metadata aids retrieval and ranking; the vector store supports similarity search by cosine or inner product.
