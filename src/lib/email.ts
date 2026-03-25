import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Send an admin alert email. Fire-and-forget — never blocks the caller.
 */
export function sendAdminEmail(subject: string, body: string): void {
  const to = process.env.ADMIN_EMAIL || 'dan@rivyls.com'
  const from = process.env.SMTP_USER || 'dan@rivyls.com'

  transporter.sendMail({
    from: `Rivyls <${from}>`,
    to,
    subject,
    html: body,
  }).catch((err) => {
    console.error('[email] Failed to send admin email:', err.message)
  })
}

/**
 * Send an email to a user. Fire-and-forget — never blocks the caller.
 */
export function sendUserEmail(to: string, subject: string, body: string): void {
  const from = process.env.SMTP_USER || 'dan@rivyls.com'

  transporter.sendMail({
    from: `Rivyls <${from}>`,
    to,
    subject,
    html: body,
  }).catch((err) => {
    console.error('[email] Failed to send user email:', err.message)
  })
}
