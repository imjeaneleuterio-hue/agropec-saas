import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '' })

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const sub = await prisma.subscription.findUnique({ where: { userId: session.userId } })
    if (!sub || (sub.plan !== 'PRO' && sub.plan !== 'PREMIUM')) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa.' }, { status: 400 })
    }

    // Cancela no Mercado Pago se tiver o ID da assinatura
    if (sub.preapprovalId) {
      try {
        const preApproval = new PreApproval(mp)
        await preApproval.update({
          id: sub.preapprovalId,
          body: { status: 'cancelled' },
        })
      } catch (e) {
        console.error('[CANCELAR] Erro ao cancelar no MP:', e)
      }
    }

    // Marca como cancelado no banco — acesso até o endDate atual
    await prisma.subscription.update({
      where: { userId: session.userId },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ message: 'Assinatura cancelada. O acesso continua até o fim do período pago.' })
  } catch (error) {
    console.error('[CANCELAR]', error)
    return NextResponse.json({ error: 'Erro ao cancelar.' }, { status: 500 })
  }
}
