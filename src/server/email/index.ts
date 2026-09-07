export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    console.info("[email:console]", message.to, message.subject, message.text.slice(0, 80));
  }
}

class ResendEmailAdapter implements EmailAdapter {
  constructor(private apiKey: string, private from: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Email send failed: ${res.status} ${body}`);
    }
  }
}

export function getEmailAdapter(): EmailAdapter {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  const from = process.env.EMAIL_FROM ?? "Nova Portal <noreply@example.com>";
  if (provider === "resend" && process.env.EMAIL_API_KEY) {
    return new ResendEmailAdapter(process.env.EMAIL_API_KEY, from);
  }
  return new ConsoleEmailAdapter();
}

export async function sendEmail(message: EmailMessage) {
  return getEmailAdapter().send(message);
}
