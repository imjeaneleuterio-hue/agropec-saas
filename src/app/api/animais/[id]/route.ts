import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { animalSchema } from '@/lib/validations'

async function findAnimal(animalId: string) {
  return prisma.animal.findUnique({ where: { id: animalId } })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const animal = await prisma.animal.findFirst({
      where: { id },
      include: {
        weightRecords: { orderBy: { date: 'desc' } },
        milkProductions: { orderBy: { date: 'desc' }, take: 30 },
        reproductiveEvents: { orderBy: { date: 'desc' } },
        healthRecords: { orderBy: { date: 'desc' } },
      },
    })

    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    return NextResponse.json({ data: animal })
  } catch (error) {
    console.error('[ANIMAL GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const animal = await findAnimal(id)
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })

    const body = await request.json()
    const parsed = animalSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const updated = await prisma.animal.update({
      where: { id },
      data: {
        ...parsed.data,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
      },
    })

    return NextResponse.json({ data: updated, message: 'Animal atualizado com sucesso' })
  } catch (error) {
    console.error('[ANIMAL PUT]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const animal = await findAnimal(id)
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })

    await prisma.animal.delete({ where: { id } })
    return NextResponse.json({ message: 'Animal removido com sucesso' })
  } catch (error) {
    console.error('[ANIMAL DELETE]', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
