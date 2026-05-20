import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { verificationToken: token } })

    if (!user) {
      return NextResponse.json({ error: 'Token inválido ou já utilizado.' }, { status: 400 })
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Token expirado. Solicite um novo cadastro.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    })

    return NextResponse.json({ message: 'E-mail confirmado com sucesso! Você já pode fazer login.' })
  } catch (error) {
    console.error('[VERIFICAR]', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
