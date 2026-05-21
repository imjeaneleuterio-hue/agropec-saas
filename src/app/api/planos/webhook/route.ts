import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment, PreApproval } from 'mercadopago'
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

async function processPayment(paymentId: string) {
  const payment = new Payment(mp)
  const data = await payment.get({ id: paymentId })
  console.log('[WEBHOOK] payment status:', data.status, 'ref:', data.external_reference)
  if (data.status !== 'approved') return
  const ref = data.external_reference ?? ''
  const [userId, plan] = ref.split(':') as [string, PlanKey]
  if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
    await activatePlan(userId, plan)
    console.log('[WEBHOOK] plano ativado:', userId, plan)
  }
}

export async function POST(request: Request) {
  try {
    // Lê body e query params — MP usa formatos diferentes dependendo da versão
    const { searchParams } = new URL(request.url)
    const body = await request.json().catch(() => ({}))

    // Normaliza topic e id dos dois formatos (webhook novo e IPN antigo)
    const topic = body?.type ?? body?.topic ?? searchParams.get('topic') ?? ''
    const id = body?.data?.id ?? body?.id ?? searchParams.get('id') ?? ''

    console.log('[WEBHOOK] topic:', topic, 'id:', id)

    if (!id) return NextResponse.json({ ok: true })

    if (topic === 'payment') {
      await processPayment(String(id))
      return NextResponse.json({ ok: true })
    }

    if (topic === 'subscription_preapproval') {
      const preApproval = new PreApproval(mp)
      const sub = await preApproval.get({ id: String(id) })
      if (sub.status === 'authorized') {
        const ref = sub.external_reference ?? ''
        const [userId, plan] = ref.split(':') as [string, PlanKey]
        if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
          await activatePlan(userId, plan, String(id))
        }
      }
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

    if (topic === 'subscription_authorized_payment') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const apData = await res.json()
      if (apData.status === 'approved' && apData.preapproval_id) {
        const preApproval = new PreApproval(mp)
        const sub = await preApproval.get({ id: apData.preapproval_id })
        const ref = sub.external_reference ?? ''
        const [userId, plan] = ref.split(':') as [string, PlanKey]
        if (userId && (plan === 'PRO' || plan === 'PREMIUM')) {
          await activatePlan(userId, plan)
        }
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[WEBHOOK MP]', error)
    return NextResponse.json({ ok: true })
  }
}
