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

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()

    if (body.markAllRead) {
      const farmId = await getActiveFarmId(session.userId)
      if (farmId) {
        await prisma.alert.updateMany({
          where: { farmId, isRead: false },
          data: { isRead: true },
        })
      }
      return NextResponse.json({ message: 'Todos os alertas marcados como lidos' })
    }

    if (body.id) {
      await prisma.alert.update({ where: { id: body.id }, data: { isRead: true } })
      return NextResponse.json({ message: 'Alerta marcado como lido' })
    }

    return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
