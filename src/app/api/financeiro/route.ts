import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { financialRecordSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [], total: 0, page, totalPages: 0, summary: [] })

    const where = {
      farmId,
      ...(type && { type: type as 'INCOME' | 'EXPENSE' }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    }

    const [records, total, summary] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialRecord.count({ where }),
      prisma.financialRecord.groupBy({
        by: ['type'],
        where: { farmId },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({ data: records, total, page, totalPages: Math.ceil(total / limit), summary })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = financialRecordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const record = await prisma.financialRecord.create({
      data: { ...parsed.data, farmId, date: new Date(parsed.data.date) },
    })

    return NextResponse.json({ data: record, message: 'Lançamento registrado' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
