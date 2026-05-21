import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { sendVerificationEmail } from '@/lib/email'

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
    const verificationToken = randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone,
        cpf,
        isActive: false,
        verificationToken,
        verificationTokenExpiry,
        farms: {
          create: { name: farmName, city: farmCity, state: farmState, type: farmType },
        },
        subscription: {
          create: { plan: 'FREE', status: 'ACTIVE' },
        },
      },
    })

    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const host = request.headers.get('host') ?? 'agropec-saas.vercel.app'
    const baseUrl = `${proto}://${host}`
    await sendVerificationEmail(email, name, verificationToken, baseUrl)

    return NextResponse.json(
      { message: 'Conta criada! Verifique seu e-mail para ativar o acesso.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[REGISTER]', error)
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
