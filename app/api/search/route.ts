import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {

    const { question, history = [], filename } = await request.json()

    if (!question || question.trim() === '') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }


    const embeddingRes = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [question],
        model: 'embed-v4.0',
        input_type: 'search_query',
        embedding_types: ['float'],
      }),
    })

    const embeddingData = await embeddingRes.json()
    const questionEmbedding = embeddingData.embeddings.float[0]


    const { data: similarChunks, error } = await supabaseAdmin.rpc(
      'match_documents',
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.1,
        match_count: 5,
        filter_filename: filename || null,
      }
    )

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    if (!similarChunks || similarChunks.length === 0) {
      return NextResponse.json({ answer: 'No relevant information found in the documents.' })
    }


    const context = similarChunks
      .map((chunk: any, i: number) => `Source ${i + 1}:\n${chunk.content}`)
      .join('\n\n')


    const chatRes = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant. Answer questions based ONLY on the provided context. 
If the answer is not in the context, say "I don't have information about that in the documents."
Be concise. Do not mention source numbers unless specifically asked.`,
          },

          ...history,

          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
    })

    const chatData = await chatRes.json()
    const answer = chatData.message.content[0].text

    return NextResponse.json({
      answer,
      sources: similarChunks.map((chunk: any) => chunk.metadata?.filename)
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}