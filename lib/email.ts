import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT ?? "587");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; skipped: true }> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[email] SMTP belum dikonfigurasi — email dilewati:",
        options.subject,
        "→",
        options.to,
      );
    }
    return { ok: false, skipped: true };
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL ?? process.env.SMTP_USER,
  });

  if (process.env.NODE_ENV === "development") {
    console.info("[email] terkirim:", options.to, info.messageId);
  }

  return { ok: true, messageId: info.messageId };
}
