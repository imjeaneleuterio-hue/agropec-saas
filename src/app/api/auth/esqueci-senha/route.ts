import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })

    // Sempre retorna sucesso para não revelar quais emails estão cadastrados
    if (!user) {
      return NextResponse.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' })
    }

    const resetToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })

    await sendPasswordResetEmail(email, user.name, resetToken)

    return NextResponse.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' })
  } catch (error) {
    console.error('[ESQUECI-SENHA]', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
