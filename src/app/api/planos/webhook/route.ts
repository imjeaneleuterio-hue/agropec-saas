import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { prisma } from '@/lib/prisma'
import type { PlanKey } from '@/lib/plans'

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '' })

async function activatePlan(userId: string, plan: PlanKey, preapprovalId?: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } })
  const base = existing?.endDate && existing.endDate > new Date() ? existing.endDate : new Date()
  const endDate = new Date(base)
  endDate.setDate(endDate.getDate() + 31)
  await prisma.subscription.upsert({
    where: { userId },
    update: { plan, status: 'ACTIVE', endDate, ...(preapprovalId && { preapprovalId }) },
    create: { userId, plan, status: 'ACTIVE', endDate, preapprovalId },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const topic = body?.type ?? body?.topic
    const id = body?.data?.id ?? body?.id

    if (!id) return NextResponse.json({ ok: true })

    // Assinatura autorizada ou atualizada
    if (topic === 'subscription_preapproval') {
      const preApproval = new PreApproval(mp)
      const sub = await preApproval.get({ id })

      if (sub.status === 'authorized') {
        const ref = sub.external_reference ?? ''
        const [userId, plan] = ref.split(':') as [string, PlanKey]
        if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
          await activatePlan(userId, plan, id)
        }
      }

      // Assinatura cancelada/pausada — reverte para FREE
      if (sub.status === 'cancelled' || sub.status === 'paused') {
        const ref = sub.external_reference ?? ''
        const [userId] = ref.split(':')
        if (userId) {
          await prisma.subscription.updateMany({
            where: { userId },
            data: { plan: 'FREE', status: 'INACTIVE', endDate: new Date() },
          })
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Pagamento mensal da assinatura
    if (topic === 'subscription_authorized_payment') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payment = await res.json()

      if (payment.status !== 'approved' || !payment.preapproval_id) {
        return NextResponse.json({ ok: true })
      }

      const preApproval = new PreApproval(mp)
      const sub = await preApproval.get({ id: payment.preapproval_id })
      const ref = sub.external_reference ?? ''
      const [userId, plan] = ref.split(':') as [string, PlanKey]

      if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
        await activatePlan(userId, plan)
      }

      return NextResponse.json({ ok: true })
    }

    // Pagamento avulso legado (retrocompatibilidade)
    if (topic === 'payment') {
      const { Payment } = await import('mercadopago')
      const payment = new Payment(mp)
      const data = await payment.get({ id })

      if (data.status === 'approved') {
        const ref = data.external_reference ?? ''
        const [userId, plan] = ref.split(':') as [string, PlanKey]
        if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
          await activatePlan(userId, plan)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[WEBHOOK MP]', error)
    return NextResponse.json({ ok: true })
  }
}
