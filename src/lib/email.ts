import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'J.ELEUPEC <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'J.ELEUPEC'

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/verificar?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Confirme seu cadastro — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#166534;margin-bottom:8px">${APP_NAME}</h2>
        <h3 style="color:#111827;font-size:20px;margin-bottom:16px">Confirme seu e-mail</h3>
        <p style="color:#374151;font-size:15px">Olá, <strong>${name}</strong>!</p>
        <p style="color:#374151;font-size:15px">Clique no botão abaixo para ativar sua conta:</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#16a34a;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
          Confirmar cadastro
        </a>
        <p style="color:#6b7280;font-size:13px">Este link expira em 24 horas.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px">
          Se você não criou uma conta no ${APP_NAME}, ignore este e-mail.
        </p>
      </div>
    `,
  })
}
