import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password || password.length < 6) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } })

    if (!user) {
      return NextResponse.json({ error: 'Link inválido ou já utilizado.' }, { status: 400 })
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Link expirado. Solicite uma nova redefinição.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
        isActive: true,
      },
    })

    return NextResponse.json({ message: 'Senha redefinida com sucesso! Faça login com a nova senha.' })
  } catch (error) {
    console.error('[REDEFINIR-SENHA]', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
