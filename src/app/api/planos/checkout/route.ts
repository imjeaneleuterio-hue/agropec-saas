import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { getSession } from '@/lib/auth'
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

    const planData = PLANS[plan]
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const host = request.headers.get('host') ?? 'agropec-saas.vercel.app'
    const baseUrl = `${proto}://${host}`

    const preference = new Preference(mp)
    const result = await preference.create({
      body: {
        items: [{
          id: `jeleupec_${plan.toLowerCase()}`,
          title: `J.ELEUPEC ${planData.name} — Mensal`,
          quantity: 1,
          unit_price: planData.price,
          currency_id: 'BRL',
        }],
        back_urls: {
          success: `${baseUrl}/planos?status=aprovado`,
          failure: `${baseUrl}/planos?status=erro`,
          pending: `${baseUrl}/planos?status=pendente`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/planos/webhook`,
        external_reference: `${session.userId}:${plan}`,
        statement_descriptor: 'JELEUPEC',
        payment_methods: {
          excluded_payment_types: [],
          installments: 1,
        },
      },
    })

    return NextResponse.json({ checkoutUrl: result.init_point })
  } catch (error) {
    console.error('[CHECKOUT]', error)
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 })
  }
}
