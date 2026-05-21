import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'J.ELEUPEC'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/login?token=${token}`

  await transporter.sendMail({
    from: `${APP_NAME} <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Redefinir senha — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#166534;margin-bottom:8px">${APP_NAME}</h2>
        <h3 style="color:#111827;font-size:20px;margin-bottom:16px">Redefinir senha</h3>
        <p style="color:#374151;font-size:15px">Olá, <strong>${name}</strong>!</p>
        <p style="color:#374151;font-size:15px">Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#16a34a;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
          Redefinir minha senha
        </a>
        <p style="color:#6b7280;font-size:13px">Este link expira em 1 hora.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px">
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `,
  })
}

export async function sendVerificationEmail(email: string, name: string, token: string, baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/api/auth/verificar?token=${token}`

  await transporter.sendMail({
    from: `${APP_NAME} <${process.env.GMAIL_USER}>`,
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
        <p style="color:#9ca3af;font-size:12px;margin-top:8px">
          Se o botão não funcionar, copie e cole este link no navegador:<br/>
          <a href="${link}" style="color:#16a34a;word-break:break-all">${link}</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px">
          Se você não criou uma conta no ${APP_NAME}, ignore este e-mail.
        </p>
      </div>
    `,
  })
}
