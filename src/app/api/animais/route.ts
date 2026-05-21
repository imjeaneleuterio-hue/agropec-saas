import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { animalSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const search = searchParams.get('search') ?? ''
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const sex = searchParams.get('sex')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 })

    const where = {
      farmId,
      ...(search && {
        OR: [
          { tag: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { breed: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(type && { type: type as 'DAIRY' | 'BEEF' }),
      ...(status && { status: status as 'ACTIVE' | 'SOLD' | 'DEAD' | 'TRANSFERRED' }),
      ...(sex && { sex: sex as 'MALE' | 'FEMALE' }),
    }

    const [animals, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          weightRecords: { orderBy: { date: 'desc' }, take: 1 },
          milkProductions: { orderBy: { date: 'desc' }, take: 1 },
        },
      }),
      prisma.animal.count({ where }),
    ])

    return NextResponse.json({ data: animals, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[ANIMALS GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = animalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const existing = await prisma.animal.findUnique({ where: { farmId_tag: { farmId, tag: parsed.data.tag } } })
    if (existing) {
      return NextResponse.json({ error: `Brinco ${parsed.data.tag} já cadastrado nesta fazenda` }, { status: 409 })
    }

    const animal = await prisma.animal.create({
      data: {
        ...parsed.data,
        farmId,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
        photoUrl: body.photoUrl,
      },
    })

    return NextResponse.json({ data: animal, message: 'Animal cadastrado com sucesso' }, { status: 201 })
  } catch (error) {
    console.error('[ANIMALS POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
