import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cep: z.string().optional(),
  hectares: z.coerce.number().positive().optional(),
  type: z.enum(['DAIRY', 'BEEF', 'MIXED']).optional(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: null })
    const farm = await prisma.farm.findUnique({ where: { id: farmId } })
    return NextResponse.json({ data: farm })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const updated = await prisma.farm.update({
      where: { id: farmId },
      data: parsed.data,
    })

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
