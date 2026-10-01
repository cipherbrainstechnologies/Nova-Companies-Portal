import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/server/email";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  topic: z.enum(["eor", "payroll", "careers", "other"]),
  message: z.string().trim().min(20).max(4000),
  website: z.string().max(200).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid", fields: [] }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => String(issue.path[0] ?? ""));
    return NextResponse.json({ error: "invalid", fields }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const inbox = process.env.CONTACT_INBOX ?? "thenovaworkforce@gmail.com";
  const topic = parsed.data.topic;
  try {
    await sendEmail({
      to: inbox,
      subject: `Nova Group enquiry (${topic})`,
      text: [
        `Name: ${parsed.data.name}`,
        `Email: ${parsed.data.email}`,
        `Company: ${parsed.data.organisation || "-"}`,
        `Phone: ${parsed.data.phone || "-"}`,
        `Topic: ${topic}`,
        "",
        parsed.data.message,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[contact] send failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
