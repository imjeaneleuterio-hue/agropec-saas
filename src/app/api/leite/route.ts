import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { milkProductionSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animalId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') ?? '30')

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { farms: { include: { animals: { select: { id: true } } } } },
    })
    const animalIds = user?.farms.flatMap((f) => f.animals.map((a) => a.id)) ?? []
    const filteredId = animalId && animalIds.includes(animalId) ? animalId : null

    const records = await prisma.milkProduction.findMany({
      where: {
        animalId: filteredId ? filteredId : { in: animalIds },
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
      },
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        animal: { select: { id: true, name: true, tag: true, breed: true } },
      },
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('[MILK GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = milkProductionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const animal = await prisma.animal.findFirst({ where: { id: parsed.data.animalId, farmId } })
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })

    const { morningLiters = 0, afternoonLiters = 0, eveningLiters = 0, ...rest } = parsed.data
    const totalLiters = morningLiters + afternoonLiters + eveningLiters

    const record = await prisma.milkProduction.create({
      data: {
        ...rest,
        morningLiters,
        afternoonLiters,
        eveningLiters,
        totalLiters,
        date: new Date(parsed.data.date),
      },
    })

    return NextResponse.json({ data: record, message: 'Produção registrada' }, { status: 201 })
  } catch (error) {
    console.error('[MILK POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
