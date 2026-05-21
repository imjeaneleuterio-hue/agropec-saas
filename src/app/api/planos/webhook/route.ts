import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'
import type { PlanKey } from '@/lib/plans'

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '' })

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    // MP envia tanto IPN quanto Webhooks — normaliza o ID
    const paymentId = body?.data?.id ?? body?.id
    const topic = body?.type ?? body?.topic

    if (topic !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    const payment = new Payment(mp)
    const data = await payment.get({ id: paymentId })

    if (data.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    const ref = data.external_reference ?? ''
    const [userId, plan] = ref.split(':') as [string, PlanKey]

    if (!userId || (plan !== 'PRO' && plan !== 'PREMIUM')) {
      return NextResponse.json({ ok: true })
    }

    // Estende 31 dias a partir da data de expiração atual (ou de hoje)
    const existing = await prisma.subscription.findUnique({ where: { userId } })
    const base = existing?.endDate && existing.endDate > new Date() ? existing.endDate : new Date()
    const endDate = new Date(base)
    endDate.setDate(endDate.getDate() + 31)

    await prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'ACTIVE', endDate },
      create: { userId, plan, status: 'ACTIVE', endDate },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[WEBHOOK MP]', error)
    return NextResponse.json({ ok: true }) // sempre 200 pro MP não retentar
  }
}
