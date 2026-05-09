import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { weightRecordSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animalId')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const records = await prisma.weightRecord.findMany({
      where: {
        animal: { farmId },
        ...(animalId && { animalId }),
      },
      orderBy: { date: 'desc' },
      take: 100,
      include: {
        animal: { select: { id: true, name: true, tag: true, breed: true, type: true } },
      },
    })

    return NextResponse.json({ data: records })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = weightRecordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const record = await prisma.weightRecord.create({
      data: { ...parsed.data, date: new Date(parsed.data.date) },
      include: { animal: { select: { id: true, name: true, tag: true } } },
    })

    return NextResponse.json({ data: record, message: 'Pesagem registrada com sucesso' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
