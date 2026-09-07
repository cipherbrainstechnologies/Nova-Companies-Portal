import { createHash } from "crypto";

export async function generatePayslipPdf(html: string): Promise<{ buffer: Buffer; sha256: string }> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith("data:") || url === "about:blank") return route.continue();
        return route.abort();
      });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const buffer = Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        }),
      );
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      await context.close();
      return { buffer, sha256 };
    } finally {
      await browser.close();
    }
  } catch {
    // Fallback minimal PDF for environments without Playwright browsers.
    const escaped = html.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const content = `BT /F1 10 Tf 40 750 Td (${escaped.slice(0, 1200).replace(/\n/g, " ")}) Tj ET`;
    const objects = [
      "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
      "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
      "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
      `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
      "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += obj;
    }
    const xrefPos = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    const buffer = Buffer.from(pdf, "utf8");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    return { buffer, sha256 };
  }
}
