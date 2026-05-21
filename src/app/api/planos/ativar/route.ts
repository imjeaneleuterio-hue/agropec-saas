import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PlanKey } from '@/lib/plans'

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '' })

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { paymentId } = await request.json()
    if (!paymentId) return NextResponse.json({ error: 'Payment ID ausente' }, { status: 400 })

    const payment = new Payment(mp)
    const data = await payment.get({ id: String(paymentId) })

    console.log('[ATIVAR] payment:', data.id, 'status:', data.status, 'ref:', data.external_reference)

    if (data.status !== 'approved') {
      return NextResponse.json({ error: 'Pagamento não aprovado', status: data.status }, { status: 400 })
    }

    const ref = data.external_reference ?? ''
    const [userId, plan] = ref.split(':') as [string, PlanKey]

    // Garante que o pagamento pertence ao usuário logado
    if (userId !== session.userId) {
      return NextResponse.json({ error: 'Pagamento não pertence a esta conta' }, { status: 403 })
    }

    if (plan !== 'PRO' && plan !== 'PREMIUM') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const existing = await prisma.subscription.findUnique({ where: { userId } })
    const base = existing?.endDate && existing.endDate > new Date() ? existing.endDate : new Date()
    const endDate = new Date(base)
    endDate.setDate(endDate.getDate() + 31)

    await prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'ACTIVE', endDate },
      create: { userId, plan, status: 'ACTIVE', endDate },
    })

    return NextResponse.json({ ok: true, plan, endDate })
  } catch (error) {
    console.error('[ATIVAR]', error)
    return NextResponse.json({ error: 'Erro ao ativar plano' }, { status: 500 })
  }
}
