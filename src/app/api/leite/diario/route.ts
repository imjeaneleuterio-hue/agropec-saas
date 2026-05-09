import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { z } from 'zod'

const schema = z.object({
  date: z.string().min(1),
  morningLiters: z.coerce.number().min(0).default(0),
  afternoonLiters: z.coerce.number().min(0).default(0),
  eveningLiters: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') ?? '60')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const records = await prisma.dailyMilkTotal.findMany({
      where: {
        farmId,
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('[DAILY MILK GET]', error)
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

    const { morningLiters, afternoonLiters, eveningLiters, ...rest } = parsed.data
    const totalLiters = morningLiters + afternoonLiters + eveningLiters

    if (totalLiters <= 0) {
      return NextResponse.json({ error: 'Informe ao menos um valor de produção.' }, { status: 400 })
    }

    const dateObj = new Date(parsed.data.date)
    // upsert: one record per farm per day
    const record = await prisma.dailyMilkTotal.upsert({
      where: { farmId_date: { farmId, date: dateObj } },
      update: { morningLiters, afternoonLiters, eveningLiters, totalLiters, notes: rest.notes },
      create: { farmId, date: dateObj, morningLiters, afternoonLiters, eveningLiters, totalLiters, notes: rest.notes },
    })

    return NextResponse.json({ data: record, message: 'Produção do dia registrada' }, { status: 201 })
  } catch (error) {
    console.error('[DAILY MILK POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
