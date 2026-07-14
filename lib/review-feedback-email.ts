import { sendEmail } from "@/lib/email";

function starsLabel(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendGuestConfirmationEmail(params: {
  guestEmail: string;
  guestName: string;
  roomName: string;
  rating: number;
  comment: string | null;
  reservationId: string;
}): Promise<boolean> {
  try {
    const roomName = escapeHtml(params.roomName);
    const commentBlock = params.comment
      ? `<p style="margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px;">${escapeHtml(params.comment)}</p>`
      : `<p style="color:#6b7280;font-style:italic;">Tanpa komentar teks</p>`;

    const result = await sendEmail({
      to: params.guestEmail,
      subject: `Konfirmasi ulasan BookHotel - ${params.roomName}`,
      text: [
        `Halo ${params.guestName},`,
        "",
        `Ulasan Anda untuk kamar "${params.roomName}" telah kami terima.`,
        `Rating: ${params.rating}/5`,
        params.comment ? `Komentar: ${params.comment}` : "",
        "",
        "Ulasan akan tampil di halaman kamar untuk membantu tamu lain.",
        "",
        "Email ini dikirim otomatis, mohon tidak membalas.",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:520px;color:#111827;">
          <p>Halo <strong>${escapeHtml(params.guestName)}</strong>,</p>
          <p>Terima kasih sudah mengulas penginapan Anda di <strong>${roomName}</strong>.</p>
          <p style="margin:16px 0;font-size:18px;color:#eab308;">${starsLabel(params.rating)} <span style="font-size:14px;color:#6b7280;">(${params.rating}/5)</span></p>
          ${commentBlock}
          <p style="font-size:13px;color:#6b7280;">Ulasan ini terkait reservasi <code>#${escapeHtml(params.reservationId.slice(0, 12))}</code> dan akan tampil di halaman kamar.</p>
        </div>
      `,
    });

    return result.ok;
  } catch (error) {
    console.error(
      "[review-email] gagal kirim konfirmasi tamu:",
      params.guestEmail,
      error,
    );
    return false;
  }
}

async function sendAdminNotificationEmail(params: {
  guestEmail: string;
  guestName: string;
  roomName: string;
  rating: number;
  comment: string | null;
  reservationId: string;
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (!adminEmail) return false;

  try {
    const roomName = escapeHtml(params.roomName);
    const result = await sendEmail({
      to: adminEmail,
      subject: `[Ulasan baru] ${params.roomName} - ${params.rating}/5`,
      text: [
        "Ulasan baru diterima.",
        "",
        `Tamu: ${params.guestName} (${params.guestEmail})`,
        `Kamar: ${params.roomName}`,
        `Rating: ${params.rating}/5`,
        params.comment ? `Komentar: ${params.comment}` : "",
        `Reservasi: ${params.reservationId}`,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:520px;color:#111827;">
          <h2 style="font-size:18px;margin:0 0 12px;">Ulasan baru</h2>
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#6b7280;">Tamu</td><td><strong>${escapeHtml(params.guestName)}</strong> (${escapeHtml(params.guestEmail)})</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Kamar</td><td>${roomName}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Rating</td><td>${starsLabel(params.rating)} (${params.rating}/5)</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;vertical-align:top;">Komentar</td><td>${params.comment ? escapeHtml(params.comment) : "<em>Tanpa komentar</em>"}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Reservasi</td><td><code>${escapeHtml(params.reservationId)}</code></td></tr>
          </table>
        </div>
      `,
    });

    return result.ok;
  } catch (error) {
    console.error(
      "[review-email] gagal kirim notifikasi admin:",
      adminEmail,
      error,
    );
    return false;
  }
}

export async function sendReviewFeedbackEmails(params: {
  guestEmail: string;
  guestName: string | null;
  roomName: string;
  rating: number;
  comment: string | null;
  reservationId: string;
}): Promise<{ guestSent: boolean; adminSent: boolean }> {
  const guestName = params.guestName?.trim() || "Tamu";
  const payload = { ...params, guestName };

  const [guestSent, adminSent] = await Promise.all([
    sendGuestConfirmationEmail(payload),
    sendAdminNotificationEmail(payload),
  ]);

  return { guestSent, adminSent };
}
