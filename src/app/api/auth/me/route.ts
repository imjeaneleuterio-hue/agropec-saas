import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, cpf: true, avatar: true, isActive: true, createdAt: true,
        farms: { select: { id: true, name: true, type: true, city: true, state: true } },
        subscription: { select: { plan: true, status: true, endDate: true } },
      },
    })

    if (!user || !user.isActive) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('[ME]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: parsed.data,
      select: { id: true, name: true, email: true, phone: true, cpf: true },
    })

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
