import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_PAGES = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;
    const limited = await rateLimit(user.value, "resume");
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "That file is too large. Upload a resume under 2 MB." },
        { status: 413 }
      );
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf") || fileType === "application/pdf";
    const isText =
      fileName.endsWith(".txt") || fileName.endsWith(".md") || fileType === "text/plain" || fileType === "text/markdown";

    if (!isPdf && !isText) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, TXT or Markdown file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Checking the file's first bytes, not just its name, keeps other binaries out of pdf-parse
    if (isPdf && buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json(
        { error: "That file isn't a valid PDF. Upload a PDF, TXT or Markdown file." },
        { status: 400 }
      );
    }

    let extractedText = "";
    if (isPdf) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      // Only the first pages matter for a resume; skipping the rest bounds parse time
      const parsed = await pdfParse(buffer, { max: MAX_PDF_PAGES });
      extractedText = parsed.text || "";
    } else {
      extractedText = buffer.toString("utf-8");
    }

    // Clean up excessive whitespace / empty lines
    const cleanedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanedText) {
      return NextResponse.json(
        { error: "Could not extract readable text from the file." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: cleanedText,
      fileName: file.name,
      characterCount: cleanedText.length,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[/api/resume/parse] Error:", error);
    return NextResponse.json(
      { error: `Failed to parse uploaded resume file: ${errMessage}` },
      { status: 500 }
    );
  }
}
