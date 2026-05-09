import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { name, email, password, phone, cpf, farmName, farmCity, farmState, farmType } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone,
        cpf,
        farms: {
          create: {
            name: farmName,
            city: farmCity,
            state: farmState,
            type: farmType,
          },
        },
        subscription: {
          create: { plan: 'FREE', status: 'ACTIVE' },
        },
      },
      include: { farms: { select: { id: true } } },
    })

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      farmId: user.farms[0]?.id,
    })

    const response = NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: 'Conta criada com sucesso',
    }, { status: 201 })

    response.cookies.set('jeleupec_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[REGISTER]', error)
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
