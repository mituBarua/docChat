import PDFParser from "pdf2json";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      const text = pdfData.Pages.map((page: any) =>
        page.Texts.map((t: any) => {
          try {
            return decodeURIComponent(t.R[0].T);
          } catch {
            return t.R[0].T;
          }
        }).join(" "),
      ).join("\n");
      resolve(text);
    });

    pdfParser.on("pdfParser_dataError", (error: any) => {
      reject(error);
    });

    pdfParser.parseBuffer(buffer);
  });
}

export function chunkText(text: string, chunkSize: number = 500): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (const word of words) {
    currentChunk.push(word);

    if (currentChunk.length >= chunkSize) {
      chunks.push(currentChunk.join(" "));
      currentChunk = currentChunk.slice(-50);
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
