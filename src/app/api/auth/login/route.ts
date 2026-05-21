import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed, retryAfterSeconds } = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} minutos.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

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

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

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
