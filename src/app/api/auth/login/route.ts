import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: { farms: { select: { id: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    // Verifica bloqueio por tentativas excessivas
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      const newAttempts = (user.loginAttempts ?? 0) + 1
      const shouldLock = newAttempts >= MAX_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      })
      if (shouldLock) {
        return NextResponse.json(
          { error: `Muitas tentativas incorretas. Conta bloqueada por ${LOCKOUT_MINUTES} minutos.` },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    // Login bem-sucedido: zera contador
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    })

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      farmId: user.farms[0]?.id,
    })

    const response = NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: 'Login realizado com sucesso',
    })

    response.cookies.set('jeleupec_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[LOGIN]', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
