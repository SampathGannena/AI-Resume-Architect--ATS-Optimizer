// Client-side parsers for PDF and DOCX → plain text
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return parsePdf(file);
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value.trim();
  }
  // .txt / .md fallback
  return (await file.text()).trim();
}

async function parsePdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const out: string[] = [];

  const normalize = (value: string) =>
    value
      .replace(/\u00A0/g, " ")
      .replace(/[\t\f\v]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    type PdfTextItem = { str: string; transform?: number[]; hasEOL?: boolean; width?: number };
    const textItems = (content.items as PdfTextItem[])
      .filter((it) => typeof it?.str === "string" && it.str.trim().length > 0)
      .map((it) => {
        const x = Array.isArray(it.transform) ? Number(it.transform[4] || 0) : 0;
        const y = Array.isArray(it.transform) ? Number(it.transform[5] || 0) : 0;
        return {
          text: normalize(it.str),
          x,
          y,
          hasEOL: Boolean(it.hasEOL),
        };
      })
      .filter((it) => it.text.length > 0);

    // Keep page reading order stable by sorting top-to-bottom, then left-to-right.
    textItems.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 1.5) return dy;
      return a.x - b.x;
    });

    const lines: { y: number; parts: string[] }[] = [];
    for (const item of textItems) {
      let line = lines.find((l) => Math.abs(l.y - item.y) <= 2);
      if (!line) {
        line = { y: item.y, parts: [] };
        lines.push(line);
      }
      line.parts.push(item.text);
      if (item.hasEOL) {
        line.y -= 3;
      }
    }

    lines.sort((a, b) => b.y - a.y);
    const pageText = lines
      .map((line) => normalize(line.parts.join(" ")))
      .filter(Boolean)
      .join("\n");

    out.push(pageText);
  }
  return out.join("\n\n").trim();
}
