import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { z } from 'zod'

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  pricePerLiter: z.coerce.number().positive('Informe um preço válido.'),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const prices = await prisma.milkPrice.findMany({
      where: { farmId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({ data: prices })
  } catch (error) {
    console.error('[MILK PRICE GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const { year, month, pricePerLiter, notes } = parsed.data

    const record = await prisma.milkPrice.upsert({
      where: { farmId_year_month: { farmId, year, month } },
      update: { pricePerLiter, notes },
      create: { farmId, year, month, pricePerLiter, notes },
    })

    return NextResponse.json({ data: record, message: 'Preço registrado com sucesso' }, { status: 201 })
  } catch (error) {
    console.error('[MILK PRICE POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
