import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { id } = await params
    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })
    const animal = await prisma.animal.findFirst({ where: { id, farmId } })
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    const notes = await prisma.animalNote.findMany({
      where: { animalId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: notes })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { id } = await params
    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })
    const animal = await prisma.animal.findFirst({ where: { id, farmId } })
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    const { content } = await request.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Anotação vazia' }, { status: 400 })
    const note = await prisma.animalNote.create({ data: { animalId: id, content: content.trim() } })
    return NextResponse.json({ data: note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { id } = await params
    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })
    const { noteId } = await request.json()
    const note = await prisma.animalNote.findFirst({
      where: { id: noteId, animal: { id, farmId } },
    })
    if (!note) return NextResponse.json({ error: 'Anotação não encontrada' }, { status: 404 })
    await prisma.animalNote.delete({ where: { id: noteId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
