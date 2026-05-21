import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const sub = await request.json()
    const endpoint: string = sub?.endpoint
    const p256dh: string = sub?.keys?.p256dh
    const auth: string = sub?.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: session.userId, endpoint } },
      update: { p256dh, auth },
      create: { userId: session.userId, endpoint, p256dh, auth },
    })

    return NextResponse.json({ message: 'Notificações ativadas' })
  } catch (error) {
    console.error('[PUSH SUBSCRIBE]', error)
    return NextResponse.json({ error: 'Erro ao salvar subscription' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: 'Endpoint obrigatório' }, { status: 400 })

    await prisma.pushSubscription.deleteMany({
      where: { userId: session.userId, endpoint },
    })

    return NextResponse.json({ message: 'Notificações desativadas' })
  } catch (error) {
    console.error('[PUSH UNSUBSCRIBE]', error)
    return NextResponse.json({ error: 'Erro ao remover subscription' }, { status: 500 })
  }
}
