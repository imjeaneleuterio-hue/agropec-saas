import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { addDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const withinDays = searchParams.get('withinDays')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const dueDateFilter = withinDays
      ? { OR: [{ dueDate: null }, { dueDate: { lte: addDays(new Date(), parseInt(withinDays)) } }] }
      : {}

    const alerts = await prisma.alert.findMany({
      where: {
        farmId,
        ...(unreadOnly && { isRead: false }),
        ...dueDateFilter,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ data: alerts })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    await prisma.alert.deleteMany({ where: { id, farmId } })
    return NextResponse.json({ message: 'Alerta removido' })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
