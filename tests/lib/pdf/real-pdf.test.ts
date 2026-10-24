// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/pdf/extractor";

/**
 * Builds a minimal, valid single-page PDF without adding a binary fixture.
 * The offsets in the cross-reference table are computed from the actual bytes.
 */
function buildMinimalPdf(text: string): ArrayBuffer {
  const content = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const encoded = Buffer.from(pdf, "latin1");
  const copy = new ArrayBuffer(encoded.length);
  new Uint8Array(copy).set(encoded);
  return copy;
}

describe("extractPdfText with a real PDF", () => {
  it("extracts text and the page count from a valid single-page PDF", async () => {
    const bytes = buildMinimalPdf(
      "We are pleased to offer you the internship at Acme Labs.",
    );
    const file = new File([bytes], "offer.pdf", { type: "application/pdf" });

    const result = await extractPdfText(file);

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("We are pleased to offer you the internship");
  });

  it("rejects a file whose declared type is PDF but whose content is not", async () => {
    const file = new File([new TextEncoder().encode("not a pdf")], "offer.pdf", {
      type: "application/pdf",
    });

    await expect(extractPdfText(file)).rejects.toMatchObject({
      code: "UNSUPPORTED_TYPE",
    });
  });
});
