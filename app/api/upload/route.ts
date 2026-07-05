import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractTextFromPDF, chunkText } from "@/lib/pdf";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const text = await extractTextFromPDF(buffer);

    const chunks = chunkText(text, 500);

    console.log(`Total chunks: ${chunks.length}`);

    for (const chunk of chunks) {
      const embeddingRes = await fetch("https://api.cohere.com/v2/embed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts: [chunk],
          model: "embed-v4.0",
          input_type: "search_document",
          embedding_types: ["float"],
        }),
      });

      const embeddingData = await embeddingRes.json();

      const embedding = embeddingData.embeddings.float[0];

      const { error: insertError } = await supabaseAdmin
        .from("documents")
        .insert({
          content: chunk,
          embedding,
          metadata: { filename: file.name },
        });

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      message: `${chunks.length} chunks processed successfully`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 },
    );
  }
}
