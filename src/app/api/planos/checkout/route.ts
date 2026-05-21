import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANS, getUserPlan } from '@/lib/plans'
import type { PlanKey } from '@/lib/plans'

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '' })

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { plan } = await request.json() as { plan: PlanKey }
    if (plan !== 'PRO' && plan !== 'PREMIUM') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const currentPlan = await getUserPlan(session.userId)
    if (currentPlan === plan) {
      return NextResponse.json({ error: 'Você já possui este plano' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    })

    const planData = PLANS[plan]
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const host = request.headers.get('host') ?? 'agropec-saas.vercel.app'
    const baseUrl = `${proto}://${host}`

    const preApproval = new PreApproval(mp)
    const result = await preApproval.create({
      body: {
        reason: `J.ELEUPEC ${planData.name} — Mensal`,
        external_reference: `${session.userId}:${plan}`,
        payer_email: user?.email ?? '',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: planData.price,
          currency_id: 'BRL',
        },
        back_url: `${baseUrl}/planos?status=aprovado`,
        status: 'pending',
      },
    })

    return NextResponse.json({ checkoutUrl: result.init_point })
  } catch (error) {
    console.error('[CHECKOUT]', error)
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 })
  }
}
