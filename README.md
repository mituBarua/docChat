# DocChat — Chat with Your Documents

A privacy-first AI document assistant. Upload any PDF and have a natural conversation with it — powered by RAG (Retrieval-Augmented Generation) and Cohere AI.

**Live demo:** https://doc-chat-phi-eosin.vercel.app

---

## What it does

Most AI tools send your documents to external servers. DocChat stores everything in your own Supabase database — your files never leave your control.

Upload a PDF. Ask anything. Get answers cited from your own document.

```
You: "What are the key skills mentioned?"
AI:  "The document highlights React, Next.js, TypeScript,
      Supabase, Stripe, and Cohere AI..."
```

---

## Features

- **Multi-document support** — upload multiple PDFs, each with its own chat history
- **RAG pipeline** — answers come from your document, not from general AI knowledge
- **Source filtering** — each document's chunks are searched independently
- **Conversation memory** — follow-up questions understand context from previous answers
- **Delete documents** — removes chunks from the vector database
- **Clear chat** — reset conversation without losing the document
- **Upload validation** — PDF-only, 10MB limit, clear error messages

---

## How it works

```
Upload flow:
PDF → Extract text → Split into chunks (500 words) → 
Embed with Cohere → Store vectors in Supabase pgvector

Query flow:
Question → Embed with Cohere → Search similar chunks → 
Top 5 chunks + conversation history → Cohere chat → Answer
```

The key detail: `input_type: 'search_document'` for uploads and `input_type: 'search_query'` for questions. This asymmetry is what makes retrieval accurate.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| AI | Cohere `embed-v4.0` (1536 dimensions), `command-a-03-2025` |
| Database | Supabase PostgreSQL + pgvector |
| Deployment | Vercel |

---

## Getting started

**1. Clone and install**

```bash
git clone https://github.com/mituBarua/doc-chat
cd doc-chat
npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
COHERE_API_KEY=your-cohere-api-key
```

**3. Set up Supabase**

Run these in your Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_filename TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
    AND (filter_filename IS NULL OR metadata->>'filename' = filter_filename)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

**4. Run locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Known limitations

- PDF text extraction depends on document quality — scanned PDFs may not extract well
- Chunk size is fixed at 500 words — not yet sentence-aware
- No user authentication — all documents visible to anyone with the URL
- Cohere free tier has rate limits on large uploads

---

## What's next

- [ ] Streaming responses
- [ ] Word and Excel support  
- [ ] User authentication — per-user document isolation
- [ ] Hybrid search — vector + keyword combined
- [ ] Better chunking — sentence boundary aware

---

## Built by

Mitu Barua — [GitHub](https://github.com/mituBarua) · [LinkedIn](https://www.linkedin.com/in/mitu-barua-19a762160/)
